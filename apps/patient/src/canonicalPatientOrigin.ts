/**
 * Si el paciente abre el SPA en un hostname legacy (preview Vercel u otro definido por env),
 * redirige a producción antes de montar React. Preserva pathname, query y hash (incluye /verify-email?token=…).
 *
 * Definí en Vercel (proyecto paciente): `VITE_CANONICAL_PATIENT_ORIGIN=https://app.motivarcare.com`
 */
export function redirectLegacyPatientHostToCanonical(): void {
  if (typeof window === "undefined") return;

  const canonicalBase = import.meta.env.VITE_CANONICAL_PATIENT_ORIGIN?.trim().replace(/\/+$/, "");
  if (!canonicalBase) return;

  let canonicalHost: string;
  try {
    canonicalHost = new URL(canonicalBase).host;
  } catch {
    return;
  }

  const host = window.location.hostname;
  if (host === canonicalHost) return;
  if (host === "localhost" || host === "127.0.0.1") return;

  const extraLegacy = (import.meta.env.VITE_LEGACY_PATIENT_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const legacyHosts = new Set<string>(["motivarcare-patient.vercel.app", ...extraLegacy]);

  if (!legacyHosts.has(host)) return;

  window.location.replace(`${canonicalBase}${window.location.pathname}${window.location.search}${window.location.hash}`);
}
