import type { AppLanguage, LocalizedText } from "@therapy/i18n-config";
import { textByLanguage } from "@therapy/i18n-config";
import type { LandingPackagesSlotId, SessionPackagesVisibilityPayload } from "@therapy/types";
import type { AdminMarket } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** API antigua o payload parcial puede omitir mercados → normalizar a AR/US/BR/ES. */
export function normalizeSessionPackagesVisibility(raw: unknown): SessionPackagesVisibilityPayload {
  const empty: SessionPackagesVisibilityPayload = {
    landing: [],
    landingPatientV2: [],
    landingProfessional: [],
    patient: [],
    patientByMarket: { AR: [], US: [], BR: [], ES: [] },
    featuredLanding: null,
    featuredLandingPatientV2: null,
    featuredLandingProfessional: null,
    featuredPatient: null,
    featuredPatientByMarket: { AR: null, US: null, BR: null, ES: null }
  };
  if (!raw || typeof raw !== "object") {
    return empty;
  }
  const v = raw as Partial<SessionPackagesVisibilityPayload>;
  const patientLegacy = Array.isArray(v.patient) ? v.patient : [];
  const pbm = v.patientByMarket;
  const arList = Array.isArray(pbm?.AR) ? pbm.AR : patientLegacy;
  const usList = Array.isArray(pbm?.US) ? pbm.US : [];
  const brList = Array.isArray(pbm?.BR) ? pbm.BR : usList;
  const esList = Array.isArray(pbm?.ES) ? pbm.ES : usList;
  const fpm = v.featuredPatientByMarket;
  return {
    landing: Array.isArray(v.landing) ? v.landing : empty.landing,
    landingPatientV2: Array.isArray(v.landingPatientV2) ? v.landingPatientV2 : empty.landingPatientV2,
    landingProfessional: Array.isArray(v.landingProfessional) ? v.landingProfessional : empty.landingProfessional,
    patient: arList,
    patientByMarket: { AR: arList, US: usList, BR: brList, ES: esList },
    featuredLanding: v.featuredLanding ?? null,
    featuredLandingPatientV2: v.featuredLandingPatientV2 ?? null,
    featuredLandingProfessional: v.featuredLandingProfessional ?? null,
    featuredPatient: v.featuredPatient ?? null,
    featuredPatientByMarket: {
      AR: (fpm && typeof fpm === "object" ? fpm.AR : undefined) ?? v.featuredPatient ?? null,
      US: (fpm && typeof fpm === "object" ? fpm.US : undefined) ?? null,
      BR: (fpm && typeof fpm === "object" ? fpm.BR : undefined) ?? null,
      ES: (fpm && typeof fpm === "object" ? fpm.ES : undefined) ?? null
    }
  };
}

export function withSafeVisibility(current: SessionPackagesVisibilityPayload): SessionPackagesVisibilityPayload {
  return {
    ...current,
    landingPatientV2: current.landingPatientV2 ?? [],
    landingProfessional: current.landingProfessional ?? [],
    featuredLandingPatientV2: current.featuredLandingPatientV2 ?? null,
    featuredLandingProfessional: current.featuredLandingProfessional ?? null,
    patientByMarket: current.patientByMarket ?? { AR: [], US: [], BR: [], ES: [] },
    featuredPatientByMarket: current.featuredPatientByMarket ?? { AR: null, US: null, BR: null, ES: null }
  };
}

export function readLandingListForSlot(v: SessionPackagesVisibilityPayload, slot: LandingPackagesSlotId): string[] {
  if (slot === "patient_main") {
    return v.landing;
  }
  if (slot === "patient_v2") {
    return v.landingPatientV2;
  }
  return v.landingProfessional;
}

export function readFeaturedLandingForSlot(
  v: SessionPackagesVisibilityPayload,
  slot: LandingPackagesSlotId
): string | null {
  if (slot === "patient_main") {
    return v.featuredLanding;
  }
  if (slot === "patient_v2") {
    return v.featuredLandingPatientV2;
  }
  return v.featuredLandingProfessional;
}

export function landingSlotShortLabel(language: AppLanguage, slot: LandingPackagesSlotId): string {
  const labels: Record<LandingPackagesSlotId, LocalizedText> = {
    patient_main: { es: "Landing paciente (principal)", en: "Patient landing (main)", pt: "Landing paciente (principal)" },
    patient_v2: { es: "Landing paciente v2", en: "Patient landing v2", pt: "Landing paciente v2" },
    professional: { es: "Landing profesionales", en: "Professional landing", pt: "Landing profissionais" }
  };
  return t(language, labels[slot]);
}

export function patientPortalChannelLabel(language: AppLanguage, market: AdminMarket): string {
  const labels: Record<AdminMarket, LocalizedText> = {
    AR: { es: "portal AR", en: "AR portal", pt: "portal AR" },
    US: { es: "portal US (USD)", en: "US portal (USD)", pt: "portal US (USD)" },
    BR: { es: "portal BR", en: "BR portal", pt: "portal BR" },
    ES: { es: "portal ES", en: "ES portal", pt: "portal ES" }
  };
  return t(language, labels[market]);
}
