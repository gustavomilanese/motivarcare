export type PatientHomeVariant = "next" | "classic";

export const PATIENT_HOME_VARIANT_STORAGE_KEY = "mc.patient.homeVariant";

export function readPatientHomeVariant(): PatientHomeVariant {
  if (typeof window === "undefined") {
    return "classic";
  }
  try {
    const raw = window.localStorage.getItem(PATIENT_HOME_VARIANT_STORAGE_KEY);
    if (raw === "classic" || raw === "next") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "classic";
}

export function writePatientHomeVariant(variant: PatientHomeVariant): void {
  try {
    window.localStorage.setItem(PATIENT_HOME_VARIANT_STORAGE_KEY, variant);
  } catch {
    // ignore
  }
}

/** Rutas del portal que usan el mismo chrome que Inicio next (rail + top bar + footer). */
export function isPatientHomeMlShellPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/sessions") return true;
  if (pathname === "/chat") return true;
  if (pathname.startsWith("/diario")) return true;
  if (pathname.startsWith("/ejercicios")) return true;
  if (pathname === "/bienestar/musica") return true;
  if (pathname.startsWith("/profile")) return true;
  if (pathname.startsWith("/profesionales")) return true;
  return false;
}
