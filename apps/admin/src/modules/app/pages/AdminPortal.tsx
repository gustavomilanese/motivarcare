import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  currencyOptionLabel,
  textByLanguage
} from "@therapy/i18n-config";
import { FinancesPage } from "../../finance";
import { links } from "../constants";
import { ModulePlaceholderPage } from "../components/ModulePlaceholderPage";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { InfoPage } from "./InfoPage";
import { PatientsOpsPage } from "./PatientsOpsPage";
import { ProfessionalsOpsPage } from "./ProfessionalsOpsPage";
import { SessionsOpsPage } from "./SessionsOpsPage";
import { SessionPackagesAdminPage } from "./SessionPackagesAdminPage";
import { UsersPage } from "./UsersPage";
import { WebAdminPage } from "./WebAdminPage";
import type { PortalPath } from "../types";

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
    if (to === "/calendar") {
      return t(props.language, { es: "Calendario", en: "Calendar", pt: "Calendario" });
    }
    if (to === "/library") {
      return t(props.language, { es: "Biblioteca", en: "Library", pt: "Biblioteca" });
    }
    if (to === "/imports") {
      return t(props.language, { es: "Importaciones", en: "Imports", pt: "Importacoes" });
    }
    if (to === "/users") {
      return t(props.language, { es: "Usuarios", en: "Users", pt: "Usuarios" });
    }
    if (to === "/plans-packages") {
      return t(props.language, { es: "Planes y paquetes de sesiones", en: "Session plans and packages", pt: "Planos e pacotes de sessoes" });
    }
    if (to === "/web-admin") {
      return t(props.language, { es: "Gestion Landing Page", en: "Landing Page Management", pt: "Gestao Landing Page" });
    }
    if (to === "/settings") {
      return t(props.language, { es: "Configuracion", en: "Settings", pt: "Configuracoes" });
    }
    return t(props.language, { es: "Auditoria IA", en: "AI audit", pt: "Auditoria IA" });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true" />
          <div>
            <strong>motivarcare</strong>
            <p>{t(props.language, { es: "Admin", en: "Admin", pt: "Admin" })}</p>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "admin-link active" : "admin-link")}
              end={link.to === "/"}
            >
              {labelForLink(link.to)}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-controls">
          <button className="danger" type="button" onClick={props.onLogout}>
            {t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
          </button>
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
              {labelForLink(link.to)}
            </NavLink>
          ))}
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<AdminDashboardPage token={props.token} language={props.language} currency={props.currency} />} />
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
            <Route
              path="/plans-packages"
              element={
                <SessionPackagesAdminPage token={props.token} language={props.language} currency={props.currency} />
              }
            />
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
            <Route
              path="/calendar"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  title={{ es: "Calendario", en: "Calendar", pt: "Calendario" }}
                  description={{
                    es: "Vista de agenda operativa para sesiones, ocupacion y disponibilidad.",
                    en: "Operational agenda view for sessions, occupancy, and availability.",
                    pt: "Visao de agenda operacional para sessoes, ocupacao e disponibilidade."
                  }}
                />
              }
            />
            <Route
              path="/library"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  title={{ es: "Biblioteca admin", en: "Admin library", pt: "Biblioteca admin" }}
                  description={{
                    es: "Recursos internos, guias y materiales de soporte para operacion clinica.",
                    en: "Internal resources, guides, and support materials for clinical operations.",
                    pt: "Recursos internos, guias e materiais de apoio para operacao clinica."
                  }}
                />
              }
            />
            <Route
              path="/imports"
              element={
                <ModulePlaceholderPage
                  language={props.language}
                  title={{ es: "Importaciones", en: "Imports", pt: "Importacoes" }}
                  description={{
                    es: "Carga masiva y procesos de importacion para datos operativos del portal.",
                    en: "Bulk upload and import workflows for portal operational data.",
                    pt: "Carga em massa e processos de importacao para dados operacionais do portal."
                  }}
                />
              }
            />
            <Route path="/users" element={<UsersPage token={props.token} language={props.language} />} />
            <Route path="/web-admin" element={<WebAdminPage token={props.token} language={props.language} />} />
            <Route
              path="/settings"
              element={
                <div className="stack-lg">
                  <section className="card stack">
                    <h2>{t(props.language, { es: "Configuracion regional", en: "Regional settings", pt: "Configuracoes regionais" })}</h2>
                    <div className="grid-form">
                      <label>
                        {t(props.language, { es: "Idioma", en: "Language", pt: "Idioma" })}
                        <select value={props.language} onChange={(event) => props.onLanguageChange(event.target.value as AppLanguage)}>
                          {SUPPORTED_LANGUAGES.map((language) => (
                            <option key={language} value={language}>
                              {language === "es" ? "Espanol" : language === "en" ? "English" : "Portugues"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t(props.language, { es: "Moneda", en: "Currency", pt: "Moeda" })}
                        <select value={props.currency} onChange={(event) => props.onCurrencyChange(event.target.value as SupportedCurrency)}>
                          {SUPPORTED_CURRENCIES.map((currency) => (
                            <option key={currency} value={currency}>
                              {currencyOptionLabel(currency, props.language)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="card stack">
                    <h2>{t(props.language, { es: "Administracion", en: "Administration", pt: "Administracao" })}</h2>
                    <p>{t(props.language, { es: "Accesos y herramientas avanzadas del panel.", en: "Access and advanced admin tools.", pt: "Acessos e ferramentas avancadas do painel." })}</p>
                    <div className="toolbar-actions">
                      <NavLink to="/users" className="primary">
                        {t(props.language, { es: "Ir a Usuarios", en: "Open Users", pt: "Abrir Usuarios" })}
                      </NavLink>
                    </div>
                  </section>
                </div>
              }
            />
            <Route
              path="/ai"
              element={
                <InfoPage
                  title={t(props.language, { es: "Auditoria IA", en: "AI audit", pt: "Auditoria IA" })}
                  description={t(props.language, {
                    es: "Cola de auditoria IA con consentimiento explicito y revision humana.",
                    en: "AI audit queue with explicit consent and human review.",
                    pt: "Fila de auditoria de IA com consentimento explicito e revisao humana."
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
