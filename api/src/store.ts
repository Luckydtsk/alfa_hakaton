import { pool } from "./db";
import { Mocks } from "./mocks";
import { Offer } from "./policy";
import { ageByCode, goalByCode, industryByCode, productByCode } from "./catalog";

export type User = {
  id: number;
  login: string;
  role: "client" | "bank";
  fullName: string;
  company: { id: number; name: string; inn: string } | null;
};

type ApplicationRecord = {
  id: number;
  user_id: number;
  company_name: string;
  inn: string;
  owner_name: string;
  goal: string | null;
  amount_rub: number | null;
  term_months: number | null;
  product: string | null;
  business_type: string | null;
  business_age: string | null;
  jobs_supported: number | null;
  industry_code: string | null;
  collateral: boolean | null;
  franchise: boolean | null;
  revolver: boolean | null;
  status: string;
  pd_chargeoff: number | null;
  risk_score: number | null;
  rules: string[];
  mocks: Mocks | null;
  offer: Offer | null;
  decision_comment: string | null;
  created_at: Date;
  updated_at: Date;
};

const SELECT = `
  SELECT a.id, c.user_id, c.name AS company_name, c.inn, u.full_name AS owner_name,
         a.goal, a.amount_rub, a.term_months, a.product, a.business_type, a.business_age,
         a.jobs_supported, a.industry_code, a.collateral, a.franchise, a.revolver, a.status,
         a.pd_chargeoff, a.risk_score, a.rules, a.mocks, a.offer, a.decision_comment,
         a.created_at, a.updated_at
  FROM applications a
  JOIN companies c ON c.id = a.company_id
  JOIN users u ON u.id = c.user_id
`;

