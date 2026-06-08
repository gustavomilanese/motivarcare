import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PackageChooseProfessionalCta(props: { language: AppLanguage; onClick: () => void }) {
  return (
    <button type="button" className="packages-choose-professional-cta" onClick={props.onClick}>
      {t(props.language, { es: "Elegir profesional", en: "Choose professional", pt: "Escolher profissional" })}
    </button>
  );
}

export function PackageCatalogLoading(props: { language: AppLanguage }) {
  return (
    <div className="packages-catalog-loading" role="status" aria-live="polite">
      <span className="sr-only">
        {t(props.language, {
          es: "Cargando paquetes disponibles",
          en: "Loading available packages",
          pt: "Carregando pacotes disponiveis"
        })}
      </span>
      <div className="packages-catalog-skeleton-grid" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div className="packages-catalog-skeleton-card" key={index}>
            <div className="packages-catalog-skeleton-line packages-catalog-skeleton-line--badge" />
            <div className="packages-catalog-skeleton-line packages-catalog-skeleton-line--title" />
            <div className="packages-catalog-skeleton-line packages-catalog-skeleton-line--body" />
            <div className="packages-catalog-skeleton-line packages-catalog-skeleton-line--price" />
            <div className="packages-catalog-skeleton-line packages-catalog-skeleton-line--button" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PackageCatalogError(props: { language: AppLanguage; variant?: "catalog" | "published" }) {
  const isPublished = props.variant === "published";

  return (
    <div className="packages-catalog-error" role="alert">
      <div className="packages-catalog-error-icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 8v5m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="packages-catalog-error-copy">
        <strong>
          {isPublished
            ? t(props.language, {
                es: "No hay paquetes publicados por ahora",
                en: "No packages are published right now",
                pt: "Nao ha pacotes publicados no momento"
              })
            : t(props.language, {
                es: "No pudimos cargar los paquetes de tu profesional",
                en: "We couldn't load your professional's packages",
                pt: "Nao foi possivel carregar os pacotes do seu profissional"
              })}
        </strong>
        <p>
          {isPublished
            ? t(props.language, {
                es: "Probá de nuevo en unos minutos o contactá al equipo de soporte.",
                en: "Try again in a few minutes or contact support.",
                pt: "Tente novamente em alguns minutos ou entre em contato com o suporte."
              })
            : t(props.language, {
                es: "Recargá la página o volvé a intentar en unos minutos. Si el problema continúa, contactá a soporte.",
                en: "Reload the page or try again in a few minutes. If the issue persists, contact support.",
                pt: "Recarregue a pagina ou tente novamente em alguns minutos. Se o problema continuar, entre em contato com o suporte."
              })}
        </p>
      </div>
      {!isPublished ? (
        <button type="button" className="packages-catalog-error-retry" onClick={() => window.location.reload()}>
          {t(props.language, { es: "Recargar página", en: "Reload page", pt: "Recarregar pagina" })}
        </button>
      ) : null}
    </div>
  );
}
