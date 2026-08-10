import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { PatientHomeVariant } from "../lib/patientHomeVariant";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Link chiquito tipo Amazon para alternar Inicio nueva / clásica. */
export function DashboardHomeVariantToggle(props: {
  language: AppLanguage;
  variant: PatientHomeVariant;
  onSelect: (variant: PatientHomeVariant) => void;
}) {
  const nextLabel = t(props.language, {
    es: "Probar Inicio nueva",
    en: "Try the new Home",
    pt: "Experimentar Inicio nova"
  });
  const classicLabel = t(props.language, {
    es: "Ver Inicio clásica",
    en: "View classic Home",
    pt: "Ver Inicio classica"
  });

  return (
    <p className="dashboard-home-variant-toggle">
      <button
        type="button"
        className="dashboard-home-variant-toggle-link"
        onClick={() => props.onSelect(props.variant === "next" ? "classic" : "next")}
      >
        {props.variant === "next" ? classicLabel : nextLabel}
      </button>
    </p>
  );
}
