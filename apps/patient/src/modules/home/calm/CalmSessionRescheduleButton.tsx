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

/** Botón Reprogramar; si falta antelación, avisa sin inflar la fila de acciones. */
export function CalmSessionRescheduleButton(props: {
  language: AppLanguage;
  startsAt: string;
  cancellationHours?: number | null;
  onReschedule: () => void;
  onBlocked: (message: string) => void;
}) {
  const noticeHours = resolvePatientChangeNoticeHours(props.cancellationHours);
  const canReschedule = canPatientRescheduleBooking(props.startsAt, noticeHours);

  return (
    <button
      className="calm-btn calm-btn--outline"
      type="button"
      onClick={() => {
        if (!canReschedule) {
          props.onBlocked(
            t(props.language, {
              es: `Reprogramar pide al menos ${noticeHours} h de anticipación.`,
              en: `Rescheduling needs at least ${noticeHours} h notice.`,
              pt: `Reagendar pede pelo menos ${noticeHours} h de antecedência.`
            })
          );
          return;
        }
        props.onBlocked("");
        props.onReschedule();
      }}
    >
      {t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
    </button>
  );
}
