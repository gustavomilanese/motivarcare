import { subscribeDocumentVisibleInterval } from "@therapy/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import { FinancesPage } from "../../finance";
import { links } from "../constants";
import { AdminNavIcon } from "../components/AdminNavIcon";
import { ModulePlaceholderPage } from "../components/ModulePlaceholderPage";
import { useInAppBack } from "../hooks/useInAppBack";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { InfoPage } from "./InfoPage";
import { PatientsOpsPage } from "./PatientsOpsPage";
import { ProfessionalsOpsPage } from "./ProfessionalsOpsPage";
import { SecurityAuditPage } from "./SecurityAuditPage";
import { SessionsOpsPage } from "./SessionsOpsPage";
import { SettingsPage } from "./SettingsPage";
import { SettingsOutletLayout } from "./SettingsOutletLayout";
import { apiRequest } from "../services/api";
import type { PortalPath, ProfessionalsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AdminPortal(props: {
  token: string;
  onLogout: () => void;
  language: AppLanguage;
  currency: SupportedCurrency;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
}) {
  const location = useLocation();
  const { canGoBack, goBack } = useInAppBack();
  const [railNavLocked, setRailNavLocked] = useState(false);
  const [pendingRiskTriageCount, setPendingRiskTriageCount] = useState(0);
  const [pendingProfRegistrationCount, setPendingProfRegistrationCount] = useState(0);
  const lastProfPendingRef = useRef<number | null>(null);

  const collapseRailAfterNav = () => {
    setRailNavLocked(true);
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  };

  const loadSidebarAlertCounts = useCallback(async () => {
    try {
      const [triageResponse, profResponse] = await Promise.all([
        apiRequest<{ pending: number }>("/api/admin/patients/risk-triage", {}, props.token),
        apiRequest<ProfessionalsResponse>("/api/admin/professionals?registrationApproval=PENDING", {}, props.token)
      ]);
      const triage = Number(triageResponse.pending) || 0;
      const profPending = (profResponse.professionals ?? []).filter((p) => p.registrationApproval === "PENDING").length;
      setPendingRiskTriageCount(triage);
      setPendingProfRegistrationCount(profPending);

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const prev = lastProfPendingRef.current;
        if (prev !== null && profPending > prev) {
          new Notification(
            textByLanguage(props.language, {
              es: "Nuevas altas de psicólogos pendientes",
              en: "New psychologist sign-ups pending review",
              pt: "Novos cadastros de psicologos pendentes"
            }),
            {
              body: textByLanguage(props.language, {
                es: `Hay ${profPending} alta(s) esperando aprobación.`,
                en: `${profPending} registration(s) await approval.`,
                pt: `${profPending} cadastro(s) aguardando aprovacao.`
              }),
              tag: "mc-prof-pending"
            }
          );
        }
      }
      lastProfPendingRef.current = profPending;
    } catch {
      setPendingRiskTriageCount(0);
      setPendingProfRegistrationCount(0);
    }
  }, [props.language, props.token]);

  useEffect(() => {
    void loadSidebarAlertCounts();
    const unsubscribePoll = subscribeDocumentVisibleInterval(() => {
      void loadSidebarAlertCounts();
    }, 30_000);

    const onProfRefresh = () => {
      void loadSidebarAlertCounts();
    };
    window.addEventListener("mc-admin-pending-prof-refresh", onProfRefresh);

    return () => {
      unsubscribePoll();
      window.removeEventListener("mc-admin-pending-prof-refresh", onProfRefresh);
    };
  }, [loadSidebarAlertCounts, location.pathname]);

  const handleNotificationCenterClick = useCallback(() => {
    const el = document.getElementById("admin-pending-prof-approvals");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  const labelForLink = (to: PortalPath): string => {
    if (to === "/") {
      return t(props.language, { es: "Dashboard", en: "Dashboard", pt: "Dashboard" });
    }
    if (to === "/patients") {
      return t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" });
    }
    if (to === "/professionals") {
      return t(props.language, { es: "Psicologos", en: "Psychologists", pt: "Psicologos" });
    }
    if (to === "/sessions") {
      return t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" });
    }
    if (to === "/finances") {
      return t(props.language, { es: "Finanzas", en: "Finance", pt: "Financas" });
    }
    if (to === "/security") {
      return t(props.language, { es: "Seguridad", en: "Security", pt: "Seguranca" });
    }
    if (to === "/calendar") {
      return t(props.language, { es: "Calendario", en: "Calendar", pt: "Calendario" });
    }
    if (to === "/library") {
      return t(props.language, { es: "Biblioteca", en: "Library", pt: "Biblioteca" });
    }
    if (to === "/imports") {
      return t(props.language, { es: "Importaciones", en: "Imports", pt: "Importacoes" });
    }
    if (to === "/settings") {
      return t(props.language, { es: "Configuracion", en: "Settings", pt: "Configuracoes" });
    }
    if (to === "/ai") {
      return t(props.language, { es: "Auditoría IA", en: "AI audit", pt: "Auditoria IA" });
    }
    return t(props.language, { es: "Auditoria IA", en: "AI audit", pt: "Auditoria IA" });
  };

  const railBadge = (count: number) => {
    if (count <= 0) {
      return null;
    }
    return <span className="admin-sidebar-rail-badge">{count > 99 ? "99+" : count}</span>;
  };

  return (
    <div className="admin-shell">
      <aside
        className={`admin-sidebar${railNavLocked ? " is-nav-locked" : ""}`}
        aria-label={t(props.language, {
          es: "Menú de la aplicación",
          en: "App menu",
          pt: "Menu do aplicativo"
        })}
        onMouseLeave={() => {
          setRailNavLocked(false);
          const active = document.activeElement;
          if (active instanceof HTMLElement && active.closest(".admin-sidebar")) {
            active.blur();
          }
        }}
      >
        <div className="admin-sidebar-edge" aria-hidden="true" />
        <div className="admin-sidebar-panel">
          <div className="admin-sidebar-brand">
            <span className="admin-sidebar-brand-mark-wrap">
              <img
                className="admin-brand-mark-img"
                src="/brand/motivarcare-mark.png"
                alt="MotivarCare"
                width={396}
                height={352}
              />
            </span>
            <span className="admin-sidebar-rail-label">
              {t(props.language, { es: "Portal Admin", en: "Admin portal", pt: "Portal admin" })}
            </span>
          </div>

          <nav className="admin-sidebar-nav">
            {links.map((link) => {
              const badgeCount =
                link.to === "/patients"
                  ? pendingRiskTriageCount
                  : link.to === "/" || link.to === "/professionals"
                    ? pendingProfRegistrationCount
                    : 0;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={collapseRailAfterNav}
                  className={({ isActive }) => `admin-sidebar-rail-link${isActive ? " is-active" : ""}`}
                  end={link.to === "/"}
                >
                  {badgeCount > 0 ? (
                    <span className="admin-sidebar-rail-icon-wrap">
                      <AdminNavIcon section={link.to} className="admin-sidebar-rail-icon" />
                      {railBadge(badgeCount)}
                    </span>
                  ) : (
                    <AdminNavIcon section={link.to} className="admin-sidebar-rail-icon" />
                  )}
                  <span className="admin-sidebar-rail-label">{labelForLink(link.to)}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="admin-sidebar-foot-stack">
            <button
              type="button"
              className="admin-sidebar-rail-foot"
              onClick={() => {
                collapseRailAfterNav();
                props.onLogout();
              }}
            >
              <span className="admin-sidebar-rail-foot-icon-wrap" aria-hidden="true">
                <AdminNavIcon section="logout" className="admin-sidebar-rail-icon" />
              </span>
              <span className="admin-sidebar-rail-foot-copy">
                <span className="admin-sidebar-rail-foot-name">
                  {t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
                </span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <nav
          className="admin-mobile-nav"
          aria-label={t(props.language, {
            es: "Navegacion mobile admin",
            en: "Admin mobile navigation",
            pt: "Navegacao mobile admin"
          })}
        >
          {links.map((link) => (
            <NavLink
              key={`mobile-${link.to}`}
              to={link.to}
              className={({ isActive }) => (isActive ? "admin-mobile-link active" : "admin-mobile-link")}
              end={link.to === "/"}
            >
              <span className="admin-link-content">
                <span>{labelForLink(link.to)}</span>
                {link.to === "/patients" && pendingRiskTriageCount > 0 ? (
                  <small className="admin-link-badge">{pendingRiskTriageCount}</small>
                ) : null}
                {link.to === "/" && pendingProfRegistrationCount > 0 ? (
                  <small className="admin-link-badge">{pendingProfRegistrationCount}</small>
                ) : null}
                {link.to === "/professionals" && pendingProfRegistrationCount > 0 ? (
                  <small className="admin-link-badge">{pendingProfRegistrationCount}</small>
                ) : null}
              </span>
            </NavLink>
          ))}
        </nav>

        <main>
          {canGoBack && location.pathname !== "/" ? (
            <button type="button" className="in-app-back" onClick={goBack}>
              ← {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
            </button>
          ) : null}
          <Routes>
            <Route
              path="/"
              element={
                <AdminDashboardPage
                  token={props.token}
                  language={props.language}
                  currency={props.currency}
                  pendingProfessionalRegistrationCount={pendingProfRegistrationCount}
                  onNotificationCenterClick={handleNotificationCenterClick}
                  canGoBack={canGoBack}
                  onBack={goBack}
                />
              }
            />
            <Route
              path="/patients"
              element={
                <PatientsOpsPage token={props.token} language={props.language} currency={props.currency} />
              }
            />
            <Route
              path="/professionals"
              element={
                <ProfessionalsOpsPage token={props.token} language={props.language} />
              }
            />
            <Route path="/plans-packages" element={<Navigate to={{ pathname: "/settings", hash: "cfg-plans-packages" }} replace />} />
            <Route
              path="/sessions"
              element={
                <SessionsOpsPage token={props.token} language={props.language} />
              }
            />
            <Route
              path="/finances"
              element={
                <FinancesPage token={props.token} language={props.language} currency={props.currency} />
              }
            />
            <Route path="/security" element={<SecurityAuditPage token={props.token} language={props.language} />} />
            <Route
              path="/calendar"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  variant="calendar"
                  title={{ es: "Calendario", en: "Calendar", pt: "Calendario" }}
                  description={{
                    es: "Vista de agenda operativa para sesiones, ocupación y disponibilidad.",
                    en: "Operational agenda view for sessions, occupancy, and availability.",
                    pt: "Visao de agenda operacional para sessoes, ocupacao e disponibilidade."
                  }}
                  relatedTo={{
                    path: "/sessions",
                    label: {
                      es: "Ir a Sesiones",
                      en: "Open Sessions",
                      pt: "Ir para Sessoes"
                    }
                  }}
                />
              }
            />
            <Route
              path="/library"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  variant="library"
                  title={{ es: "Biblioteca admin", en: "Admin library", pt: "Biblioteca admin" }}
                  description={{
                    es: "Recursos internos, guias y materiales de soporte para operacion clinica.",
                    en: "Internal resources, guides, and support materials for clinical operations.",
                    pt: "Recursos internos, guias e materiais de apoio para operacao clinica."
                  }}
                  relatedTo={{
                    path: "/settings",
                    label: {
                      es: "Abrir configuración",
                      en: "Open settings",
                      pt: "Abrir configuracoes"
                    }
                  }}
                />
              }
            />
            <Route
              path="/imports"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  variant="imports"
                  title={{ es: "Importaciones", en: "Imports", pt: "Importacoes" }}
                  description={{
                    es: "Carga masiva y procesos de importacion para datos operativos del portal.",
                    en: "Bulk upload and import workflows for portal operational data.",
                    pt: "Carga em massa e processos de importacao para dados operacionais do portal."
                  }}
                  relatedTo={{
                    path: "/patients",
                    label: {
                      es: "Gestionar pacientes",
                      en: "Manage patients",
                      pt: "Gerenciar pacientes"
                    }
                  }}
                />
              }
            />
            <Route path="/users" element={<Navigate to={{ pathname: "/settings", hash: "cfg-users-admin" }} replace />} />
            <Route path="/web-admin" element={<Navigate to={{ pathname: "/settings", hash: "cfg-landing" }} replace />} />
            <Route path="/settings" element={<SettingsOutletLayout />}>
              <Route
                index
                element={
                  <SettingsPage
                    token={props.token}
                    language={props.language}
                    currency={props.currency}
                    onLanguageChange={props.onLanguageChange}
                    onCurrencyChange={props.onCurrencyChange}
                  />
                }
              />
              <Route path="users" element={<Navigate to={{ pathname: "/settings", hash: "cfg-users-admin" }} replace />} />
              <Route
                path="plans-packages"
                element={<Navigate to={{ pathname: "/settings", hash: "cfg-plans-packages" }} replace />}
              />
              <Route path="web-admin" element={<Navigate to={{ pathname: "/settings", hash: "cfg-landing" }} replace />} />
            </Route>
            <Route
              path="/ai"
              element={
                <InfoPage
                  language={props.language}
                  title={t(props.language, { es: "Auditoria IA", en: "AI audit", pt: "Auditoria IA" })}
                  badge={{ es: "Próximamente", en: "Coming soon", pt: "Em breve" }}
                  description={t(props.language, {
                    es: "Estamos preparando la cola de auditoría con consentimiento explícito y revisión humana.",
                    en: "We’re building the audit queue with explicit consent and human review.",
                    pt: "Estamos preparando a fila de auditoria com consentimento explicito e revisao humana."
                  })}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
