import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { McButton, McModal } from "@therapy/ui";
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
    <McModal
      open
      title={t(props.language, {
        es: "¿Listo para continuar?",
        en: "Ready to continue?",
        pt: "Pronto para continuar?"
      })}
      onClose={props.onGoBack}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <>
          <McButton variant="secondary" onClick={props.onGoBack}>
            {t(props.language, {
              es: "Revisar",
              en: "Review",
              pt: "Revisar"
            })}
          </McButton>
          <McButton onClick={props.onContinue}>
            {t(props.language, {
              es: "Continuar",
              en: "Continue",
              pt: "Continuar"
            })}
          </McButton>
        </>
      }
    >
      <ul className="pro-web-identity-confirm-points">
        {points.map((point) => (
          <li key={point.es}>{t(props.language, point)}</li>
        ))}
      </ul>
    </McModal>
  );
}
