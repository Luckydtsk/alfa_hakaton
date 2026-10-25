import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Shell } from "./components/Shell";
import { Muted } from "./components/ui";
import { CabinetProvider, useCabinet } from "./state/CabinetContext";
import { LoginPage, RegistrationPage } from "./pages/AuthPages";
import { ApplicationsPage, HomePage } from "./pages/HomePage";
import { NewApplicationPage } from "./pages/NewApplicationPage";
import { ApplicationPage } from "./pages/ApplicationPage";
import { BankPage } from "./pages/BankPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { ReservePage } from "./pages/ReservePage";

function RequireSession({ role }: { role: "client" | "bank" }) {
  const { user, initializing } = useCabinet();
  if (initializing)
    return (
      <div style={{ padding: 40 }}>
        <Muted>Проверяем сессию…</Muted>
      </div>
    );
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role)
    return <Navigate to={user.role === "bank" ? "/bank" : "/app"} replace />;
  return <Outlet />;
}
function PageEffects() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Альфа - Бузинесс · Кабинет финансирования";
  }, [location.pathname]);
  return null;
}

export function App() {
  return (
    <CabinetProvider>
      <PageEffects />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route element={<RequireSession role="client" />}>
          <Route element={<Shell />}>
            <Route path="/app" element={<HomePage />} />
            <Route path="/app/applications" element={<ApplicationsPage />} />
            <Route path="/app/new" element={<NewApplicationPage />} />
            <Route path="/app/reserve" element={<ReservePage />} />
            <Route path="/app/documents" element={<DocumentsPage />} />
            <Route path="/app/:id" element={<ApplicationPage />} />
          </Route>
        </Route>
        <Route element={<RequireSession role="bank" />}>
          <Route element={<Shell />}>
            <Route path="/bank" element={<BankPage />} />
            <Route path="/bank/documents" element={<DocumentsPage />} />
            <Route path="/bank/:id" element={<ApplicationPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CabinetProvider>
  );
}
