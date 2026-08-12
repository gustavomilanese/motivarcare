import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  createBooking,
  createDlocalTrialCheckout,
  syncDlocalPayment
} from "../api/client";
import type { MatchingSlot } from "../api/types";
import { patientUsesDlocalCheckout } from "./dlocalCheckout";
import { acquireDlocalCheckoutIdempotencyKey } from "./checkoutDlocalReturn";
import { clearPendingTrialBooking, writePendingTrialBooking } from "./pendingTrialBooking";
import { deviceTimeZone } from "../utils/date";

WebBrowser.maybeCompleteAuthSession();

function trialPaymentReturnUrl(payment: "success" | "cancel"): string {
  return Linking.createURL("payment-return", {
    queryParams: {
      trialPayment: payment
    }
  });
}

export async function startTrialCheckout(params: {
  token: string;
  professionalId: string;
  slot: MatchingSlot;
  holdId: string;
  residencyCountry: string | null | undefined;
}): Promise<{ ok: boolean; error?: string; mode: "dlocal" | "direct" }> {
  const startsAt =
    typeof params.slot.startsAt === "string"
      ? params.slot.startsAt
      : new Date(params.slot.startsAt).toISOString();
  const endsAt =
    typeof params.slot.endsAt === "string"
      ? params.slot.endsAt
      : new Date(params.slot.endsAt).toISOString();

  if (!patientUsesDlocalCheckout(params.residencyCountry)) {
    // Mercados sin dLocal: la API permite trial sin cobro (p. ej. no-AR).
    await createBooking({
      token: params.token,
      professionalId: params.professionalId,
      startsAt,
      endsAt,
      holdId: params.holdId,
      patientTimezone: deviceTimeZone(),
      idempotencyKey: `booking-${params.professionalId}-${startsAt}-${endsAt}`
    });
    return { ok: true, mode: "direct" };
  }

  const scope = `trial:${params.professionalId}:${startsAt}`;
  const idempotencyKey = await acquireDlocalCheckoutIdempotencyKey(scope);
  const successUrl = trialPaymentReturnUrl("success");
  const cancelUrl = trialPaymentReturnUrl("cancel");

  const checkout = await createDlocalTrialCheckout({
    token: params.token,
    professionalId: params.professionalId,
    startsAt,
    endsAt,
    holdId: params.holdId,
    patientTimezone: deviceTimeZone(),
    idempotencyKey,
    successUrl,
    cancelUrl
  });

  const checkoutUrl = checkout.checkoutUrl?.trim() ?? "";
  if (!/^https?:\/\//i.test(checkoutUrl)) {
    return { ok: false, error: "dLocal no devolvió una URL de pago", mode: "dlocal" };
  }

  await writePendingTrialBooking({
    professionalId: params.professionalId,
    slot: { id: params.slot.id, startsAt, endsAt },
    paymentId: checkout.paymentId ?? "",
    orderId: checkout.orderId,
    holdId: params.holdId
  });

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, successUrl);
  if (result.type === "cancel" || result.type === "dismiss") {
    return { ok: false, error: "Checkout cancelado", mode: "dlocal" };
  }
  return { ok: true, mode: "dlocal" };
}

export async function syncAndConfirmTrialBooking(params: {
  token: string;
  paymentId: string;
  professionalId: string;
  slot: { startsAt: string; endsAt: string };
  holdId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const retryDelaysMs = [0, 700, 1200, 2500];
  let lastError = "No se pudo confirmar el pago de la sesión de prueba";
  let fulfilled = false;

  for (const delayMs of retryDelaysMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      const synced = await syncDlocalPayment({
        token: params.token,
        paymentId: params.paymentId
      });
      if (synced.ok && synced.fulfilled) {
        fulfilled = true;
        break;
      }
      lastError = `Payment status: ${synced.paymentStatus ?? "pending"}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
      return { ok: false, error: lastError };
    }
  }

  if (!fulfilled) {
    return { ok: false, error: lastError };
  }

  try {
    await createBooking({
      token: params.token,
      professionalId: params.professionalId,
      startsAt: params.slot.startsAt,
      endsAt: params.slot.endsAt,
      holdId: params.holdId,
      patientTimezone: deviceTimeZone(),
      idempotencyKey: `booking-${params.professionalId}-${params.slot.startsAt}-${params.slot.endsAt}`
    });
    await clearPendingTrialBooking();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo reservar la sesión de prueba"
    };
  }
}

export function parseTrialPaymentReturnUrl(url: string | null | undefined): {
  trialPayment: "success" | "cancel" | null;
} {
  if (!url) {
    return { trialPayment: null };
  }
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams ?? {};
    const raw = String(q.trialPayment ?? "").trim();
    if (raw === "success" || raw === "cancel") {
      return { trialPayment: raw };
    }
    return { trialPayment: null };
  } catch {
    return { trialPayment: null };
  }
}
