import { type CSSProperties } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import { MoodFace } from "../../home/calm/calmIcons";
import type { WeeklyMoodBucket, WeeklyMoodLineSegment } from "../lib/analytics";
import { moodLabelForStats } from "../lib/analytics";
import { DIARY_CHART_WEEKS, type DiaryChartWeeks } from "../hooks/useDiaryRecords";
import { t } from "../lib/labels";
import { MOOD_OPTIONS, moodMeta } from "../lib/moods";

export function DiaryRecordsChart(props: {
  language: AppLanguage;
  weeks: DiaryChartWeeks;
  onWeeks: (weeks: DiaryChartWeeks) => void;
  weeklyMood: WeeklyMoodBucket[];
  segments: WeeklyMoodLineSegment[];
}) {
  const hasAny = props.weeklyMood.some((week) => week.entryCount > 0);
  const period = t(props.language, {
    es: `Últimas ${props.weeks} semanas`,
    en: `Last ${props.weeks} weeks`,
    pt: `Últimas ${props.weeks} semanas`
  });

  return (
    <article className="diary-records-card">
      <div className="diary-records-card-head">
        <div>
          <h2>{t(props.language, { es: "Evolución emocional", en: "Emotional trend", pt: "Evolução emocional" })}</h2>
          <p>{period}</p>
        </div>
        <div className="diary-records-periods" role="group" aria-label={t(props.language, { es: "Período del gráfico", en: "Chart period", pt: "Período do gráfico" })}>
          {DIARY_CHART_WEEKS.map((weeks) => (
            <button
              key={weeks}
              type="button"
              className={`diary-records-chip${props.weeks === weeks ? " is-active" : ""}`}
              aria-pressed={props.weeks === weeks}
              onClick={() => props.onWeeks(weeks)}
            >
              {t(props.language, {
                es: `${weeks} semanas`,
                en: `${weeks} weeks`,
                pt: `${weeks} semanas`
              })}
            </button>
          ))}
        </div>
      </div>
      <p className="diary-records-help">
        {t(props.language, {
          es: "Cada columna es una semana. La línea une tu ánimo promedio; más arriba = mejor. Si una semana no tiene entradas, el trazo se corta.",
          en: "Each column is one week. The line connects your average mood; higher = better. If a week has no entries, the line breaks.",
          pt: "Cada coluna é uma semana. A linha une seu humor médio; mais alto = melhor. Sem entradas na semana, a linha se interrompe."
        })}
      </p>
      <div
        className={`diary-chart diary-chart--weekly diary-chart--weeks-${props.weeks} diary-records-chart`}
        role="img"
        aria-label={t(props.language, {
          es: `Gráfico de evolución emocional, ${period}`,
          en: `Weekly emotional trend chart, ${period}`,
          pt: `Gráfico de evolução emocional, ${period}`
        })}
      >
        <div className="diary-chart-y" aria-hidden="true">
          {[...MOOD_OPTIONS].reverse().map((option) => (
            <span key={option.id} className="diary-chart-y-tick" title={t(props.language, { es: option.labelEs, en: option.labelEn, pt: option.labelPt })}>
              <span className="diary-records-axis-face">
                <MoodFace face={option.id} />
              </span>
              <span className="diary-chart-y-text">{t(props.language, { es: option.labelEs, en: option.labelEn, pt: option.labelPt })}</span>
            </span>
          ))}
        </div>
        <div className="diary-chart-plot">
          {!hasAny ? (
            <p className="diary-chart-empty">
              {t(props.language, { es: "Todavía no hay entradas en este período.", en: "No entries in this period yet.", pt: "Ainda não há entradas neste período." })}
            </p>
          ) : (
            <>
              {props.segments.length > 0 ? (
                <svg className="diary-chart-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {props.segments.map((segment, index) => (
                    <line
                      key={`${segment.x1}-${segment.y1}-${index}`}
                      x1={segment.x1}
                      y1={segment.y1}
                      x2={segment.x2}
                      y2={segment.y2}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              ) : null}
              <div className="diary-chart-weeks-row">
                {props.weeklyMood.map((week) => (
                  <div key={week.key} className="diary-chart-week">
                    {week.score === null || !week.mood ? (
                      <span className="diary-chart-week-empty" aria-hidden="true">—</span>
                    ) : (
                      <>
                        <span
                          className="diary-chart-dot"
                          style={
                            {
                              "--diary-point-y": `${((5 - week.score) / 4) * 100}%`,
                              background: moodMeta(week.mood).tone
                            } as CSSProperties
                          }
                          title={moodLabelForStats(week.mood, props.language)}
                        />
                        <span className="diary-chart-week-meta">
                          {week.entryCount}{" "}
                          {week.entryCount === 1
                            ? t(props.language, { es: "entrada", en: "entry", pt: "entrada" })
                            : t(props.language, { es: "entradas", en: "entries", pt: "entradas" })}
                        </span>
                      </>
                    )}
                    <span className="diary-chart-x">{week.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
