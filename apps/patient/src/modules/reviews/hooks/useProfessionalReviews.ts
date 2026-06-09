import { useEffect, useState } from "react";
import type { ProfessionalReviewPublicItem, ProfessionalReviewStats } from "@therapy/types";
import { fetchProfessionalReviews } from "../services/professionalReviewsApi";

export function useProfessionalReviews(
  professionalId: string | null,
  options?: { limit?: number; enabled?: boolean }
) {
  const limit = options?.limit ?? 12;
  const enabled = options?.enabled ?? Boolean(professionalId);
  const [reviews, setReviews] = useState<ProfessionalReviewPublicItem[]>([]);
  const [stats, setStats] = useState<ProfessionalReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!professionalId || !enabled) {
      setReviews([]);
      setStats(null);
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    void fetchProfessionalReviews(professionalId, { limit })
      .then((response) => {
        if (!active) {
          return;
        }
        setReviews(response.reviews ?? []);
        setStats(response.stats ?? null);
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, limit, professionalId]);

  return { reviews, stats, loading, error };
}
