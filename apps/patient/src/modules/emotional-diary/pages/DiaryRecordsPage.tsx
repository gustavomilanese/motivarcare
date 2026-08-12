import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import type { EmotionalDiaryStats } from "@therapy/types";
import { DiaryEntriesTimeline } from "../components/DiaryEntriesTimeline";
import { DiaryEntryDetailModal } from "../components/DiaryEntryDetailModal";
import { DiaryPortalToolbar, DiarySectionIntro, DiaryShell } from "../components/DiaryChrome";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";
import { useScrollSectionToTopOnMount } from "../../app/lib/navigateSectionTop";
import { buildWeeklyMoodLineSegments, buildWeeklyMoodSeries, moodLabelForStats } from "../lib/analytics";
import { t } from "../lib/labels";
import { moodMeta, MOOD_OPTIONS } from "../lib/moods";
import {
  fetchDiaryEntries,
  fetchDiarySessionSummary,
  fetchDiaryStats,
  migrateLocalDiaryIfNeeded,
  sendDiarySessionSummary
} from "../services/emotionalDiaryApi";
import type { DiaryEntry } from "../types";
import type { EmotionalDiarySessionSummary } from "@therapy/types";
import { DiarySessionReportView } from "../components/DiarySessionReportView";

export interface DiaryRecordsPageProps {
  language: AppLanguage;
  authToken: string;
}

const CHART_PERIOD_WEEKS = [4, 8, 12] as const;
type ChartPeriodWeeks = (typeof CHART_PERIOD_WEEKS)[number];

