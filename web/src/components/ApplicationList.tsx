import { Link } from "react-router-dom";
import type { Application } from "../api";
import { rub } from "../api";
import { titleOf } from "../domain/models";
import { useCompact } from "../hooks/useCompact";
import { Muted, StatusBadge } from "./ui";

export function ApplicationList({
  items,
  bank = false,
}: {
  items: Application[];
  bank?: boolean;
}) {
  const compact = useCompact();
  return (
    <div style={{ borderTop: "1px solid var(--line)" }}>
      {items.length === 0 ? (
        <div style={{ padding: "30px 0" }}>
          <Muted>Заявок пока нет.</Muted>
        </div>
      ) : (
        items.map((item) => (
          <Link
            key={item.id}
            to={`${bank ? "/bank" : "/app"}/${item.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: compact
                ? "minmax(0,1fr) auto"
                : "minmax(0,1fr) 150px 170px 16px",
              alignItems: "center",
              gap: compact ? 12 : 20,
              borderBottom: "1px solid var(--line)",
              padding: "22px 0",
              textDecoration: "none",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  fontSize: 15,
                  marginBottom: 6,
                  overflowWrap: "anywhere",
                }}
              >
                {bank ? item.companyName : titleOf(item)}
              </h3>
              <Muted>
                Заявка № {item.id} ·{" "}
                {new Date(item.createdAt).toLocaleDateString("ru-RU")}
              </Muted>
            </div>
            {!compact && (
              <div>
                <strong style={{ fontSize: 14 }}>{rub(item.amountRub)}</strong>
                <Muted>{item.termMonths ?? "—"} месяцев</Muted>
              </div>
            )}
            <StatusBadge status={item.status} />
            {!compact && (
              <span aria-hidden="true" style={{ fontSize: 22 }}>
                ›
              </span>
            )}
          </Link>
        ))
      )}
    </div>
  );
}
