import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { TherapyModality } from "@therapy/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CouplesTherapyCarePathBanner(props: {
  language: AppLanguage;
  onOpenPackages: () => void;
}) {
  return (
    <aside className="patient-couples-care-banner" role="status">
      <div className="patient-couples-care-banner__copy">
        <p className="patient-couples-care-banner__kicker">
          {t(props.language, {
            es: "Terapia de pareja",
            en: "Couples therapy",
            pt: "Terapia de casal"
          })}
        </p>
        <h2 className="patient-couples-care-banner__title">
          {t(props.language, {
            es: "Vuestro espacio terapéutico en pareja",
            en: "Your couples therapy space",
            pt: "Seu espaco terapeutico a dois"
          })}
        </h2>
        <p className="patient-couples-care-banner__lead">
          {t(props.language, {
            es: "Las sesiones son por videollamada (Google Meet). Elegí un plan de pareja y reservá con profesionales que atienden en modalidad de pareja.",
            en: "Sessions are by video call (Google Meet). Choose a couples plan and book with professionals who offer couples therapy.",
            pt: "As sessoes sao por videochamada (Google Meet). Escolha um plano de casal e reserve com profissionais que atendem em casal."
          })}
        </p>
      </div>
      <button type="button" className="primary patient-couples-care-banner__cta" onClick={props.onOpenPackages}>
        {t(props.language, {
          es: "Ver planes de pareja",
          en: "View couples plans",
          pt: "Ver planos de casal"
        })}
      </button>
    </aside>
  );
}

export function isCouplesTherapyModality(modality: TherapyModality | null | undefined): boolean {
  return modality === "COUPLES";
}
