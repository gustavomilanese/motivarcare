import type { SessionPackagesVisibilityPayload } from "@therapy/types";
import { z } from "zod";
import type { Market } from "@prisma/client";

const MAX_VISIBLE = 3;

const marketPatientArraysSchema = z
  .object({
    AR: z.array(z.string().min(1)).max(MAX_VISIBLE).optional(),
    US: z.array(z.string().min(1)).max(MAX_VISIBLE).optional(),
    BR: z.array(z.string().min(1)).max(MAX_VISIBLE).optional(),
    ES: z.array(z.string().min(1)).max(MAX_VISIBLE).optional()
  })
  .optional();

const marketFeaturedSchema = z
  .object({
    AR: z.string().min(1).nullable().optional(),
    US: z.string().min(1).nullable().optional(),
    BR: z.string().min(1).nullable().optional(),
    ES: z.string().min(1).nullable().optional()
  })
  .optional();

const sessionPackagesVisibilityStoredSchema = z
  .object({
    landing: z.array(z.string().min(1)).max(MAX_VISIBLE),
    patient: z.array(z.string().min(1)).max(MAX_VISIBLE),
    patientByMarket: marketPatientArraysSchema,
    featuredLanding: z.string().min(1).nullable().optional(),
    featuredPatient: z.string().min(1).nullable().optional(),
    featuredPatientByMarket: marketFeaturedSchema
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

function emptyPatientByMarket(): SessionPackagesVisibilityPayload["patientByMarket"] {
  return { AR: [], US: [], BR: [], ES: [] };
}

function emptyFeaturedByMarket(): SessionPackagesVisibilityPayload["featuredPatientByMarket"] {
  return { AR: null, US: null, BR: null, ES: null };
}

/**
 * Normaliza el JSON guardado en SystemConfig (compatibilidad con `patient` solo en AR y con solo AR/US).
 */
export function parseSessionPackagesVisibility(value: unknown): SessionPackagesVisibilityPayload {
  const parsed = sessionPackagesVisibilityStoredSchema.safeParse(value);
  if (!parsed.success) {
    return {
      landing: [],
      patient: [],
      patientByMarket: emptyPatientByMarket(),
      featuredLanding: null,
      featuredPatient: null,
      featuredPatientByMarket: emptyFeaturedByMarket()
    };
  }

  const data = parsed.data;
  const patientLegacy = dedupeMax(data.patient ?? []);
  const pbm = data.patientByMarket;
  const arFromSplit = pbm?.AR ? dedupeMax(pbm.AR) : [];
  const usFromSplit = pbm?.US ? dedupeMax(pbm.US) : [];
  const brFromSplit = pbm?.BR ? dedupeMax(pbm.BR) : [];
  const esFromSplit = pbm?.ES ? dedupeMax(pbm.ES) : [];

  const patientByMarket = {
    AR: arFromSplit.length > 0 ? arFromSplit : patientLegacy,
    US: usFromSplit,
    BR: brFromSplit.length > 0 ? brFromSplit : usFromSplit,
    ES: esFromSplit.length > 0 ? esFromSplit : usFromSplit
  };

  const fpm = data.featuredPatientByMarket;

  return {
    landing: dedupeMax(data.landing ?? []),
    patient: patientByMarket.AR,
    patientByMarket,
    featuredLanding: data.featuredLanding ?? null,
    featuredPatient: data.featuredPatient ?? null,
    featuredPatientByMarket: {
      AR: fpm?.AR ?? data.featuredPatient ?? null,
      US: fpm?.US ?? null,
      BR: fpm?.BR ?? null,
      ES: fpm?.ES ?? null
    }
  };
}

export function patientVisibilityIdsForMarket(
  visibility: SessionPackagesVisibilityPayload,
  market: Market
): string[] {
  return visibility.patientByMarket[market];
}

export function featuredPatientIdForMarket(
  visibility: SessionPackagesVisibilityPayload,
  market: Market
): string | null {
  const v = visibility.featuredPatientByMarket[market];
  const ids = visibility.patientByMarket[market];
  return v && ids.includes(v) ? v : null;
}

export const sessionPackagesVisibilityPutSchema = z.object({
  landing: z.array(z.string().min(1)).max(MAX_VISIBLE),
  patient: z.array(z.string().min(1)).max(MAX_VISIBLE),
  patientByMarket: z
    .object({
      AR: z.array(z.string().min(1)).max(MAX_VISIBLE),
      US: z.array(z.string().min(1)).max(MAX_VISIBLE),
      BR: z.array(z.string().min(1)).max(MAX_VISIBLE),
      ES: z.array(z.string().min(1)).max(MAX_VISIBLE)
    })
    .optional(),
  featuredLanding: z.string().min(1).nullable().optional(),
  featuredPatient: z.string().min(1).nullable().optional(),
  featuredPatientByMarket: z
    .object({
      AR: z.string().min(1).nullable().optional(),
      US: z.string().min(1).nullable().optional(),
      BR: z.string().min(1).nullable().optional(),
      ES: z.string().min(1).nullable().optional()
    })
    .optional()
});

export function visibilityPayloadForStorage(
  parsed: z.infer<typeof sessionPackagesVisibilityPutSchema>
): SessionPackagesVisibilityPayload {
  const patientByMarket = {
    AR: dedupeMax(parsed.patientByMarket?.AR ?? parsed.patient),
    US: dedupeMax(parsed.patientByMarket?.US ?? []),
    BR: dedupeMax(parsed.patientByMarket?.BR ?? []),
    ES: dedupeMax(parsed.patientByMarket?.ES ?? [])
  };
  return {
    landing: dedupeMax(parsed.landing),
    patient: patientByMarket.AR,
    patientByMarket,
    featuredLanding: parsed.featuredLanding ?? null,
    featuredPatient: parsed.featuredPatient ?? null,
    featuredPatientByMarket: {
      AR: parsed.featuredPatientByMarket?.AR ?? parsed.featuredPatient ?? null,
      US: parsed.featuredPatientByMarket?.US ?? null,
      BR: parsed.featuredPatientByMarket?.BR ?? null,
      ES: parsed.featuredPatientByMarket?.ES ?? null
    }
  };
}
