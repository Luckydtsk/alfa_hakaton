import { Link } from "react-router-dom";
import { OfferCarousel } from "../components/OfferCarousel";
import { ApplicationList } from "../components/ApplicationList";
import {
  ActionLink,
  Muted,
  PageHeading,
  SectionHeading,
} from "../components/ui";
import { useCabinet } from "../state/CabinetContext";
import { useCompact } from "../hooks/useCompact";

export function HomePage() {
  const { applications, loading } = useCabinet(),
    compact = useCompact();
  return (
    <>
      <PageHeading
        title="Финансирование"
        description="Для текущих задач и новых возможностей вашего бизнеса."
      />
      <OfferCarousel />
      <SectionHeading>Какая задача у бизнеса?</SectionHeading>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "repeat(3,minmax(0,1fr))",
          gap: 16,
        }}
      >
        {[
          {
            number: "01 / ТЕКУЩИЕ РАСХОДЫ",
            title: "Оплатить срочную закупку",
            text: "Когда нужно рассчитаться с поставщиком или пополнить запасы.",
            link: "Подобрать решение",
            to: "/app/new?product=working_capital",
          },
          {
            number: "02 / РАЗВИТИЕ",
            title: "Вложиться в развитие",
            text: "Оборудование, ремонт или расширение — без изъятия денег из оборота.",
            link: "Посмотреть условия",
            to: "/app/new?product=equipment",
          },
          {
            number: "03 / КАССОВЫЙ РАЗРЫВ",
            title: "Подключить резерв",
            text: "Автоматически покрывать нехватку денег на текущие платежи.",
            link: "Подробнее",
            to: "/app/reserve",
          },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              minHeight: compact ? 0 : 220,
              padding: 24,
              border: "1px solid var(--line)",
              borderRadius: 16,
              textDecoration: "none",
            }}
          >
            <span
              style={{ fontSize: 11, color: "var(--muted)", marginBottom: 28 }}
            >
              {item.number}
            </span>
            <h3 style={{ fontSize: 17, marginBottom: 10 }}>{item.title}</h3>
            <Muted>{item.text}</Muted>
            <span
              style={{
                marginTop: "auto",
                paddingTop: 22,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {item.link} →
            </span>
          </Link>
        ))}
      </div>
      <section style={{ marginTop: 36 }}>
        <SectionHeading
          action={
            <Link
              to="/app/applications"
              style={{ fontSize: 13, textDecoration: "none", fontWeight: 600 }}
            >
              Все заявки →
            </Link>
          }
        >
          Ваши заявки
        </SectionHeading>
        {loading ? (
          <Muted>Загружаем заявки…</Muted>
        ) : (
          <ApplicationList items={applications.slice(0, 2)} />
        )}
      </section>
    </>
  );
}

export function ApplicationsPage() {
  const { applications, loading } = useCabinet();
  return (
    <>
      <PageHeading
        title="Мои заявки"
        description="Все решения и следующие действия — здесь."
        action={<ActionLink to="/app/new">Новая заявка</ActionLink>}
      />
      {loading ? (
        <Muted>Загружаем заявки…</Muted>
      ) : (
        <ApplicationList items={applications} />
      )}
    </>
  );
}
