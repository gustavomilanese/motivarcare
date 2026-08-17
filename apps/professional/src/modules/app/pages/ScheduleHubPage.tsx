import { NavLink, Outlet } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ScheduleHubPage(props: { language: AppLanguage }) {
  const aria = t(props.language, {
    es: "Horarios: plantilla de trabajo y disponibilidad publicada",
    en: "Availability: work hours and published slots",
    pt: "Horários: modelo de trabalho e disponibilidade publicada"
  });
  return (
    <div className="pro-schedule-hub">
      <div className="pro-schedule-hub-frame">
        <nav className="pro-schedule-hub-tabs" aria-label={aria} data-tour="pro-tour-agenda-tabs">
          <div className="pro-schedule-hub-tabs-track" role="presentation">
            <NavLink
              to="/horarios"
              end
              className={({ isActive }) => `pro-schedule-hub-tab${isActive ? " active" : ""}`}
            >
              <span className="pro-schedule-hub-tab-label-full">
                {t(props.language, {
                  es: "Configurar horarios de trabajo",
                  en: "Configure work hours",
                  pt: "Configurar horários de trabalho"
                })}
              </span>
              <span className="pro-schedule-hub-tab-label-short">
                {t(props.language, { es: "Plantilla", en: "Template", pt: "Modelo" })}
              </span>
            </NavLink>
            <NavLink
              to="/horarios/disponibilidad"
              className={({ isActive }) => `pro-schedule-hub-tab${isActive ? " active" : ""}`}
            >
              <span className="pro-schedule-hub-tab-label-full">
                {t(props.language, {
                  es: "Disponibilidad configurada",
                  en: "Configured availability",
                  pt: "Disponibilidade configurada"
                })}
              </span>
              <span className="pro-schedule-hub-tab-label-short">
                {t(props.language, { es: "Publicados", en: "Published", pt: "Publicados" })}
              </span>
            </NavLink>
          </div>
        </nav>
        <div className="pro-schedule-hub-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
