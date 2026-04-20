import type { AppLanguage } from "@therapy/i18n-config";
import { fetchProfessionalDirectory } from "../../matching/services/professionals";
import { apiRequest } from "../services/api";
import type {
  AuthMeApiResponse,
  BookingsMineApiResponse,
  ProfileMeApiResponse
} from "../types";

export type PatientPortalSyncBatchSettled = {
  profileResult: PromiseSettledResult<ProfileMeApiResponse>;
  bookingsResult: PromiseSettledResult<BookingsMineApiResponse>;
  authResult: PromiseSettledResult<AuthMeApiResponse>;
  professionalDirectoryResult: PromiseSettledResult<Awaited<ReturnType<typeof fetchProfessionalDirectory>>>;
};

/**
 * Una sola petición en vuelo por token (el epoch del caller se ignora para la coalescencia).
 * Antes: clave `token+epoch` → cada bump de epoch (cleanup / resync) abría un lote nuevo en paralelo
 * y el navegador spameaba GET cada ~15ms.
 */
const inFlightByToken = new Map<string, Promise<PatientPortalSyncBatchSettled>>();
/** Fin del último lote completado por token (ms); 0 = aún no hubo ninguno en esta sesión de página. */
const lastBatchEndedAtByToken = new Map<string, number>();

/** Mínimo tiempo entre el *inicio* de dos lotes consecutivos para el mismo token. */
const MIN_MS_BETWEEN_BATCH_STARTS = 2200;

/**
 * Varias montadas (StrictMode) o re-disparos no duplican
 * GET /profiles/me + /bookings/mine + /auth/me + /profiles/me/matching.
 */
export function fetchPatientPortalSyncBatchShared(params: {
  token: string;
  /** Conservado por compatibilidad; la coalescencia es solo por `token`. */
  epoch: number;
  language: AppLanguage;
}): Promise<PatientPortalSyncBatchSettled> {
  void params.epoch;
  const tokenKey = params.token;
  const existing = inFlightByToken.get(tokenKey);
  if (existing) {
    return existing;
  }

  const pending = (async (): Promise<PatientPortalSyncBatchSettled> => {
    const lastEnd = lastBatchEndedAtByToken.get(tokenKey) ?? 0;
    const now = Date.now();
    const sinceLastEnd = now - lastEnd;
    if (lastEnd !== 0 && sinceLastEnd < MIN_MS_BETWEEN_BATCH_STARTS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_MS_BETWEEN_BATCH_STARTS - sinceLastEnd));
    }

    const [profileResult, bookingsResult, authResult, professionalDirectoryResult] = await Promise.allSettled([
      apiRequest<ProfileMeApiResponse>("/api/profiles/me", {}, params.token),
      apiRequest<BookingsMineApiResponse>("/api/bookings/mine", {}, params.token),
      apiRequest<AuthMeApiResponse>("/api/auth/me", {}, params.token),
      fetchProfessionalDirectory(params.token, params.language)
    ]);
    lastBatchEndedAtByToken.set(tokenKey, Date.now());
    return { profileResult, bookingsResult, authResult, professionalDirectoryResult };
  })().finally(() => {
    inFlightByToken.delete(tokenKey);
  });

  inFlightByToken.set(tokenKey, pending);
  return pending;
}
