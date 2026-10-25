import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { rub } from "../api";
import { CompanyProfileForm } from "../components/CompanyProfileForm";
import {
  Button,
  Check,
  Columns,
  ErrorMessage,
  Facts,
  Field,
  Input,
  LargeAmount,
  Modal,
  Muted,
  Note,
  PageHeading,
  Panel,
  Stack,
  TextArea,
} from "../components/ui";
import { estimateLoan } from "../domain/models";
import { useCabinet } from "../state/CabinetContext";
import { useOperation } from "../hooks/useOperation";

export function NewApplicationPage() {
  const cabinet = useCabinet(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    operation = useOperation();
  const [product, setProduct] = useState(
      params.get("product") === "working_capital"
        ? "working_capital"
        : "equipment",
    ),
    [goal, setGoal] = useState(""),
    [amount, setAmount] = useState("3000000"),
    [term, setTerm] = useState(36),
    [collateral, setCollateral] = useState(true),
    [franchise, setFranchise] = useState(false),
    [step, setStep] = useState(1),
    [consent, setConsent] = useState(false),
    [profileOpen, setProfileOpen] = useState(false);
  const { profile, meta, user } = cabinet;
  const selected = meta?.products.find((p) => p.code === product);
  const estimate = estimateLoan(Number(amount) || 0, term);
  const incomplete =
    !profile.businessAge ||
    !profile.industryCode ||
    profile.jobsSupported == null;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!goal.trim()) {
      operation.setError("Опишите задачу бизнеса.");
      return;
    }
    if (!Number.isSafeInteger(Number(amount)) || Number(amount) <= 0) {
      operation.setError("Укажите положительную сумму в целых рублях.");
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    if (!consent || incomplete) return;
    void operation.run(async () => {
      const item = await cabinet.createApplication({
        ...profile,
        goal: goal.trim(),
        amountRub: Number(amount),
        termMonths: term,
        product,
        collateral,
        franchise,
      });
      navigate(`/app/${item.id}`);
    });
  }
  return (
    <>
      <Link
        to="/app"
        style={{
          display: "inline-block",
          fontSize: 13,
          color: "var(--muted)",
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        ← Финансирование
      </Link>
      <PageHeading
        title="Подберём финансирование"
        description="Понятные условия — до отправки заявки."
      />
      <div
        style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap" }}
      >
        {["Задача и условия", "Проверка и отправка"].map((name, i) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontSize: 13,
              color: step === i + 1 ? "var(--ink)" : "var(--muted)",
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 25,
                height: 25,
                borderRadius: "50%",
                background: step === i + 1 ? "var(--ink)" : "var(--soft)",
                color: step === i + 1 ? "white" : "var(--muted)",
              }}
            >
              {i + 1}
            </span>
            {name}
          </div>
        ))}
      </div>
      <Columns>
        <form onSubmit={submit}>
          <Stack gap={24}>
            {step === 1 ? (
              <>
                <h2 style={{ fontSize: 23 }}>На что нужны деньги?</h2>
                <Field
                  label="Для чего нужны деньги?"
                  hint="Опишите задачу своими словами"
                >
                  <TextArea
                    required
                    maxLength={1000}
                    placeholder="Например, купить станок за 800 тысяч или закупить товар к сезону"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </Field>
                <Field label="Кредитный продукт">
                  <div
                    role="group"
                    aria-label="Кредитный продукт"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                  >
                    {meta?.products.map((p) => (
                      <Button
                        key={p.code}
                        variant="secondary"
                        aria-pressed={product === p.code}
                        onClick={() => setProduct(p.code)}
                        style={{
                          border: "1px solid var(--line)",
                          background:
                            product === p.code ? "var(--ink)" : "white",
                          color: product === p.code ? "white" : "var(--ink)",
                        }}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </Field>
                <Field label="Сумма, ₽">
                  <Input
                    required
                    type="number"
                    min={1}
                    max={1000000000}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Field label="Срок финансирования">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {meta?.terms.map((t) => (
                      <Button
                        key={t}
                        variant="secondary"
                        aria-pressed={term === t}
                        onClick={() => setTerm(t)}
                        style={{
                          background: term === t ? "var(--ink)" : "var(--soft)",
                          color: term === t ? "white" : "var(--ink)",
                        }}
                      >
                        {t} мес.
                      </Button>
                    ))}
                  </div>
                </Field>
                <Check
                  checked={collateral}
                  onChange={(e) => setCollateral(e.target.checked)}
                >
                  Есть имущество, которое можно предоставить в залог
                </Check>
                <Check
                  checked={franchise}
                  onChange={(e) => setFranchise(e.target.checked)}
                >
                  Бизнес работает по франшизе
                </Check>
                {selected && (
                  <Note>
                    Выбран {selected.label.toLowerCase()}. Лимит продукта:{" "}
                    {rub(selected.maxAmountRub)}, срок до{" "}
                    {selected.maxTermMonths} месяцев.
                    {selected.collateralRequired
                      ? " Для этого продукта нужен залог."
                      : ""}
                  </Note>
                )}
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 23 }}>Проверьте заявку</h2>
                <Muted>Данные компании уже заполнены из вашего аккаунта.</Muted>
                <Facts
                  items={[
                    ["Компания", user?.company?.name],
                    ["ИНН", user?.company?.inn],
                    ["Задача", goal],
                    ["Продукт", selected?.label],
                    ["Сумма и срок", `${rub(Number(amount))} · ${term} мес.`],
                    ["Форма бизнеса", profile.businessType],
                    [
                      "Возраст бизнеса",
                      meta?.ages.find((a) => a.code === profile.businessAge)
                        ?.label ?? "Не указан",
                    ],
                    [
                      "Отрасль",
                      meta?.industries.find(
                        (i) => i.code === profile.industryCode,
                      )?.label ?? "Не указана",
                    ],
                    ["Сотрудники", profile.jobsSupported ?? "Не указано"],
                  ]}
                />
                {incomplete && (
                  <Note tone="warning">
                    В аккаунте не хватает сведений для заявки.{" "}
                    <Button variant="text" onClick={() => setProfileOpen(true)}>
                      Дополнить профиль
                    </Button>
                  </Note>
                )}
                <Check
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                >
                  Согласен на обработку данных и запрос кредитной истории для
                  рассмотрения заявки
                </Check>
              </>
            )}
            <ErrorMessage message={operation.error} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
              }}
            >
              {step === 2 ? (
                <Button
                  variant="secondary"
                  onClick={() => setStep(1)}
                  disabled={operation.busy}
                >
                  Назад
                </Button>
              ) : (
                <Muted>Шаг 1 из 2</Muted>
              )}
              <Button
                type="submit"
                disabled={operation.busy || !meta || (step === 2 && incomplete)}
              >
                {operation.busy
                  ? "Отправляем…"
                  : step === 2
                    ? "Отправить заявку"
                    : "Продолжить"}{" "}
                →
              </Button>
            </div>
          </Stack>
        </form>
        <Panel>
          <Stack>
            <Muted>ПРИМЕР РАСЧЁТА</Muted>
            <h3 style={{ fontSize: 17 }}>
              {selected?.label ?? "Загружаем продукты…"}
            </h3>
            <LargeAmount>{rub(estimate.payment)}</LargeAmount>
            <Muted>Примерный ежемесячный платёж</Muted>
            <Facts
              items={[
                ["Ставка в примере", "18% годовых"],
                ["Проценты за срок", rub(estimate.interest)],
                ["Комиссии в примере", "0 ₽"],
              ]}
            />
            <Muted>
              Учебный расчёт по аннуитетной схеме, не тариф банка и не
              одобрение. Окончательные условия и график должны быть указаны в договоре.
            </Muted>
          </Stack>
        </Panel>
      </Columns>
      {profileOpen && (
        <Modal
          title="Дополнить сведения компании"
          onClose={() => setProfileOpen(false)}
        >
          <CompanyProfileForm onSaved={() => setProfileOpen(false)} />
        </Modal>
      )}
    </>
  );
}
