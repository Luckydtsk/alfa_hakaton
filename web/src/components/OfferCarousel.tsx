import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCabinet } from "../state/CabinetContext";
import { useCompact } from "../hooks/useCompact";
import { Button, Muted } from "./ui";

export function OfferCarousel() {
  const { profile, meta } = useCabinet(),
    compact = useCompact();
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [revision, setRevision] = useState(0);
  const region = useRef<HTMLElement>(null);
  const slides = useMemo(() => {
    const equipment = meta?.products.find((p) => p.code === "equipment"),
      working = meta?.products.find((p) => p.code === "working_capital");
    const manufacturing = profile.industryCode === "manufacturing";
    const a = {
      key: "equipment",
      label: "Кредит на оборудование",
      title: manufacturing
        ? "Новое оборудование — новые возможности"
        : "Инвестируйте в следующий шаг бизнеса",
      text: "Станки, техника и оснащение. Рассмотрите финансирование покупки, сохранив деньги на текущие расходы.",
      amount: equipment
        ? `До ${equipment.maxAmountRub / 1000000} млн ₽`
        : "Кредит на оборудование",
      detail: equipment
        ? `До ${equipment.maxTermMonths} месяцев · с залогом`
        : "На приобретение оборудования",
      reason: manufacturing
        ? "Показываем для производственной компании из вашего профиля."
        : "Может подойти для оснащения и расширения бизнеса.",
      to: "/app/new?product=equipment",
      cta: "Рассмотреть кредит",
    };
    const b = {
      key: "working",
      label: "Оборотный кредит",
      title:
        profile.industryCode === "retail"
          ? "Пополните запасы к новому сезону"
          : "Закупки сегодня. Возможности завтра.",
      text: "На товар, материалы и текущие расходы. Выберите сумму и срок под ближайшие задачи компании.",
      amount: working
        ? `До ${working.maxAmountRub / 1000000} млн ₽`
        : "Оборотный кредит",
      detail: working
        ? `До ${working.maxTermMonths} месяцев · без обязательного залога`
        : "На текущие расходы",
      reason:
        profile.industryCode === "retail"
          ? "Показываем для розничной компании из вашего профиля."
          : "Для финансирования текущих расходов компании.",
      to: "/app/new?product=working_capital",
      cta: "Посмотреть условия",
    };
    const c = {
      key: "reserve",
      label: "Резерв на платежи",
      title: "Поступления задержались. Платежи — нет.",
      text: "Подключите резерв заранее. Он покроет недостающую часть платежа в пределах доступного лимита.",
      amount: "Оформите заранее",
      detail: "Один договор · повторное использование",
      reason: "Подстраховка текущих платежей при кассовом разрыве.",
      to: "/app/reserve",
      cta: "Как работает резерв",
    };
    return manufacturing ? [a, b, c] : [b, a, c];
  }, [meta, profile.industryCode]);
  useEffect(() => {
    setIndex(0);
  }, [profile.industryCode]);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !region.current?.contains(document.activeElement))
        setIndex((i) => (i + 1) % slides.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length, revision]);
  const slide = slides[index];
  function move(next: number) {
    setIndex((next + slides.length) % slides.length);
    setRevision((r) => r + 1);
  }
  return (
    <section
      ref={region}
      aria-label="Предложения для вашей компании"
      aria-roledescription="карусель"
      style={{
        position: "relative",
        width: "100%",
        background: "var(--surface)",
        borderRadius: 20,
        marginBottom: 36,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: compact ? "24px 22px 0" : "24px 36px 0",
          fontSize: compact ? 10 : 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1.4,
        }}
      >
        Для вашего бизнеса
      </div>
      <div
        role="group"
        aria-label={`Предложение ${index + 1} из ${slides.length}`}
        aria-roledescription="слайд"
        style={{
          display: "grid",
          gridTemplateColumns: compact
            ? "minmax(0,1fr)"
            : "minmax(0,1.35fr) minmax(220px,.65fr)",
          gap: compact ? 22 : 48,
          padding: compact ? "24px 48px" : "28px 80px 32px",
          minHeight: compact ? 450 : 300,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            {slide.label}
          </div>
          <h2
            style={{
              fontSize: compact ? 27 : 34,
              letterSpacing: -1,
              lineHeight: 1.15,
              maxWidth: 560,
              margin: "14px 0",
            }}
          >
            {slide.title}
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "var(--muted)",
              lineHeight: 1.6,
              maxWidth: 540,
            }}
          >
            {slide.text}
          </p>
          <Link
            to={slide.to}
            style={{
              display: "inline-flex",
              marginTop: 24,
              padding: "15px 22px",
              borderRadius: 10,
              background: "var(--red)",
              color: "white",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {slide.cta} →
          </Link>
          <Muted style={{ marginTop: 20, fontSize: 12 }}>{slide.reason}</Muted>
        </div>
        <div
          style={{
            paddingLeft: compact ? 0 : 28,
            paddingTop: compact ? 18 : 0,
            borderLeft: compact ? 0 : "1px solid #dcdce0",
            borderTop: compact ? "1px solid #dcdce0" : 0,
          }}
        >
          <Muted>Пример продукта</Muted>
          <div
            style={{
              fontSize: compact ? 25 : 32,
              fontWeight: 700,
              letterSpacing: -1,
              margin: "12px 0",
            }}
          >
            {slide.amount}
          </div>
          <Muted>{slide.detail}</Muted>
          <Muted style={{ marginTop: 18 }}>
            Не является одобрением. Доступность и окончательные условия
            определяются после рассмотрения заявки.
          </Muted>
        </div>
      </div>
      {[-1, 1].map((direction) => (
        <Button
          key={direction}
          variant="secondary"
          aria-label={
            direction === -1
              ? "Предыдущее предложение"
              : "Следующее предложение"
          }
          onClick={() => move(index + direction)}
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            left: direction === -1 ? (compact ? 8 : 20) : undefined,
            right: direction === 1 ? (compact ? 8 : 20) : undefined,
            width: compact ? 30 : 40,
            minHeight: 48,
            padding: 0,
            background: "white",
            border: "1px solid #dedee2",
            fontSize: 25,
          }}
        >
          {direction === -1 ? "‹" : "›"}
        </Button>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: compact ? "0 20px 20px" : "0 36px 22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {slides.map((item, i) => (
            <button
              key={item.key}
              aria-label={`Предложение ${i + 1}: ${item.label}`}
              aria-current={index === i ? "true" : undefined}
              onClick={() => move(i)}
              style={{
                width: 24,
                height: 24,
                padding: 8,
                border: 0,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: index === i ? "var(--red)" : "#c8c8cd",
                }}
              />
            </button>
          ))}
          <Muted>
            {index + 1} / {slides.length}
          </Muted>
        </div>
        <Button
          variant="text"
          aria-label={
            paused
              ? "Продолжить автоматическую смену предложений"
              : "Приостановить автоматическую смену предложений"
          }
          onClick={() => setPaused((p) => !p)}
          style={{ fontSize: 12 }}
        >
          {paused ? "Продолжить смену" : "Пауза"}
        </Button>
      </div>
    </section>
  );
}
