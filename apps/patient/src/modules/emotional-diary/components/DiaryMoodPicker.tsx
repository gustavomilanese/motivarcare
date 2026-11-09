import { type AppLanguage } from "@therapy/i18n-config";
import { MoodFace } from "../../home/calm/calmIcons";
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
    <div className="diary-entry-climate" role="list" aria-label={props.ariaLabel}>
      {MOOD_OPTIONS.map((option) => {
        const active = props.activeMood === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="listitem"
            className={`diary-entry-climate-btn${active ? " is-active" : ""}`}
            onClick={() => props.onSelect(option.id)}
            aria-pressed={active}
          >
            <span aria-hidden="true">
              <MoodFace face={option.id} />
            </span>
            <span>
              {t(props.language, { es: option.labelEs, en: option.labelEn, pt: option.labelPt })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
