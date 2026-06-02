import { env } from "../config/env.js";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Enlace al modal de edición del paciente en el portal Admin (requiere sesión admin). */
export function buildAdminPatientEditLink(patientId: string): string {
  const base = stripTrailingSlash(env.ADMIN_APP_URL);
  const params = new URLSearchParams({ patientId, edit: "1" });
  return `${base}/patients?${params.toString()}`;
}
