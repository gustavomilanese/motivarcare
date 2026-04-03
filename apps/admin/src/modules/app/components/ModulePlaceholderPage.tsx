import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { NavLink } from "react-router-dom";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const SOON_BADGE: LocalizedText = {
  es: "Próximamente",
  en: "Coming soon",
  pt: "Em breve"
};

const DEFAULT_BACK: LocalizedText = {
  es: "Volver al panel",
  en: "Back to dashboard",
  pt: "Voltar ao painel"
};

function PlaceholderVisual(props: { variant: "calendar" | "library" | "imports" }) {
  const common = {
    className: "module-placeholder-visual-svg",
    viewBox: "0 0 120 120",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const
  };

  if (props.variant === "calendar") {
    return (
      <svg {...common}>
        <rect x="20" y="28" width="80" height="72" rx="8" />
        <path d="M20 44h80M44 20v16M76 20v16" />
        <path d="M36 58h12v10H36zm18 0h12v10H54zm18 0h12v10H72zM36 76h12v10H36zm18 0h12v10H54z" />
      </svg>
    );
  }

  if (props.variant === "library") {
    return (
      <svg {...common}>
        <path d="M28 24h20v72H28zM52 32h20v64H52zM76 28h20v68H76z" />
        <path d="M34 36h8M58 44h8M82 40h8" opacity="0.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M32 88V40l28-16 28 16v48" />
      <path d="M32 56h56M48 72h24" />
      <circle cx="72" cy="48" r="10" />
      <path d="m78 54 12 12" />
    </svg>
  );
}

export function ModulePlaceholderPage(props: {
  language: AppLanguage;
  title: LocalizedText;
  description: LocalizedText;
  variant?: "calendar" | "library" | "imports";
  imageUrl?: string;
  imageAlt?: LocalizedText;
  /** Módulo disponible mientras tanto */
  relatedTo?: { path: string; label: LocalizedText };
}) {
  const variant = props.variant ?? "imports";
  const backLabel = t(props.language, DEFAULT_BACK);

  return (
    <section className="card module-placeholder-card" aria-labelledby="module-placeholder-title">
      <div className="module-placeholder-copy">
        <span className="module-placeholder-badge">{t(props.language, SOON_BADGE)}</span>
        <h2 id="module-placeholder-title">{t(props.language, props.title)}</h2>
        <p className="module-placeholder-lead">{t(props.language, props.description)}</p>
        <p className="module-placeholder-hint">
          {t(props.language, {
            es: "Estamos preparando esta sección. Mientras tanto podés seguir operando desde el resto del panel.",
            en: "We are building this section. You can keep working from the rest of the admin panel.",
            pt: "Estamos preparando esta seção. Enquanto isso, use o restante do painel."
          })}
        </p>
        <div className="module-placeholder-actions">
          <NavLink to="/" className="primary-link module-placeholder-cta">
            {backLabel}
          </NavLink>
          {props.relatedTo ? (
            <NavLink to={props.relatedTo.path} className="module-placeholder-secondary">
              {t(props.language, props.relatedTo.label)}
            </NavLink>
          ) : null}
        </div>
      </div>
      {typeof props.imageUrl === "string" && props.imageUrl.length > 0 ? (
        <figure className="module-placeholder-image">
          <img src={props.imageUrl} alt={t(props.language, props.imageAlt ?? props.title)} loading="lazy" />
        </figure>
      ) : (
        <div className="module-placeholder-visual" aria-hidden="true">
          <div className="module-placeholder-visual-inner">
            <PlaceholderVisual variant={variant} />
          </div>
        </div>
      )}
    </section>
  );
}
