import { env } from "../config/env.js";

/**
 * Pacientes que deben recibir el "prep" invisible de staging (intake + pro test + reserva demo).
 * - `isTestUser` (cuentas del seed de verificación de Google).
 * - O email listado en `REVIEWER_STAGING_PREP_EMAIL_ALLOWLIST` (coma).
 */
export function shouldApplyReviewerStagingPatientPrep(email: string, isTestUser: boolean): boolean {
  if (!env.REVIEWER_STAGING_PREP_ENABLED) {
    return false;
  }
  if (isTestUser) {
    return true;
  }
  const raw = env.REVIEWER_STAGING_PREP_EMAIL_ALLOWLIST.trim();
  if (!raw) {
    return false;
  }
  const lowered = email.trim().toLowerCase();
  return raw.split(",").some((part) => {
    const e = part.trim().toLowerCase();
    return e.length > 0 && e === lowered;
  });
}
