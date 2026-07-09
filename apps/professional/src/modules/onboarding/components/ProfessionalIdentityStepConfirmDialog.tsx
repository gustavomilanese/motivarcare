import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  PROFESSIONAL_IDENTITY_ADVANCE_AI_BULLET
} from "../constants/professionalProfileGuidanceCopy";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalIdentityStepConfirmDialog(props: {
  language: AppLanguage;
  onGoBack: () => void;
  onContinue: () => void;
}) {
  const points = [PROFESSIONAL_IDENTITY_ADVANCE_AI_BULLET];

  return (
    <div className="pro-web-identity-confirm" role="dialog" aria-modal="true" aria-labelledby="pro-web-identity-confirm-title">
      <article className="pro-web-identity-confirm-card">
        <header className="pro-web-identity-confirm-head">
          <h3 id="pro-web-identity-confirm-title">
            {t(props.language, {
              es: "¿Listo para continuar?",
              en: "Ready to continue?",
              pt: "Pronto para continuar?"
            })}
          </h3>
        </header>

        <ul className="pro-web-identity-confirm-points">
          {points.map((point) => (
            <li key={point.es}>{t(props.language, point)}</li>
          ))}
        </ul>

        <div className="pro-web-identity-confirm-actions">
          <button type="button" className="pro-secondary" onClick={props.onGoBack}>
            {t(props.language, {
              es: "Revisar",
              en: "Review",
              pt: "Revisar"
            })}
          </button>
          <button type="button" className="pro-primary" onClick={props.onContinue}>
            {t(props.language, {
              es: "Continuar",
              en: "Continue",
              pt: "Continuar"
            })}
          </button>
        </div>
      </article>
    </div>
  );
}
