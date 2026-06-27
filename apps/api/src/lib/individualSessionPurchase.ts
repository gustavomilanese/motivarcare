import type { Market } from "@prisma/client";
import { billingCurrencyCodeForMarket } from "@therapy/types";
import { prisma } from "./prisma.js";
import { resolveDlocalChargeAmount } from "./dlocalChargeAmount.js";
import { listPriceMajorUnitsForPackageMarket } from "./professionalSessionListPrice.js";
import {
  normalizeCatalogFallbackToUsdCents,
  resolvePackagePricingFromUsd
} from "./resolveSessionPackagePrice.js";
import { getResilientUsdArsRate } from "./usdArsExchangeResilient.js";

const PATIENT_ACTIVE_ASSIGNMENTS_KEY = "patient-active-assignments";
const AUTO_INDIVIDUAL_SESSION_STRIPE_ID = "motivar-auto-catalog-individual-1";
const DEFAULT_INDIVIDUAL_SESSION_USD_CENTS = 6500;

function parsePatientAssignments(value: unknown): Record<string, string | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const assignments: Record<string, string | null> = {};
  for (const [patientId, professionalId] of entries) {
    assignments[patientId] = typeof professionalId === "string" && professionalId.trim().length > 0 ? professionalId : null;
  }
  return assignments;
}

async function loadUsdArsRateOrNull(): Promise<number | null> {
  try {
    return await getResilientUsdArsRate();
  } catch {
    return null;
  }
}

export async function getOrCreateGlobalIndividualSessionPackage(market: Market): Promise<{
  id: string;
  name: string;
  credits: number;
  active: boolean;
  priceCents: number;
  discountPercent: number;
  currency: string | null;
  professionalId: string | null;
}> {
  const existing = await prisma.sessionPackage.findFirst({
    where: { active: true, credits: 1, professionalId: null, market },
    select: {
      id: true,
      name: true,
      credits: true,
      active: true,
      priceCents: true,
      discountPercent: true,
      currency: true,
      professionalId: true
    },
    orderBy: [{ createdAt: "asc" }]
  });
  if (existing) {
    return existing;
  }

  const referenceBundle = await prisma.sessionPackage.findFirst({
    where: { active: true, credits: { gt: 1 }, professionalId: null, market },
    orderBy: [{ credits: "asc" }],
    select: { priceCents: true, credits: true, currency: true }
  });

  const arsPerUsd = await loadUsdArsRateOrNull();
  const priceCents = referenceBundle
    ? Math.max(
        100,
        normalizeCatalogFallbackToUsdCents({
          fallbackPriceCents: Math.round(referenceBundle.priceCents / referenceBundle.credits),
          fallbackCurrency: referenceBundle.currency ?? "usd",
          arsPerUsd
        })
      )
    : DEFAULT_INDIVIDUAL_SESSION_USD_CENTS;
  const currency = "usd";
  const paymentProvider = market === "AR" ? "MERCADOPAGO" : "STRIPE";

  return prisma.sessionPackage.upsert({
    where: { market_stripePriceId: { market, stripePriceId: AUTO_INDIVIDUAL_SESSION_STRIPE_ID } },
    create: {
      market,
      paymentProvider,
      stripePriceId: AUTO_INDIVIDUAL_SESSION_STRIPE_ID,
      name: "Sesión individual",
      credits: 1,
      priceCents,
      discountPercent: 0,
      currency,
      active: true,
      professionalId: null
    },
    update: {
      active: true
    },
    select: {
      id: true,
      name: true,
      credits: true,
      active: true,
      priceCents: true,
      discountPercent: true,
      currency: true,
      professionalId: true
    }
  });
}

export type IndividualSessionsPurchaseQuote = {
  patientId: string;
  market: Market;
  billingCurrency: string;
  unitPackageId: string;
  sessionCount: number;
  displayName: string;
  professionalIdSnapshot: string | null;
  unitPricing: {
    listPriceCents: number;
    priceCents: number;
    discountPercent: number;
  };
  totalPricing: {
    listPriceCents: number;
    priceCents: number;
    discountPercent: number;
  };
  chargeAmountMajor: number;
  chargeCurrency: string;
};

export function chargeAmountMajorForMarket(params: {
  market: import("@prisma/client").Market;
  priceUsdCents: number;
  arsPerUsd: number | null;
}): { amountMajor: number; currency: string } {
  return resolveDlocalChargeAmount(params);
}

export async function resolveIndividualSessionsPurchaseQuote(params: {
  patientId: string;
  sessionCount: number;
}): Promise<IndividualSessionsPurchaseQuote> {
  if (!Number.isInteger(params.sessionCount) || params.sessionCount < 1 || params.sessionCount > 99) {
    throw new Error("Invalid session count");
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: params.patientId },
    select: { id: true, market: true }
  });
  if (!patient) {
    throw new Error("Patient profile not found");
  }

  const unitPackage = await getOrCreateGlobalIndividualSessionPackage(patient.market);
  const [assignmentConfig, arsPerUsd] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } }),
    loadUsdArsRateOrNull()
  ]);

  const assignments = parsePatientAssignments(assignmentConfig?.value);
  const activeProfessionalId = assignments[patient.id] ?? null;
  const activeProfessional = activeProfessionalId
    ? await prisma.professionalProfile.findUnique({
        where: { id: activeProfessionalId },
        select: {
          id: true,
          market: true,
          sessionPriceArs: true,
          sessionPriceUsd: true,
          discount4: true,
          discount8: true,
          discount12: true
        }
      })
    : null;

  const sessionListPriceUsdMajor =
    activeProfessional != null
      ? listPriceMajorUnitsForPackageMarket(activeProfessional, patient.market, arsPerUsd)
      : null;
  const unitPricing = resolvePackagePricingFromUsd({
    credits: 1,
    fallbackPriceCents: unitPackage.priceCents,
    fallbackCurrency: unitPackage.currency ?? "usd",
    fallbackDiscountPercent: unitPackage.discountPercent,
    sessionListPriceUsdMajor,
    profileDiscount4: activeProfessional?.discount4,
    profileDiscount8: activeProfessional?.discount8,
    profileDiscount12: activeProfessional?.discount12,
    arsPerUsd
  });

  const sessionCount = params.sessionCount;
  const totalPricing = {
    listPriceCents: unitPricing.listPriceCents * sessionCount,
    priceCents: unitPricing.priceCents * sessionCount,
    discountPercent: unitPricing.discountPercent
  };
  const charge = chargeAmountMajorForMarket({
    market: patient.market,
    priceUsdCents: totalPricing.priceCents,
    arsPerUsd
  });

  return {
    patientId: patient.id,
    market: patient.market,
    billingCurrency: billingCurrencyCodeForMarket(patient.market),
    unitPackageId: unitPackage.id,
    sessionCount,
    displayName: `Sesiones individuales (×${sessionCount})`,
    professionalIdSnapshot: activeProfessional?.id ?? null,
    unitPricing: {
      listPriceCents: unitPricing.listPriceCents,
      priceCents: unitPricing.priceCents,
      discountPercent: unitPricing.discountPercent
    },
    totalPricing,
    chargeAmountMajor: charge.amountMajor,
    chargeCurrency: charge.currency
  };
}
