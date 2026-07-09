import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function SessionsCollapsibleToggle(props: { expanded: boolean; language: AppLanguage }) {
  const actionLabel = props.expanded
    ? t(props.language, { es: "Ocultar sección", en: "Hide section", pt: "Ocultar secao" })
    : t(props.language, { es: "Expandir sección", en: "Expand section", pt: "Expandir secao" });

  return (
    <>
      <span className="sessions-collapse-icon" aria-hidden="true">
        {props.expanded ? "−" : "+"}
      </span>
      <span className="sr-only">{actionLabel}</span>
    </>
  );
}
