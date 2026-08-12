import type { CSSProperties } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import type { EmotionalDiarySessionSummary } from "@therapy/types";
import { moodMeta, NEED_OPTIONS } from "../lib/moods";
import { t } from "../lib/labels";

function formatBlockDate(iso: string, language: AppLanguage): string {
  return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function needLabel(needId: string, language: AppLanguage): string {
  const need = NEED_OPTIONS.find((option) => option.id === needId);
  if (!need) return needId;
  return t(language, { es: need.labelEs, en: need.labelEn, pt: need.labelPt });
}

export function DiarySessionReportView(props: {
  language: AppLanguage;
  summary: EmotionalDiarySessionSummary;
  className?: string;
}) {
  if (!props.summary.blocks || props.summary.blocks.length === 0) {
    return (
      <div className={`diary-session-report ${props.className ?? ""}`.trim()}>
        <p className="diary-session-report-empty">{props.summary.headline || props.summary.summary}</p>
      </div>
    );
  }

  return (
    <div className={`diary-session-report ${props.className ?? ""}`.trim()}>
      <header className="diary-session-report-head">
        <p className="diary-session-report-eyebrow">
          {t(props.language, {
            es: "Informe del diario",
            en: "Diary report",
            pt: "Relatório do diário"
          })}
        </p>
        <h4 className="diary-session-report-title">{props.summary.headline}</h4>
        <p className="diary-session-report-lead">
          {t(props.language, {
            es: "Así se ve lo que vas a compartir: en lenguaje claro, listo para la sesión.",
            en: "This is what you’ll share: clear language, ready for the session.",
            pt: "Assim fica o que você vai compartilhar: linguagem clara, pronto para a sessão."
          })}
        </p>
      </header>
      <ol className="diary-session-report-blocks">
        {props.summary.blocks.map((block, index) => {
          const mood = moodMeta(block.mood);
          return (
            <li key={block.entryId} className="diary-session-report-block">
              <div className="diary-session-report-block-top">
                <span className="diary-session-report-index" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <strong className="diary-session-report-block-title">{block.title}</strong>
                  <p className="diary-session-report-block-date">
                    {formatBlockDate(block.publishedAt, props.language)}
                  </p>
                </div>
              </div>
              <p
                className="diary-session-report-mood"
                style={{ "--diary-mood-tone": mood.tone } as CSSProperties}
              >
                <span aria-hidden="true">{mood.emoji}</span>{" "}
                {t(props.language, {
                  es: `Cómo te sentías: ${mood.labelEs}`,
                  en: `How you felt: ${mood.labelEn}`,
                  pt: `Como você se sentia: ${mood.labelPt}`
                })}
              </p>
              {block.whatHappened ? (
                <div className="diary-session-report-field">
                  <span>
                    {t(props.language, { es: "Qué pasó", en: "What happened", pt: "O que aconteceu" })}
                  </span>
                  <p>{block.whatHappened}</p>
                </div>
              ) : null}
              {block.feelings.length > 0 ? (
                <div className="diary-session-report-field">
                  <span>
                    {t(props.language, { es: "Sentimientos", en: "Feelings", pt: "Sentimentos" })}
                  </span>
                  <p>{block.feelings.join(" · ")}</p>
                </div>
              ) : null}
              {block.recurringThought ? (
                <div className="diary-session-report-field">
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
                <div className="diary-session-report-field">
                  <span>
                    {t(props.language, {
                      es: "Qué necesitabas",
                      en: "What you needed",
                      pt: "O que você precisava"
                    })}
                  </span>
                  <p>{block.needsNow.map((id) => needLabel(id, props.language)).join(" · ")}</p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
