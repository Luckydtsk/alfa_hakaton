import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useCabinet } from "../state/CabinetContext";
import { useCompact } from "../hooks/useCompact";
import { useOperation } from "../hooks/useOperation";
import { CompanyProfileForm } from "./CompanyProfileForm";
import { Button, ErrorMessage, Modal, Muted, Note } from "./ui";

export function Brand() {
  return (
    <span
      style={{
        fontWeight: 800,
        fontSize: 23,
        letterSpacing: -1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--red)" }}>Альфа</span> - Бузинесс
    </span>
  );
}

export function Shell() {
  const { user, demo, logout, loading, error, reload, applications } =
    useCabinet();
  const compact = useCompact(),
    navigate = useNavigate(),
    operation = useOperation();
  const [profileOpen, setProfileOpen] = useState(false);
  const bank = user?.role === "bank";
  const navigation = bank
    ? [
        ["/bank", "Очередь сотрудника"],
        ["/bank/documents", "Документы"],
      ]
    : [
        ["/app", "Финансирование"],
        ["/app/applications", "Мои заявки"],
        ["/app/reserve", "Резерв на платежи"],
        ["/app/documents", "Документы"],
      ];
  return (
    <>
      <header
        style={{
          minHeight: compact ? 72 : 84,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          borderBottom: "1px solid var(--line)",
          padding: compact ? "16px 20px" : "20px 40px",
          flexWrap: "wrap",
        }}
      >
        <NavLink
          to={bank ? "/bank" : "/app"}
          aria-label="Альфа - Бузинесс, главная"
          style={{ textDecoration: "none" }}
        >
          <Brand />
        </NavLink>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: compact ? 12 : 24,
          }}
        >
          {demo && (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Деморежим
            </span>
          )}
          <Button
            variant="text"
            onClick={() => setProfileOpen(true)}
            aria-label="Профиль компании"
          >
            <span
              style={{ display: compact ? "none" : "inline", fontWeight: 400 }}
            >
              {user?.company?.name ?? user?.fullName}
            </span>
            <span
              style={{
                width: 38,
                height: 38,
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                background: "var(--soft)",
                fontSize: 12,
              }}
            >
              {user?.fullName
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
          </Button>
          <Button
            variant="text"
            disabled={operation.busy}
            onClick={() =>
              void operation.run(async () => {
                await logout();
                navigate("/", { replace: true });
              })
            }
          >
            Выйти
          </Button>
        </div>
      </header>
      <div
        style={{
          display: compact ? "block" : "grid",
          gridTemplateColumns: "236px minmax(0,1fr)",
          minHeight: "calc(100vh - 84px)",
        }}
      >
        <aside
          aria-label="Основная навигация"
          style={{
            display: "flex",
            flexDirection: compact ? "row" : "column",
            gap: 5,
            padding: compact ? "12px 16px" : "36px 20px",
            borderRight: compact ? 0 : "1px solid var(--line)",
            borderBottom: compact ? "1px solid var(--line)" : 0,
            overflowX: compact ? "auto" : "visible",
            position: compact ? "sticky" : "static",
            top: 0,
            background: "white",
            zIndex: 5,
          }}
        >
          {navigation.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/app" || to === "/bank"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: compact ? "12px" : "14px 16px",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: compact ? 12 : 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                background: isActive ? "#fef0ee" : "transparent",
                color: isActive ? "#bf2419" : "var(--ink)",
              })}
            >
              {label}
              {label === "Мои заявки" && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {applications.length}
                </span>
              )}
            </NavLink>
          ))}
          {!compact && (
            <p
              style={{
                marginTop: "auto",
                padding: "60px 16px 0",
                fontSize: 12,
                lineHeight: 1.7,
                color: "var(--muted)",
              }}
            >
              Всё о финансировании
              <br />в одном кабинете.
            </p>
          )}
        </aside>
        <main
          id="main-content"
          style={{
            width: "100%",
            maxWidth: 1300,
            padding: compact ? "30px 20px" : "44px 52px 32px",
            margin: "0 auto",
            minWidth: 0,
          }}
        >
          {demo && (
            <div style={{ marginBottom: 24 }}>
              <Note>
                Демонстрационный кабинет. Заявки, решения и операции сохраняются
                только в браузере. Реальные банковские операции не выполняются.
              </Note>
            </div>
          )}
          <ErrorMessage message={operation.error} />
          {error && (
            <div style={{ marginBottom: 24 }}>
              <ErrorMessage message={error} />
              <Button
                variant="secondary"
                disabled={loading}
                onClick={() => void reload()}
              >
                Повторить загрузку
              </Button>
            </div>
          )}
          <Outlet />
          <footer
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              borderTop: "1px solid var(--line)",
              paddingTop: 22,
              marginTop: 48,
            }}
          >
            <Muted>Учебный проект · Подписание и выдача смоделированы</Muted>
            {demo && (
              <NavLink to="/" style={{ fontSize: 12, color: "var(--muted)" }}>
                Сменить демонстрационный аккаунт
              </NavLink>
            )}
          </footer>
        </main>
      </div>
      {profileOpen && (
        <Modal
          title={bank ? "Профиль сотрудника" : "Профиль компании"}
          onClose={() => setProfileOpen(false)}
        >
          {bank ? (
            <Muted>{user?.fullName}</Muted>
          ) : (
            <CompanyProfileForm onSaved={() => setProfileOpen(false)} />
          )}
        </Modal>
      )}
    </>
  );
}
