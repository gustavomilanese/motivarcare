import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { isDlocalGoCheckoutAvailable, marketFromResidencyCountry, DLOCAL_CHECKOUT_UNAVAILABLE_ERROR } from "@therapy/types";
import {
  createDlocalPackageCheckout,
  syncDlocalPayment
} from "../api/client";
import type { SessionPackage } from "../api/types";
import {
  acquireDlocalCheckoutIdempotencyKey,
  clearPendingCheckoutDlocalReturn,
  dlocalPackageIdempotencyScope,
  readPendingCheckoutDlocalReturn,
  savePendingCheckoutDlocalReturn
} from "./checkoutDlocalReturn";

WebBrowser.maybeCompleteAuthSession();

export function patientUsesDlocalCheckout(residencyCountry: string | null | undefined): boolean {
  const market = marketFromResidencyCountry(residencyCountry);
  return isDlocalGoCheckoutAvailable({
    market,
    residencyCountry: residencyCountry ?? null
  });
}

function paymentReturnUrl(params: { payment: "success" | "cancel"; purchase: "package" | "individual" }): string {
  return Linking.createURL("payment-return", {
    queryParams: {
      payment: params.payment,
      purchase: params.purchase
    }
  });
}

export async function startPackageCheckout(params: {
  token: string;
  pkg: SessionPackage;
  residencyCountry: string | null | undefined;
}): Promise<{ ok: boolean; error?: string; mode: "dlocal" | "direct"; remainingCredits?: number }> {
  const usesDlocal = patientUsesDlocalCheckout(params.residencyCountry);

  if (!usesDlocal) {
    return { ok: false, error: DLOCAL_CHECKOUT_UNAVAILABLE_ERROR, mode: "dlocal" };
  }

  const scope = dlocalPackageIdempotencyScope(params.pkg.id);
    const idempotencyKey = await acquireDlocalCheckoutIdempotencyKey(scope);
    const successUrl = paymentReturnUrl({ payment: "success", purchase: "package" });
    const cancelUrl = paymentReturnUrl({ payment: "cancel", purchase: "package" });

    const checkout = await createDlocalPackageCheckout({
      token: params.token,
      packageId: params.pkg.id,
      idempotencyKey,
      successUrl,
      cancelUrl
    });

    const checkoutUrl = checkout.checkoutUrl?.trim() ?? "";
    if (!/^https?:\/\//i.test(checkoutUrl)) {
      return { ok: false, error: "dLocal no devolvió una URL de pago", mode: "dlocal" };
    }

    await savePendingCheckoutDlocalReturn({
      kind: "package",
      packageId: params.pkg.id,
      packageName: params.pkg.name,
      sessionCount: params.pkg.credits,
      paymentId: checkout.paymentId,
      orderId: checkout.orderId
    });

    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, successUrl);
    if (result.type === "cancel" || result.type === "dismiss") {
      return { ok: false, error: "Checkout cancelado", mode: "dlocal" };
    }
    // Return URL handling is done by useDlocalCheckoutReturn (also parses result.url if present).
    return { ok: true, mode: "dlocal" };
}

export async function fulfillPendingDlocalCheckout(params: {
  token: string;
  paymentId?: string | null;
  orderId?: string | null;
}): Promise<{ ok: boolean; fulfilled: boolean; error?: string }> {
  const pending = await readPendingCheckoutDlocalReturn();
  const paymentId = params.paymentId?.trim() || pending?.paymentId || null;
  const orderId = params.orderId?.trim() || pending?.orderId || null;

  const retryDelaysMs = [0, 700, 1200, 2500];
  let lastError = "Could not sync payment";

  for (const delayMs of retryDelaysMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      const result = await syncDlocalPayment({
        token: params.token,
        paymentId,
        orderId
      });
      if (result.ok && result.fulfilled) {
        await clearPendingCheckoutDlocalReturn({ clearIdempotency: true });
        return { ok: true, fulfilled: true };
      }
      lastError = `Payment status: ${result.paymentStatus ?? "pending"}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
      break;
    }
  }

  // Fallback: sweep pending checkouts for this patient.
  try {
    const pendingResult = await syncDlocalPayment({ token: params.token });
    if (pendingResult.ok && pendingResult.fulfilled) {
      await clearPendingCheckoutDlocalReturn({ clearIdempotency: true });
      return { ok: true, fulfilled: true };
    }
  } catch {
    // keep lastError
  }

  return { ok: false, fulfilled: false, error: lastError };
}

export function parsePaymentReturnUrl(url: string | null | undefined): {
  payment: "success" | "cancel" | null;
  purchase: string | null;
  paymentId: string | null;
  orderId: string | null;
} {
  if (!url) {
    return { payment: null, purchase: null, paymentId: null, orderId: null };
  }
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams ?? {};
    const paymentRaw = String(q.payment ?? "").trim();
    const payment = paymentRaw === "success" || paymentRaw === "cancel" ? paymentRaw : null;
    return {
      payment,
      purchase: q.purchase ? String(q.purchase) : null,
      paymentId: q.payment_id ? String(q.payment_id) : q.paymentId ? String(q.paymentId) : null,
      orderId: q.dlocalOrder ? String(q.dlocalOrder) : q.orderId ? String(q.orderId) : null
    };
  } catch {
    return { payment: null, purchase: null, paymentId: null, orderId: null };
  }
}
