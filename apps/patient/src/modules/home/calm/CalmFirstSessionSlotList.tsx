import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { TimeSlot } from "../../app/types";
import { formatClock, formatShortDate } from "./calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmFirstSessionSlotList(props: {
  language: AppLanguage;
  timeZone: string;
  slots: TimeSlot[];
  selectedStartsAt?: string | null;
  onSelectSlot: (slot: TimeSlot) => void;
  onSeeMore: () => void;
}) {
  return (
    <div className="calm-first-session__slots">
      <div className="calm-slot-row">
        {props.slots.map((slot) => {
          const selected = Boolean(props.selectedStartsAt && props.selectedStartsAt === slot.startsAt);
          return (
            <button
              key={slot.id}
              type="button"
              className={`calm-slot${selected ? " calm-slot--selected" : ""}`}
              aria-pressed={selected}
              onClick={() => props.onSelectSlot(slot)}
            >
              {formatClock(slot.startsAt, props.timeZone, props.language)}
              <small>{formatShortDate(slot.startsAt, props.timeZone, props.language)}</small>
            </button>
          );
        })}
      </div>
      <button type="button" className="calm-text-link calm-first-session__more-slots" onClick={props.onSeeMore}>
        {t(props.language, { es: "Ver más horarios", en: "See more times", pt: "Ver mais horários" })}
      </button>
    </div>
  );
}
