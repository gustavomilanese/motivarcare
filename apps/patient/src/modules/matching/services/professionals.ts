import { apiRequest, resolvePublicAssetUrl } from "../../app/services/api";
import type { MatchCardProfessional, ProfessionalDirectoryApiResponse } from "../types";

function safeString(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const directoryInflight = new Map<string, Promise<MatchCardProfessional[]>>();

function directoryRequestKey(token: string | null | undefined, language: string): string {
  return token ? `auth:${token}:${language}` : "public";
}

async function fetchProfessionalDirectoryOnce(token?: string | null, language: "es" | "en" | "pt" = "es"): Promise<MatchCardProfessional[]> {
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
    firstName: item.firstName ?? "",
    lastName: item.lastName ?? "",
    title: safeString(item.title) ?? "Profesional de salud mental",
    specialization: safeString(item.specialization),
    focusPrimary: safeString(item.focusPrimary),
    bio: safeString(item.bio),
    therapeuticApproach: safeString(item.therapeuticApproach),
    languages: Array.isArray(item.languages) ? item.languages : [],
    yearsExperience: item.yearsExperience ?? 0,
    sessionPriceArs: item.sessionPriceArs ?? null,
    sessionPriceUsd: item.sessionPriceUsd ?? null,
    photoUrl: resolvePublicAssetUrl(safeString(item.photoUrl)),
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

/**
 * Varias partes del portal (sync batch, cambio de idioma, matching) pueden pedir el mismo listado a la vez;
 * una sola petición en vuelo por token+idioma.
 */
export async function fetchProfessionalDirectory(token?: string | null, language: "es" | "en" | "pt" = "es"): Promise<MatchCardProfessional[]> {
  const key = directoryRequestKey(token ?? null, language);
  const existing = directoryInflight.get(key);
  if (existing) {
    return existing;
  }
  const pending = fetchProfessionalDirectoryOnce(token, language).finally(() => {
    directoryInflight.delete(key);
  });
  directoryInflight.set(key, pending);
  return pending;
}
