import { useEffect, useMemo, useState } from "react";
import { formatDateWithLocale, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { MatchTimeSlot } from "../types";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";

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
  onRetry?: () => void;
  continueLoading?: boolean;
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

  const hasVisibleSlots = grouped.morning.length + grouped.day.length + grouped.night.length > 0;
  const showEmptyState = !props.loading && !props.error && dayKeys.length === 0;

  const monthLabel = selectedDayKey
    ? formatDateWithLocale({
        value: `${selectedDayKey}T12:00:00.000Z`,
        language: props.language,
        timeZone: props.timezone,
        options: { month: "long", year: "numeric" }
      })
    : null;

  return (
    <div className="matching-flow-backdrop availability-picker-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="matching-flow-modal availability-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="availability-picker-header">
          <button
            type="button"
            className="availability-picker-icon-btn"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
          >
            ←
          </button>
          <button
            type="button"
            className="availability-picker-icon-btn"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>

        <div className="availability-picker-copy">
          <p className="availability-picker-kicker">
            {t(props.language, { es: "Horarios disponibles", en: "Available times", pt: "Horarios disponiveis" })}
          </p>
          <h3 id="availability-picker-title">
            {t(props.language, {
              es: "Elegí día y hora",
              en: "Pick a day and time",
              pt: "Escolha dia e horario"
            })}
          </h3>
          <p className="availability-picker-lead">
            {replaceSessionLabel(props.language, props.sessionDurationMinutes)} · {props.professionalName}
            {!props.loading && ordered.length > 0
              ? ` · ${ordered.length} ${t(props.language, { es: "opciones", en: "options", pt: "opcoes" })}`
              : ""}
          </p>
        </div>

        {props.loading ? (
          <div className="availability-picker-loading" role="status">
            <MotivarCarePageLoader language={props.language} layout="inline" />
            <p>
              {t(props.language, {
                es: "Cargando horarios del profesional…",
                en: "Loading this therapist’s times…",
                pt: "Carregando horarios do profissional…"
              })}
            </p>
          </div>
        ) : null}

        {!props.loading && props.error ? (
          <div className="availability-picker-empty" role="alert">
            <strong>
              {t(props.language, {
                es: "No pudimos cargar los horarios",
                en: "We couldn’t load times",
                pt: "Nao foi possivel carregar os horarios"
              })}
            </strong>
            <p>{props.error}</p>
            {props.onRetry ? (
              <button type="button" className="availability-picker-retry" onClick={props.onRetry}>
                {t(props.language, { es: "Reintentar", en: "Try again", pt: "Tentar de novo" })}
              </button>
            ) : null}
          </div>
        ) : null}

        {showEmptyState ? (
          <div className="availability-picker-empty">
            <strong>
              {t(props.language, {
                es: "No hay turnos libres por ahora",
                en: "No open slots right now",
                pt: "Nao ha horarios livres agora"
              })}
            </strong>
            <p>
              {t(props.language, {
                es: "Este profesional no tiene horarios publicados en las próximas semanas. Probá con otro o volvé más tarde.",
                en: "This therapist has no published times in the coming weeks. Try another or check back later.",
                pt: "Este profissional nao tem horarios publicados nas proximas semanas. Tente outro ou volte mais tarde."
              })}
            </p>
            {props.onRetry ? (
              <button type="button" className="availability-picker-retry" onClick={props.onRetry}>
                {t(props.language, { es: "Actualizar", en: "Refresh", pt: "Atualizar" })}
              </button>
            ) : null}
          </div>
        ) : null}

        {!props.loading && !props.error && dayKeys.length > 0 ? (
          <>
            <section className="availability-month-row">
              <strong>{monthLabel}</strong>
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
                const slotsForDay = ordered.filter((slot) => toDateKey(slot.startsAt, props.timezone) === dayKey).length;
                return (
                  <button
                    key={dayKey}
                    type="button"
                    className={`availability-day-button ${selectedDayKey === dayKey ? "selected" : ""}`}
                    onClick={() => setSelectedDayKey(dayKey)}
                  >
                    <span>{weekday}</span>
                    <strong>{day}</strong>
                    <em>{slotsForDay}</em>
                  </button>
                );
              })}
            </div>

            <p className="availability-timezone-note">
              {t(props.language, {
                es: "Mostramos fecha y hora en tu zona",
                en: "Date and time shown in your timezone",
                pt: "Data e horario no seu fuso"
              })}
              : <strong>{props.timezone}</strong>
            </p>

            {hasVisibleSlots ? (
              <div className="availability-periods">
                <AvailabilityPeriodBlock
                  language={props.language}
                  label={t(props.language, { es: "Mañana", en: "Morning", pt: "Manha" })}
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
            ) : (
              <p className="availability-picker-day-empty">
                {t(props.language, {
                  es: "No hay horarios para este día. Elegí otra fecha arriba.",
                  en: "No times on this day. Pick another date above.",
                  pt: "Nao ha horarios neste dia. Escolha outra data acima."
                })}
              </p>
            )}
          </>
        ) : null}

        <footer className="availability-picker-footer">
          <button
            type="button"
            className="matching-flow-primary availability-picker-primary"
            onClick={props.onContinue}
            disabled={!props.selectedSlotId || props.continueLoading || props.loading}
          >
            {props.continueLoading
              ? t(props.language, { es: "Reservando…", en: "Reserving…", pt: "Reservando…" })
              : t(props.language, { es: "Continuar", en: "Continue", pt: "Continuar" })}
          </button>
        </footer>
      </section>
    </div>
  );
}

function replaceSessionLabel(language: AppLanguage, minutes: number): string {
  return t(language, {
    es: `Sesión ${minutes} min`,
    en: `${minutes}-min session`,
    pt: `Sessao de ${minutes} min`
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
