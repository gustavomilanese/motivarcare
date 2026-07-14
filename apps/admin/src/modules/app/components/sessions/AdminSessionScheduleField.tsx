import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import {
  SESSION_DURATION_OPTIONS,
  applySessionSchedulePreset,
  combineLocalDateTime,
  durationMinutesBetween,
  parseLocalDateTimeValue,
  sessionSchedulePresetLabel,
  splitLocalDateTime,
  type SessionSchedulePresetId,
  withDuration
} from "../../lib/adminSessionSchedule";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const PRESETS: SessionSchedulePresetId[] = [
  "past_2h",
  "past_1h",
  "now_minus_duration",
  "today_same_time",
  "tomorrow_same_time"
];

export function AdminSessionScheduleField(props: {
  language: AppLanguage;
  startsAt: string;
  endsAt: string;
  onChange: (next: { startsAt: string; endsAt: string }) => void;
  disabled?: boolean;
}) {
  const { date, time } = splitLocalDateTime(props.startsAt);
  const duration = durationMinutesBetween(props.startsAt, props.endsAt);
  const endDate = parseLocalDateTimeValue(props.endsAt);
  const endPreview = endDate
    ? formatDateWithLocale({
        value: endDate.toISOString(),
        language: props.language,
        options: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      })
    : props.endsAt;
  const durationKnown = (SESSION_DURATION_OPTIONS as readonly number[]).includes(duration);

  const setFromParts = (nextDate: string, nextTime: string, nextDuration: number) => {
    props.onChange(withDuration(combineLocalDateTime(nextDate, nextTime), nextDuration));
  };

  return (
    <div className="admin-session-schedule">
      <div className="admin-session-schedule-head">
        <h4>{t(props.language, { es: "Agenda", en: "Schedule", pt: "Agenda" })}</h4>
        <p>
          {t(props.language, {
            es: "Elegí un día, la hora de inicio y la duración. El fin se calcula solo — sin abrir dos calendarios.",
            en: "Pick one day, start time, and duration. End time is calculated — no dual calendar dance.",
            pt: "Escolha um dia, horário de início e duração. O fim é calculado — sem dois calendários."
          })}
        </p>
      </div>

      <div className="admin-session-schedule-grid">
        <label className="admin-session-schedule-field">
          <span>{t(props.language, { es: "Día", en: "Day", pt: "Dia" })}</span>
          <input
            type="date"
            value={date}
            disabled={props.disabled}
            onChange={(event) => setFromParts(event.target.value, time, duration)}
          />
        </label>
        <label className="admin-session-schedule-field">
          <span>{t(props.language, { es: "Inicio", en: "Start", pt: "Início" })}</span>
          <input
            type="time"
            value={time}
            disabled={props.disabled}
            step={300}
            onChange={(event) => setFromParts(date, event.target.value, duration)}
          />
        </label>
        <label className="admin-session-schedule-field">
          <span>{t(props.language, { es: "Duración", en: "Duration", pt: "Duração" })}</span>
          <select
            value={duration}
            disabled={props.disabled}
            onChange={(event) => setFromParts(date, time, Number(event.target.value))}
          >
            {!durationKnown ? <option value={duration}>{duration} min</option> : null}
            {SESSION_DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="admin-session-schedule-end">
        <span>{t(props.language, { es: "Fin", en: "Ends", pt: "Fim" })}</span>
        <strong>{endPreview}</strong>
      </p>

      <div
        className="admin-session-schedule-presets"
        role="group"
        aria-label={t(props.language, { es: "Atajos de agenda", en: "Schedule shortcuts", pt: "Atalhos de agenda" })}
      >
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="admin-session-schedule-preset"
            disabled={props.disabled}
            onClick={() =>
              props.onChange(
                applySessionSchedulePreset({
                  preset,
                  currentStartsAt: props.startsAt,
                  durationMinutes: duration
                })
              )
            }
          >
            {sessionSchedulePresetLabel(props.language, preset)}
          </button>
        ))}
      </div>
    </div>
  );
}
