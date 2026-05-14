import { NavLink, Outlet } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ScheduleHubPage(props: { language: AppLanguage }) {
  const aria = t(props.language, {
    es: "Mi Agenda: horarios de trabajo y disponibilidad configurada",
    en: "My agenda: work hours and configured availability",
    pt: "Minha agenda: horarios de trabalho e disponibilidade configurada"
  });
  return (
    <div className="pro-schedule-hub">
      <nav className="pro-schedule-hub-tabs" aria-label={aria}>
        <NavLink
          to="/horarios"
          end
          className={({ isActive }) => `pro-schedule-hub-tab${isActive ? " active" : ""}`}
        >
          {t(props.language, {
            es: "Configurar horarios de trabajo",
            en: "Configure work hours",
            pt: "Configurar horários de trabalho"
          })}
        </NavLink>
        <NavLink
          to="/horarios/disponibilidad"
          className={({ isActive }) => `pro-schedule-hub-tab${isActive ? " active" : ""}`}
        >
          {t(props.language, {
            es: "Disponibilidad configurada",
            en: "Configured availability",
            pt: "Disponibilidade configurada"
          })}
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
