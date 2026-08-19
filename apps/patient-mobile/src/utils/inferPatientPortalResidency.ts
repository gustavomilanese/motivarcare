import { inferPatientPortalResidencyIso2 as inferFromTypes } from "@therapy/types";

/**
 * Sin selector en registro móvil: la API exige ISO2.
 * Zona horaria primero: Chrome/iOS `en-US` en Argentina no debe mandar US.
 */
export function inferPatientPortalResidencyIso2(): string {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    return inferFromTypes({
      locales: [resolved.locale],
      timezone: resolved.timeZone
    });
  } catch {
    return inferFromTypes();
  }
}
