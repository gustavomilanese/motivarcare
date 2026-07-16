import type {
  PaymentCheckout,
  PaymentCheckoutKind,
  PaymentCheckoutProvider,
  PaymentCheckoutStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { DlocalOrderContext } from "./dlocalOrderContext.types.js";

export type PaymentCheckoutActorRole = "PATIENT" | "ADMIN" | "SYSTEM" | "WEBHOOK";

export type CreatePaymentCheckoutParams = {
  patientId: string;
  kind: PaymentCheckoutKind;
  provider: PaymentCheckoutProvider;
  providerOrderId: string;
  packageId?: string | null;
  sessionCount?: number | null;
  trialProfessionalId?: string | null;
  trialStartsAt?: Date | null;
  trialEndsAt?: Date | null;
  chargeAmountMajor?: number | null;
  chargeCurrency?: string | null;
  displayName?: string | null;
  metadata?: Prisma.InputJsonObject;
};

export type PaymentCheckoutListItem = {
  id: string;
  kind: PaymentCheckoutKind;
  status: PaymentCheckoutStatus;
  provider: PaymentCheckoutProvider;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  packageId: string | null;
  displayName: string | null;
  sessionCount: number | null;
  chargeAmountMajor: number | null;
  chargeCurrency: string | null;
  fulfillmentPurchaseId: string | null;
  fulfillmentBookingId: string | null;
  lastProviderStatus: string | null;
  lastError: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
  events: Array<{
    id: string;
    eventType: string;
    message: string | null;
    actorRole: string | null;
    createdAt: string;
  }>;
};

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function serializePaymentCheckout(
  checkout: PaymentCheckout & {
    events?: Array<{
      id: string;
      eventType: string;
      message: string | null;
      actorRole: string | null;
      createdAt: Date;
    }>;
  }
): PaymentCheckoutListItem {
  return {
    id: checkout.id,
    kind: checkout.kind,
    status: checkout.status,
    provider: checkout.provider,
    providerPaymentId: checkout.providerPaymentId,
    providerOrderId: checkout.providerOrderId,
    packageId: checkout.packageId,
    displayName: checkout.displayName,
    sessionCount: checkout.sessionCount,
    chargeAmountMajor: decimalToNumber(checkout.chargeAmountMajor),
    chargeCurrency: checkout.chargeCurrency,
    fulfillmentPurchaseId: checkout.fulfillmentPurchaseId,
    fulfillmentBookingId: checkout.fulfillmentBookingId,
    lastProviderStatus: checkout.lastProviderStatus,
    lastError: checkout.lastError,
    paidAt: checkout.paidAt?.toISOString() ?? null,
    fulfilledAt: checkout.fulfilledAt?.toISOString() ?? null,
    createdAt: checkout.createdAt.toISOString(),
    updatedAt: checkout.updatedAt.toISOString(),
    events: (checkout.events ?? []).map((event) => ({
      id: event.id,
      eventType: event.eventType,
      message: event.message,
      actorRole: event.actorRole,
      createdAt: event.createdAt.toISOString()
    }))
  };
}

export async function logPaymentCheckoutEvent(params: {
  checkoutId: string;
  eventType: string;
  message?: string | null;
  payload?: Prisma.InputJsonObject;
  actorRole?: PaymentCheckoutActorRole;
}): Promise<void> {
  await prisma.paymentCheckoutEvent.create({
    data: {
      checkoutId: params.checkoutId,
      eventType: params.eventType,
      message: params.message ?? null,
      payload: params.payload,
      actorRole: params.actorRole ?? "SYSTEM"
    }
  });
}

export async function createPaymentCheckout(params: CreatePaymentCheckoutParams): Promise<PaymentCheckout> {
  const existing = await prisma.paymentCheckout.findUnique({
    where: { providerOrderId: params.providerOrderId }
  });
  if (existing) {
    return existing;
  }

  const checkout = await prisma.paymentCheckout.create({
    data: {
      patientId: params.patientId,
      kind: params.kind,
      provider: params.provider,
      providerOrderId: params.providerOrderId,
      packageId: params.packageId ?? null,
      sessionCount: params.sessionCount ?? null,
      trialProfessionalId: params.trialProfessionalId ?? null,
      trialStartsAt: params.trialStartsAt ?? null,
      trialEndsAt: params.trialEndsAt ?? null,
      chargeAmountMajor: params.chargeAmountMajor ?? null,
      chargeCurrency: params.chargeCurrency ?? null,
      displayName: params.displayName ?? null,
      metadata: params.metadata,
      status: "CREATED"
    }
  });

  await logPaymentCheckoutEvent({
    checkoutId: checkout.id,
    eventType: "checkout.created",
    message: `Checkout ${params.kind} created`,
    payload: {
      providerOrderId: params.providerOrderId,
      packageId: params.packageId ?? null,
      sessionCount: params.sessionCount ?? null
    },
    actorRole: "SYSTEM"
  });

  return checkout;
}

export const PENDING_CHECKOUT_REUSE_WINDOW_MS = 45 * 60 * 1000;

export async function findRecentPendingPaymentCheckout(params: {
  patientId: string;
  kind: PaymentCheckoutKind;
  packageId?: string | null;
  sessionCount?: number | null;
}): Promise<PaymentCheckout | null> {
  const since = new Date(Date.now() - PENDING_CHECKOUT_REUSE_WINDOW_MS);
  return prisma.paymentCheckout.findFirst({
    where: {
      patientId: params.patientId,
      kind: params.kind,
      status: { in: ["CREATED", "REDIRECTED"] },
      createdAt: { gte: since },
      ...(params.packageId != null ? { packageId: params.packageId } : {}),
      ...(params.sessionCount != null ? { sessionCount: params.sessionCount } : {})
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function expireSupersededPendingCheckouts(params: {
  patientId: string;
  kind: PaymentCheckoutKind;
  packageId?: string | null;
  sessionCount?: number | null;
  keepCheckoutId?: string | null;
}): Promise<void> {
  await prisma.paymentCheckout.updateMany({
    where: {
      patientId: params.patientId,
      kind: params.kind,
      status: { in: ["CREATED", "REDIRECTED"] },
      ...(params.keepCheckoutId ? { id: { not: params.keepCheckoutId } } : {}),
      ...(params.packageId != null ? { packageId: params.packageId } : {}),
      ...(params.sessionCount != null ? { sessionCount: params.sessionCount } : {})
    },
    data: { status: "EXPIRED" }
  });
}

export async function markPaymentCheckoutExpired(checkoutId: string): Promise<void> {
  await prisma.paymentCheckout.update({
    where: { id: checkoutId },
    data: { status: "EXPIRED" }
  });
}

function paymentCheckoutProductKey(row: Pick<PaymentCheckoutListItem, "kind" | "packageId" | "sessionCount">): string {
  return `${row.kind}:${row.packageId ?? ""}:${row.sessionCount ?? ""}`;
}

function isSuccessfulPaymentCheckoutStatus(status: PaymentCheckoutStatus): boolean {
  return status === "FULFILLED" || status === "PAID";
}

function dedupeVisiblePaymentCheckouts(rows: PaymentCheckoutListItem[]): PaymentCheckoutListItem[] {
  const fulfilledProductKeys = new Set<string>();
  for (const row of rows) {
    if (isSuccessfulPaymentCheckoutStatus(row.status)) {
      fulfilledProductKeys.add(paymentCheckoutProductKey(row));
    }
  }

  const seenPendingKeys = new Set<string>();
  const visible: PaymentCheckoutListItem[] = [];

  for (const row of rows) {
    if (row.status === "EXPIRED") {
      continue;
    }

    const productKey = paymentCheckoutProductKey(row);

    if (row.status === "CREATED" || row.status === "REDIRECTED") {
      if (fulfilledProductKeys.has(productKey)) {
        continue;
      }
      if (seenPendingKeys.has(productKey)) {
        continue;
      }
      seenPendingKeys.add(productKey);
    }

    visible.push(row);
  }

  return visible;
}

export async function expireStalePendingPaymentCheckoutsForPatient(patientId: string): Promise<void> {
  const successful = await prisma.paymentCheckout.findMany({
    where: {
      patientId,
      status: { in: ["FULFILLED", "PAID"] }
    },
    select: {
      kind: true,
      packageId: true,
      sessionCount: true
    }
  });

  const seen = new Set<string>();
  for (const checkout of successful) {
    const key = `${checkout.kind}:${checkout.packageId ?? ""}:${checkout.sessionCount ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    await expireSupersededPendingCheckouts({
      patientId,
      kind: checkout.kind,
      packageId: checkout.packageId,
      sessionCount: checkout.sessionCount
    });
  }
}

export async function markPaymentCheckoutRedirected(params: {
  providerOrderId: string;
  providerPaymentId: string;
  checkoutSessionKey?: string | null;
}): Promise<PaymentCheckout | null> {
  const checkout = await prisma.paymentCheckout.findUnique({
    where: { providerOrderId: params.providerOrderId }
  });
  if (!checkout) {
    return null;
  }

  const updated = await prisma.paymentCheckout.update({
    where: { id: checkout.id },
    data: {
      status: checkout.status === "CREATED" ? "REDIRECTED" : checkout.status,
      providerPaymentId: params.providerPaymentId,
      checkoutSessionKey: params.checkoutSessionKey ?? `dlocal:${params.providerPaymentId}`
    }
  });

  await logPaymentCheckoutEvent({
    checkoutId: updated.id,
    eventType: "checkout.redirected",
    message: "Patient redirected to payment provider",
    payload: {
      providerPaymentId: params.providerPaymentId
    },
    actorRole: "PATIENT"
  });

  return updated;
}

export async function findPaymentCheckoutByReference(params: {
  paymentId?: string | null;
  orderId?: string | null;
}): Promise<PaymentCheckout | null> {
  const paymentId = params.paymentId?.trim() || null;
  const orderId = params.orderId?.trim() || null;

  if (orderId) {
    const byOrder = await prisma.paymentCheckout.findUnique({ where: { providerOrderId: orderId } });
    if (byOrder) {
      return byOrder;
    }
  }

  if (paymentId) {
    return prisma.paymentCheckout.findFirst({
      where: {
        OR: [
          { providerPaymentId: paymentId },
          { checkoutSessionKey: `dlocal:${paymentId}` }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
  }

  return null;
}

export async function assertPatientOwnsPaymentCheckout(params: {
  patientId: string;
  paymentId?: string | null;
  orderId?: string | null;
}): Promise<PaymentCheckout> {
  const checkout = await findPaymentCheckoutByReference({
    paymentId: params.paymentId,
    orderId: params.orderId
  });
  if (!checkout) {
    throw new Error("Payment checkout not found");
  }
  if (checkout.patientId !== params.patientId) {
    throw new Error("Payment checkout does not belong to this patient");
  }
  return checkout;
}

export async function recordPaymentCheckoutSyncAttempt(params: {
  checkoutId: string;
  paymentStatus: string;
  fulfilled: boolean;
  purchaseId?: string | null;
  error?: string | null;
  actorRole?: PaymentCheckoutActorRole;
  markFulfilled?: boolean;
}): Promise<PaymentCheckout> {
  const now = new Date();
  const data: Prisma.PaymentCheckoutUpdateInput = {
    lastProviderStatus: params.paymentStatus,
    lastError: params.error ?? null
  };

  const shouldMarkFulfilled = params.fulfilled && params.markFulfilled !== false;

  if (shouldMarkFulfilled) {
    data.status = "FULFILLED";
    data.fulfilledAt = now;
    data.paidAt = now;
    if (params.purchaseId) {
      data.fulfillmentPurchaseId = params.purchaseId;
    }
  } else if (params.fulfilled || isPaidLikeStatus(params.paymentStatus)) {
    data.status = "PAID";
    data.paidAt = now;
  } else if (params.error) {
    data.status = "FAILED";
  }

  const updated = await prisma.paymentCheckout.update({
    where: { id: params.checkoutId },
    data
  });

  await logPaymentCheckoutEvent({
    checkoutId: params.checkoutId,
    eventType: shouldMarkFulfilled ? "checkout.fulfilled" : "checkout.sync_attempt",
    message: shouldMarkFulfilled
      ? "Payment confirmed and credits granted"
      : params.error
        ? params.error
        : `Provider status: ${params.paymentStatus}`,
    payload: {
      paymentStatus: params.paymentStatus,
      fulfilled: params.fulfilled,
      purchaseId: params.purchaseId ?? null
    },
    actorRole: params.actorRole ?? "SYSTEM"
  });

  if (updated.status === "FULFILLED" || updated.status === "PAID") {
    await expireSupersededPendingCheckouts({
      patientId: updated.patientId,
      kind: updated.kind,
      packageId: updated.packageId,
      sessionCount: updated.sessionCount,
      keepCheckoutId: updated.id
    });
  }

  return updated;
}

function isPaidLikeStatus(status: string): boolean {
  const normalized = status.trim().toUpperCase();
  return normalized === "PAID" || normalized === "COMPLETED" || normalized === "APPROVED";
}

export async function markPaymentCheckoutCancelled(params: {
  providerOrderId?: string | null;
  checkoutId?: string | null;
  actorRole?: PaymentCheckoutActorRole;
}): Promise<void> {
  const checkout = params.checkoutId
    ? await prisma.paymentCheckout.findUnique({ where: { id: params.checkoutId } })
    : params.providerOrderId
      ? await prisma.paymentCheckout.findUnique({ where: { providerOrderId: params.providerOrderId } })
      : null;
  if (!checkout || checkout.status === "FULFILLED") {
    return;
  }

  await prisma.paymentCheckout.update({
    where: { id: checkout.id },
    data: { status: "CANCELLED" }
  });

  await logPaymentCheckoutEvent({
    checkoutId: checkout.id,
    eventType: "checkout.cancelled",
    message: "Patient cancelled payment at provider",
    actorRole: params.actorRole ?? "PATIENT"
  });
}

export async function linkPaymentCheckoutTrialBooking(params: {
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  bookingId: string;
}): Promise<void> {
  const startsAt = new Date(params.startsAt);
  const endsAt = new Date(params.endsAt);
  const checkout =
    (await prisma.paymentCheckout.findFirst({
      where: {
        patientId: params.patientId,
        kind: "TRIAL",
        status: { in: ["PAID", "FULFILLED"] },
        trialProfessionalId: params.professionalId,
        trialStartsAt: startsAt,
        trialEndsAt: endsAt
      },
      orderBy: { createdAt: "desc" }
    }))
    ?? (await findReusablePaidTrialCheckout({
      patientId: params.patientId,
      professionalId: params.professionalId
    }));
  if (!checkout) {
    return;
  }

  await prisma.paymentCheckout.update({
    where: { id: checkout.id },
    data: {
      status: "FULFILLED",
      fulfillmentBookingId: params.bookingId,
      fulfilledAt: new Date(),
      trialStartsAt: startsAt,
      trialEndsAt: endsAt
    }
  });

  await logPaymentCheckoutEvent({
    checkoutId: checkout.id,
    eventType: "checkout.trial_booked",
    message: "Trial session booked after payment",
    payload: { bookingId: params.bookingId },
    actorRole: "SYSTEM"
  });
}

/** Prueba pagada sin reserva activa (p. ej. tras cancelar dentro de plazo). */
export async function findReusablePaidTrialCheckout(params: {
  patientId: string;
  professionalId: string;
}): Promise<PaymentCheckout | null> {
  return prisma.paymentCheckout.findFirst({
    where: {
      patientId: params.patientId,
      kind: "TRIAL",
      status: { in: ["PAID", "FULFILLED"] },
      trialProfessionalId: params.professionalId,
      paidAt: { not: null },
      fulfillmentBookingId: null
    },
    orderBy: { paidAt: "desc" }
  });
}

/** Libera el cobro de prueba al cancelar la reserva (permite elegir otro horario sin pagar de nuevo). */
export async function releaseTrialCheckoutOnBookingCancel(bookingId: string): Promise<void> {
  const checkout = await prisma.paymentCheckout.findFirst({
    where: {
      kind: "TRIAL",
      fulfillmentBookingId: bookingId
    },
    orderBy: { paidAt: "desc" }
  });
  if (!checkout) {
    return;
  }

  await prisma.paymentCheckout.update({
    where: { id: checkout.id },
    data: {
      status: "PAID",
      fulfillmentBookingId: null
    }
  });

  await logPaymentCheckoutEvent({
    checkoutId: checkout.id,
    eventType: "checkout.trial_released",
    message: "Trial booking cancelled — payment credit released for rebooking",
    payload: { bookingId },
    actorRole: "SYSTEM"
  });
}

export async function findPaidTrialCheckoutProof(params: {
  patientId: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<PaymentCheckout | null> {
  const exactMatch = await prisma.paymentCheckout.findFirst({
    where: {
      patientId: params.patientId,
      kind: "TRIAL",
      status: { in: ["PAID", "FULFILLED"] },
      trialProfessionalId: params.professionalId,
      trialStartsAt: params.startsAt,
      trialEndsAt: params.endsAt,
      fulfillmentBookingId: null
    },
    orderBy: { paidAt: "desc" }
  });
  if (exactMatch) {
    return exactMatch;
  }
  return findReusablePaidTrialCheckout({
    patientId: params.patientId,
    professionalId: params.professionalId
  });
}

export async function rebuildDlocalOrderContextFromCheckout(orderId: string): Promise<DlocalOrderContext | null> {
  const checkout = await prisma.paymentCheckout.findUnique({
    where: { providerOrderId: orderId }
  });
  if (!checkout || checkout.provider !== "DLOCAL") {
    return null;
  }

  const metadata = checkout.metadata;
  const pricing =
    metadata
    && typeof metadata === "object"
    && !Array.isArray(metadata)
    && "pricing" in metadata
    && metadata.pricing
    && typeof metadata.pricing === "object"
    && !Array.isArray(metadata.pricing)
      ? (metadata.pricing as {
          listPriceCents: number;
          priceCents: number;
          discountPercent?: number;
        })
      : null;

  if (!pricing) {
    return null;
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: checkout.patientId },
    select: { market: true }
  });
  if (!patient) {
    return null;
  }

  const chargeAmountMajor = decimalToNumber(checkout.chargeAmountMajor) ?? 0;
  const chargeCurrency = checkout.chargeCurrency ?? "ARS";
  const professionalIdSnapshot =
    metadata
    && typeof metadata === "object"
    && !Array.isArray(metadata)
    && typeof metadata.professionalIdSnapshot === "string"
      ? metadata.professionalIdSnapshot
      : null;

  if (checkout.kind === "TRIAL" && checkout.trialProfessionalId && checkout.trialStartsAt && checkout.trialEndsAt) {
    return {
      kind: "trial",
      paymentId: checkout.providerPaymentId ?? undefined,
      patientId: checkout.patientId,
      professionalId: checkout.trialProfessionalId,
      startsAt: checkout.trialStartsAt.toISOString(),
      endsAt: checkout.trialEndsAt.toISOString(),
      market: patient.market,
      pricing: {
        listPriceCents: pricing.listPriceCents,
        priceCents: pricing.priceCents
      },
      chargeAmountMajor,
      chargeCurrency
    };
  }

  if (checkout.kind === "INDIVIDUAL" && checkout.packageId && checkout.sessionCount) {
    return {
      kind: "individual",
      paymentId: checkout.providerPaymentId ?? undefined,
      patientId: checkout.patientId,
      packageId: checkout.packageId,
      sessionCount: checkout.sessionCount,
      displayName: checkout.displayName ?? `Sesiones individuales (×${checkout.sessionCount})`,
      market: patient.market,
      professionalIdSnapshot,
      pricing: {
        listPriceCents: pricing.listPriceCents,
        priceCents: pricing.priceCents,
        discountPercent: pricing.discountPercent ?? 0
      },
      chargeAmountMajor,
      chargeCurrency
    };
  }

  if (checkout.kind === "PACKAGE" && checkout.packageId) {
    return {
      kind: "package",
      paymentId: checkout.providerPaymentId ?? undefined,
      patientId: checkout.patientId,
      packageId: checkout.packageId,
      market: patient.market,
      professionalIdSnapshot,
      pricing: {
        listPriceCents: pricing.listPriceCents,
        priceCents: pricing.priceCents,
        discountPercent: pricing.discountPercent ?? 0
      },
      chargeAmountMajor,
      chargeCurrency
    };
  }

  return null;
}

export async function listPaymentCheckoutsForPatient(params: {
  patientId: string;
  limit?: number;
  includeEvents?: boolean;
  includeExpired?: boolean;
}): Promise<PaymentCheckoutListItem[]> {
  if (!params.includeExpired) {
    await expireStalePendingPaymentCheckoutsForPatient(params.patientId);
  }

  const rows = await prisma.paymentCheckout.findMany({
    where: {
      patientId: params.patientId,
      ...(params.includeExpired ? {} : { status: { not: "EXPIRED" } })
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(params.limit ?? 30, 1), 100),
    include: params.includeEvents
      ? {
          events: {
            orderBy: { createdAt: "desc" },
            take: 12
          }
        }
      : undefined
  });

  const serialized = rows.map((row) => serializePaymentCheckout(row));
  return params.includeExpired ? serialized : dedupeVisiblePaymentCheckouts(serialized);
}
