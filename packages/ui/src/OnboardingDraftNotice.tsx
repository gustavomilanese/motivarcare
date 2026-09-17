import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

import type { OnboardingDraftStatus } from "./useOnboardingDraft";

/**
 * Línea de estado del autoguardado (abajo del formulario).
 * Siempre reserva altura para que el contenido no salte al guardar.
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

  const savingText = textByLanguage(props.language, {
    es: "Guardando…",
    en: "Saving…",
    pt: "Salvando…"
  } satisfies LocalizedText);

  const savedText = textByLanguage(props.language, {
    es: "Guardado",
    en: "Saved",
    pt: "Salvo"
  } satisfies LocalizedText);

  const errorText = textByLanguage(props.language, {
    es: "No se pudo guardar. Reintentamos solo.",
    en: "Couldn’t save. We’ll retry automatically.",
    pt: "Nao foi possivel salvar. Tentaremos de novo."
  } satisfies LocalizedText);

  let message = "";
  if (props.status === "saving") {
    message = savingText;
  } else if (props.status === "saved") {
    message = savedText;
  } else if (props.status === "error") {
    message = errorText;
  } else if (props.restored) {
    message = restoredText;
    if (props.detail) {
      message = `${message} ${props.detail}`;
    }
  }

  const className = props.className
    ? `mc-draft-notice ${props.className}`
    : "mc-draft-notice";

  return (
    <p className={className} role="status" aria-live="polite" data-empty={message ? undefined : "true"}>
      {message || "\u00a0"}
    </p>
  );
}
