import type { AppLanguage, LocalizedText } from "@therapy/i18n-config";
import { textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function MatchingStickyAction(props: {
  language: AppLanguage;
  professionalName: string;
  score: number;
  onContinue: () => void;
}) {
  return (
    <section className="patient-matching-sticky">
      <div>
        <strong>{props.professionalName}</strong>
        <p>
          {t(props.language, {
            es: `Listo para continuar con ${props.score}% de compatibilidad.`,
            en: `Ready to continue with ${props.score}% compatibility.`,
            pt: `Pronto para continuar com ${props.score}% de compatibilidade.`
          })}
        </p>
      </div>
      <button type="button" onClick={props.onContinue}>
        {t(props.language, {
          es: "Continuar con este terapeuta",
          en: "Continue with this therapist",
          pt: "Continuar com este terapeuta"
        })}
      </button>
    </section>
  );
}
