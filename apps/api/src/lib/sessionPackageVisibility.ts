import type { SessionPackagesVisibilityPayload } from "@therapy/types";
import { z } from "zod";
import type { Market } from "@prisma/client";

const MAX_VISIBLE = 3;

const sessionPackagesVisibilityStoredSchema = z
  .object({
    landing: z.array(z.string().min(1)).max(MAX_VISIBLE),
    patient: z.array(z.string().min(1)).max(MAX_VISIBLE),
    patientByMarket: z
      .object({
        AR: z.array(z.string().min(1)).max(MAX_VISIBLE).optional(),
        US: z.array(z.string().min(1)).max(MAX_VISIBLE).optional()
      })
      .optional(),
    featuredLanding: z.string().min(1).nullable().optional(),
    featuredPatient: z.string().min(1).nullable().optional(),
    featuredPatientByMarket: z
      .object({
        AR: z.string().min(1).nullable().optional(),
        US: z.string().min(1).nullable().optional()
      })
      .optional()
  })
  .passthrough();

/** @deprecated usar `SessionPackagesVisibilityPayload` desde `@therapy/types` */
export type SessionPackagesVisibilityNormalized = SessionPackagesVisibilityPayload;

function dedupeMax(ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (!out.includes(id)) {
      out.push(id);
    }
    if (out.length >= MAX_VISIBLE) {
      break;
    }
  }
  return out;
}

/**
 * Normaliza el JSON guardado en SystemConfig (compatibilidad con `patient` solo en AR).
 */
export function parseSessionPackagesVisibility(value: unknown): SessionPackagesVisibilityPayload {
  const parsed = sessionPackagesVisibilityStoredSchema.safeParse(value);
  if (!parsed.success) {
    return {
      landing: [],
      patient: [],
      patientByMarket: { AR: [], US: [] },
      featuredLanding: null,
      featuredPatient: null,
      featuredPatientByMarket: { AR: null, US: null }
    };
  }

  const data = parsed.data;
  const patientLegacy = dedupeMax(data.patient ?? []);
  const arFromSplit = data.patientByMarket?.AR ? dedupeMax(data.patientByMarket.AR) : [];
  const usFromSplit = data.patientByMarket?.US ? dedupeMax(data.patientByMarket.US) : [];

  const patientByMarket = {
    AR: arFromSplit.length > 0 ? arFromSplit : patientLegacy,
    US: usFromSplit
  };

  return {
    landing: dedupeMax(data.landing ?? []),
    patient: patientByMarket.AR,
    patientByMarket,
    featuredLanding: data.featuredLanding ?? null,
    featuredPatient: data.featuredPatient ?? null,
    featuredPatientByMarket: {
      AR: data.featuredPatientByMarket?.AR ?? data.featuredPatient ?? null,
      US: data.featuredPatientByMarket?.US ?? null
    }
  };
}

export function patientVisibilityIdsForMarket(
  visibility: SessionPackagesVisibilityPayload,
  market: Market
): string[] {
  return market === "US" ? visibility.patientByMarket.US : visibility.patientByMarket.AR;
}

export function featuredPatientIdForMarket(
  visibility: SessionPackagesVisibilityPayload,
  market: Market
): string | null {
  if (market === "US") {
    const v = visibility.featuredPatientByMarket.US;
    return v && visibility.patientByMarket.US.includes(v) ? v : null;
  }
  const v = visibility.featuredPatientByMarket.AR ?? visibility.featuredPatient;
  return v && visibility.patientByMarket.AR.includes(v) ? v : null;
}

export const sessionPackagesVisibilityPutSchema = z.object({
  landing: z.array(z.string().min(1)).max(MAX_VISIBLE),
  patient: z.array(z.string().min(1)).max(MAX_VISIBLE),
  patientByMarket: z
    .object({
      AR: z.array(z.string().min(1)).max(MAX_VISIBLE),
      US: z.array(z.string().min(1)).max(MAX_VISIBLE)
    })
    .optional(),
  featuredLanding: z.string().min(1).nullable().optional(),
  featuredPatient: z.string().min(1).nullable().optional(),
  featuredPatientByMarket: z
    .object({
      AR: z.string().min(1).nullable().optional(),
      US: z.string().min(1).nullable().optional()
    })
    .optional()
});

export function visibilityPayloadForStorage(
  parsed: z.infer<typeof sessionPackagesVisibilityPutSchema>
): SessionPackagesVisibilityPayload {
  const patientByMarket = {
    AR: dedupeMax(parsed.patientByMarket?.AR ?? parsed.patient),
    US: dedupeMax(parsed.patientByMarket?.US ?? [])
  };
  return {
    landing: dedupeMax(parsed.landing),
    patient: patientByMarket.AR,
    patientByMarket,
    featuredLanding: parsed.featuredLanding ?? null,
    featuredPatient: parsed.featuredPatient ?? null,
    featuredPatientByMarket: {
      AR: parsed.featuredPatientByMarket?.AR ?? parsed.featuredPatient ?? null,
      US: parsed.featuredPatientByMarket?.US ?? null
    }
  };
}
