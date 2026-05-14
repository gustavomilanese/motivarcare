import { env } from "../config/env.js";

/**
 * Staging: con `REVIEWER_STAGING_PREP_ENABLED=true`, **todo** paciente recibe al login/registro el prep
 * invisible (intake + profesional test + reserva demo). No usar en producción real.
 */
export function isReviewerStagingPatientPrepEnabled(): boolean {
  return env.REVIEWER_STAGING_PREP_ENABLED;
}
