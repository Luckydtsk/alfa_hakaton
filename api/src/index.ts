import express from "express";
import { createHmac } from "crypto";
import { AGES, GOALS, INDUSTRIES, PRODUCTS, suggestProduct, TERMS } from "./catalog";
import { newToken, verifyPassword } from "./auth";
import { migrate, waitForDatabase } from "./db";
import { evaluate } from "./pipeline";
import { scoreLoan } from "./scoringClient";
import { seed } from "./seed";
import { Offer } from "./policy";
import {
  User,
  createSession,
  deleteSession,
  findUser,
  getForUser,
  insertApplication,
  listForUser,
  present,
  saveOutcome,
  setStatus,
  userByToken,
} from "./store";

const app = express();
app.use(express.json());

function tokenHash(token: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "dev-session-secret").update(token).digest("hex");
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const part = header
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

function setSessionCookie(res: express.Response, token: string, maxAge: number): void {
  res.setHeader("Set-Cookie", `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}

async function actor(req: express.Request): Promise<User | null> {
  const token = readCookie(req.headers.cookie, "sid");
  if (!token) return null;
  return userByToken(tokenHash(token));
}

function asyncRoute(handler: (req: express.Request, res: express.Response) => Promise<void>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    handler(req, res).catch(next);
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/meta", (_req, res) => {
  res.json({
    fxRubPerUsd: Number(process.env.FX_RUB_PER_USD ?? 90),
    pdApprove: Number(process.env.PD_APPROVE ?? 0.03),
    pdReview: Number(process.env.PD_REVIEW ?? 0.12),
    industries: INDUSTRIES,
    ages: AGES,
    goals: GOALS,
    products: PRODUCTS,
    terms: TERMS,
  });
});

app.post(
  "/api/login",
  asyncRoute(async (req, res) => {
    const user = await findUser(String(req.body?.login ?? ""));
    if (!user || !verifyPassword(String(req.body?.password ?? ""), user.passwordHash)) {
      res.status(401).json({ error: "Неверный логин или пароль" });
      return;
    }
    const token = newToken();
    await createSession(user.id, tokenHash(token));
    setSessionCookie(res, token, 7 * 24 * 3600);
    res.json({
      id: user.id,
      login: user.login,
      role: user.role,
      fullName: user.fullName,
      company: user.company,
    });
  }),
);

app.post(
  "/api/logout",
  asyncRoute(async (req, res) => {
    const token = readCookie(req.headers.cookie, "sid");
    if (token) await deleteSession(tokenHash(token));
    setSessionCookie(res, "", 0);
    res.json({ ok: true });
  }),
);

app.get(
  "/api/me",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user) {
      res.status(401).json({ error: "Нужно войти" });
      return;
    }
    res.json(user);
  }),
);

app.get(
  "/api/applications",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user) {
      res.status(401).json({ error: "Нужно войти" });
      return;
    }
    const rows = await listForUser(user);
    res.json(rows.map(present));
  }),
);

app.get(
  "/api/applications/:id",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user) {
      res.status(401).json({ error: "Нужно войти" });
      return;
    }
    const row = await getForUser(Number(req.params.id), user);
    if (!row) {
      res.status(404).json({ error: "Заявка не найдена" });
      return;
    }
    res.json(present(row));
  }),
);

app.post(
  "/api/applications",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user || user.role !== "client" || !user.company) {
      res.status(403).json({ error: "Заявку создаёт клиент" });
      return;
    }
    const draft = draftFromBody(req.body, user);
    const outcome = await evaluate(draft, user.company.inn);
    const row = await insertApplication(user.company.id, draft, {
      status: outcome.decision.status,
      rules: outcome.decision.rules,
      offer: outcome.decision.offer,
      mocks: outcome.mocks,
      pd: outcome.pd,
      riskScore: outcome.riskScore,
    });
    res.status(201).json(present(row));
  }),
);

app.post(
  "/api/applications/:id/supplement",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user || user.role !== "client" || !user.company) {
      res.status(403).json({ error: "Дополнить заявку может клиент" });
      return;
    }
    const current = await getForUser(Number(req.params.id), user);
    if (!current || current.status !== "need_info") {
      res.status(409).json({ error: "Сейчас заявка не ждёт данных" });
      return;
    }
    const draft = draftFromBody({ ...present(current), ...req.body }, user);
    const outcome = await evaluate(draft, user.company.inn);
    const row = await saveOutcome(current.id, draft, {
      status: outcome.decision.status,
      rules: outcome.decision.rules,
      offer: outcome.decision.offer,
      mocks: outcome.mocks,
      pd: outcome.pd,
      riskScore: outcome.riskScore,
    });
    res.json(present(row));
  }),
);

app.post(
  "/api/applications/:id/accept-offer",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user || user.role !== "client") {
      res.status(403).json({ error: "Принять условия может клиент" });
      return;
    }
    const current = await getForUser(Number(req.params.id), user);
    if (!current || current.status !== "counteroffer" || !current.offer) {
      res.status(409).json({ error: "По заявке нет предложения" });
      return;
    }
    const offer = current.offer as Offer;
    const draft = {
      goal: current.goal,
      amountRub: offer.amountRub,
      termMonths: offer.termMonths,
      product: offer.product,
      businessType: current.business_type,
      businessAge: current.business_age,
      jobsSupported: current.jobs_supported,
      industryCode: current.industry_code,
      collateral: offer.collateral,
      franchise: Boolean(current.franchise),
      revolver: offer.revolver,
    };
    const scored = await scoreLoan({
      amountRub: offer.amountRub,
      termMonths: offer.termMonths,
      industryCode: draft.industryCode ?? "",
      businessType: draft.businessType ?? "",
      businessAge: draft.businessAge ?? "",
      jobsSupported: draft.jobsSupported ?? 0,
      collateral: offer.collateral,
      revolver: offer.revolver,
      franchise: draft.franchise,
    });
    const row = await saveOutcome(
      current.id,
      draft,
      {
        status: "approved",
        rules: [
          ...(current.rules ?? []),
          "Клиент принял предложенные условия.",
          `Повторная вероятность списания ${new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 }).format(scored.pd_chargeoff)}.`,
        ],
        offer: null,
        mocks: current.mocks!,
        pd: scored.pd_chargeoff,
        riskScore: scored.risk_score,
      },
    );
    res.json(present(row));
  }),
);

app.post(
  "/api/applications/:id/decline-offer",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user || user.role !== "client") {
      res.status(403).json({ error: "Отказаться может клиент" });
      return;
    }
    const current = await getForUser(Number(req.params.id), user);
    if (!current || current.status !== "counteroffer") {
      res.status(409).json({ error: "По заявке нет предложения" });
      return;
    }
    await setStatus(current.id, "rejected", null, ["Клиент отказался от предложенных условий."]);
    const row = await getForUser(current.id, user);
    res.json(present(row!));
  }),
);

app.post(
  "/api/applications/:id/prepare-documents",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user || user.role !== "client") {
      res.status(403).json({ error: "Документы готовит клиент" });
      return;
    }
    const current = await getForUser(Number(req.params.id), user);
    if (!current || current.status !== "approved") {
      res.status(409).json({ error: "Документы готовятся после одобрения" });
      return;
    }
    await setStatus(current.id, "documents_ready", null, [
      "Документы сформированы в кабинете. Подписание смоделировано.",
    ]);
    res.json(present((await getForUser(current.id, user))!));
  }),
);

app.post(
  "/api/applications/:id/fund",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user || user.role !== "client") {
      res.status(403).json({ error: "Выдачу подтверждает клиент" });
      return;
    }
    const current = await getForUser(Number(req.params.id), user);
    if (!current || current.status !== "documents_ready") {
      res.status(409).json({ error: "Сначала подготовьте документы" });
      return;
    }
    await setStatus(current.id, "funded", null, ["Выдача смоделирована. Деньги не переводились."]);
    res.json(present((await getForUser(current.id, user))!));
  }),
);

app.post(
  "/api/applications/:id/decide",
  asyncRoute(async (req, res) => {
    const user = await actor(req);
    if (!user || user.role !== "bank") {
      res.status(403).json({ error: "Решение принимает сотрудник банка" });
      return;
    }
    const current = await getForUser(Number(req.params.id), user);
    if (!current || current.status !== "manual_review") {
      res.status(409).json({ error: "Заявка не в серой зоне" });
      return;
    }
    const comment = String(req.body?.comment ?? "").trim();
    if (!comment) {
      res.status(400).json({ error: "Нужен комментарий" });
      return;
    }
    const action = String(req.body?.action ?? "");
    if (action === "approve") {
      await setStatus(current.id, "approved", comment, [`Сотрудник одобрил заявку. ${comment}`]);
    } else if (action === "reject") {
      await setStatus(current.id, "rejected", comment, [`Сотрудник отказал. ${comment}`]);
    } else if (action === "need_info") {
      await setStatus(current.id, "need_info", comment, [`Сотрудник запросил данные. ${comment}`]);
    } else if (action === "counteroffer") {
      const amountRub = Number(req.body?.amountRub);
      const termMonths = Number(req.body?.termMonths);
      const product = req.body?.product === "equipment" ? "equipment" : "working_capital";
      if (!Number.isFinite(amountRub) || amountRub <= 0 || ![12, 24, 36].includes(termMonths)) {
        res.status(400).json({ error: "Укажите сумму и срок 12, 24 или 36 месяцев" });
        return;
      }
      const offer: Offer = {
        amountRub,
        termMonths,
        product,
        collateral: product === "equipment" ? true : Boolean(current.collateral),
        revolver: product === "working_capital",
      };
      await saveOutcome(
        current.id,
        {
          goal: current.goal,
          amountRub: current.amount_rub,
          termMonths: current.term_months,
          product: current.product,
          businessType: current.business_type,
          businessAge: current.business_age,
          jobsSupported: current.jobs_supported,
          industryCode: current.industry_code,
          collateral: Boolean(current.collateral),
          franchise: Boolean(current.franchise),
          revolver: Boolean(current.revolver),
        },
        {
          status: "counteroffer",
          rules: [...(current.rules ?? []), `Сотрудник предложил другие условия. ${comment}`],
          offer,
          mocks: current.mocks!,
          pd: current.pd_chargeoff,
          riskScore: current.risk_score,
        },
        comment,
      );
    } else {
      res.status(400).json({ error: "Неизвестное действие" });
      return;
    }
    res.json(present((await getForUser(current.id, user))!));
  }),
);

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Ошибка сервера" });
});

function draftFromBody(body: Record<string, unknown>, user: User) {
  const goal = typeof body.goal === "string" ? body.goal : null;
  const product =
    body.product === "equipment" || body.product === "working_capital" ? body.product : suggestProduct(goal);
  const amount = body.amountRub == null || body.amountRub === "" ? null : Number(body.amountRub);
  const term = body.termMonths == null || body.termMonths === "" ? null : Number(body.termMonths);
  const jobs = body.jobsSupported == null || body.jobsSupported === "" ? null : Number(body.jobsSupported);
  return {
    goal,
    amountRub: Number.isFinite(amount) ? amount : null,
    termMonths: Number.isFinite(term) ? term : null,
    product,
    businessType: typeof body.businessType === "string" && body.businessType ? body.businessType : "ООО",
    businessAge: typeof body.businessAge === "string" && body.businessAge ? body.businessAge : null,
    jobsSupported: jobs != null && Number.isFinite(jobs) ? jobs : null,
    industryCode: typeof body.industryCode === "string" && body.industryCode ? body.industryCode : null,
    collateral: Boolean(body.collateral),
    franchise: Boolean(body.franchise),
    revolver: product === "working_capital",
    companyId: user.company?.id,
  };
}

async function main(): Promise<void> {
  await waitForDatabase();
  await migrate();
  await seed();
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`api listening on :${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
