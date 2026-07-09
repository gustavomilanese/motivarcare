import type { Market, PaymentCheckoutKind } from "@prisma/client";
import { billingCurrencyCodeForMarket } from "@therapy/types";
import { env } from "../../config/env.js";
import { createDlocalGoPayment, getDlocalGoPayment, isDlocalGoPaymentPaid } from "../../lib/dlocalGoClient.js";
import { setIdempotencyValue, getIdempotencyValue } from "../../lib/idempotencyStore.js";
import { listPriceMajorUnitsForPackageMarket } from "../../lib/professionalSessionListPrice.js";
import { prisma } from "../../lib/prisma.js";
import { resolvePackagePricingFromUsd } from "../../lib/resolveSessionPackagePrice.js";
import { getResilientUsdArsRate } from "../../lib/usdArsExchangeResilient.js";
import { getFinanceRules } from "../finance/finance.service.js";
import { sessionPackageAvailableForPatientMarket } from "../../lib/sessionPackageMarketAccess.js";
import { resolveIndividualSessionsPurchaseQuote } from "../../lib/individualSessionPurchase.js";
import { resolveDlocalChargeAmount } from "../../lib/dlocalChargeAmount.js";
import { assertPatientDlocalCheckoutAllowed } from "../../lib/dlocalPatientCheckout.js";
import { fulfillPaidIndividualSessionsPurchase, fulfillPaidPackagePurchase } from "./packagePurchaseFulfillment.js";
import { formatTrialPaymentDescription } from "../../lib/formatTrialPaymentDescription.js";
import type {
  DlocalOrderContext,
  DlocalTrialOrderContext
} from "./dlocalOrderContext.types.js";
export type {
  DlocalPackageOrderContext,
  DlocalTrialOrderContext,
  DlocalIndividualOrderContext,
  DlocalOrderContext
} from "./dlocalOrderContext.types.js";
import {
  createPaymentCheckout,
  expireSupersededPendingCheckouts,
  findRecentPendingPaymentCheckout,
  findPaymentCheckoutByReference,
  markPaymentCheckoutExpired,
  markPaymentCheckoutRedirected,
  recordPaymentCheckoutSyncAttempt,
  rebuildDlocalOrderContextFromCheckout
} from "./paymentCheckout.service.js";

const PATIENT_ACTIVE_ASSIGNMENTS_KEY = "patient-active-assignments";

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

const ORDER_CONTEXT_TTL_SECONDS = 7 * 24 * 60 * 60;
const TRIAL_PAYMENT_PROOF_TTL_SECONDS = 7 * 24 * 60 * 60;

export type DlocalPaymentSyncResult = {
  fulfilled: boolean;
  paymentStatus: string;
  purchaseId?: string | null;
  checkoutId?: string | null;
};

