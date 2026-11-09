export type PatientHomeVariant = "next" | "classic";

export type PatientHomeView = "ml" | "classic";

/** v3: la home calma (sobre la versión original) es la principal. ML queda como escape hatch. */
export const PATIENT_HOME_VARIANT_STORAGE_KEY = "mc.patient.homeVariant.v3";

export const PATIENT_HOME_VARIANT_EVENT = "mc-patient-home-variant";

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

export function setPatientHomeVariant(variant: PatientHomeVariant): void {
  writePatientHomeVariant(variant);
  try {
    window.dispatchEvent(new Event(PATIENT_HOME_VARIANT_EVENT));
  } catch {
    // ignore
  }
}

/** Qué superficie de Inicio montar (contenido). */
export function resolveHomeView(variant: PatientHomeVariant): PatientHomeView {
  return variant === "classic" ? "classic" : "ml";
}

/** La home calma es un solo layout. El bloque RN de la clásica ya no se monta. */
export function shouldMountDashboardRnHome(_view: PatientHomeView): boolean {
  return false;
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

/**
 * Chrome ML (rail + top bar) solo con variant next en desktop y rutas shell.
 * Clásica = chrome clásico 100% (sin mezclar rail/top ML).
 */
export function shouldUsePatientHomeMlChrome(params: {
  isMobilePortal: boolean;
  homeVariant: PatientHomeVariant;
  pathname: string;
}): boolean {
  return (
    !params.isMobilePortal &&
    params.homeVariant === "next" &&
    isPatientHomeMlShellPath(params.pathname)
  );
}
