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
