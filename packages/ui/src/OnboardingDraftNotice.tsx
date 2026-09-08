import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

import type { OnboardingDraftStatus } from "./useOnboardingDraft";

/**
 * Aviso de que el onboarding se está guardando solo. Lo comparten el cuestionario del
 * paciente y el wizard del profesional para que el mensaje sea el mismo en los dos.
 */
export function OnboardingDraftNotice(props: {
  language: AppLanguage;
  status: OnboardingDraftStatus;
  /** `true` cuando se recuperó progreso previo al entrar. */
  restored: boolean;
  /** Detalle opcional al retomar (p. ej. archivos que hay que volver a subir). */
  detail?: string;
  className?: string;
}) {
  const restoredText = textByLanguage(props.language, {
    es: "Retomamos donde lo habías dejado.",
    en: "We picked up where you left off.",
    pt: "Retomamos de onde voce parou."
  } satisfies LocalizedText);

  const savedText = textByLanguage(props.language, {
    es: "Progreso guardado. Si salís, podés seguir después.",
    en: "Progress saved. If you leave, you can continue later.",
    pt: "Progresso salvo. Se sair, pode continuar depois."
  } satisfies LocalizedText);

  const message = props.restored ? restoredText : props.status === "saved" ? savedText : "";
  if (!message) {
    return null;
  }

  const className = props.className ? `mc-draft-notice ${props.className}` : "mc-draft-notice";
  return (
    <p className={className} role="status">
      {message}
      {props.restored && props.detail ? ` ${props.detail}` : ""}
    </p>
  );
}
