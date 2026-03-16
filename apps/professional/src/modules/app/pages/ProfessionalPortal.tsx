import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { AdminPage } from "./AdminPage";
import { AgendaPage, PublishedAvailabilityPage } from "./PublishedAvailabilityPage";
import { ChatPage } from "./ChatPage";
import { DashboardPage } from "./DashboardPage";
import { IncomePage } from "./IncomePage";
import { PatientsPage } from "./PatientsPage";
import { ProfilePage } from "./ProfilePage";
import { SchedulePage } from "./SchedulePage";
import { SettingsPage } from "./SettingsPage";
import type { AuthUser, PortalSection } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalPortal(props: {
  token: string;
  user: AuthUser;
  onLogout: () => void;
  language: AppLanguage;
  currency: SupportedCurrency;
  onUserChange: (user: AuthUser) => void;
}) {
  const links: Array<{ to: PortalSection; label: string }> = [
    { to: "/", label: t(props.language, { es: "Dashboard", en: "Dashboard", pt: "Dashboard" }) },
    { to: "/agenda", label: t(props.language, { es: "Agenda", en: "Agenda", pt: "Agenda" }) },
    { to: "/horarios", label: t(props.language, { es: "Configurar Horarios", en: "Set Schedule", pt: "Configurar Horarios" }) },
    { to: "/disponibilidad", label: t(props.language, { es: "Disponibilidad", en: "Availability", pt: "Disponibilidade" }) },
    { to: "/pacientes", label: t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" }) },
    { to: "/chat", label: t(props.language, { es: "Chat", en: "Chat", pt: "Chat" }) },
    { to: "/ingresos", label: t(props.language, { es: "Ingresos", en: "Earnings", pt: "Receitas" }) }
  ];

  return (
    <div className="pro-shell">
      <aside className="pro-sidebar">
        <div className="pro-brand">
          <span className="pro-brand-mark">M</span>
          <div>
            <strong>Motivarte</strong>
            <p>{t(props.language, { es: "Portal profesional", en: "Professional portal", pt: "Portal profissional" })}</p>
          </div>
        </div>

        <nav className="pro-sidebar-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "pro-link active" : "pro-link")} end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="pro-sidebar-foot">
          <p>{props.user.email}</p>
        </div>
      </aside>

      <div className="pro-main">
        <header className="pro-header">
          <div>
            <h1>
              {replaceTemplate(
                t(props.language, { es: "Hola, {name}", en: "Hi, {name}", pt: "Ola, {name}" }),
                { name: props.user.fullName }
              )}
            </h1>
          </div>
          <div className="pro-header-actions">
            <NavLink
              to="/perfil"
              className={({ isActive }) => `pro-header-icon-link ${isActive ? "active" : ""}`}
              aria-label={t(props.language, { es: "Perfil", en: "Profile", pt: "Perfil" })}
            >
              <span className="pro-header-icon profile" aria-hidden="true" />
            </NavLink>
            <NavLink
              to="/ajustes"
              className={({ isActive }) => `pro-header-icon-link ${isActive ? "active" : ""}`}
              aria-label={t(props.language, { es: "Ajustes", en: "Settings", pt: "Configuracoes" })}
            >
              <span className="pro-header-icon settings" aria-hidden="true" />
            </NavLink>
            <button className="pro-danger" type="button" onClick={props.onLogout}>
              {t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
            </button>
          </div>
        </header>

        <nav
          className="pro-mobile-nav"
          aria-label={t(props.language, {
            es: "Navegacion mobile profesional",
            en: "Professional mobile navigation",
            pt: "Navegacao mobile profissional"
          })}
        >
          {links.map((link) => (
            <NavLink
              key={`mobile-${link.to}`}
              to={link.to}
              className={({ isActive }) => (isActive ? "pro-mobile-link active" : "pro-mobile-link")}
              end={link.to === "/"}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <main className="pro-main-content">
          <Routes>
            <Route path="/" element={<DashboardPage token={props.token} language={props.language} currency={props.currency} user={props.user} />} />
            <Route path="/agenda" element={<AgendaPage token={props.token} language={props.language} />} />
            <Route path="/horarios" element={<SchedulePage token={props.token} language={props.language} />} />
            <Route path="/disponibilidad" element={<PublishedAvailabilityPage token={props.token} language={props.language} />} />
            <Route path="/pacientes" element={<PatientsPage token={props.token} language={props.language} />} />
            <Route path="/chat" element={<ChatPage token={props.token} user={props.user} language={props.language} />} />
            <Route path="/ingresos" element={<IncomePage token={props.token} language={props.language} currency={props.currency} />} />
            <Route path="/admin" element={<AdminPage token={props.token} language={props.language} />} />
            <Route
              path="/perfil"
              element={<ProfilePage token={props.token} user={props.user} language={props.language} onUserChange={props.onUserChange} />}
            />
            <Route path="/ajustes" element={<SettingsPage token={props.token} onLogout={props.onLogout} language={props.language} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
