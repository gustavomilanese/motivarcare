import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ModulePlaceholderPage(props: {
  language: AppLanguage;
  title: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
  imageAlt?: LocalizedText;
}) {
  return (
    <section className="card module-placeholder-card">
      <div className="module-placeholder-copy">
        <h2>{t(props.language, props.title)}</h2>
        <p>{t(props.language, props.description)}</p>
      </div>
      {typeof props.imageUrl === "string" && props.imageUrl.length > 0 ? (
        <figure className="module-placeholder-image">
          <img src={props.imageUrl} alt={t(props.language, props.imageAlt ?? props.title)} loading="lazy" />
        </figure>
      ) : null}
    </section>
  );
}
