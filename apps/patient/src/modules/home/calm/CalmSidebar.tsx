import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AuthBrand } from "../../auth/AuthBrand";
import { IconBienestar, IconChat, IconDiario, IconInicio, IconSesiones } from "./calmIcons";
import { requestPatientDashboardTour } from "../components/GuidedTour";
import { CalmSupportNote } from "./CalmSupportNote";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmSidebar(props: { language: AppLanguage; unreadMessagesCount: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const badge = props.unreadMessagesCount > 99 ? "99+" : String(props.unreadMessagesCount);
  return (
    <aside className="portal-sidebar calm-sidebar">
      <AuthBrand />
      <nav className="portal-sidebar-nav calm-side-nav" data-tour="patient-tour-sidebar">
        <NavLink end to="/" className={({ isActive }) => `calm-side-link${isActive ? " is-active" : ""}`}>
          <IconInicio />
          {t(props.language, { es: "Inicio", en: "Home", pt: "Início" })}
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `calm-side-link${isActive ? " is-active" : ""}`}>
          <IconChat />
          {t(props.language, { es: "Mensajes", en: "Messages", pt: "Mensagens" })}
          {props.unreadMessagesCount > 0 ? <span className="calm-side-badge">{badge}</span> : null}
        </NavLink>
        <NavLink to="/sessions" className={({ isActive }) => `calm-side-link${isActive ? " is-active" : ""}`}>
          <IconSesiones />
          {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" })}
        </NavLink>
        <NavLink to="/diario" className={({ isActive }) => `calm-side-link${isActive ? " is-active" : ""}`}>
          <IconDiario />
          {t(props.language, { es: "Diario", en: "Diary", pt: "Diário" })}
        </NavLink>
        <NavLink to="/ejercicios" className={({ isActive }) => `calm-side-link${isActive ? " is-active" : ""}`}>
          <IconBienestar />
          {t(props.language, { es: "Bienestar", en: "Wellbeing", pt: "Bem-estar" })}
        </NavLink>
      </nav>
      <div className="portal-sidebar-foot">
        <button
          type="button"
          className="portal-sidebar-tour"
          onClick={() => {
            const goHome = location.pathname !== "/";
            if (goHome) navigate("/");
            window.setTimeout(() => requestPatientDashboardTour({ force: true }), goHome ? 420 : 60);
          }}
        >
          <img src="/brand/ds/maca.svg" alt="" width="28" height="28" />
          <span className="portal-sidebar-tour-label">
            {t(props.language, { es: "Tour con Maca", en: "Tour with Maca", pt: "Tour com a Maca" })}
          </span>
        </button>
        <CalmSupportNote language={props.language} />
      </div>
    </aside>
  );
}
