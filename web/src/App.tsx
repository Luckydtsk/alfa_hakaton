import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Application, Meta, STATUS_LABEL, User, api, pct, rub } from "./api";

const ACCOUNTS = [
  ["client.good", "Одобрение, затем выдача"],
  ["client.cafe", "Отказ по модели"],
  ["client.thin", "Нужно дополнить данные"],
  ["client.border", "Другие условия"],
  ["client.closed", "Отказ: компания ликвидирована"],
  ["client.gray", "Серая зона для сотрудника"],
  ["bank.underwriter", "Кабинет сотрудника банка"],
];

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route element={<Frame />}>
        <Route path="/app" element={<ClientHome />} />
        <Route path="/app/new" element={<NewApplication />} />
        <Route path="/app/:id" element={<ApplicationPage mode="client" />} />
        <Route path="/bank" element={<BankGate />} />
        <Route path="/bank/:id" element={<BankCase />} />
      </Route>
    </Routes>
  );
}

function Frame() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    api<User>("/api/me").then(setUser).catch(() => setUser(null));
  }, []);
  if (user === undefined) return <p className="page">Загрузка…</p>;
  if (!user) return <Navigate to="/" replace />;
  return (
    <div className="shell">
      <header className="top">
        <Link className="brand" to={user.role === "bank" ? "/bank" : "/app"}>
          Кабинет финансирования
        </Link>
        <nav>
          <span className="small muted">{user.fullName}</span>
          <button
            className="btn-secondary"
            onClick={() => api("/api/logout", { method: "POST" }).then(() => (window.location.href = "/"))}
          >
            Выйти
          </button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("client.good");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");

  async function submit(nextLogin = login) {
    setError("");
    try {
      const user = await api<User>("/api/login", {
        method: "POST",
        body: JSON.stringify({ login: nextLogin, password }),
      });
      navigate(user.role === "bank" ? "/bank" : "/app");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка входа");
    }
  }

  return (
    <main className="page grid">
      <section>
        <h1>Деньги для дела, без банковского жаргона</h1>
        <p className="lead">Опишите задачу. Кабинет подберёт продукт, проверит компанию и покажет решение по заявке.</p>
        <form
          className="form card"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label>
            Логин
            <input value={login} onChange={(event) => setLogin(event.target.value)} />
          </label>
          <label>
            Пароль
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit">Войти</button>
        </form>
      </section>
      <section className="stack">
        <h2>Тестовые входы</h2>
        <p className="small muted">Пароль у всех один: demo</p>
        <div className="accounts">
          {ACCOUNTS.map(([value, label]) => (
            <button key={value} className="account" onClick={() => void submit(value)}>
              <span>{label}</span>
              <span className="muted">{value}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function BankGate() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    api<User>("/api/me").then(setUser);
  }, []);
  if (!user) return <p className="page">Загрузка…</p>;
  if (user.role !== "bank") return <Navigate to="/app" replace />;
  return <BankHome />;
}

function BankCase() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    api<User>("/api/me").then(setUser);
  }, []);
  if (!user) return <p className="page">Загрузка…</p>;
  if (user.role !== "bank") return <Navigate to="/app" replace />;
  return <ApplicationPage mode="bank" />;
}

