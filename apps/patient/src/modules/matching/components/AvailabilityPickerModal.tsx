import { useEffect, useMemo, useState } from "react";
import { formatDateWithLocale, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { MatchTimeSlot } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function toDateKey(value: string, timezone: string): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((item) => item.type === "year")?.value ?? "1970";
  const month = parts.find((item) => item.type === "month")?.value ?? "01";
  const day = parts.find((item) => item.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function sortByStart(slots: MatchTimeSlot[]): MatchTimeSlot[] {
  return [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function slotPeriod(hour: number): "morning" | "day" | "night" {
  if (hour < 12) {
    return "morning";
  }
  if (hour < 18) {
    return "day";
  }
  return "night";
}

export function AvailabilityPickerModal(props: {
  language: AppLanguage;
  timezone: string;
  professionalName: string;
  sessionDurationMinutes: number;
  slots: MatchTimeSlot[];
  loading: boolean;
  error: string;
  selectedSlotId: string;
  onSelectSlot: (slot: MatchTimeSlot) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const ordered = useMemo(() => sortByStart(props.slots), [props.slots]);
  const dayKeys = useMemo(
    () => Array.from(new Set(ordered.map((slot) => toDateKey(slot.startsAt, props.timezone)))),
    [ordered, props.timezone]
  );
  const [selectedDayKey, setSelectedDayKey] = useState(dayKeys[0] ?? "");

  useEffect(() => {
    if (dayKeys.length === 0) {
      setSelectedDayKey("");
      return;
    }
    if (!dayKeys.includes(selectedDayKey)) {
      setSelectedDayKey(dayKeys[0]);
    }
  }, [dayKeys, selectedDayKey]);

  const visibleDaySlots = useMemo(
    () => ordered.filter((slot) => toDateKey(slot.startsAt, props.timezone) === selectedDayKey),
    [ordered, props.timezone, selectedDayKey]
  );

  const grouped = useMemo(() => {
    const morning: MatchTimeSlot[] = [];
    const day: MatchTimeSlot[] = [];
    const night: MatchTimeSlot[] = [];
    visibleDaySlots.forEach((slot) => {
      const hour = Number.parseInt(
        formatDateWithLocale({
          value: slot.startsAt,
          language: "en",
          timeZone: props.timezone,
          options: { hour: "2-digit", hour12: false }
        }),
        10
      );
      const period = slotPeriod(Number.isNaN(hour) ? 0 : hour);
      if (period === "morning") {
        morning.push(slot);
      } else if (period === "day") {
        day.push(slot);
      } else {
        night.push(slot);
      }
    });
    return { morning, day, night };
  }, [props.timezone, visibleDaySlots]);

  return (
    <div className="matching-flow-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="matching-flow-modal availability-picker-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="matching-flow-header">
          <button type="button" className="matching-flow-back-button" onClick={props.onClose}>
            ←
          </button>
          <div>
            <h3>{t(props.language, { es: "Elige una hora", en: "Choose a time", pt: "Escolha um horario" })}</h3>
            <p>
              {replaceSessionLabel(props.language, props.sessionDurationMinutes)} · {props.professionalName}
            </p>
          </div>
          <span className="matching-flow-info">i</span>
        </header>

        <section className="availability-month-row">
          <strong>
            {selectedDayKey
              ? formatDateWithLocale({
                  value: `${selectedDayKey}T12:00:00.000Z`,
                  language: props.language,
                  timeZone: props.timezone,
                  options: { month: "long", year: "numeric" }
                })
              : t(props.language, { es: "Sin fechas", en: "No dates", pt: "Sem datas" })}
          </strong>
        </section>

        <div className="availability-days-grid">
          {dayKeys.slice(0, 10).map((dayKey) => {
            const iso = `${dayKey}T12:00:00.000Z`;
            const weekday = formatDateWithLocale({
              value: iso,
              language: props.language,
              timeZone: props.timezone,
              options: { weekday: "short" }
            });
            const day = formatDateWithLocale({
              value: iso,
              language: props.language,
              timeZone: props.timezone,
              options: { day: "2-digit" }
            });
            return (
              <button
                key={dayKey}
                type="button"
                className={`availability-day-button ${selectedDayKey === dayKey ? "selected" : ""}`}
                onClick={() => setSelectedDayKey(dayKey)}
              >
                <span>{weekday}</span>
                <strong>{day}</strong>
              </button>
            );
          })}
        </div>

        <p className="availability-timezone-note">
          {t(props.language, {
            es: "La fecha y hora se muestran según tu zona horaria actual",
            en: "Date and time are shown in your current timezone",
            pt: "Data e horario sao exibidos no seu fuso horario atual"
          })}: {props.timezone}
        </p>

        {props.loading ? (
          <p className="availability-status-message">
            {t(props.language, { es: "Cargando horarios...", en: "Loading slots...", pt: "Carregando horarios..." })}
          </p>
        ) : null}

        {!props.loading && props.error ? (
          <p className="availability-status-message error">{props.error}</p>
        ) : null}

        {!props.loading && !props.error ? (
          <div className="availability-periods">
            <AvailabilityPeriodBlock
              language={props.language}
              label={t(props.language, { es: "Por la mañana", en: "Morning", pt: "Manhã" })}
              slots={grouped.morning}
              timezone={props.timezone}
              selectedSlotId={props.selectedSlotId}
              onSelectSlot={props.onSelectSlot}
            />
            <AvailabilityPeriodBlock
              language={props.language}
              label={t(props.language, { es: "Tarde", en: "Afternoon", pt: "Tarde" })}
              slots={grouped.day}
              timezone={props.timezone}
              selectedSlotId={props.selectedSlotId}
              onSelectSlot={props.onSelectSlot}
            />
            <AvailabilityPeriodBlock
              language={props.language}
              label={t(props.language, { es: "Noche", en: "Evening", pt: "Noite" })}
              slots={grouped.night}
              timezone={props.timezone}
              selectedSlotId={props.selectedSlotId}
              onSelectSlot={props.onSelectSlot}
            />
          </div>
        ) : null}

        <footer className="matching-flow-footer">
          <button type="button" className="matching-flow-primary" onClick={props.onContinue} disabled={!props.selectedSlotId}>
            {t(props.language, { es: "Continuar", en: "Continue", pt: "Continuar" })}
          </button>
        </footer>
      </section>
    </div>
  );
}

function replaceSessionLabel(language: AppLanguage, minutes: number): string {
  return t(language, {
    es: `Sesión ${minutes} minutos`,
    en: `${minutes}-minute session`,
    pt: `Sessao de ${minutes} minutos`
  });
}

function AvailabilityPeriodBlock(props: {
  language: AppLanguage;
  label: string;
  slots: MatchTimeSlot[];
  timezone: string;
  selectedSlotId: string;
  onSelectSlot: (slot: MatchTimeSlot) => void;
}) {
  if (props.slots.length === 0) {
    return null;
  }

  return (
    <section className="availability-period-block">
      <h4>{props.label}</h4>
      <div className="availability-slot-grid">
        {props.slots.map((slot) => {
          const time = formatDateWithLocale({
            value: slot.startsAt,
            language: props.language,
            timeZone: props.timezone,
            options: { hour: "2-digit", minute: "2-digit", hour12: false }
          });
          return (
            <button
              key={slot.id}
              type="button"
              className={`availability-slot-button ${props.selectedSlotId === slot.id ? "selected" : ""}`}
              onClick={() => props.onSelectSlot(slot)}
            >
              {time}
            </button>
          );
        })}
      </div>
    </section>
  );
}
