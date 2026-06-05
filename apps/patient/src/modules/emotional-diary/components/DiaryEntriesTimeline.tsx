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
    <div className="diary-timeline-table" role="table" aria-label={props.ariaLabel}>
      <div className="diary-timeline-head" role="row">
        <span role="columnheader">{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
        <span role="columnheader">{t(props.language, { es: "Entrada", en: "Entry", pt: "Entrada" })}</span>
        <span role="columnheader">{t(props.language, { es: "Estado", en: "Mood", pt: "Estado" })}</span>
        <span className="sr-only" role="columnheader">
          {t(props.language, { es: "Acciones", en: "Actions", pt: "Ações" })}
        </span>
      </div>
      <ul className="diary-timeline">
        {props.entries.map((entry) => {
          const mood = moodMeta(entry.mood);
          return (
            <li key={entry.id} className="diary-timeline-row" role="row">
              <span className="diary-timeline-col diary-timeline-col--date" role="cell">
                {formatEntryDate(entry.createdAt, props.language)}
              </span>
              <span className="diary-timeline-col diary-timeline-col--title" role="cell" title={entryTimelineTitle(entry)}>
                {entryTimelineTitle(entry)}
              </span>
              <span className="diary-timeline-col diary-timeline-col--mood" role="cell">
                <span className="diary-mood-pill diary-mood-pill--compact" style={{ backgroundColor: `${mood.tone}22`, color: mood.tone }}>
                  {mood.emoji} {t(props.language, { es: mood.labelEs, en: mood.labelEn, pt: mood.labelPt })}
                </span>
              </span>
              <span className="diary-timeline-col diary-timeline-col--actions" role="cell">
                <button type="button" className="diary-timeline-link" onClick={() => props.onOpenDetail(entry.id)}>
                  {t(props.language, { es: "Detalle", en: "Detail", pt: "Detalhe" })}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
