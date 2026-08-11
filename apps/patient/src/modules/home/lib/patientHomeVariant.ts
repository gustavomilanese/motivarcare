export type PatientHomeVariant = "next" | "classic";

export type PatientHomeView = "ml" | "classic";

/** v2: corte a Inicio ML por defecto; la clásica queda solo como escape hatch. */
export const PATIENT_HOME_VARIANT_STORAGE_KEY = "mc.patient.homeVariant.v2";

export const PATIENT_HOME_VARIANT_EVENT = "mc-patient-home-variant";

export function readPatientHomeVariant(): PatientHomeVariant {
  if (typeof window === "undefined") {
    return "next";
  }
  try {
    const raw = window.localStorage.getItem(PATIENT_HOME_VARIANT_STORAGE_KEY);
    if (raw === "classic" || raw === "next") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "next";
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

/** Inicio RN-web (≤680px) solo con variant classic; ML muestra NextActionHome en todos los viewports. */
export function shouldMountDashboardRnHome(view: PatientHomeView): boolean {
  return view === "classic";
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
