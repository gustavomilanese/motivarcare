import { useEffect, useState } from "react";
import { fetchDiaryEntries } from "../../emotional-diary/services/emotionalDiaryApi";
import type { WeekMoodEntry } from "./calmWeekMood";

/** Carga entradas publicadas del diario (API) para el gráfico “Tu semana”. */
export function useWeekMoodEntries(authToken: string | null | undefined, enabled: boolean) {
  const [entries, setEntries] = useState<WeekMoodEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(enabled && authToken));

  useEffect(() => {
    if (!enabled || !authToken) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchDiaryEntries(authToken, "published")
      .then((published) => {
        if (cancelled) return;
        setEntries(
          published.map((entry) => ({
            createdAt: entry.createdAt,
            status: entry.status,
            mood: entry.mood
          }))
        );
      })
      .catch(() => {
        if (cancelled) return;
        setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, enabled]);

  return { entries, loading };
}
