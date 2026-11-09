import { type AppLanguage, textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import { formatClock } from "../../../home/calm/calmHomeFormat";
import type { TimeSlot } from "../../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function localeTag(language: AppLanguage): string {
  if (language === "en") return "en-US";
  if (language === "pt") return "pt-BR";
  return "es-AR";
}

function dayKey(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function dayLabel(iso: string, timeZone: string, language: AppLanguage): string {
  try {
    const label = new Intl.DateTimeFormat(localeTag(language), {
      weekday: "long",
      day: "numeric",
      month: "short",
      timeZone
    }).format(new Date(iso));
    return label.charAt(0).toLocaleUpperCase(localeTag(language)) + label.slice(1);
  } catch {
    return iso.slice(0, 10);
  }
}

export function BookingSlotChoices(props: {
  slots: TimeSlot[];
  loading: boolean;
  disabled: boolean;
  language: AppLanguage;
  timeZone: string;
  onSelect: (slotId: string) => void;
}) {
  if (props.loading) {
    return (
      <p className="session-booking-slots-status">
        {t(props.language, { es: "Cargando disponibilidad...", en: "Loading availability...", pt: "Carregando disponibilidade..." })}
      </p>
    );
  }

  if (props.slots.length === 0) {
    return (
      <p className="session-booking-slots-status">
        {t(props.language, {
          es: "Sin horarios publicados por ahora",
          en: "No published times right now",
          pt: "Sem horarios publicados por enquanto"
        })}
      </p>
    );
  }

  const groups = new Map<string, TimeSlot[]>();
  const ordered = [...props.slots].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  for (const slot of ordered) {
    const key = dayKey(slot.startsAt, props.timeZone);
    const list = groups.get(key) ?? [];
    list.push(slot);
    groups.set(key, list);
  }

  return (
    <div className="session-booking-slots">
      {[...groups.entries()].map(([key, slots]) => (
        <section key={key} className="session-booking-day">
          <p className="session-booking-day-label">{dayLabel(slots[0]?.startsAt ?? key, props.timeZone, props.language)}</p>
          <div className="session-booking-day-times">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className="session-booking-slot"
                disabled={props.disabled}
                onClick={() => props.onSelect(slot.id)}
              >
                {formatClock(slot.startsAt, props.timeZone, props.language)}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
