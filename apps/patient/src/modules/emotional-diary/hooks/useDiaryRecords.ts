import { useEffect, useMemo, useState } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import type { EmotionalDiarySessionSummary, EmotionalDiaryStats } from "@therapy/types";
import { buildWeeklyMoodLineSegments, buildWeeklyMoodSeries } from "../lib/analytics";
import { t } from "../lib/labels";
import {
  fetchDiaryEntries,
  fetchDiarySessionSummary,
  fetchDiaryStats,
  migrateLocalDiaryIfNeeded,
  sendDiarySessionSummary
} from "../services/emotionalDiaryApi";
import type { DiaryEntry } from "../types";

export const DIARY_CHART_WEEKS = [4, 8, 12] as const;
export type DiaryChartWeeks = (typeof DIARY_CHART_WEEKS)[number];

export function formatDiaryEntryDate(iso: string, language: AppLanguage): string {
  return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function useDiaryRecords(language: AppLanguage, authToken: string) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [stats, setStats] = useState<EmotionalDiaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [summary, setSummary] = useState<EmotionalDiarySessionSummary | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [chartWeeks, setChartWeeks] = useState<DiaryChartWeeks>(4);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await migrateLocalDiaryIfNeeded(authToken);
        const [published, diaryStats] = await Promise.all([
          fetchDiaryEntries(authToken, "published"),
          fetchDiaryStats(authToken)
        ]);
        if (cancelled) return;
        setEntries(published);
        setStats(diaryStats);
      } catch (requestError) {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : t(language, {
                es: "Error al cargar registros",
                en: "Could not load records",
                pt: "Erro ao carregar registros"
              })
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const weeklyMood = useMemo(
    () => buildWeeklyMoodSeries(entries, language, chartWeeks),
    [entries, language, chartWeeks]
  );
  const moodLineSegments = useMemo(() => buildWeeklyMoodLineSegments(weeklyMood), [weeklyMood]);
  const detailEntry = useMemo(
    () => (detailEntryId ? entries.find((entry) => entry.id === detailEntryId) ?? null : null),
    [detailEntryId, entries]
  );

  async function handleBuildSummary() {
    setSummaryLoading(true);
    setError("");
    setSentNotice(null);
    try {
      setSummary(await fetchDiarySessionSummary(authToken));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(language, {
              es: "No pudimos armar el resumen",
              en: "We couldn't build the summary",
              pt: "Nao foi possivel montar o resumo"
            })
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleSendSummary() {
    setSendLoading(true);
    setError("");
    setSentNotice(null);
    try {
      const result = await sendDiarySessionSummary(authToken);
      setSummary(result.summary);
      setSentNotice(
        t(language, {
          es: `Listo: enviamos el informe a ${result.professionalName}.`,
          en: `Done: we sent the report to ${result.professionalName}.`,
          pt: `Pronto: enviamos o relatório para ${result.professionalName}.`
        })
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(language, {
              es: "No pudimos enviar el informe",
              en: "We couldn't send the report",
              pt: "Nao foi possivel enviar o relatorio"
            })
      );
    } finally {
      setSendLoading(false);
    }
  }

  return {
    entries,
    stats,
    loading,
    error,
    summaryLoading,
    sendLoading,
    summary,
    sentNotice,
    chartWeeks,
    setChartWeeks,
    weeklyMood,
    moodLineSegments,
    detailEntry,
    setDetailEntryId,
    handleBuildSummary,
    handleSendSummary
  };
}
