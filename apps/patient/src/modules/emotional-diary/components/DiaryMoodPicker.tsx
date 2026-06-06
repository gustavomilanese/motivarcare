import { type CSSProperties } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import { t } from "../lib/labels";
import { MOOD_OPTIONS } from "../lib/moods";
import type { MoodLevel } from "../types";

export function DiaryMoodPicker(props: {
  language: AppLanguage;
  activeMood?: MoodLevel | null;
  onSelect: (mood: MoodLevel) => void;
  ariaLabel: string;
}) {
  return (
    <div className="diary-mood-scroll">
      <div className="diary-mood-scroll-inner">
        <div className="diary-mood-row diary-mood-row--compact diary-mood-row--scroll" role="list" aria-label={props.ariaLabel}>
          {MOOD_OPTIONS.map((option) => {
            const active = props.activeMood === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="listitem"
                className={`diary-mood-btn${active ? " diary-mood-btn--active" : ""}`}
                style={{ "--diary-mood-tone": option.tone } as CSSProperties}
                onClick={() => props.onSelect(option.id)}
                aria-pressed={active}
              >
                <span className="diary-mood-btn-emoji" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="diary-mood-btn-label">
                  {t(props.language, { es: option.labelEs, en: option.labelEn, pt: option.labelPt })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
