import { pool } from "./db";
import { hashPassword } from "./auth";
import { evaluate } from "./pipeline";
import { Draft, insertApplication } from "./store";

const PASSWORD = "demo";

type SeedUser = {
  login: string;
  fullName: string;
  role: "client" | "bank";
  company?: { name: string; inn: string };
  application?: Draft;
};

const USERS: SeedUser[] = [
  {
    login: "client.good",
    fullName: "Марина Соколова",
    role: "client",
    company: { name: "ООО «Северная практика»", inn: "7701000001" },
    application: {
      goal: "equipment",
      amountRub: 3_000_000,
      termMonths: 36,
      product: "equipment",
      businessType: "ООО",
      businessAge: "existing_5y_plus",
      jobsSupported: 12,
      industryCode: "professional",
      collateral: true,
      franchise: false,
      revolver: false,
    },
  },
  {
    login: "client.cafe",
    fullName: "Илья Орлов",
    role: "client",
    company: { name: "ИП Орлов", inn: "7701000002" },
    application: {
      goal: "cash_gap",
      amountRub: 1_500_000,
      termMonths: 24,
      product: "working_capital",
      businessType: "ИП",
      businessAge: "startup",
      jobsSupported: 2,
      industryCode: "cafe",
      collateral: false,
      franchise: false,
      revolver: true,
    },
  },
  {
    login: "client.thin",
    fullName: "Анна Лебедева",
    role: "client",
    company: { name: "ООО «Чистый лист»", inn: "7701000003" },
    application: {
      goal: "stock",
      amountRub: 1_000_000,
      termMonths: 12,
      product: "working_capital",
      businessType: "ООО",
      businessAge: null,
      jobsSupported: null,
      industryCode: "retail",
      collateral: false,
      franchise: false,
      revolver: true,
    },
  },
  {
    login: "client.border",
    fullName: "Павел Рядов",
    role: "client",
    company: { name: "ООО «Ряд и полка»", inn: "7701000004" },
    application: {
      goal: "stock",
      amountRub: 8_000_000,
      termMonths: 12,
      product: "working_capital",
      businessType: "ООО",
      businessAge: "age_2_to_5",
      jobsSupported: 6,
      industryCode: "retail",
      collateral: false,
      franchise: false,
      revolver: true,
    },
  },
  {
    login: "client.closed",
    fullName: "Олег Архипов",
    role: "client",
    company: { name: "ООО «Архив»", inn: "7701000005" },
    application: {
      goal: "equipment",
      amountRub: 2_000_000,
      termMonths: 12,
      product: "equipment",
      businessType: "ООО",
      businessAge: "existing_5y_plus",
      jobsSupported: 4,
      industryCode: "wholesale",
      collateral: false,
      franchise: false,
      revolver: false,
    },
  },
  {
    login: "client.gray",
    fullName: "Кирилл Мохов",
    role: "client",
    company: { name: "ООО «Тихая мастерская»", inn: "7701000006" },
    application: {
      goal: "equipment",
      amountRub: 4_000_000,
      termMonths: 36,
      product: "equipment",
      businessType: "ООО",
      businessAge: "age_2_to_5",
      jobsSupported: 8,
      industryCode: "manufacturing",
      collateral: true,
      franchise: false,
      revolver: false,
    },
  },
  { login: "bank.underwriter", fullName: "Елена Крылова", role: "bank" },
];

async function waitForScoring(): Promise<void> {
  const base = process.env.SCORING_URL ?? "http://127.0.0.1:8000";
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return;
    } catch {
      // Scoring container may still be starting.
    }
    if (attempt === 30) throw new Error("Скоринг не ответил на /health");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export async function seed(): Promise<void> {
  const existing = await pool.query(`SELECT count(*)::int AS count FROM users`);
  if (existing.rows[0].count > 0) return;
  await waitForScoring();
  const passwordHash = hashPassword(PASSWORD);
  for (const user of USERS) {
    const inserted = await pool.query(
      `INSERT INTO users (login, password_hash, role, full_name) VALUES ($1, $2, $3, $4) RETURNING id`,
      [user.login, passwordHash, user.role, user.fullName],
    );
    if (!user.company || !user.application) continue;
    const company = await pool.query(`INSERT INTO companies (user_id, name, inn) VALUES ($1, $2, $3) RETURNING id`, [
      inserted.rows[0].id,
      user.company.name,
      user.company.inn,
    ]);
    const draft = {
      ...user.application,
      revolver: user.application.product === "working_capital",
    };
    const outcome = await evaluate(draft, user.company.inn);
    await insertApplication(company.rows[0].id, draft, {
      status: outcome.decision.status,
      rules: outcome.decision.rules,
      offer: outcome.decision.offer,
      mocks: outcome.mocks,
      pd: outcome.pd,
      riskScore: outcome.riskScore,
    });
    console.log(`${user.login}: ${outcome.decision.status} pd=${outcome.pd ?? "—"}`);
  }
}
