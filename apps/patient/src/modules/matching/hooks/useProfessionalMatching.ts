import { useMemo } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";
import { effectiveSessionListMajorUnits } from "../lib/sessionListPrice";
import type { MatchCardProfessional, SortMode } from "../types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

interface RankedProfessionalView {
  professional: MatchCardProfessional;
  score: number;
  reasons: string[];
  matchedTopics: string[];
  suggestedSlots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
}

function sortFutureSlots(slots: Array<{ id: string; startsAt: string; endsAt: string }>): Array<{ id: string; startsAt: string; endsAt: string }> {
  const now = Date.now();
  return [...slots]
    .filter((slot) => new Date(slot.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function useProfessionalMatching(params: {
  professionals: MatchCardProfessional[];
  patientMarket: Market;
  intakeAnswers: Record<string, string>;
  language: AppLanguage;
  search: string;
  specialtyFilter: string;
  sortMode: SortMode;
  isFirstSelectionRequired: boolean;
}) {
  const ranked = useMemo(
    () => params.professionals.map((professional) => ({
      professional,
      score: Math.max(1, Math.min(99, Math.round(professional.matchScore ?? professional.compatibilityBase ?? 50))),
      reasons: (professional.matchReasons ?? []).length > 0 ? (professional.matchReasons ?? []) : ["Perfil compatible por disponibilidad y perfil clínico."],
      matchedTopics: professional.matchedTopics ?? [],
      suggestedSlots: sortFutureSlots(
        ((professional.suggestedSlots ?? []).length > 0 ? (professional.suggestedSlots ?? []) : professional.slots).slice(0, 6)
      )
    })),
    [params.professionals]
  );

  const specialties = useMemo(() => {
    const set = new Set<string>();
    ranked.forEach((item) => {
      if (item.professional.specialization) {
        set.add(item.professional.specialization);
      }
      if (item.professional.focusPrimary) {
        set.add(item.professional.focusPrimary);
      }
    });
    return Array.from(set);
  }, [ranked]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    ranked.forEach((item) => {
      item.professional.languages.forEach((language) => set.add(language));
    });
    return Array.from(set);
  }, [ranked]);

  const filtered = useMemo(() => {
    return ranked.filter((item) => {
      const professional = item.professional;
      const normalizedSearch = normalize(params.search);
      const specialtyTokens = [professional.specialization, professional.focusPrimary].filter(Boolean) as string[];
      const matchesSearch =
        normalizedSearch.length === 0
        || normalize(professional.fullName).includes(normalizedSearch)
        || specialtyTokens.some((value) => normalize(value).includes(normalizedSearch))
        || item.matchedTopics.some((value) => normalize(value).includes(normalizedSearch));

      const matchesSpecialty =
        params.specialtyFilter === "all"
        || specialtyTokens.some((value) => value === params.specialtyFilter);
      return matchesSearch && matchesSpecialty;
    });
  }, [params.search, params.specialtyFilter, ranked]);

  const ordered = useMemo(() => {
    const list = [...filtered];
    list.sort((left, right) => sortResults(left, right, params.sortMode, params.patientMarket));
    return list;
  }, [
    filtered,
    params.sortMode,
    params.patientMarket
  ]);

  return {
    ranked,
    specialties,
    languages,
    ordered
  };
}

function sortResults(
  left: RankedProfessionalView,
  right: RankedProfessionalView,
  sortMode: SortMode,
  patientMarket: Market
): number {
  if (sortMode === "price-asc") {
    const leftPrice = effectiveSessionListMajorUnits(left.professional, patientMarket) ?? Number.MAX_SAFE_INTEGER;
    const rightPrice = effectiveSessionListMajorUnits(right.professional, patientMarket) ?? Number.MAX_SAFE_INTEGER;
    if (leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }
  }

  if (sortMode === "price-desc") {
    const leftPrice = effectiveSessionListMajorUnits(left.professional, patientMarket) ?? -1;
    const rightPrice = effectiveSessionListMajorUnits(right.professional, patientMarket) ?? -1;
    if (leftPrice !== rightPrice) {
      return rightPrice - leftPrice;
    }
  }

  if (sortMode === "rating-desc") {
    const leftRating = left.professional.ratingAverage ?? 0;
    const rightRating = right.professional.ratingAverage ?? 0;
    if (leftRating !== rightRating) {
      return rightRating - leftRating;
    }
  }

  if (sortMode === "reviews-desc") {
    const leftReviews = left.professional.reviewsCount ?? 0;
    const rightReviews = right.professional.reviewsCount ?? 0;
    if (leftReviews !== rightReviews) {
      return rightReviews - leftReviews;
    }
  }

  return right.score - left.score;
}
