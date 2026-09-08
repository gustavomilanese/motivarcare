import type { AppLanguage } from "@therapy/i18n-config";
import { fetchProfessionalDirectory } from "../../matching/services/professionals";
import { apiRequest } from "../services/api";
import type {
  AuthMeApiResponse,
  BookingsMineApiResponse,
  ProfileMeApiResponse
} from "../types";

export type PatientPortalCoreSyncSettled = {
  profileResult: PromiseSettledResult<ProfileMeApiResponse>;
  bookingsResult: PromiseSettledResult<BookingsMineApiResponse>;
  authResult: PromiseSettledResult<AuthMeApiResponse>;
};

export type PatientPortalSyncBatchSettled = PatientPortalCoreSyncSettled & {
  professionalDirectoryResult: PromiseSettledResult<Awaited<ReturnType<typeof fetchProfessionalDirectory>>>;
};

/**
 * Una sola petición en vuelo por token (el epoch del caller se ignora para la coalescencia).
 * Antes: clave `token+epoch` → cada bump de epoch (cleanup / resync) abría un lote nuevo en paralelo
 * y el navegador spameaba GET cada ~15ms.
 */
const inFlightCoreByToken = new Map<string, Promise<PatientPortalCoreSyncSettled>>();
const inFlightDirectoryByToken = new Map<string, Promise<Awaited<ReturnType<typeof fetchProfessionalDirectory>>>>();
/** Fin del último lote completado por token (ms); 0 = aún no hubo ninguno en esta sesión de página. */
const lastCoreEndedAtByToken = new Map<string, number>();
/** Si llegó un `forceFresh` mientras había lote en vuelo, encadenamos UNO solo al terminar. */
const pendingForceCoreByToken = new Set<string>();

/** Mínimo tiempo entre el *inicio* de dos lotes core consecutivos para el mismo token. */
const MIN_MS_BETWEEN_BATCH_STARTS = 2200;

/** Evita “Cargando tu perfil…” infinito si el API no responde (red, CORS, backend colgado). */
const PATIENT_PORTAL_SYNC_TIMEOUT_MS = 45_000;

function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

async function runPatientPortalCoreSync(params: {
  token: string;
  skipThrottle?: boolean;
}): Promise<PatientPortalCoreSyncSettled> {
  const tokenKey = params.token;
  if (!params.skipThrottle) {
    const lastEnd = lastCoreEndedAtByToken.get(tokenKey) ?? 0;
    const now = Date.now();
    const sinceLastEnd = now - lastEnd;
    if (lastEnd !== 0 && sinceLastEnd < MIN_MS_BETWEEN_BATCH_STARTS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_MS_BETWEEN_BATCH_STARTS - sinceLastEnd));
    }
  }

  // Solo lo imprescindible para levantar el shell. El matching (~2s en local) va aparte.
  const [profileResult, bookingsResult, authResult] = await Promise.allSettled([
    apiRequest<ProfileMeApiResponse>("/api/profiles/me", {}, params.token),
    apiRequest<BookingsMineApiResponse>("/api/bookings/mine", {}, params.token),
    apiRequest<AuthMeApiResponse>("/api/auth/me", {}, params.token)
  ]);
  lastCoreEndedAtByToken.set(tokenKey, Date.now());
  return { profileResult, bookingsResult, authResult };
}

/**
 * Sync crítico del login: perfil + reservas + auth.
 * No incluye matching: ese endpoint es lento y no debe dejar al usuario mirando el spinner.
 */
export function fetchPatientPortalCoreSyncShared(params: {
  token: string;
  epoch: number;
  forceFresh?: boolean;
}): Promise<PatientPortalCoreSyncSettled> {
  void params.epoch;
  const tokenKey = params.token;
  const existing = inFlightCoreByToken.get(tokenKey);

  if (params.forceFresh) {
    lastCoreEndedAtByToken.delete(tokenKey);
    if (existing) {
      const alreadyQueued = pendingForceCoreByToken.has(tokenKey);
      pendingForceCoreByToken.add(tokenKey);
      if (alreadyQueued) {
        return existing;
      }
      return existing.catch(() => undefined).then(() => {
        pendingForceCoreByToken.delete(tokenKey);
        return fetchPatientPortalCoreSyncShared({
          token: params.token,
          epoch: params.epoch,
          forceFresh: true
        });
      });
    }
  } else if (existing) {
    return existing;
  }

  const pending = Promise.race([
    runPatientPortalCoreSync({
      token: params.token,
      skipThrottle: Boolean(params.forceFresh)
    }),
    rejectAfter(PATIENT_PORTAL_SYNC_TIMEOUT_MS, "Patient portal sync timed out waiting for API")
  ]).finally(() => {
    if (inFlightCoreByToken.get(tokenKey) === pending) {
      inFlightCoreByToken.delete(tokenKey);
    }
  });

  inFlightCoreByToken.set(tokenKey, pending);
  return pending;
}

/** Directorio / matching en segundo plano (puede tardar; no bloquea el login). */
export function fetchPatientPortalDirectoryShared(params: {
  token: string;
  language: AppLanguage;
}): Promise<Awaited<ReturnType<typeof fetchProfessionalDirectory>>> {
  const tokenKey = `${params.token}::${params.language}`;
  const existing = inFlightDirectoryByToken.get(tokenKey);
  if (existing) {
    return existing;
  }

  const pending = fetchProfessionalDirectory(params.token, params.language).finally(() => {
    if (inFlightDirectoryByToken.get(tokenKey) === pending) {
      inFlightDirectoryByToken.delete(tokenKey);
    }
  });
  inFlightDirectoryByToken.set(tokenKey, pending);
  return pending;
}

/**
 * Compat: un solo await con matching incluido (tests / callers viejos).
 * Preferir `fetchPatientPortalCoreSyncShared` + `fetchPatientPortalDirectoryShared`.
 */
export async function fetchPatientPortalSyncBatchShared(params: {
  token: string;
  epoch: number;
  language: AppLanguage;
  forceFresh?: boolean;
}): Promise<PatientPortalSyncBatchSettled> {
  const core = await fetchPatientPortalCoreSyncShared({
    token: params.token,
    epoch: params.epoch,
    forceFresh: params.forceFresh
  });
  const professionalDirectoryResult = await Promise.allSettled([
    fetchPatientPortalDirectoryShared({
      token: params.token,
      language: params.language
    })
  ]).then((rows) => rows[0]!);

  return { ...core, professionalDirectoryResult };
}
