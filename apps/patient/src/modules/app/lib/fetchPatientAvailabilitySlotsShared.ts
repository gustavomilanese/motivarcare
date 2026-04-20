import { apiRequest } from "../services/api";
import type { AvailabilitySlotsApiResponse } from "../types";

const inFlightByTokenAndProfessional = new Map<string, Promise<AvailabilitySlotsApiResponse>>();

function slotsKey(token: string, professionalId: string): string {
  return `${token}\0${professionalId}`;
}

/**
 * Coalesce in-flight availability for the same pro+token. `from`/`to` suelen variar unos ms
 * entre renders y rompen 304; compartir la misma promesa evita ráfagas idénticas.
 */
export function fetchSharedPatientAvailabilitySlots(params: {
  token: string;
  professionalId: string;
  from: Date;
  to: Date;
}): Promise<AvailabilitySlotsApiResponse> {
  const key = slotsKey(params.token, params.professionalId);
  const existing = inFlightByTokenAndProfessional.get(key);
  if (existing) {
    return existing;
  }

  const fromIso = params.from.toISOString();
  const toIso = params.to.toISOString();
  const pending = apiRequest<AvailabilitySlotsApiResponse>(
    `/api/availability/${params.professionalId}/slots?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
    {},
    params.token
  ).finally(() => {
    inFlightByTokenAndProfessional.delete(key);
  });

  inFlightByTokenAndProfessional.set(key, pending);
  return pending;
}
