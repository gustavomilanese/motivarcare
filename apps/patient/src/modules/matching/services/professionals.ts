import { apiRequest } from "../../app/services/api";
import type { MatchCardProfessional, ProfessionalDirectoryApiResponse } from "../types";

function safeString(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function fetchProfessionalDirectory(token?: string | null, language: "es" | "en" | "pt" = "es"): Promise<MatchCardProfessional[]> {
  const endpoint = token
    ? `/api/profiles/me/matching?language=${encodeURIComponent(language)}`
    : "/api/profiles/professionals";
  const response = await apiRequest<ProfessionalDirectoryApiResponse>(
    endpoint,
    {},
    token ?? undefined
  );

  return (response.professionals ?? []).map((item) => ({
    id: item.id,
    fullName: item.fullName,
    title: safeString(item.title) ?? "Profesional de salud mental",
    specialization: safeString(item.specialization),
    focusPrimary: safeString(item.focusPrimary),
    bio: safeString(item.bio),
    therapeuticApproach: safeString(item.therapeuticApproach),
    languages: Array.isArray(item.languages) ? item.languages : [],
    yearsExperience: item.yearsExperience ?? 0,
    sessionPriceUsd: item.sessionPriceUsd ?? null,
    photoUrl: safeString(item.photoUrl),
    birthCountry: safeString(item.birthCountry),
    stripeVerified: item.stripeVerified === true,
    ratingAverage: item.ratingAverage ?? null,
    reviewsCount: item.reviewsCount ?? 0,
    matchScore: item.matchScore ?? (item.compatibility ?? 0),
    matchReasons: Array.isArray(item.matchReasons) ? item.matchReasons : [],
    matchedTopics: Array.isArray(item.matchedTopics) ? item.matchedTopics : [],
    suggestedSlots: Array.isArray(item.suggestedSlots) ? item.suggestedSlots : [],
    sessionDurationMinutes: item.sessionDurationMinutes ?? 50,
    activePatientsCount: item.activePatientsCount ?? 0,
    completedSessionsCount: item.completedSessionsCount ?? 0,
    sessionsCount: item.sessionsCount ?? 0,
    compatibilityBase: item.compatibility ?? 0,
    slots: Array.isArray(item.slots) ? item.slots : []
  }));
}
