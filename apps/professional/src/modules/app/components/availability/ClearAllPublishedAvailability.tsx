import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Borra todos los horarios publicados para poder republicar limpio. */
export function ClearAllPublishedAvailability(props: {
  language: AppLanguage;
  slotCount: number;
  busy?: boolean;
  onClear: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const disabled = props.busy || working || props.slotCount <= 0;

  if (!confirming) {
    return (
      <button type="button" className="pro-secondary" disabled={disabled} onClick={() => setConfirming(true)}>
        {t(props.language, {
          es: "Borrar toda la disponibilidad",
          en: "Clear all availability",
          pt: "Apagar toda a disponibilidade"
        })}
      </button>
    );
  }

  return (
    <div className="pro-inline-actions" style={{ flexWrap: "wrap", gap: 8 }}>
      <p className="pro-muted" style={{ margin: 0, flex: "1 1 100%" }}>
        {t(props.language, {
          es: `Se van a borrar ${props.slotCount} horario(s) publicados. Las reservas de pacientes no se cancelan. Después volvé a publicar desde la plantilla.`,
          en: `This will delete ${props.slotCount} published slot(s). Patient bookings stay. Then republish from your work-hours template.`,
          pt: `Serão apagados ${props.slotCount} horário(s) publicados. As reservas dos pacientes permanecem. Depois republice a partir do modelo.`
        })}
      </p>
      <button
        type="button"
        className="pro-primary"
        disabled={props.busy || working}
        onClick={() => {
          void (async () => {
            setWorking(true);
            try {
              await props.onClear();
              setConfirming(false);
            } finally {
              setWorking(false);
            }
          })();
        }}
      >
        {working
          ? t(props.language, { es: "Borrando…", en: "Clearing…", pt: "Apagando…" })
          : t(props.language, { es: "Sí, borrar todo", en: "Yes, clear all", pt: "Sim, apagar tudo" })}
      </button>
      <button type="button" className="pro-secondary" disabled={working} onClick={() => setConfirming(false)}>
        {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
      </button>
    </div>
  );
}
