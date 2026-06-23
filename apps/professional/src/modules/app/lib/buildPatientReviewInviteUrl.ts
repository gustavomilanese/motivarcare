import { PATIENT_PORTAL_URL } from "../services/api";

export function buildPatientReviewInviteUrl(professionalId: string): string {
  const base = PATIENT_PORTAL_URL.replace(/\/+$/, "");
  return `${base}/?dejar-opinion=${encodeURIComponent(professionalId)}`;
}
