import { useState } from "react";
import type { Application } from "../api";
import { rub } from "../api";
import { ContractModal } from "../components/ContractModal";
import { Button, Muted, PageHeading } from "../components/ui";
import { useCabinet } from "../state/CabinetContext";
import { useReserve } from "../hooks/useReserve";
import { applicationContract, reserveContract } from "../services/pdf";
import { titleOf } from "../domain/models";

export function DocumentsPage() {
  const { applications, user } = useCabinet(),
    { reserve } = useReserve();
  const [selected, setSelected] = useState<Application | "reserve" | null>(
    null,
  );
  const items = applications.filter((a) =>
    ["documents_ready", "funded"].includes(a.status),
  );
  return (
    <>
      <PageHeading
        title="Документы"
        description="Договоры и условия вашего финансирования."
      />
      <div style={{ borderTop: "1px solid var(--line)" }}>
        {reserve.active && user?.role === "client" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              padding: "22px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div>
              <h3 style={{ fontSize: 16 }}>Договор резерва на платежи</h3>
              <Muted>Учебный образец · локальная симуляция</Muted>
            </div>
            <Button variant="secondary" onClick={() => setSelected("reserve")}>
              Открыть
            </Button>
          </div>
        )}
        {items.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: "22px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div>
              <h3 style={{ fontSize: 16 }}>Договор финансирования № {a.id}</h3>
              <Muted>
                {titleOf(a)} · {rub(a.amountRub)}
              </Muted>
            </div>
            <Button variant="secondary" onClick={() => setSelected(a)}>
              Открыть
            </Button>
          </div>
        ))}
        {!items.length && !reserve.active && (
          <div style={{ padding: "30px 0" }}>
            <Muted>
              Документы появятся после подготовки пакета по одобренной заявке.
            </Muted>
          </div>
        )}
      </div>
      {selected && (
        <ContractModal
          title={
            selected === "reserve"
              ? "Договор резерва на платежи"
              : "Договор финансирования"
          }
          text={
            selected === "reserve"
              ? reserveContract
              : applicationContract(selected)
          }
          filename={`alfa-buziness-${selected === "reserve" ? "reserve" : selected.id}.pdf`}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
