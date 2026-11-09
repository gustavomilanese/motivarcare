import { useState } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { DeviceTestModal } from "./DeviceTestModal";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Abre la prueba local de cámara y micrófono. */
export function DeviceTestLink(props: { language: AppLanguage; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={props.className ?? "calm-text-link calm-session-av-test"}
        onClick={() => setOpen(true)}
      >
        {t(props.language, {
          es: "Probar cámara y micrófono",
          en: "Test camera and microphone",
          pt: "Testar câmera e microfone"
        })}
      </button>
      <DeviceTestModal language={props.language} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
