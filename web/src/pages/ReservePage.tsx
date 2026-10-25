import { useState, type FormEvent } from "react";
import { rub } from "../api";
import { ContractModal } from "../components/ContractModal";
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
} from "../components/ui";
import { useReserve } from "../hooks/useReserve";
import { useOperation } from "../hooks/useOperation";
import { useCompact } from "../hooks/useCompact";
import { reserveContract } from "../services/pdf";

export function ReservePage() {
  const { reserve, activate, pay, receive } = useReserve(),
    compact = useCompact(),
    operation = useOperation();
  const [modal, setModal] = useState<"connect" | "payment" | null>(null),
    [contractOpen, setContractOpen] = useState(false),
    [consent, setConsent] = useState(false);
  const [amount, setAmount] = useState("120000"),
    [recipient, setRecipient] = useState("ООО «Материалы и комплектующие»"),
    [income, setIncome] = useState("100000");
  const payment = Number(amount),
    borrow = Math.max(0, payment - reserve.ownFunds);
  function checkPayment(event: FormEvent) {
    event.preventDefault();
    operation.setError("");
    if (
      !Number.isSafeInteger(payment) ||
      payment <= 0 ||
      payment > reserve.ownFunds + reserve.limit - reserve.debt
    ) {
      operation.setError(
        "Своих средств и доступного резерва недостаточно либо сумма некорректна.",
      );
      return;
    }
    setModal("payment");
  }
  function confirmPayment() {
    void operation.run(async () => {
      pay(payment, recipient.trim());
      setModal(null);
    });
  }
  function addIncome(event: FormEvent) {
    event.preventDefault();
    void operation.run(async () => {
      receive(Number(income));
    });
  }
  return (
    <>
      <PageHeading
        title="Резерв на платежи"
        description={
          reserve.active
            ? "Резерв подключён в локальной симуляции."
            : "Подстраховка, когда расходы уже есть, а поступления ещё в пути."
        }
      />
      <div style={{ marginBottom: 28 }}>
        <Note tone="warning">
          Демонстрация продукта. Операции по резерву пока не поддерживаются API
          проекта; баланс, договор и история ниже сохраняются только в этом
          браузере. Данные реального счёта не используются.
        </Note>
      </div>
      {!reserve.active ? (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "1.2fr 1fr",
              gap: 28,
              padding: compact ? 28 : 36,
              background: "var(--surface)",
              borderRadius: 20,
              marginBottom: 36,
            }}
          >
            <Stack>
              <Muted>ОВЕРДРАФТ ПО СЧЁТУ</Muted>
              <h2
                style={{
                  fontSize: compact ? 28 : 32,
                  lineHeight: 1.15,
                  letterSpacing: -1,
                }}
              >
                Платежи идут по плану.
                <br />
                Даже при кассовом разрыве.
              </h2>
              <Muted>
                Заранее оформите резерв. Если своих денег не хватит на платёж,
                недостающая сумма будет использована из доступного лимита.
              </Muted>
              <Button
                onClick={() => {
                  setConsent(false);
                  setModal("connect");
                }}
                style={{ justifySelf: "start" }}
              >
                Подключить резерв
              </Button>
            </Stack>
            <div
              style={{
                padding: compact ? "24px 0 0" : "10px 0 10px 28px",
                borderLeft: compact ? 0 : "1px solid #dcdce0",
                borderTop: compact ? "1px solid #dcdce0" : 0,
              }}
            >
              <Stack>
                <Muted>Пример лимита в прототипе</Muted>
                <LargeAmount>500 000 ₽</LargeAmount>
                <Muted>
                  Не предодобренное предложение. Подключение моделирует решение
                  и принятие учебных условий.
                </Muted>
              </Stack>
            </div>
          </section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "repeat(3,1fr)",
              gap: 24,
            }}
          >
            {[
              [
                "01",
                "Оформляете заранее",
                "Один договор определяет лимит, стоимость и правила возврата.",
              ],
              [
                "02",
                "Используете при нехватке",
                "Перед подтверждением видно, сколько денег будет использовано из резерва.",
              ],
              [
                "03",
                "Погашаете поступлениями",
                "Поступления погашают задолженность, доступный лимит восстанавливается.",
              ],
            ].map(([n, title, text]) => (
              <section
                key={n}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <Stack>
                  <Muted>{n}</Muted>
                  <h3>{title}</h3>
                  <Muted>{text}</Muted>
                </Stack>
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "1.25fr 1fr 1fr",
              gap: 24,
              padding: "28px 0",
              borderBottom: "1px solid var(--line)",
              marginBottom: 28,
            }}
          >
            {[
              ["Доступно из резерва", reserve.limit - reserve.debt],
              ["Использовано", reserve.debt],
              ["Собственные средства", reserve.ownFunds],
            ].map(([label, value]) => (
              <div key={label}>
                <Muted>{label}</Muted>
                <div style={{ marginTop: 9 }}>
                  <LargeAmount>{rub(Number(value))}</LargeAmount>
                </div>
              </div>
            ))}
          </div>
          <Columns>
            <section>
              <h2 style={{ fontSize: 23, marginBottom: 12 }}>
                Оплатить из кабинета
              </h2>
              <Muted>
                Сначала используются ваши деньги. Резерв покрывает только
                недостающую сумму.
              </Muted>
              <form onSubmit={checkPayment} style={{ marginTop: 24 }}>
                <Stack>
                  <Field label="Получатель">
                    <Input
                      required
                      maxLength={120}
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                  </Field>
                  <Field label="Сумма платежа, ₽">
                    <Input
                      required
                      type="number"
                      min={1}
                      step={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Field>
                  <Button type="submit" style={{ justifySelf: "start" }}>
                    Проверить платёж →
                  </Button>
                </Stack>
              </form>
            </section>
            <Panel>
              <Stack>
                <h3>Условия резерва</h3>
                <Facts
                  items={[
                    ["Общий лимит", rub(reserve.limit)],
                    ["Ставка в примере", "18% годовых"],
                    ["Комиссии в примере", "0 ₽"],
                    ["Возврат", "Автоматически из поступлений"],
                  ]}
                />
                <Button variant="text" onClick={() => setContractOpen(true)}>
                  Прочитать договор
                </Button>
                <div style={{ borderTop: "1px solid #dcdce0", paddingTop: 20 }}>
                  <h3 style={{ marginBottom: 12 }}>Поступление на счёт</h3>
                  <Muted>
                    Смоделируйте поступление и проверьте восстановление лимита.
                  </Muted>
                  <form onSubmit={addIncome} style={{ marginTop: 16 }}>
                    <Stack>
                      <Field label="Сумма поступления, ₽">
                        <Input
                          type="number"
                          required
                          min={1}
                          max={100000000}
                          step={1}
                          value={income}
                          onChange={(e) => setIncome(e.target.value)}
                        />
                      </Field>
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={operation.busy}
                      >
                        Смоделировать поступление
                      </Button>
                    </Stack>
                  </form>
                </div>
              </Stack>
            </Panel>
          </Columns>
          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 23, marginBottom: 20 }}>
              Операции по резерву
            </h2>
            {reserve.events.length ? (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                  }}
                >
                  <thead>
                    <tr>
                      {["Операция", "Из резерва / погашено", "Сумма"].map(
                        (title) => (
                          <th
                            key={title}
                            style={{
                              textAlign: "left",
                              fontSize: 12,
                              color: "var(--muted)",
                              padding: "16px 12px 16px 0",
                              borderBottom: "1px solid var(--line)",
                            }}
                          >
                            {title}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {reserve.events.map((event) => (
                      <tr key={event.id}>
                        <td
                          style={{
                            padding: "20px 12px 20px 0",
                            borderBottom: "1px solid var(--line)",
                          }}
                        >
                          {event.description}
                          <Muted>
                            {new Date(event.createdAt).toLocaleString("ru-RU")}
                          </Muted>
                        </td>
                        <td
                          style={{
                            padding: "20px 12px 20px 0",
                            borderBottom: "1px solid var(--line)",
                          }}
                        >
                          {rub(event.principal)}
                        </td>
                        <td
                          style={{
                            padding: "20px 0",
                            borderBottom: "1px solid var(--line)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {event.kind === "income" ? "+" : "−"}
                          {rub(event.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Muted>
                После первого платежа здесь появится история использования и
                погашения.
              </Muted>
            )}
          </section>
        </>
      )}
      <div style={{ marginTop: 20 }}>
        <ErrorMessage message={operation.error} />
      </div>
      {modal === "connect" && (
        <Modal
          title="Подключить резерв на платежи"
          onClose={() => setModal(null)}
        >
          <Stack>
            <Note>
              Учебные условия для демонстрации механики. Реального кредитного
              договора не возникает.
            </Note>
            <Facts
              items={[
                ["Лимит в примере", "500 000 ₽"],
                ["Ставка в примере", "18% годовых"],
                ["Максимальный срок долга", "30 дней"],
                ["Комиссии", "0 ₽"],
              ]}
            />
            <details>
              <summary style={{ cursor: "pointer", fontSize: 14 }}>
                Прочитать учебный договор
              </summary>
              <p
                style={{
                  whiteSpace: "pre-line",
                  lineHeight: 1.7,
                  fontSize: 13,
                  marginTop: 16,
                }}
              >
                {reserveContract}
              </p>
            </details>
            <Check
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            >
              Принимаю учебные условия и подключаю автоматическое использование
              резерва при нехватке своих средств
            </Check>
            <ErrorMessage message={operation.error} />
            <Button
              disabled={!consent || operation.busy}
              onClick={() =>
                void operation.run(async () => {
                  activate();
                  setModal(null);
                })
              }
            >
              Подписать и подключить
            </Button>
          </Stack>
        </Modal>
      )}
      {modal === "payment" && (
        <Modal title="Проверьте платёж" onClose={() => setModal(null)}>
          <Stack>
            <Muted>{recipient}</Muted>
            <LargeAmount>{rub(payment)}</LargeAmount>
            <Facts
              items={[
                ["Ваши средства", rub(Math.min(payment, reserve.ownFunds))],
                ["Из резерва", rub(borrow)],
                [
                  "Доступный резерв после",
                  rub(reserve.limit - reserve.debt - borrow),
                ],
                ["Комиссия за платёж", "0 ₽ в примере"],
              ]}
            />
            <Note tone={borrow ? "warning" : "success"}>
              {borrow
                ? "На заёмную часть действует 18% годовых в примере. Вернуть нужно в течение 30 дней. При возврате в тот же день проценты в демо равны 0 ₽."
                : "Собственных средств достаточно. Резерв не используется."}
            </Note>
            <ErrorMessage message={operation.error} />
            <Button disabled={operation.busy} onClick={confirmPayment}>
              Подтвердить платёж
            </Button>
            <Muted>Реального списания не будет.</Muted>
          </Stack>
        </Modal>
      )}
      {contractOpen && (
        <ContractModal
          title="Договор резерва на платежи"
          text={reserveContract}
          filename="alfa-buziness-reserve.pdf"
          onClose={() => setContractOpen(false)}
        />
      )}
    </>
  );
}