export function present(row: ApplicationRecord) {
  const offer = row.offer
    ? { ...row.offer, productLabel: productByCode(row.offer.product)?.label ?? row.offer.product }
    : null;
  return {
    id: row.id,
    status: row.status,
    goal: row.goal,
    goalLabel: goalByCode(row.goal)?.label ?? null,
    amountRub: row.amount_rub,
    termMonths: row.term_months,
    product: row.product,
    productLabel: productByCode(row.product)?.label ?? null,
    businessType: row.business_type,
    businessAge: row.business_age,
    ageLabel: ageByCode(row.business_age)?.label ?? null,
    jobsSupported: row.jobs_supported,
    industryCode: row.industry_code,
    industryLabel: industryByCode(row.industry_code)?.label ?? null,
    collateral: row.collateral,
    franchise: row.franchise,
    revolver: row.revolver,
    pdChargeoff: row.pd_chargeoff,
    riskScore: row.risk_score,
    rules: row.rules ?? [],
    mocks: row.mocks,
    offer,
    decisionComment: row.decision_comment,
    companyName: row.company_name,
    inn: row.inn,
    ownerName: row.owner_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUser(login: string): Promise<(User & { passwordHash: string }) | null> {
  const result = await pool.query(
    `SELECT u.id, u.login, u.role, u.full_name, u.password_hash, c.id AS company_id, c.name AS company_name, c.inn
     FROM users u
     LEFT JOIN companies c ON c.user_id = u.id
     WHERE u.login = $1`,
    [login],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    login: row.login,
    role: row.role,
    fullName: row.full_name,
    passwordHash: row.password_hash,
    company: row.company_id ? { id: row.company_id, name: row.company_name, inn: row.inn } : null,
  };
}

export async function userByToken(tokenHash: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT u.id, u.login, u.role, u.full_name, c.id AS company_id, c.name AS company_name, c.inn
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN companies c ON c.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    login: row.login,
    role: row.role,
    fullName: row.full_name,
    company: row.company_id ? { id: row.company_id, name: row.company_name, inn: row.inn } : null,
  };
}

export async function createSession(userId: number, tokenHash: string): Promise<void> {
  await pool.query(`INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')`, [
    tokenHash,
    userId,
  ]);
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE token = $1`, [tokenHash]);
}

async function one(id: number): Promise<ApplicationRecord | null> {
  const result = await pool.query(`${SELECT} WHERE a.id = $1`, [id]);
  return (result.rows[0] as ApplicationRecord | undefined) ?? null;
}

export async function listForUser(user: User): Promise<ApplicationRecord[]> {
  const result =
    user.role === "bank"
      ? await pool.query(`${SELECT} ORDER BY a.updated_at DESC`)
      : await pool.query(`${SELECT} WHERE c.user_id = $1 ORDER BY a.updated_at DESC`, [user.id]);
  return result.rows as ApplicationRecord[];
}

export async function getForUser(id: number, user: User): Promise<ApplicationRecord | null> {
  const row = await one(id);
  if (!row) return null;
  if (user.role !== "bank" && row.user_id !== user.id) return null;
  return row;
}

export type Draft = {
  goal: string | null;
  amountRub: number | null;
  termMonths: number | null;
  product: string | null;
  businessType: string | null;
  businessAge: string | null;
  jobsSupported: number | null;
  industryCode: string | null;
  collateral: boolean;
  franchise: boolean;
  revolver: boolean;
};

export async function insertApplication(
  companyId: number,
  draft: Draft,
  outcome: { status: string; rules: string[]; offer: Offer | null; mocks: Mocks; pd: number | null; riskScore: number | null },
): Promise<ApplicationRecord> {
  const result = await pool.query(
    `INSERT INTO applications (
       company_id, goal, amount_rub, term_months, product, business_type, business_age, jobs_supported,
       industry_code, collateral, franchise, revolver, status, pd_chargeoff, risk_score, rules, mocks, offer
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb
     ) RETURNING id`,
    [
      companyId,
      draft.goal,
      draft.amountRub,
      draft.termMonths,
      draft.product,
      draft.businessType,
      draft.businessAge,
      draft.jobsSupported,
      draft.industryCode,
      draft.collateral,
      draft.franchise,
      draft.revolver,
      outcome.status,
      outcome.pd,
      outcome.riskScore,
      JSON.stringify(outcome.rules),
      JSON.stringify(outcome.mocks),
      outcome.offer ? JSON.stringify(outcome.offer) : null,
    ],
  );
  return (await one(result.rows[0].id))!;
}

export async function saveOutcome(
  id: number,
  draft: Draft,
  outcome: { status: string; rules: string[]; offer: Offer | null; mocks: Mocks; pd: number | null; riskScore: number | null },
  comment: string | null = null,
): Promise<ApplicationRecord> {
  await pool.query(
    `UPDATE applications SET
       goal = $2, amount_rub = $3, term_months = $4, product = $5, business_type = $6, business_age = $7,
       jobs_supported = $8, industry_code = $9, collateral = $10, franchise = $11, revolver = $12,
       status = $13, pd_chargeoff = $14, risk_score = $15, rules = $16::jsonb, mocks = $17::jsonb,
       offer = $18::jsonb, decision_comment = COALESCE($19, decision_comment), updated_at = now()
     WHERE id = $1`,
    [
      id,
      draft.goal,
      draft.amountRub,
      draft.termMonths,
      draft.product,
      draft.businessType,
      draft.businessAge,
      draft.jobsSupported,
      draft.industryCode,
      draft.collateral,
      draft.franchise,
      draft.revolver,
      outcome.status,
      outcome.pd,
      outcome.riskScore,
      JSON.stringify(outcome.rules),
      JSON.stringify(outcome.mocks),
      outcome.offer ? JSON.stringify(outcome.offer) : null,
      comment,
    ],
  );
  return (await one(id))!;
}

export async function setStatus(id: number, status: string, comment: string | null, extraRules?: string[]): Promise<void> {
  if (extraRules) {
    await pool.query(
      `UPDATE applications
       SET status = $2, decision_comment = COALESCE($3, decision_comment), rules = rules || $4::jsonb, updated_at = now()
       WHERE id = $1`,
      [id, status, comment, JSON.stringify(extraRules)],
    );
    return;
  }
  await pool.query(
    `UPDATE applications SET status = $2, decision_comment = COALESCE($3, decision_comment), updated_at = now() WHERE id = $1`,
    [id, status, comment],
  );
}
