import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { pct, rub, type Application } from "../api";
import { ContractModal } from "../components/ContractModal";
import {
  Button,
  Check,
  Columns,
  ErrorMessage,
  Facts,
  Field,
  Input,
  Modal,
  Muted,
  Note,
  PageHeading,
  Panel,
  Select,
  Stack,
  StatusBadge,
  TextArea,
} from "../components/ui";
import { titleOf, type ApplicationAction } from "../domain/models";
import { useCabinet } from "../state/CabinetContext";
import { useOperation } from "../hooks/useOperation";
import { applicationContract } from "../services/pdf";

function SupplementForm({ item }: { item: Application }) {
  const cabinet = useCabinet(),
    operation = useOperation();
  const [age, setAge] = useState(
      item.businessAge ?? cabinet.profile.businessAge,
    ),
    [jobs, setJobs] = useState(
      String(item.jobsSupported ?? cabinet.profile.jobsSupported ?? ""),
    );
  function submit(event: FormEvent) {
    event.preventDefault();
    void operation.run(async () => {
      await cabinet.act(item.id, "supplement", {
        businessAge: age,
        jobsSupported: Number(jobs),
      });
    });
  }
  return (
    <form onSubmit={submit}>
      <Stack>
        <Field label="Возраст бизнеса">
          <Select required value={age} onChange={(e) => setAge(e.target.value)}>
            <option value="">Выберите возраст</option>
            {cabinet.meta?.ages.map((a) => (
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
        <ErrorMessage message={operation.error} />
        <Button disabled={operation.busy} type="submit">
          Отправить данные
        </Button>
      </Stack>
    </form>
  );
}

function UnderwriterForm({ item }: { item: Application }) {
  const cabinet = useCabinet(),
    operation = useOperation();
  const [action, setAction] = useState("approve"),
    [comment, setComment] = useState(""),
    [amount, setAmount] = useState(String(item.amountRub ?? "")),
    [term, setTerm] = useState(item.termMonths ?? 12),
    [product, setProduct] = useState(item.product ?? "working_capital");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) {
      operation.setError("Комментарий обязателен.");
      return;
    }
    void operation.run(async () => {
      await cabinet.act(item.id, "decide", {
        action,
        comment: comment.trim(),
        amountRub: Number(amount),
        termMonths: term,
        product,
      });
    });
  }
  return (
    <Panel>
      <form onSubmit={submit}>
        <Stack>
          <h3>Решение сотрудника</h3>
          <Field label="Действие">
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="approve">Одобрить</option>
              <option value="counteroffer">Предложить другие условия</option>
              <option value="need_info">Запросить данные</option>
              <option value="reject">Отказать</option>
            </Select>
          </Field>
          {action === "counteroffer" && (
            <>
              <Field label="Новая сумма, ₽">
                <Input
                  required
                  min={1}
                  step={1}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field label="Новый срок">
                <Select
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value))}
                >
                  {cabinet.meta?.terms.map((t) => (
                    <option key={t} value={t}>
                      {t} мес.
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Продукт">
                <Select
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                >
                  {cabinet.meta?.products.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}
          <Field label="Комментарий клиенту">
            <TextArea
              required
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
          <ErrorMessage message={operation.error} />
          <Button type="submit" disabled={operation.busy}>
            Записать решение
          </Button>
        </Stack>
      </form>
    </Panel>
  );
}

export function ApplicationPage() {
  const { id } = useParams(),
    cabinet = useCabinet(),
    operation = useOperation();
  const [contractOpen, setContractOpen] = useState(false),
    [fundOpen, setFundOpen] = useState(false),
    [consent, setConsent] = useState(false);
  const item = cabinet.applications.find((a) => a.id === Number(id));
  const bank = cabinet.user?.role === "bank";
  if (!item)
    return (
      <>
        <PageHeading
          title={cabinet.loading ? "Загружаем заявку…" : "Заявка не найдена"}
        />
        <Link to={bank ? "/bank" : "/app/applications"}>
          Вернуться к заявкам
        </Link>
      </>
    );
  function act(action: ApplicationAction) {
    void operation.run(async () => {
      await cabinet.act(Number(id), action);
      setFundOpen(false);
    });
  }
  const titles: Record<string, string> = {
    approved: "Финансирование одобрено",
    need_info: "Нужно немного больше информации",
    manual_review: "Заявка на рассмотрении",
    counteroffer: "Можем предложить другие условия",
    documents_ready: "Документы готовы к ознакомлению",
    funded: "Выдача смоделирована",
    rejected: "По заявке принято отрицательное решение",
  };
  const stage =
    item.status === "funded" ? 4 : item.status === "documents_ready" ? 3 : 2;
  return (
    <>
      <Link
        to={bank ? "/bank" : "/app/applications"}
        style={{
          display: "inline-block",
          marginBottom: 24,
          fontSize: 13,
          color: "var(--muted)",
          textDecoration: "none",
        }}
      >
        ← {bank ? "Очередь сотрудника" : "Мои заявки"}
      </Link>
      <PageHeading
        title={titleOf(item)}
        description={`Заявка № ${item.id} · ${new Date(item.createdAt).toLocaleDateString("ru-RU")}`}
        action={<StatusBadge status={item.status} />}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {["Заявка", "Проверки", "Решение", "Документы", "Выдача"].map(
          (name, i) => (
            <div
              key={name}
              style={{
                flex: 1,
                paddingTop: 14,
                borderTop: `3px solid ${i < stage ? "var(--ink)" : i === stage ? "var(--red)" : "var(--line)"}`,
                fontSize: 12,
                color: i === stage ? "var(--red)" : "var(--muted)",
              }}
            >
              {name}
            </div>
          ),
        )}
      </div>
      <Columns>
        <Stack>
          <section
            style={{
              padding: 28,
              border: "1px solid var(--line)",
              borderRadius: 16,
            }}
          >
            <Stack>
              <StatusBadge status={item.status} />
              <h2 style={{ fontSize: 26, lineHeight: 1.2 }}>
                {titles[item.status] ?? "Заявка в работе"}
              </h2>
              {item.status === "manual_review" && (
                <Muted>
                  Решение появится в этой карточке после рассмотрения
                  сотрудником.
                </Muted>
              )}
              {item.status === "funded" && (
                <Muted>
                  Оформление завершено. Реальные деньги не переводились.
                </Muted>
              )}
              {item.status === "documents_ready" && (
                <Muted>
                  Ознакомьтесь с учебным образцом. Следующее действие моделирует
                  подписание и выдачу.
                </Muted>
              )}
              {item.status === "counteroffer" && item.offer && (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                    <Panel>
                      <Muted>Вы запросили</Muted>
                      <h3 style={{ marginTop: 12 }}>
                        {rub(item.amountRub)} · {item.termMonths} мес.
                      </h3>
                      <Muted>{item.productLabel}</Muted>
                    </Panel>
                    <Panel>
                      <Muted>Банк предлагает</Muted>
                      <h3 style={{ marginTop: 12 }}>
                        {rub(item.offer.amountRub)} · {item.offer.termMonths}{" "}
                        мес.
                      </h3>
                      <Muted>{item.offer.productLabel}</Muted>
                    </Panel>
                  </div>
                  {!bank && (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <Button
                        disabled={operation.busy}
                        onClick={() => act("accept-offer")}
                      >
                        Принять условия
                      </Button>
                      <Button
                        disabled={operation.busy}
                        variant="secondary"
                        onClick={() => act("decline-offer")}
                      >
                        Отказаться
                      </Button>
                    </div>
                  )}
                </>
              )}
              {!bank && item.status === "approved" && (
                <Button
                  disabled={operation.busy}
                  onClick={() => act("prepare-documents")}
                >
                  Подготовить документы
                </Button>
              )}
              {!bank && item.status === "need_info" && (
                <SupplementForm item={item} />
              )}
              {!bank && item.status === "documents_ready" && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Button
                    variant="secondary"
                    onClick={() => setContractOpen(true)}
                  >
                    Прочитать договор
                  </Button>
                  <Button
                    onClick={() => {
                      setConsent(false);
                      setFundOpen(true);
                    }}
                  >
                    Подписать и получить деньги
                  </Button>
                </div>
              )}
              {item.status === "funded" && (
                <Button
                  variant="secondary"
                  onClick={() => setContractOpen(true)}
                >
                  Открыть документы
                </Button>
              )}
              {bank && item.status !== "manual_review" && (
                <Muted>
                  Дальнейшие действия выполняет клиент в своём кабинете.
                </Muted>
              )}
              <ErrorMessage message={operation.error} />
            </Stack>
          </section>
          <section>
            <h2 style={{ fontSize: 23, marginBottom: 16 }}>
              Почему такое решение
            </h2>
            <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
              {item.rules.map((rule, i) => (
                <li key={`${i}:${rule}`}>{rule}</li>
              ))}
            </ul>
            {item.decisionComment && (
              <Note>Комментарий сотрудника: {item.decisionComment}</Note>
            )}
          </section>
          {item.pdChargeoff != null && (
            <Panel>
              <Stack gap={12}>
                <h3>Оценка риска</h3>
                <div style={{ fontSize: 34, fontWeight: 700 }}>
                  {pct(item.pdChargeoff)}
                </div>
                <Muted>
                  Вероятность списания. Балл {item.riskScore} из 1000; выше —
                  меньше риск. Оценка модели и кредитное решение — разные вещи.
                </Muted>
              </Stack>
            </Panel>
          )}
          {item.mocks && (
            <section>
              <h3 style={{ marginBottom: 16 }}>Проверки</h3>
              <Stack gap={12}>
                <Muted>
                  ЕГРЮЛ:{" "}
                  {item.mocks.registry.status === "liquidated"
                    ? "компания ликвидирована"
                    : "компания действует"}{" "}
                  · {item.mocks.registry.registeredAt}
                </Muted>
                <Muted>
                  БКИ: {item.mocks.bureau.openLoans} кредитов, просрочка{" "}
                  {item.mocks.bureau.hasDelinquency ? "есть" : "отсутствует"},
                  платёж {rub(item.mocks.bureau.monthlyPaymentRub)}
                </Muted>
                <Muted>
                  Прозрачный бизнес: {item.mocks.transparent.director},{" "}
                  {item.mocks.transparent.okved}
                </Muted>
                <Muted>Интеграции смоделированы на сервере.</Muted>
              </Stack>
            </section>
          )}
        </Stack>
        <Stack>
          <Panel>
            <Stack>
              <h3>Условия заявки</h3>
              <Facts
                items={[
                  ["Компания", item.companyName],
                  ["ИНН", item.inn],
                  ["Сумма", rub(item.amountRub)],
                  ["Срок", `${item.termMonths ?? "—"} месяцев`],
                  ["Продукт", item.productLabel ?? "—"],
                  ["Возраст бизнеса", item.ageLabel ?? "Не указан"],
                  ["Сотрудники", item.jobsSupported ?? "Не указано"],
                  ["Отрасль", item.industryLabel ?? "—"],
                  ["Залог", item.collateral ? "Есть" : "Нет"],
                ]}
              />
            </Stack>
          </Panel>
          <Button
            variant="secondary"
            disabled={cabinet.loading}
            onClick={() => void cabinet.reload()}
          >
            Обновить статус
          </Button>
          {bank && item.status === "manual_review" && (
            <UnderwriterForm key={item.id} item={item} />
          )}
        </Stack>
      </Columns>
      {contractOpen && (
        <ContractModal
          title="Договор финансирования"
          text={applicationContract(item)}
          filename={`alfa-buziness-dogovor-${item.id}.pdf`}
          onClose={() => setContractOpen(false)}
        />
      )}
      {fundOpen && (
        <Modal
          title="Подписать и смоделировать выдачу"
          onClose={() => setFundOpen(false)}
        >
          <Stack>
            <Facts
              items={[
                ["Сумма финансирования", rub(item.amountRub)],
                ["Срок", `${item.termMonths} месяцев`],
              ]}
            />
            <Note>
              Это учебная операция. Реальной электронной подписи и перевода
              средств не будет.
            </Note>
            <Check
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            >
              Я ознакомился с учебными условиями договора
            </Check>
            <Button variant="text" onClick={() => setContractOpen(true)}>
              Открыть договор
            </Button>
            <ErrorMessage message={operation.error} />
            <Button
              disabled={!consent || operation.busy}
              onClick={() => act("fund")}
            >
              Подтвердить
            </Button>
          </Stack>
        </Modal>
      )}
    </>
  );
}
