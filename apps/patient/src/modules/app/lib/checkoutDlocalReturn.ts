import {
  clearDlocalCheckoutIdempotencyKey,
  dlocalIndividualIdempotencyScope,
  dlocalPackageIdempotencyScope
} from "./dlocalCheckoutIdempotency";

export const CHECKOUT_DLOCAL_RETURN_STORAGE_KEY = "mc:checkout-dlocal-return";

export type PendingCheckoutDlocalReturn = {
  kind: "individual" | "package";
  sessionCount?: number;
  packageName?: string;
  packageId?: string;
  paymentId?: string;
  orderId?: string;
};

export function savePendingCheckoutDlocalReturn(pending: PendingCheckoutDlocalReturn): void {
  sessionStorage.setItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY, JSON.stringify(pending));
}

export function readPendingCheckoutDlocalReturn(): PendingCheckoutDlocalReturn | null {
  const raw = sessionStorage.getItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PendingCheckoutDlocalReturn;
  } catch {
    return null;
  }
}

export function clearPendingCheckoutDlocalReturn(options?: { clearIdempotency?: boolean }): void {
  const pending = readPendingCheckoutDlocalReturn();
  sessionStorage.removeItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY);

  if (options?.clearIdempotency && pending) {
    if (pending.kind === "package" && pending.packageId) {
      clearDlocalCheckoutIdempotencyKey(dlocalPackageIdempotencyScope(pending.packageId));
    } else if (pending.kind === "individual" && pending.sessionCount) {
      clearDlocalCheckoutIdempotencyKey(dlocalIndividualIdempotencyScope(pending.sessionCount));
    }
  }
}
