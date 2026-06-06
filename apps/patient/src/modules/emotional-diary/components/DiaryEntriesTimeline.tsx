import { type AppLanguage } from "@therapy/i18n-config";
import { entryTimelineTitle } from "../lib/entryDisplay";
import { t } from "../lib/labels";
import { moodMeta } from "../lib/moods";
import type { DiaryEntry } from "../types";

export interface DiaryEntriesTimelineProps {
  language: AppLanguage;
  entries: DiaryEntry[];
  onOpenDetail: (entryId: string) => void;
  ariaLabel: string;
  emptyMessage?: string;
}

function formatEntryDate(iso: string, language: AppLanguage): string {
  return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function DiaryEntriesTimeline(props: DiaryEntriesTimelineProps) {
  if (props.entries.length === 0) {
    if (!props.emptyMessage) return null;
    return <p className="diary-muted">{props.emptyMessage}</p>;
  }

  return (
    <ul className="diary-entry-cards" aria-label={props.ariaLabel}>
      {props.entries.map((entry) => {
        const mood = moodMeta(entry.mood);
        const title = entryTimelineTitle(entry);
        return (
          <li key={entry.id}>
            <button type="button" className="diary-entry-card" onClick={() => props.onOpenDetail(entry.id)}>
              <div className="diary-entry-card-top">
                <time className="diary-entry-card-date" dateTime={entry.createdAt}>
                  {formatEntryDate(entry.createdAt, props.language)}
                </time>
                <span
                  className="diary-mood-pill diary-mood-pill--compact"
                  style={{ backgroundColor: `${mood.tone}22`, color: mood.tone }}
                >
                  {mood.emoji}{" "}
                  {t(props.language, { es: mood.labelEs, en: mood.labelEn, pt: mood.labelPt })}
                </span>
              </div>
              <div className="diary-entry-card-bottom">
                <span className="diary-entry-card-title">{title}</span>
                <span className="diary-entry-card-chevron" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
