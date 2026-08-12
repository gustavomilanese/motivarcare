import type { CSSProperties } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { EmotionalDiarySessionSummary } from "@therapy/types";
import { moodMeta } from "./emotionalDiaryMoodMeta";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const NEED_LABELS: Record<string, LocalizedText> = {
  rest: { es: "Descansar", en: "Rest", pt: "Descansar" },
  talk: { es: "Hablarlo", en: "Talk it out", pt: "Conversar" },
  breathe: { es: "Respirar", en: "Breathe", pt: "Respirar" },
  boundaries: { es: "Poner límites", en: "Set boundaries", pt: "Limites" },
  organize: { es: "Ordenar ideas", en: "Organize thoughts", pt: "Organizar ideias" }
};

function formatBlockDate(iso: string, language: AppLanguage): string {
  return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function needLabel(needId: string, language: AppLanguage): string {
  const labels = NEED_LABELS[needId];
  return labels ? t(language, labels) : needId;
}

export function ProDiarySessionReportView(props: {
  language: AppLanguage;
  summary: EmotionalDiarySessionSummary;
}) {
  if (!props.summary.blocks || props.summary.blocks.length === 0) {
    return <p className="pro-muted">{props.summary.headline || props.summary.summary}</p>;
  }

  return (
    <div className="pro-diary-session-report" role="region" aria-label={t(props.language, { es: "Informe completo", en: "Full report", pt: "Relatório completo" })}>
      <header className="pro-diary-session-report-head">
        <p className="pro-diary-session-report-eyebrow">
          {t(props.language, {
            es: "Informe del diario",
            en: "Diary report",
            pt: "Relatório do diário"
          })}
        </p>
        <h3>
          {t(props.language, {
            es: `Panorama para la sesión · ${props.summary.entryCount} entrada${props.summary.entryCount === 1 ? "" : "s"}`,
            en: `Session overview · ${props.summary.entryCount} entr${props.summary.entryCount === 1 ? "y" : "ies"}`,
            pt: `Panorama da sessão · ${props.summary.entryCount} entrada${props.summary.entryCount === 1 ? "" : "s"}`
          })}
        </h3>
        <p className="pro-diary-session-report-lead">
          {t(props.language, {
            es: "Lectura ordenada de lo que el paciente compartió, lista para usar en el encuentro.",
            en: "An ordered reading of what the patient shared, ready for the session.",
            pt: "Leitura ordenada do que o paciente compartilhou, pronta para o encontro."
          })}
        </p>
      </header>
      <ol className="pro-diary-session-report-blocks">
        {props.summary.blocks.map((block, index) => {
          const mood = moodMeta(block.mood);
          return (
            <li
              key={block.entryId}
              className="pro-diary-session-report-block"
              style={
                {
                  "--diary-mood-tone": mood.tone,
                  "--diary-mood-soft": mood.soft
                } as CSSProperties
              }
            >
              <div className="pro-diary-session-report-block-top">
                <span className="pro-diary-session-report-index" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="pro-diary-session-report-block-heading">
                  <strong>{block.title}</strong>
                  <time dateTime={block.publishedAt}>{formatBlockDate(block.publishedAt, props.language)}</time>
                </div>
                <span className="pro-diary-session-report-mood-pill">
                  <span aria-hidden="true">{mood.emoji}</span>
                  {t(props.language, { es: mood.labelEs, en: mood.labelEn, pt: mood.labelPt })}
                </span>
              </div>
              {block.whatHappened ? (
                <div className="pro-diary-session-report-field">
                  <span>{t(props.language, { es: "Qué pasó", en: "What happened", pt: "O que aconteceu" })}</span>
                  <p>{block.whatHappened}</p>
                </div>
              ) : null}
              {block.feelings.length > 0 ? (
                <div className="pro-diary-session-report-field">
                  <span>{t(props.language, { es: "Sentimientos", en: "Feelings", pt: "Sentimentos" })}</span>
                  <div className="pro-diary-session-report-chips">
                    {block.feelings.map((feeling) => (
                      <span key={feeling}>{feeling}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {block.recurringThought ? (
                <div className="pro-diary-session-report-field">
                  <span>
                    {t(props.language, {
                      es: "Pensamiento que volvía",
                      en: "Recurring thought",
                      pt: "Pensamento recorrente"
                    })}
                  </span>
                  <p>{block.recurringThought}</p>
                </div>
              ) : null}
              {block.needsNow.length > 0 ? (
                <div className="pro-diary-session-report-field">
                  <span>
                    {t(props.language, {
                      es: "Qué necesitaba",
                      en: "What was needed",
                      pt: "O que precisava"
                    })}
                  </span>
                  <div className="pro-diary-session-report-chips">
                    {block.needsNow.map((id) => (
                      <span key={id}>{needLabel(id, props.language)}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
