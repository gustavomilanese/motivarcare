import { useState } from "react";
import {
  canPatientRescheduleBooking,
  resolvePatientChangeNoticeHours,
  textByLanguage,
  type AppLanguage,
  type LocalizedText
} from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Reprogramar de la card principal: si falta antelación, explica en vez de quedar mute. */
export function CalmSessionRescheduleButton(props: {
  language: AppLanguage;
  startsAt: string;
  cancellationHours?: number | null;
  onReschedule: () => void;
}) {
  const [notice, setNotice] = useState("");
  const noticeHours = resolvePatientChangeNoticeHours(props.cancellationHours);
  const canReschedule = canPatientRescheduleBooking(props.startsAt, noticeHours);

  return (
    <div className="calm-session-reschedule">
      <button
        className="calm-btn calm-btn--outline"
        type="button"
        onClick={() => {
          if (!canReschedule) {
            setNotice(
              t(props.language, {
                es: `Solo podés reprogramar con al menos ${noticeHours} h de anticipación. Escribile a tu profesional por el chat si necesitás coordinar.`,
                en: `You can only reschedule at least ${noticeHours} h ahead. Message your professional in chat if you need to coordinate.`,
                pt: `Só é possível reagendar com pelo menos ${noticeHours} h de antecedência. Escreva no chat se precisar combinar.`
              })
            );
            return;
          }
          setNotice("");
          props.onReschedule();
        }}
      >
        {t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
      </button>
      {notice ? <p className="calm-session-reschedule-notice">{notice}</p> : null}
    </div>
  );
}
