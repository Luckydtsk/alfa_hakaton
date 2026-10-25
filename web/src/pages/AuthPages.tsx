import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../components/Shell";
import {
  Button,
  Check,
  ErrorMessage,
  Field,
  Input,
  Muted,
  Note,
  Select,
  Stack,
} from "../components/ui";
import { useCabinet } from "../state/CabinetContext";
import { useOperation } from "../hooks/useOperation";
import { useCompact } from "../hooks/useCompact";
import { demoMeta } from "../services/demoGateway";

function AuthLayout({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description: string;
}) {
  const compact = useCompact();
  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          padding: compact ? "24px 20px" : "30px 48px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <Brand />
        </Link>
      </header>
      <main
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: compact ? "36px 20px" : "70px 40px",
          display: "grid",
          gridTemplateColumns: compact ? "minmax(0,1fr)" : "1fr 1fr",
          gap: compact ? 32 : 80,
          alignItems: "start",
        }}
      >
        <section>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--muted)",
              marginBottom: 24,
            }}
          >
            Финансирование для бизнеса
          </div>
          <h1
            style={{
              fontSize: compact ? 32 : 44,
              lineHeight: 1.13,
              letterSpacing: -1.4,
              maxWidth: 450,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "var(--muted)",
              lineHeight: 1.6,
              marginTop: 24,
              maxWidth: 440,
            }}
          >
            {description}
          </p>
          <div
            style={{
              borderTop: "1px solid var(--line)",
              marginTop: 36,
              paddingTop: 24,
            }}
          >
            <Muted>
              Подбор по задаче, прозрачное решение и понятный следующий шаг — в
              одном кабинете.
            </Muted>
          </div>
        </section>
        <section style={{ minWidth: 0 }}>{children}</section>
      </main>
      <footer style={{ padding: 24, textAlign: "center" }}>
        <Muted>Учебный проект · «Альфа - Бузинесс»</Muted>
      </footer>
    </div>
  );
}

export function LoginPage() {
  const cabinet = useCabinet(),
    navigate = useNavigate(),
    operation = useOperation();
  const [login, setLogin] = useState("client.good"),
    [password, setPassword] = useState("demo");
  function submit(event: FormEvent) {
    event.preventDefault();
    void operation.run(async () => {
      const user = await cabinet.login(login, password);
      navigate(user.role === "bank" ? "/bank" : "/app");
    });
  }
  function demo(bank = false) {
    void operation.run(async () => {
      cabinet.enterDemo(bank);
      navigate(bank ? "/bank" : "/app");
    });
  }
  return (
    <AuthLayout
      title="Деньги на то, что двигает бизнес"
      description="Войдите, чтобы подобрать финансирование, узнать решение по заявке и продолжить оформление."
    >
      <Stack>
        <h2 style={{ fontSize: 25 }}>Войти в кабинет</h2>
        {cabinet.user && (
          <Note>
            Вы уже вошли как {cabinet.user.fullName}.{" "}
            <Link to={cabinet.user.role === "bank" ? "/bank" : "/app"}>
              Продолжить работу
            </Link>
          </Note>
        )}
        <form onSubmit={submit}>
          <Stack>
            <Field label="Логин">
              <Input
                autoComplete="username"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </Field>
            <Field label="Пароль">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <ErrorMessage message={operation.error} />
            {cabinet.error && <Note tone="warning">{cabinet.error}</Note>}
            <Button type="submit" disabled={operation.busy}>
              {operation.busy ? "Входим…" : "Войти"}
            </Button>
          </Stack>
        </form>
        <Muted>
          Нет аккаунта?{" "}
          <Link to="/register" style={{ color: "var(--ink)" }}>
            Создать аккаунт
          </Link>
        </Muted>
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
          <Stack gap={14}>
            <h3 style={{ fontSize: 16 }}>
              Посмотреть без подключения к серверу
            </h3>
            <Muted>
              Отдельный деморежим с тестовыми данными. Это не вход в банковский
              аккаунт.
            </Muted>
            <Button
              variant="secondary"
              onClick={() => demo()}
              disabled={operation.busy}
            >
              Открыть демокабинет клиента
            </Button>
            <Button
              variant="text"
              onClick={() => demo(true)}
              disabled={operation.busy}
            >
              Демонстрация кабинета сотрудника →
            </Button>
            <details
              style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}
            >
              <summary style={{ cursor: "pointer" }}>
                Тестовые аккаунты API
              </summary>
              <p style={{ marginTop: 12 }}>
                client.good, client.cafe, client.thin, client.border,
                client.closed, client.gray, bank.underwriter.
                <br />
                Пароль: demo. Нужен запущенный API.
              </p>
            </details>
          </Stack>
        </div>
      </Stack>
    </AuthLayout>
  );
}

export function RegistrationPage() {
  const { createDemoAccount } = useCabinet(),
    navigate = useNavigate(),
    operation = useOperation();
  const [name, setName] = useState(""),
    [company, setCompany] = useState(""),
    [inn, setInn] = useState(""),
    [industry, setIndustry] = useState(""),
    [age, setAge] = useState(""),
    [jobs, setJobs] = useState(""),
    [businessType, setBusinessType] = useState("ООО"),
    [consent, setConsent] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!consent) return;
    void operation.run(async () => {
      createDemoAccount(name.trim(), company.trim(), inn, {
        businessType,
        businessAge: age,
        jobsSupported: Number(jobs),
        industryCode: industry,
      });
      navigate("/app");
    });
  }
  return (
    <AuthLayout
      title="Начнём с вашего бизнеса"
      description="Сведения компании заполняются один раз. При оформлении заявки они уже будут в кабинете."
    >
      <Stack>
        <h2 style={{ fontSize: 25 }}>Создание аккаунта</h2>
        <Note tone="warning">
          Создание настоящего аккаунта пока недоступно. Сейчас можно создать
          только демонстрационный профиль в этом браузере. Пароль не
          запрашивается и не сохраняется.
        </Note>
        <form onSubmit={submit}>
          <Stack gap={16}>
            <Field label="Ваше имя">
              <Input
                required
                maxLength={120}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Название компании">
              <Input
                required
                maxLength={160}
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </Field>
            <Field label="ИНН компании">
              <Input
                required
                inputMode="numeric"
                pattern="(?:[0-9]{10}|[0-9]{12})"
                minLength={10}
                maxLength={12}
                value={inn}
                onChange={(e) => setInn(e.target.value)}
              />
            </Field>
            <Field label="Форма бизнеса">
              <Select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                <option>ООО</option>
                <option>ИП</option>
              </Select>
            </Field>
            <Field label="Отрасль">
              <Select
                required
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Выберите отрасль</option>
                {demoMeta.industries.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Возраст бизнеса">
              <Select
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
              >
                <option value="">Выберите возраст</option>
                {demoMeta.ages.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Число сотрудников">
              <Input
                required
                type="number"
                min={0}
                max={100000}
                step={1}
                value={jobs}
                onChange={(e) => setJobs(e.target.value)}
              />
            </Field>
            <Check
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            >
              Понимаю, что создаётся демонстрационный профиль. Использую только
              тестовые данные.
            </Check>
            <ErrorMessage message={operation.error} />
            <Button type="submit" disabled={operation.busy}>
              Создать демонстрационный профиль
            </Button>
          </Stack>
        </form>
        <Link to="/" style={{ fontSize: 14 }}>
          Уже есть аккаунт? Войти
        </Link>
      </Stack>
    </AuthLayout>
  );
}
