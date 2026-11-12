import { useState } from "react";
import type { LocalizedText } from "@therapy/i18n-config";

/** Acción destructiva: borra todos los slots publicados del profesional. */
export function ClearAllAvailabilityButton(props: {
  slotCount: number;
  busy?: boolean;
  t: (values: LocalizedText) => string;
  onClear: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const disabled = props.busy || working || props.slotCount <= 0;

  if (!confirming) {
    return (
      <button
        type="button"
        className="danger"
        disabled={disabled}
        onClick={() => setConfirming(true)}
      >
        {props.t({
          es: "Borrar toda la disponibilidad",
          en: "Clear all availability",
          pt: "Apagar toda a disponibilidade"
        })}
      </button>
    );
  }

  return (
    <div className="button-row ops-actions" style={{ flexWrap: "wrap", gap: 8 }}>
      <p className="muted" style={{ margin: 0, flex: "1 1 100%" }}>
        {props.t({
          es: `Se van a borrar ${props.slotCount} horario(s). Las reservas confirmadas no se tocan. Después hay que republicar la agenda.`,
          en: `This will delete ${props.slotCount} slot(s). Confirmed bookings stay. Then republish the schedule.`,
          pt: `Serão apagados ${props.slotCount} horário(s). As reservas confirmadas permanecem. Depois é preciso republicar a agenda.`
        })}
      </p>
      <button
        type="button"
        className="danger"
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
          ? props.t({ es: "Borrando…", en: "Clearing…", pt: "Apagando…" })
          : props.t({ es: "Sí, borrar todo", en: "Yes, clear all", pt: "Sim, apagar tudo" })}
      </button>
      <button type="button" disabled={working} onClick={() => setConfirming(false)}>
        {props.t({ es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
      </button>
    </div>
  );
}