function ClientHome() {
  const [items, setItems] = useState<Application[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Application[]>("/api/applications").then(setItems).catch((reason) => setError(reason.message));
  }, []);
  return (
    <main className="page stack">
      <div className="spread">
        <div>
          <h1>Мои заявки</h1>
          <p className="muted">Статус сохраняется. Можно закрыть страницу и вернуться.</p>
        </div>
        <Link className="btn" to="/app/new">Новая заявка</Link>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="list">
        {(items ?? []).map((item) => (
          <Link key={item.id} className="app-link" to={`/app/${item.id}`}>
            <span>
              <strong>{item.goalLabel ?? "Заявка"} №{item.id}</strong>
              <span className="muted"> · {rub(item.amountRub)} · {item.termMonths ?? "—"} мес.</span>
            </span>
            <span className={`pill ${item.status}`}>{STATUS_LABEL[item.status] ?? item.status}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

function NewApplication() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [goal, setGoal] = useState("cash_gap");
  const [product, setProduct] = useState("working_capital");
  const [amountRub, setAmountRub] = useState("1500000");
  const [termMonths, setTermMonths] = useState("12");
  const [businessType, setBusinessType] = useState("ООО");
  const [businessAge, setBusinessAge] = useState("existing_5y_plus");
  const [jobsSupported, setJobsSupported] = useState("5");
  const [industryCode, setIndustryCode] = useState("retail");
  const [collateral, setCollateral] = useState(false);
  const [franchise, setFranchise] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch((reason) => setError(reason.message));
  }, []);

  const suggested = meta?.goals.find((item) => item.code === goal)?.product;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const created = await api<Application>("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          goal,
          product,
          amountRub: Number(amountRub),
          termMonths: Number(termMonths),
          businessType,
          businessAge,
          jobsSupported: jobsSupported === "" ? null : Number(jobsSupported),
          industryCode,
          collateral,
          franchise,
        }),
      });
      navigate(`/app/${created.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось отправить");
    }
  }

  return (
    <main className="page">
      <h1>Какая задача у бизнеса</h1>
      <p className="muted">Сначала цель и сумма. Продукт можно оставить предложенным.</p>
      <form className="form card" onSubmit={(event) => void submit(event)}>
        <label>
          Цель
          <select
            value={goal}
            onChange={(event) => {
              const next = event.target.value;
              setGoal(next);
              const match = meta?.goals.find((item) => item.code === next);
              if (match) setProduct(match.product);
            }}
          >
            {meta?.goals.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        <p className="small muted">
          Предложение кабинета: {meta?.products.find((item) => item.code === suggested)?.label}. Сейчас выбран{" "}
          {meta?.products.find((item) => item.code === product)?.label}.
        </p>
        <label>
          Продукт
          <select value={product} onChange={(event) => setProduct(event.target.value)}>
            {meta?.products.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label} · до {rub(item.maxAmountRub)} · до {item.maxTermMonths} мес.
              </option>
            ))}
          </select>
        </label>
        <label>
          Сумма, ₽
          <input inputMode="numeric" value={amountRub} onChange={(event) => setAmountRub(event.target.value)} />
        </label>
        <label>
          Срок
          <select value={termMonths} onChange={(event) => setTermMonths(event.target.value)}>
            {meta?.terms.map((term) => (
              <option key={term} value={term}>{term} месяцев</option>
            ))}
          </select>
        </label>
        <label>
          Форма бизнеса
          <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
            <option>ООО</option>
            <option>ИП</option>
          </select>
        </label>
        <label>
          Возраст бизнеса
          <select value={businessAge} onChange={(event) => setBusinessAge(event.target.value)}>
            <option value="">Не знаю</option>
            {meta?.ages.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          Сотрудники
          <input inputMode="numeric" value={jobsSupported} onChange={(event) => setJobsSupported(event.target.value)} />
        </label>
        <label>
          Отрасль
          <select value={industryCode} onChange={(event) => setIndustryCode(event.target.value)}>
            {meta?.industries.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={collateral} onChange={(event) => setCollateral(event.target.checked)} />
          Есть залог
        </label>
        <label className="check">
          <input type="checkbox" checked={franchise} onChange={(event) => setFranchise(event.target.checked)} />
          Это франшиза
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit">Отправить заявку</button>
      </form>
    </main>
  );
}

function BankHome() {
  const [items, setItems] = useState<Application[] | null>(null);
  useEffect(() => {
    api<Application[]>("/api/applications").then(setItems);
  }, []);
  const queue = (items ?? []).filter((item) => item.status === "manual_review");
  const rest = (items ?? []).filter((item) => item.status !== "manual_review");
  return (
    <main className="page stack">
      <h1>Очередь сотрудника</h1>
      <section className="stack">
        <h2>Ждут решения</h2>
        {queue.length === 0 ? <p className="muted">Серых заявок нет.</p> : null}
        {queue.map((item) => (
          <Link key={item.id} className="app-link" to={`/bank/${item.id}`}>
            <span>{item.companyName} · {rub(item.amountRub)}</span>
            <span className={`pill ${item.status}`}>{STATUS_LABEL[item.status]}</span>
          </Link>
        ))}
      </section>
      <section className="stack">
        <h2>Остальные</h2>
        {rest.map((item) => (
          <Link key={item.id} className="app-link" to={`/bank/${item.id}`}>
            <span>{item.companyName} · {item.goalLabel}</span>
            <span className={`pill ${item.status}`}>{STATUS_LABEL[item.status] ?? item.status}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

function ApplicationPage({ mode }: { mode: "client" | "bank" }) {
  const params = useParams();
  const [item, setItem] = useState<Application | null>(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [action, setAction] = useState("approve");
  const [amountRub, setAmountRub] = useState("");
  const [termMonths, setTermMonths] = useState("12");
  const [product, setProduct] = useState("working_capital");
  const [age, setAge] = useState("existing_5y_plus");
  const [jobs, setJobs] = useState("3");

  async function reload() {
    const next = await api<Application>(`${mode === "bank" ? "/api/applications" : "/api/applications"}/${params.id}`);
    setItem(next);
    setAmountRub(String(next.offer?.amountRub ?? next.amountRub ?? ""));
    setTermMonths(String(next.offer?.termMonths ?? next.termMonths ?? 12));
    setProduct(next.product ?? "working_capital");
  }

  useEffect(() => {
    reload().catch((reason) => setError(reason.message));
  }, [params.id]);

  async function post(path: string, body?: unknown) {
    setError("");
    try {
      const next = await api<Application>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      setItem(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка");
    }
  }

  if (!item) return <p className="page">{error || "Загрузка…"}</p>;
  const steps = ["Заявка", "Проверки", "Оценка", "Решение", "Документы", "Выдача"];
  const step = ["rejected", "need_info", "counteroffer", "manual_review"].includes(item.status)
    ? 3
    : item.status === "approved"
      ? 3
      : item.status === "documents_ready"
        ? 4
        : item.status === "funded"
          ? 5
          : 2;

  return (
    <main className="page stack">
      <div className="spread">
        <div>
          <p className="small muted">{item.companyName} · ИНН {item.inn}</p>
          <h1>{item.goalLabel ?? "Заявка"} №{item.id}</h1>
        </div>
        <span className={`pill ${item.status}`}>{STATUS_LABEL[item.status] ?? item.status}</span>
      </div>
      <ol className="steps">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? "on" : ""}>{label}</li>
        ))}
      </ol>
      <section className="grid">
        <div className="stack">
          <article className="card">
            <h2>Что дальше</h2>
            <NextAction item={item} mode={mode} onPost={post} />
            {error ? <p className="error">{error}</p> : null}
          </article>
          {item.pdChargeoff != null ? (
            <article className="card">
              <h2>Оценка риска</h2>
              <p className="metric">{pct(item.pdChargeoff)}</p>
              <p className="muted">Вероятность списания. Балл {item.riskScore} из 1000, выше — спокойнее.</p>
            </article>
          ) : null}
          <article className="card">
            <h2>Почему такое решение</h2>
            <ul>
              {item.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            {item.decisionComment ? <p>Комментарий сотрудника: {item.decisionComment}</p> : null}
          </article>
        </div>
        <div className="stack">
          <article className="panel">
            <h3>Заявка</h3>
            <dl className="facts">
              <div><dt>Сумма</dt><dd>{rub(item.amountRub)}</dd></div>
              <div><dt>Срок</dt><dd>{item.termMonths ?? "—"} мес.</dd></div>
              <div><dt>Продукт</dt><dd>{item.productLabel ?? "—"}</dd></div>
              <div><dt>Бизнес</dt><dd>{item.businessType ?? "—"}</dd></div>
              <div><dt>Возраст</dt><dd>{item.ageLabel ?? "не указан"}</dd></div>
              <div><dt>Сотрудники</dt><dd>{item.jobsSupported ?? "не указано"}</dd></div>
              <div><dt>Отрасль</dt><dd>{item.industryLabel ?? "—"}</dd></div>
              <div><dt>Залог</dt><dd>{item.collateral ? "есть" : "нет"}</dd></div>
            </dl>
          </article>
          {item.offer ? (
            <article className="panel">
              <h3>Предложение банка</h3>
              <div className="offer">
                <div>
                  <p className="small muted">Было</p>
                  <p>{rub(item.amountRub)} · {item.termMonths} мес.</p>
                  <p>{item.productLabel}</p>
                </div>
                <div>
                  <p className="small muted">Стало</p>
                  <p>{rub(item.offer.amountRub)} · {item.offer.termMonths} мес.</p>
                  <p>{item.offer.productLabel}</p>
                </div>
              </div>
            </article>
          ) : null}
          {item.mocks ? (
            <article className="panel">
              <h3>Проверки</h3>
              <p>ЕГРЮЛ: {item.mocks.registry.status === "liquidated" ? "ликвидирована" : "действует"} с {item.mocks.registry.registeredAt}</p>
              <p>Бюро: кредитов {item.mocks.bureau.openLoans}, просрочка {item.mocks.bureau.hasDelinquency ? "есть" : "нет"}, платёж {rub(item.mocks.bureau.monthlyPaymentRub)}</p>
              <p>Прозрачный бизнес: {item.mocks.transparent.director}, {item.mocks.transparent.okved}</p>
            </article>
          ) : null}
          {mode === "bank" && item.status === "manual_review" ? (
            <form
              className="form card"
              onSubmit={(event) => {
                event.preventDefault();
                void post(`/api/applications/${item.id}/decide`, { action, comment, amountRub: Number(amountRub), termMonths: Number(termMonths), product });
              }}
            >
              <h3>Решение сотрудника</h3>
              <label>
                Действие
                <select value={action} onChange={(event) => setAction(event.target.value)}>
                  <option value="approve">Одобрить</option>
                  <option value="counteroffer">Изменить сумму или срок</option>
                  <option value="need_info">Запросить данные</option>
                  <option value="reject">Отказать</option>
                </select>
              </label>
              {action === "counteroffer" ? (
                <>
                  <label>
                    Новая сумма, ₽
                    <input value={amountRub} onChange={(event) => setAmountRub(event.target.value)} />
                  </label>
                  <label>
                    Новый срок
                    <select value={termMonths} onChange={(event) => setTermMonths(event.target.value)}>
                      <option value="12">12</option>
                      <option value="24">24</option>
                      <option value="36">36</option>
                    </select>
                  </label>
                  <label>
                    Продукт
                    <select value={product} onChange={(event) => setProduct(event.target.value)}>
                      <option value="working_capital">Оборотный кредит</option>
                      <option value="equipment">Кредит на оборудование</option>
                    </select>
                  </label>
                </>
              ) : null}
              <label>
                Комментарий
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
              <button className="btn" type="submit">Записать решение</button>
            </form>
          ) : null}
          {mode === "client" && item.status === "need_info" ? (
            <form
              className="form card"
              onSubmit={(event) => {
                event.preventDefault();
                void post(`/api/applications/${item.id}/supplement`, {
                  ...item,
                  businessAge: age,
                  jobsSupported: Number(jobs),
                });
              }}
            >
              <h3>Дополнить заявку</h3>
              <label>
                Возраст бизнеса
                <select value={age} onChange={(event) => setAge(event.target.value)}>
                  <option value="startup">Бизнес откроется на эти деньги</option>
                  <option value="under_2y">Младше 2 лет</option>
                  <option value="age_2_to_5">От 2 до 5 лет</option>
                  <option value="existing_5y_plus">Старше 5 лет</option>
                </select>
              </label>
              <label>
                Сотрудники
                <input value={jobs} onChange={(event) => setJobs(event.target.value)} />
              </label>
              <button className="btn" type="submit">Отправить данные</button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function NextAction({
  item,
  mode,
  onPost,
}: {
  item: Application;
  mode: "client" | "bank";
  onPost: (path: string, body?: unknown) => Promise<void>;
}) {
  if (mode === "client" && item.status === "counteroffer") {
    return (
      <div className="row">
        <button className="btn" onClick={() => void onPost(`/api/applications/${item.id}/accept-offer`)}>Принять условия</button>
        <button className="btn-secondary" onClick={() => void onPost(`/api/applications/${item.id}/decline-offer`)}>Отказаться</button>
      </div>
    );
  }
  if (mode === "client" && item.status === "approved") {
    return <button className="btn" onClick={() => void onPost(`/api/applications/${item.id}/prepare-documents`)}>Подготовить документы</button>;
  }
  if (mode === "client" && item.status === "documents_ready") {
    return (
      <div className="stack">
        <p>Договор и график сформированы в кабинете. Подпись и платёж смоделированы.</p>
        <button className="btn" onClick={() => void onPost(`/api/applications/${item.id}/fund`)}>Подтвердить выдачу</button>
      </div>
    );
  }
  if (item.status === "funded") return <p>Заявка завершена. Деньги не переводились: это учебный прототип.</p>;
  if (item.status === "rejected") return <p>По этой заявке отказ. Новую можно подать отдельно.</p>;
  if (item.status === "need_info" && mode === "client") {
    return <p>Банку не хватает сведений. Дополните заявку справа, это не отказ.</p>;
  }
  if (item.status === "need_info") return <p>Клиенту нужно дополнить заявку. Это не отказ.</p>;
  if (item.status === "manual_review" && mode === "bank") return <p>Решение справа. Комментарий обязателен.</p>;
  if (item.status === "manual_review") return <p>Заявку смотрит сотрудник банка. Решение появится в этой карточке.</p>;
  if (item.status === "approved" && mode === "bank") return <p>Заявка одобрена. Документы готовит клиент.</p>;
  if (item.status === "documents_ready") return <p>Документы подготовлены. Клиент подтверждает выдачу.</p>;
  if (item.status === "counteroffer") return <p>Клиент выбирает, принять условия или отказаться.</p>;
  return <p>Заявка в работе.</p>;
}
