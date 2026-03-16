import { useMemo } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { rankProfessionalsForPatient, type RankedProfessional } from "../matchingEngine";
import type { MatchCardProfessional, SortMode } from "../types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function useProfessionalMatching(params: {
  professionals: MatchCardProfessional[];
  intakeAnswers: Record<string, string>;
  language: AppLanguage;
  search: string;
  specialtyFilter: string;
  languageFilter: string;
  sortMode: SortMode;
  isFirstSelectionRequired: boolean;
}) {
  const ranked = useMemo(
    () =>
      rankProfessionalsForPatient({
        professionals: params.professionals,
        intakeAnswers: params.intakeAnswers,
        language: params.language
      }),
    [params.intakeAnswers, params.language, params.professionals]
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
      const matchesLanguage =
        params.languageFilter === "all"
        || professional.languages.includes(params.languageFilter);

      return matchesSearch && matchesSpecialty && matchesLanguage;
    });
  }, [params.languageFilter, params.search, params.specialtyFilter, ranked]);

  const ordered = useMemo(() => {
    const clinicallyMatched = filtered.filter((item) => item.matchedTopics.length > 0);
    const source =
      params.isFirstSelectionRequired && clinicallyMatched.length > 0
        ? clinicallyMatched
        : filtered;
    const list = [...source];
    list.sort((left, right) => sortResults(left, right, params.sortMode));
    return list;
  }, [filtered, params.isFirstSelectionRequired, params.sortMode]);

  return {
    ranked,
    specialties,
    languages,
    ordered
  };
}

function sortResults(left: RankedProfessional, right: RankedProfessional, sortMode: SortMode): number {
  if (sortMode === "price-asc") {
    const leftPrice = left.professional.sessionPriceUsd ?? Number.MAX_SAFE_INTEGER;
    const rightPrice = right.professional.sessionPriceUsd ?? Number.MAX_SAFE_INTEGER;
    if (leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }
  }

  if (sortMode === "experience") {
    if (right.professional.yearsExperience !== left.professional.yearsExperience) {
      return right.professional.yearsExperience - left.professional.yearsExperience;
    }
  }

  if (sortMode === "next-slot") {
    const leftNext = left.suggestedSlots[0] ? new Date(left.suggestedSlots[0].startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightNext = right.suggestedSlots[0] ? new Date(right.suggestedSlots[0].startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftNext !== rightNext) {
      return leftNext - rightNext;
    }
  }

  return right.score - left.score;
}