function appendDlocalOrderToUrl(url: string, orderId: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("dlocalOrder", orderId);
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}dlocalOrder=${encodeURIComponent(orderId)}`;
  }
}

async function loadUsdArsRateOrNull(): Promise<number | null> {
  try {
    return await getResilientUsdArsRate();
  } catch {
    return null;
  }
}

export type DlocalTrialPaymentProof = {
  paymentId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  paidAt: string;
};

function trialPaymentStoreKey(patientId: string): string {
  return `dlocal:trial-paid:${patientId}`;
}

export async function loadTrialPaymentProof(patientId: string): Promise<DlocalTrialPaymentProof | null> {
  const raw = await getIdempotencyValue(trialPaymentStoreKey(patientId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as DlocalTrialPaymentProof;
  } catch {
    return null;
  }
}

export async function clearTrialPaymentProof(patientId: string): Promise<void> {
  await setIdempotencyValue({
    key: trialPaymentStoreKey(patientId),
    value: "",
    ttlSeconds: 1
  });
}

export function trialPaymentMatchesBooking(
  proof: DlocalTrialPaymentProof,
  professionalId: string,
  startsAt: Date,
  endsAt: Date
): boolean {
  return (
    proof.professionalId === professionalId
    && proof.startsAt === startsAt.toISOString()
    && proof.endsAt === endsAt.toISOString()
  );
}

function orderContextKey(orderId: string): string {
  return `dlocal:order:${orderId}`;
}

export async function storeDlocalOrderContext(orderId: string, context: DlocalOrderContext): Promise<void> {
  await setIdempotencyValue({
    key: orderContextKey(orderId),
    value: JSON.stringify(context),
    ttlSeconds: ORDER_CONTEXT_TTL_SECONDS
  });
}

export async function loadDlocalOrderContext(orderId: string): Promise<DlocalOrderContext | null> {
  const raw = await getIdempotencyValue(orderContextKey(orderId));
  if (raw) {
    try {
      return JSON.parse(raw) as DlocalOrderContext;
    } catch {
      // fall through to durable checkout record
    }
  }
  return rebuildDlocalOrderContextFromCheckout(orderId);
}

async function persistDlocalOrderPaymentId(orderId: string, paymentId: string): Promise<void> {
  const context = await loadDlocalOrderContext(orderId);
  if (!context) {
    return;
  }
  await storeDlocalOrderContext(orderId, { ...context, paymentId });
}

async function loadPatientForDlocalCheckout(patientId: string) {
  return prisma.patientProfile.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      market: true,
      residencyCountry: true,
      user: {
        select: {
          fullName: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
}

function buildOrderId(patientId: string, packageId: string): string {
  return `mc-${patientId}-${packageId}-${Date.now().toString(36)}`;
}

type DlocalCheckoutResult = { checkoutUrl: string; paymentId: string; orderId: string };

const inflightDlocalCheckouts = new Map<string, Promise<DlocalCheckoutResult>>();

async function withDlocalProductCheckoutDedupe(params: {
  scopeKey: string;
  patientId: string;
  kind: PaymentCheckoutKind;
  packageId?: string | null;
  sessionCount?: number | null;
  create: () => Promise<DlocalCheckoutResult>;
}): Promise<DlocalCheckoutResult> {
  const inflight = inflightDlocalCheckouts.get(params.scopeKey);
  if (inflight) {
    return inflight;
  }

  const run = async (): Promise<DlocalCheckoutResult> => {
    const pending = await findRecentPendingPaymentCheckout({
      patientId: params.patientId,
      kind: params.kind,
      packageId: params.packageId,
      sessionCount: params.sessionCount
    });

    if (pending?.providerPaymentId && pending.providerOrderId) {
      try {
        const payment = await getDlocalGoPayment(pending.providerPaymentId);
        if (isDlocalGoPaymentPaid(payment.status)) {
          void processDlocalGoPaymentNotification(pending.providerPaymentId).catch(() => undefined);
          throw new Error("Payment already completed. Refresh to see your credits.");
        }
        const status = String(payment.status).trim().toUpperCase();
        if (status === "PENDING" && payment.redirect_url) {
          return {
            checkoutUrl: payment.redirect_url,
            paymentId: pending.providerPaymentId,
            orderId: pending.providerOrderId
          };
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("already completed")) {
          throw error;
        }
      }
      await markPaymentCheckoutExpired(pending.id);
    }

    await expireSupersededPendingCheckouts({
      patientId: params.patientId,
      kind: params.kind,
      packageId: params.packageId,
      sessionCount: params.sessionCount
    });
    return params.create();
  };

  const promise = run().finally(() => {
    inflightDlocalCheckouts.delete(params.scopeKey);
  });
  inflightDlocalCheckouts.set(params.scopeKey, promise);
  return promise;
}

export async function createDlocalCheckoutForPackage(params: {
  patientId: string;
  packageId: string;
  successUrl: string;
  backUrl: string;
}): Promise<DlocalCheckoutResult> {
  return withDlocalProductCheckoutDedupe({
    scopeKey: `pkg:${params.patientId}:${params.packageId}`,
    patientId: params.patientId,
    kind: "PACKAGE",
    packageId: params.packageId,
    create: () => createDlocalCheckoutForPackageCore(params)
  });
}

async function createDlocalCheckoutForPackageCore(params: {
  patientId: string;
  packageId: string;
  successUrl: string;
  backUrl: string;
}): Promise<DlocalCheckoutResult> {
  const patient = await loadPatientForDlocalCheckout(params.patientId);
  if (!patient) {
    throw new Error("Patient profile not found");
  }
  const payerCountry = assertPatientDlocalCheckoutAllowed(patient);

  const sessionPackage = await prisma.sessionPackage.findUnique({
    where: { id: params.packageId },
    select: {
      id: true,
      name: true,
      credits: true,
      active: true,
      priceCents: true,
      discountPercent: true,
      currency: true,
      professionalId: true,
      market: true
    }
  });
  if (!sessionPackage) {
    throw new Error("Session package not found");
  }
  if (!sessionPackageAvailableForPatientMarket(sessionPackage, patient.market)) {
    throw new Error("Package is not available in this patient's market");
  }
  if (!sessionPackage.active) {
    throw new Error("Session package is not active");
  }

  const [assignmentConfig, packageProfessional, arsPerUsdForPurchase] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } }),
    sessionPackage.professionalId
      ? prisma.professionalProfile.findUnique({
          where: { id: sessionPackage.professionalId },
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
      : Promise.resolve(null),
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

  const pricingProfessional = activeProfessional ?? packageProfessional;
  const sessionListPriceUsdMajor =
    pricingProfessional != null
      ? listPriceMajorUnitsForPackageMarket(pricingProfessional, patient.market, arsPerUsdForPurchase)
      : null;
  const pricing = resolvePackagePricingFromUsd({
    credits: sessionPackage.credits,
    fallbackPriceCents: sessionPackage.priceCents,
    fallbackCurrency: sessionPackage.currency ?? "usd",
    fallbackDiscountPercent: sessionPackage.discountPercent,
    sessionListPriceUsdMajor,
    profileDiscount4: pricingProfessional?.discount4,
    profileDiscount8: pricingProfessional?.discount8,
    profileDiscount12: pricingProfessional?.discount12,
    arsPerUsd: arsPerUsdForPurchase
  });

  const charge = resolveDlocalChargeAmount({
    market: patient.market,
    priceUsdCents: pricing.priceCents,
    arsPerUsd: arsPerUsdForPurchase
  });

  const orderId = buildOrderId(patient.id, sessionPackage.id);
  await storeDlocalOrderContext(orderId, {
    kind: "package",
    patientId: patient.id,
    packageId: sessionPackage.id,
    market: patient.market,
    professionalIdSnapshot: pricingProfessional?.id ?? null,
    pricing: {
      listPriceCents: pricing.listPriceCents,
      priceCents: pricing.priceCents,
      discountPercent: pricing.discountPercent
    },
    chargeAmountMajor: charge.amountMajor,
    chargeCurrency: charge.currency
  });

  await createPaymentCheckout({
    patientId: patient.id,
    kind: "PACKAGE",
    provider: "DLOCAL",
    providerOrderId: orderId,
    packageId: sessionPackage.id,
    displayName: sessionPackage.name,
    chargeAmountMajor: charge.amountMajor,
    chargeCurrency: charge.currency,
    metadata: {
      pricing: {
        listPriceCents: pricing.listPriceCents,
        priceCents: pricing.priceCents,
        discountPercent: pricing.discountPercent
      },
      professionalIdSnapshot: pricingProfessional?.id ?? null,
      payerCountry
    }
  });

  const payerName = [patient.user.firstName, patient.user.lastName].filter(Boolean).join(" ").trim() || patient.user.fullName;
  const notificationUrl = `${env.API_PUBLIC_URL.replace(/\/+$/, "")}/api/payments/dlocal/webhook`;
  const payment = await createDlocalGoPayment({
    amount: charge.amountMajor,
    currency: charge.currency,
    country: payerCountry,
    orderId,
    description: `MotivarCare · ${sessionPackage.name}`,
    notificationUrl,
    successUrl: appendDlocalOrderToUrl(params.successUrl, orderId),
    backUrl: appendDlocalOrderToUrl(params.successUrl, orderId),
    payer: {
      name: payerName,
      email: patient.user.email
    }
  });

  if (!payment.redirect_url) {
    throw new Error("dLocal Go did not return a checkout redirect URL");
  }

  await persistDlocalOrderPaymentId(orderId, payment.id);
  await markPaymentCheckoutRedirected({
    providerOrderId: orderId,
    providerPaymentId: payment.id,
    checkoutSessionKey: `dlocal:${payment.id}`
  });

  return {
    checkoutUrl: payment.redirect_url,
    paymentId: payment.id,
    orderId
  };
}

function buildTrialOrderId(patientId: string): string {
  return `mc-trial-${patientId}-${Date.now().toString(36)}`;
}

function buildIndividualOrderId(patientId: string, sessionCount: number): string {
  return `mc-ind-${patientId}-${sessionCount}-${Date.now().toString(36)}`;
}

export async function createDlocalCheckoutForIndividualSessions(params: {
  patientId: string;
  sessionCount: number;
  professionalId?: string | null;
  successUrl: string;
  backUrl: string;
}): Promise<DlocalCheckoutResult> {
  return withDlocalProductCheckoutDedupe({
    scopeKey: `ind:${params.patientId}:${params.sessionCount}`,
    patientId: params.patientId,
    kind: "INDIVIDUAL",
    sessionCount: params.sessionCount,
    create: () => createDlocalCheckoutForIndividualSessionsCore(params)
  });
}

async function createDlocalCheckoutForIndividualSessionsCore(params: {
  patientId: string;
  sessionCount: number;
  professionalId?: string | null;
  successUrl: string;
  backUrl: string;
}): Promise<DlocalCheckoutResult> {
  const patient = await loadPatientForDlocalCheckout(params.patientId);
  if (!patient) {
    throw new Error("Patient profile not found");
  }
  const payerCountry = assertPatientDlocalCheckoutAllowed(patient);

  const quote = await resolveIndividualSessionsPurchaseQuote({
    patientId: patient.id,
    sessionCount: params.sessionCount,
    professionalId: params.professionalId ?? null
  });

  const orderId = buildIndividualOrderId(patient.id, quote.sessionCount);
  await storeDlocalOrderContext(orderId, {
    kind: "individual",
    patientId: patient.id,
    packageId: quote.unitPackageId,
    sessionCount: quote.sessionCount,
    displayName: quote.displayName,
    market: quote.market,
    professionalIdSnapshot: quote.professionalIdSnapshot,
    pricing: quote.totalPricing,
    chargeAmountMajor: quote.chargeAmountMajor,
    chargeCurrency: quote.chargeCurrency
  });

  await createPaymentCheckout({
    patientId: patient.id,
    kind: "INDIVIDUAL",
    provider: "DLOCAL",
    providerOrderId: orderId,
    packageId: quote.unitPackageId,
    sessionCount: quote.sessionCount,
    displayName: quote.displayName,
    chargeAmountMajor: quote.chargeAmountMajor,
    chargeCurrency: quote.chargeCurrency,
    metadata: {
      pricing: quote.totalPricing,
      professionalIdSnapshot: quote.professionalIdSnapshot,
      payerCountry
    }
  });

  const payerName = [patient.user.firstName, patient.user.lastName].filter(Boolean).join(" ").trim() || patient.user.fullName;
  const notificationUrl = `${env.API_PUBLIC_URL.replace(/\/+$/, "")}/api/payments/dlocal/webhook`;
  const payment = await createDlocalGoPayment({
    amount: quote.chargeAmountMajor,
    currency: quote.chargeCurrency,
    country: payerCountry,
    orderId,
    description: `MotivarCare · ${quote.sessionCount} sesión${quote.sessionCount === 1 ? "" : "es"}`,
    notificationUrl,
    successUrl: appendDlocalOrderToUrl(params.successUrl, orderId),
    backUrl: appendDlocalOrderToUrl(params.backUrl, orderId),
    payer: {
      name: payerName,
      email: patient.user.email
    }
  });

  if (!payment.redirect_url) {
    throw new Error("dLocal Go did not return a checkout redirect URL");
  }

  await persistDlocalOrderPaymentId(orderId, payment.id);
  await markPaymentCheckoutRedirected({
    providerOrderId: orderId,
    providerPaymentId: payment.id,
    checkoutSessionKey: `dlocal:${payment.id}`
  });

  return {
    checkoutUrl: payment.redirect_url,
    paymentId: payment.id,
    orderId
  };
}

export async function createDlocalCheckoutForTrialSession(params: {
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  patientTimezone?: string | null;
  successUrl: string;
  backUrl: string;
}): Promise<{ checkoutUrl: string; paymentId: string; orderId: string }> {
  const patient = await loadPatientForDlocalCheckout(params.patientId);
  if (!patient) {
    throw new Error("Patient profile not found");
  }
  const payerCountry = assertPatientDlocalCheckoutAllowed(patient);

  const professional = await prisma.professionalProfile.findUnique({
    where: { id: params.professionalId },
    select: {
      id: true,
      market: true,
      sessionPriceArs: true,
      sessionPriceUsd: true,
      user: { select: { fullName: true } }
    }
  });
  if (!professional) {
    throw new Error("Professional not found");
  }

  const arsPerUsd = await loadUsdArsRateOrNull();
  const sessionListPriceUsdMajor = listPriceMajorUnitsForPackageMarket(professional, patient.market, arsPerUsd);
  if (sessionListPriceUsdMajor == null || sessionListPriceUsdMajor <= 0) {
    throw new Error("Session price unavailable for trial checkout");
  }

  const listPriceCents = Math.round(sessionListPriceUsdMajor * 100);
  const charge = resolveDlocalChargeAmount({
    market: patient.market,
    priceUsdCents: listPriceCents,
    arsPerUsd
  });

  const orderId = buildTrialOrderId(patient.id);
  await storeDlocalOrderContext(orderId, {
    kind: "trial",
    patientId: patient.id,
    professionalId: professional.id,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    market: patient.market,
    pricing: {
      listPriceCents,
      priceCents: listPriceCents
    },
    chargeAmountMajor: charge.amountMajor,
    chargeCurrency: charge.currency
  });

  await createPaymentCheckout({
    patientId: patient.id,
    kind: "TRIAL",
    provider: "DLOCAL",
    providerOrderId: orderId,
    trialProfessionalId: professional.id,
    trialStartsAt: new Date(params.startsAt),
    trialEndsAt: new Date(params.endsAt),
    displayName: "Sesión de prueba",
    chargeAmountMajor: charge.amountMajor,
    chargeCurrency: charge.currency,
    metadata: {
      pricing: {
        listPriceCents,
        priceCents: listPriceCents
      },
      payerCountry
    }
  });

  const payerName = [patient.user.firstName, patient.user.lastName].filter(Boolean).join(" ").trim() || patient.user.fullName;
  const notificationUrl = `${env.API_PUBLIC_URL.replace(/\/+$/, "")}/api/payments/dlocal/webhook`;
  const payment = await createDlocalGoPayment({
    amount: charge.amountMajor,
    currency: charge.currency,
    country: payerCountry,
    orderId,
    description: formatTrialPaymentDescription({
      professionalName: professional.user.fullName,
      startsAt: params.startsAt,
      patientTimezone: params.patientTimezone,
      patientMarket: patient.market
    }),
    notificationUrl,
    successUrl: appendDlocalOrderToUrl(params.successUrl, orderId),
    backUrl: appendDlocalOrderToUrl(params.successUrl, orderId),
    payer: {
      name: payerName,
      email: patient.user.email
    }
  });

  if (!payment.redirect_url) {
    throw new Error("dLocal Go did not return a checkout redirect URL");
  }

  await persistDlocalOrderPaymentId(orderId, payment.id);
  await markPaymentCheckoutRedirected({
    providerOrderId: orderId,
    providerPaymentId: payment.id,
    checkoutSessionKey: `dlocal:${payment.id}`
  });

  return {
    checkoutUrl: payment.redirect_url,
    paymentId: payment.id,
    orderId
  };
}

async function fulfillPaidTrialSession(params: {
  paymentId: string;
  context: DlocalTrialOrderContext;
}): Promise<void> {
  await setIdempotencyValue({
    key: trialPaymentStoreKey(params.context.patientId),
    value: JSON.stringify({
      paymentId: params.paymentId,
      professionalId: params.context.professionalId,
      startsAt: params.context.startsAt,
      endsAt: params.context.endsAt,
      paidAt: new Date().toISOString()
    } satisfies DlocalTrialPaymentProof),
    ttlSeconds: TRIAL_PAYMENT_PROOF_TTL_SECONDS
  });
}

async function recordDlocalCheckoutSync(params: {
  paymentId: string;
  orderId: string;
  paymentStatus: string;
  fulfilled: boolean;
  purchaseId?: string | null;
  actorRole?: "PATIENT" | "ADMIN" | "SYSTEM" | "WEBHOOK";
  trialPaidOnly?: boolean;
}): Promise<string | null> {
  const checkout = await findPaymentCheckoutByReference({
    paymentId: params.paymentId,
    orderId: params.orderId
  });
  if (!checkout) {
    return null;
  }

  await recordPaymentCheckoutSyncAttempt({
    checkoutId: checkout.id,
    paymentStatus: params.paymentStatus,
    fulfilled: params.fulfilled,
    purchaseId: params.purchaseId ?? null,
    actorRole: params.actorRole ?? "SYSTEM",
    markFulfilled: params.trialPaidOnly ? false : params.fulfilled
  });
  return checkout.id;
}

export async function processDlocalGoOrderSync(orderId: string): Promise<DlocalPaymentSyncResult> {
  const context = await loadDlocalOrderContext(orderId);
  if (!context) {
    throw new Error(`Missing checkout context for order ${orderId}`);
  }
  const paymentId = context.paymentId?.trim();
  if (!paymentId) {
    return { fulfilled: false, paymentStatus: "UNKNOWN" };
  }
  return processDlocalGoPaymentNotification(paymentId);
}

export async function processDlocalGoPaymentNotification(paymentId: string): Promise<DlocalPaymentSyncResult> {
  const payment = await getDlocalGoPayment(paymentId);
  const paymentStatus = String(payment.status).trim().toUpperCase();
  if (!isDlocalGoPaymentPaid(payment.status)) {
    return { fulfilled: false, paymentStatus };
  }

  const orderId = payment.order_id?.trim();
  if (!orderId) {
    throw new Error("dLocal payment missing order_id");
  }

  const context = await loadDlocalOrderContext(orderId);
  if (!context) {
    throw new Error(`Missing checkout context for order ${orderId}`);
  }

  if (context.kind === "trial") {
    await fulfillPaidTrialSession({ paymentId: payment.id, context });
    const checkoutId = await recordDlocalCheckoutSync({
      paymentId: payment.id,
      orderId,
      paymentStatus,
      fulfilled: true,
      trialPaidOnly: true,
      actorRole: "WEBHOOK"
    });
    return { fulfilled: true, paymentStatus, checkoutId };
  }

  const checkoutSessionId = `dlocal:${payment.id}`;
  const existingPurchase = await prisma.patientPackagePurchase.findUnique({
    where: { stripeCheckoutSessionId: checkoutSessionId },
    select: { id: true }
  });
  if (existingPurchase) {
    const checkoutId = await recordDlocalCheckoutSync({
      paymentId: payment.id,
      orderId,
      paymentStatus,
      fulfilled: true,
      purchaseId: existingPurchase.id,
      actorRole: "WEBHOOK"
    });
    return { fulfilled: true, paymentStatus, purchaseId: existingPurchase.id, checkoutId };
  }

  if (context.kind === "individual") {
    const purchaseId = await fulfillPaidIndividualSessionsPurchase({
      checkoutSessionId,
      patientId: context.patientId,
      packageId: context.packageId,
      sessionCount: context.sessionCount,
      displayName: context.displayName,
      professionalIdSnapshot: context.professionalIdSnapshot,
      pricing: context.pricing,
      market: context.market,
      billingCurrency: billingCurrencyCodeForMarket(context.market),
      paymentProviderSnapshot: "dlocal"
    });
    const checkoutId = await recordDlocalCheckoutSync({
      paymentId: payment.id,
      orderId,
      paymentStatus,
      fulfilled: true,
      purchaseId,
      actorRole: "WEBHOOK"
    });
    return { fulfilled: true, paymentStatus, purchaseId, checkoutId };
  }

  const purchaseId = await fulfillPaidPackagePurchase({
    checkoutSessionId,
    patientId: context.patientId,
    packageId: context.packageId,
    professionalIdSnapshot: context.professionalIdSnapshot,
    pricing: context.pricing,
    market: context.market,
    billingCurrency: billingCurrencyCodeForMarket(context.market),
    paymentProviderSnapshot: "dlocal"
  });
  const checkoutId = await recordDlocalCheckoutSync({
    paymentId: payment.id,
    orderId,
    paymentStatus,
    fulfilled: true,
    purchaseId,
    actorRole: "WEBHOOK"
  });
  return { fulfilled: true, paymentStatus, purchaseId, checkoutId };
}
