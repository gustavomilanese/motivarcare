import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { NavLink } from "react-router-dom";

const BACK: LocalizedText = {
  es: "Volver al panel",
  en: "Back to dashboard",
  pt: "Voltar ao painel"
};

const INFO_BADGE: LocalizedText = {
  es: "Información",
  en: "Information",
  pt: "Informacao"
};

export function InfoPage(props: { language: AppLanguage; title: string; description: string; badge?: LocalizedText }) {
  const badgeText = props.badge ?? INFO_BADGE;
  return (
    <section className="card admin-info-page" aria-labelledby="admin-info-title">
      <div className="admin-info-page-copy">
        <span className="module-placeholder-badge module-placeholder-badge--muted">{textByLanguage(props.language, badgeText)}</span>
        <h2 id="admin-info-title">{props.title}</h2>
        <p className="module-placeholder-lead">{props.description}</p>
        <NavLink to="/" className="primary-link module-placeholder-cta">
          {textByLanguage(props.language, BACK)}
        </NavLink>
      </div>
      <div className="module-placeholder-visual admin-info-page-visual" aria-hidden="true">
        <div className="module-placeholder-visual-inner">
          <svg
            className="module-placeholder-visual-svg"
            viewBox="0 0 120 120"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M44 28h48v64H44z" />
            <path d="M52 40h32M52 52h24M52 64h28" />
            <circle cx="78" cy="82" r="16" />
            <path d="M84 88l10 10" />
          </svg>
        </div>
      </div>
    </section>
  );
}