function formatEntryDate(iso: string, language: AppLanguage): string {
  return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatLastShared(iso: string | null, language: AppLanguage): string {
  if (!iso) return "—";
  return formatEntryDate(iso, language);
}

export function DiaryRecordsPage(props: DiaryRecordsPageProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [stats, setStats] = useState<EmotionalDiaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [summary, setSummary] = useState<EmotionalDiarySessionSummary | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [chartWeeks, setChartWeeks] = useState<ChartPeriodWeeks>(4);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  useScrollSectionToTopOnMount(true, loading ? "loading" : "ready");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await migrateLocalDiaryIfNeeded(props.authToken);
        const [published, diaryStats] = await Promise.all([
          fetchDiaryEntries(props.authToken, "published"),
          fetchDiaryStats(props.authToken)
        ]);
        if (cancelled) return;
        setEntries(published);
        setStats(diaryStats);
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : "Error al cargar registros");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.authToken]);

  const monthDelta = useMemo(
    () => (stats ? stats.entriesThisMonth - stats.entriesPrevMonth : 0),
    [stats]
  );
  const weeklyMood = useMemo(
    () => buildWeeklyMoodSeries(entries, props.language, chartWeeks),
    [entries, props.language, chartWeeks]
  );
  const moodLineSegments = useMemo(() => buildWeeklyMoodLineSegments(weeklyMood), [weeklyMood]);
  const insights = stats?.insights ?? [];
  const hasAnyWeeklyEntry = weeklyMood.some((week) => week.entryCount > 0);
  const detailEntry = useMemo(
    () => (detailEntryId ? entries.find((entry) => entry.id === detailEntryId) ?? null : null),
    [detailEntryId, entries]
  );

  function chartPeriodLabel(weeks: ChartPeriodWeeks): string {
    if (weeks === 4) {
      return t(props.language, { es: "Últimas 4 semanas", en: "Last 4 weeks", pt: "Últimas 4 semanas" });
    }
    if (weeks === 8) {
      return t(props.language, { es: "Últimas 8 semanas", en: "Last 8 weeks", pt: "Últimas 8 semanas" });
    }
    return t(props.language, { es: "Últimas 12 semanas", en: "Last 12 weeks", pt: "Últimas 12 semanas" });
  }

  async function handleBuildSummary() {
    setSummaryLoading(true);
    setError("");
    setSentNotice(null);
    try {
      const result = await fetchDiarySessionSummary(props.authToken);
      setSummary(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos armar el resumen");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleSendSummary() {
    setSendLoading(true);
    setError("");
    setSentNotice(null);
    try {
      const result = await sendDiarySessionSummary(props.authToken);
      setSummary(result.summary);
      setSentNotice(
        t(props.language, {
          es: `Listo: enviamos el informe a ${result.professionalName}.`,
          en: `Done: we sent the report to ${result.professionalName}.`,
          pt: `Pronto: enviamos o relatório para ${result.professionalName}.`
        })
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos enviar el informe");
    } finally {
      setSendLoading(false);
    }
  }

  if (loading) {
    return (
      <DiaryShell language={props.language} className="diary-page--records">
        <div data-section-top-anchor className="diary-page-top-anchor" aria-hidden="true" />
        <DiaryPortalToolbar language={props.language} showLeaveActions />
        <DiarySectionIntro
          language={props.language}
          title={t(props.language, { es: "Mis registros", en: "My records", pt: "Meus registros" })}
        />
        <MotivarCarePageLoader language={props.language} layout="block" />
      </DiaryShell>
    );
  }

  return (
    <DiaryShell language={props.language} className="diary-page--records">
      <div data-section-top-anchor className="diary-page-top-anchor" aria-hidden="true" />
      <DiaryPortalToolbar language={props.language} showLeaveActions />
      <DiarySectionIntro
        language={props.language}
        title={t(props.language, { es: "Mis registros", en: "My records", pt: "Meus registros" })}
        subtitle={t(props.language, {
          es: "Revisá tu historial emocional, identificá patrones y preparate para tus sesiones.",
          en: "Review your emotional history, spot patterns, and prepare for sessions.",
          pt: "Revise seu histórico emocional, identifique padrões e prepare-se para as sessões."
        })}
      />

      {error ? <p className="diary-error">{error}</p> : null}

      <div className="diary-stats-row">
        <article className="diary-stat-card">
          <p className="diary-stat-label">{t(props.language, { es: "Entradas este mes", en: "Entries this month", pt: "Entradas este mês" })}</p>
          <p className="diary-stat-value">{stats?.entriesThisMonth ?? 0}</p>
          <p className="diary-stat-meta diary-stat-meta--up">
            {monthDelta >= 0 ? "+" : ""}
            {monthDelta}{" "}
            {t(props.language, { es: "vs. mes anterior", en: "vs. previous month", pt: "vs. mês anterior" })}
          </p>
        </article>
        <article className="diary-stat-card">
          <p className="diary-stat-label">{t(props.language, { es: "Mood más frecuente", en: "Most frequent mood", pt: "Humor mais frequente" })}</p>
          <p className="diary-stat-value">{moodLabelForStats(stats?.mostFrequentMood ?? "regular", props.language)}</p>
          <p className="diary-stat-meta">{stats?.mostFrequentMoodPct ?? 0}% {t(props.language, { es: "de tus registros", en: "of your entries", pt: "dos seus registros" })}</p>
        </article>
        <article className="diary-stat-card">
          <p className="diary-stat-label">{t(props.language, { es: "Días consecutivos registrando", en: "Consecutive logging days", pt: "Dias consecutivos registrando" })}</p>
          <p className="diary-stat-value">{stats?.consecutiveDays ?? 0} {t(props.language, { es: "días", en: "days", pt: "dias" })}</p>
          <p className="diary-stat-meta diary-stat-meta--ok">{t(props.language, { es: "¡Seguí así!", en: "Keep it up!", pt: "Continue assim!" })}</p>
        </article>
        <article className="diary-stat-card">
          <p className="diary-stat-label">{t(props.language, { es: "Compartidas con psicólogo", en: "Shared with therapist", pt: "Compartilhadas com psicólogo" })}</p>
          <p className="diary-stat-value">{stats?.sharedWithPsychologist ?? 0}</p>
          <p className="diary-stat-meta">
            {t(props.language, { es: "Última:", en: "Last:", pt: "Última:" })}{" "}
            {formatLastShared(stats?.lastSharedAt ?? null, props.language)}
          </p>
        </article>
      </div>

      <div className="diary-grid diary-grid--records">
        <article className="diary-card diary-card--chart">
          <div className="diary-card-head diary-card-head--split diary-card-head--chart">
            <div>
              <h3>{t(props.language, { es: "Evolución emocional", en: "Emotional trend", pt: "Evolução emocional" })}</h3>
              <p>{chartPeriodLabel(chartWeeks)}</p>
            </div>
            <label className="diary-chart-period">
              <span className="sr-only">
                {t(props.language, { es: "Período del gráfico", en: "Chart period", pt: "Período do gráfico" })}
              </span>
              <select
                className="diary-chart-period-select"
                value={chartWeeks}
                onChange={(event) => setChartWeeks(Number(event.target.value) as ChartPeriodWeeks)}
              >
                {CHART_PERIOD_WEEKS.map((weeks) => (
                  <option key={weeks} value={weeks}>
                    {weeks === 4
                      ? t(props.language, { es: "4 semanas", en: "4 weeks", pt: "4 semanas" })
                      : weeks === 8
                        ? t(props.language, { es: "8 semanas", en: "8 weeks", pt: "8 semanas" })
                        : t(props.language, { es: "12 semanas", en: "12 weeks", pt: "12 semanas" })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="diary-chart-help">
            {t(props.language, {
              es: "Cada columna es una semana. La línea une tu ánimo promedio; más arriba = mejor. Si una semana no tiene entradas, el trazo se corta.",
              en: "Each column is one week. The line connects your average mood; higher = better. If a week has no entries, the line breaks.",
              pt: "Cada coluna é uma semana. A linha une seu humor médio; mais alto = melhor. Sem entradas na semana, a linha se interrompe."
            })}
          </p>
          <div
            className={`diary-chart diary-chart--weekly diary-chart--weeks-${chartWeeks}`}
            role="img"
            aria-label={t(props.language, {
              es: `Gráfico de evolución emocional, ${chartPeriodLabel(chartWeeks)}`,
              en: `Weekly emotional trend chart, ${chartPeriodLabel(chartWeeks)}`,
              pt: `Gráfico de evolução emocional, ${chartPeriodLabel(chartWeeks)}`
            })}
          >
            <div className="diary-chart-y" aria-hidden="true">
              {MOOD_OPTIONS.map((option) => (
                <span key={option.id} className="diary-chart-y-tick" title={t(props.language, { es: option.labelEs, en: option.labelEn, pt: option.labelPt })}>
                  <span className="diary-chart-y-emoji">{option.emoji}</span>
                  <span className="diary-chart-y-text">{t(props.language, { es: option.labelEs, en: option.labelEn, pt: option.labelPt })}</span>
                </span>
              ))}
            </div>
            <div className="diary-chart-plot">
              {!hasAnyWeeklyEntry ? (
                <p className="diary-chart-empty">{t(props.language, { es: "Todavía no hay entradas en este período.", en: "No entries in this period yet.", pt: "Ainda não há entradas neste período." })}</p>
              ) : (
                <>
                  {moodLineSegments.length > 0 ? (
                    <svg className="diary-chart-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      {moodLineSegments.map((segment, index) => (
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
                    {weeklyMood.map((week) => (
                      <div key={week.key} className="diary-chart-week">
                        {week.score === null || !week.mood ? (
                          <span className="diary-chart-week-empty" aria-hidden="true">
                            {t(props.language, { es: "—", en: "—", pt: "—" })}
                          </span>
                        ) : (
                          <>
                            <span
                              className="diary-chart-dot"
                              style={
                                {
                                  "--diary-point-y": `${((week.score - 1) / 4) * 100}%`,
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

        <article className="diary-card diary-card--timeline">
          <div className="diary-card-head">
            <h3>{t(props.language, { es: "Timeline de entradas", en: "Entry timeline", pt: "Linha do tempo" })}</h3>
            <p>{t(props.language, { es: "Tus registros más recientes.", en: "Your most recent entries.", pt: "Seus registros mais recentes." })}</p>
          </div>
          <DiaryEntriesTimeline
            language={props.language}
            entries={entries}
            onOpenDetail={setDetailEntryId}
            ariaLabel={t(props.language, { es: "Timeline de entradas", en: "Entry timeline", pt: "Linha do tempo" })}
          />
        </article>

        <article className="diary-card diary-card--insights">
          <div className="diary-card-head">
            <h3>{t(props.language, { es: "Insights de la semana", en: "Weekly insights", pt: "Insights da semana" })}</h3>
            <p>{t(props.language, { es: "Reflexiones generadas para vos.", en: "Reflections generated for you.", pt: "Reflexões geradas para você." })}</p>
          </div>
          <ul className="diary-insights-list">
            {insights.length === 0 ? (
              <li className="diary-insights-empty">
                <p>{t(props.language, { es: "Seguí registrando para ver insights acá.", en: "Keep logging to see insights here.", pt: "Continue registrando para ver insights aqui." })}</p>
              </li>
            ) : (
              insights.map((insight) => (
                <li key={insight.id}>
                  <span className="diary-insight-icon" aria-hidden="true">{insight.icon}</span>
                  <p>{t(props.language, { es: insight.textEs, en: insight.textEn, pt: insight.textPt })}</p>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="diary-card diary-card--session">
          <p className="diary-session-eyebrow">
            {t(props.language, { es: "Antes de tu sesión", en: "Before your session", pt: "Antes da sua sessão" })}
          </p>
          <h3 className="diary-session-title">
            {t(props.language, { es: "Prepará tu próxima sesión", en: "Prepare for your next session", pt: "Prepare sua próxima sessão" })}
          </h3>
          <p className="diary-session-lead">
            {t(props.language, {
              es: "Armá el informe con las entradas que compartiste, revisalo y envialo a tu psicólogo/a. Así queda claro que lo recibió.",
              en: "Build the report from the entries you shared, review it, and send it to your therapist so it’s clear they received it.",
              pt: "Monte o relatório com as entradas que compartilhou, revise e envie ao seu psicólogo. Assim fica claro que ele recebeu."
            })}
          </p>
          <div className="diary-session-actions">
            <button
              type="button"
              className="diary-btn diary-btn--ghost diary-btn--wide diary-session-cta"
              disabled={summaryLoading || sendLoading}
              onClick={() => void handleBuildSummary()}
            >
              {summaryLoading
                ? t(props.language, { es: "Armando informe…", en: "Building report…", pt: "Montando relatório…" })
                : t(props.language, {
                    es: "Vista previa del informe",
                    en: "Preview report",
                    pt: "Pré-visualizar relatório"
                  })}
            </button>
            <button
              type="button"
              className="diary-btn diary-btn--primary diary-btn--wide diary-session-cta"
              disabled={sendLoading || summaryLoading}
              onClick={() => void handleSendSummary()}
            >
              {sendLoading
                ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
                : t(props.language, {
                    es: "Enviar al psicólogo/a",
                    en: "Send to my therapist",
                    pt: "Enviar ao psicólogo"
                  })}
            </button>
          </div>
          {sentNotice ? <p className="diary-session-sent" role="status">{sentNotice}</p> : null}
          {summary ? <DiarySessionReportView language={props.language} summary={summary} /> : null}
          <Link className="diary-session-link" to="/sessions">
            {t(props.language, { es: "Ver turnos y sesiones →", en: "View appointments and sessions →", pt: "Ver consultas e sessões →" })}
          </Link>
        </article>
      </div>

      {detailEntry ? (
        <DiaryEntryDetailModal
          language={props.language}
          entry={detailEntry}
          formattedDate={formatEntryDate(detailEntry.createdAt, props.language)}
          onClose={() => setDetailEntryId(null)}
        />
      ) : null}
    </DiaryShell>
  );
}
