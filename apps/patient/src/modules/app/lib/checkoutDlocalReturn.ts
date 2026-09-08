import {
  clearDlocalCheckoutIdempotencyKey,
  dlocalIndividualIdempotencyScope,
  dlocalPackageIdempotencyScope
} from "./dlocalCheckoutIdempotency";

export const CHECKOUT_DLOCAL_RETURN_STORAGE_KEY = "mc:checkout-dlocal-return";

/** localStorage mirror: mobile often loses sessionStorage when returning from dLocal. */
const CHECKOUT_DLOCAL_RETURN_LOCAL_KEY = "mc:checkout-dlocal-return:v1";
const PENDING_LOCAL_TTL_MS = 48 * 60 * 60 * 1000;

export type PendingCheckoutDlocalReturn = {
  kind: "individual" | "package";
  sessionCount?: number;
  packageName?: string;
  packageId?: string;
  paymentId?: string;
  orderId?: string;
  /** Profesional elegido en matching / pricing al iniciar el checkout. */
  professionalId?: string;
};

type PendingCheckoutDlocalReturnStored = PendingCheckoutDlocalReturn & {
  savedAt: number;
};

function parsePending(raw: string | null): PendingCheckoutDlocalReturn | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PendingCheckoutDlocalReturnStored | PendingCheckoutDlocalReturn;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const { kind, sessionCount, packageName, packageId, paymentId, orderId, professionalId } = parsed;
    if (kind !== "individual" && kind !== "package") {
      return null;
    }
    return {
      kind,
      ...(typeof sessionCount === "number" ? { sessionCount } : {}),
      ...(typeof packageName === "string" ? { packageName } : {}),
      ...(typeof packageId === "string" ? { packageId } : {}),
      ...(typeof paymentId === "string" ? { paymentId } : {}),
      ...(typeof orderId === "string" ? { orderId } : {}),
      ...(typeof professionalId === "string" && professionalId.trim()
        ? { professionalId: professionalId.trim() }
        : {})
    };
  } catch {
    return null;
  }
}

function readLocalPendingMeta(): { pending: PendingCheckoutDlocalReturn; savedAt: number | null } | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(CHECKOUT_DLOCAL_RETURN_LOCAL_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingCheckoutDlocalReturnStored;
    if (!parsed || typeof parsed !== "object") {
      localStorage.removeItem(CHECKOUT_DLOCAL_RETURN_LOCAL_KEY);
      return null;
    }
    if (typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt > PENDING_LOCAL_TTL_MS) {
      localStorage.removeItem(CHECKOUT_DLOCAL_RETURN_LOCAL_KEY);
      return null;
    }
    const pending = parsePending(raw);
    if (!pending) {
      return null;
    }
    return {
      pending,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : null
    };
  } catch {
    return null;
  }
}

export function savePendingCheckoutDlocalReturn(pending: PendingCheckoutDlocalReturn): void {
  const payload = JSON.stringify(pending);
  sessionStorage.setItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY, payload);
  if (typeof localStorage !== "undefined") {
    const durable: PendingCheckoutDlocalReturnStored = { ...pending, savedAt: Date.now() };
    localStorage.setItem(CHECKOUT_DLOCAL_RETURN_LOCAL_KEY, JSON.stringify(durable));
  }
}

export function readPendingCheckoutDlocalReturn(): PendingCheckoutDlocalReturn | null {
  const fromSession = parsePending(sessionStorage.getItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY));
  if (fromSession) {
    return fromSession;
  }
  const fromLocal = readLocalPendingMeta();
  if (fromLocal) {
    // Rehydrate sessionStorage so the rest of the return flow sees a consistent pending.
    sessionStorage.setItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY, JSON.stringify(fromLocal.pending));
    return fromLocal.pending;
  }
  return null;
}

/** Edad del pending en localStorage (ms), o null si no hay / no se conoce. */
export function readPendingCheckoutDlocalReturnAgeMs(): number | null {
  const meta = readLocalPendingMeta();
  if (!meta?.savedAt) {
    return null;
  }
  return Math.max(0, Date.now() - meta.savedAt);
}

export function clearPendingCheckoutDlocalReturn(options?: { clearIdempotency?: boolean }): void {
  const pending = readPendingCheckoutDlocalReturn();
  sessionStorage.removeItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY);
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(CHECKOUT_DLOCAL_RETURN_LOCAL_KEY);
  }

  if (options?.clearIdempotency && pending) {
    if (pending.kind === "package" && pending.packageId) {
      clearDlocalCheckoutIdempotencyKey(dlocalPackageIdempotencyScope(pending.packageId));
    } else if (pending.kind === "individual" && pending.sessionCount) {
      clearDlocalCheckoutIdempotencyKey(dlocalIndividualIdempotencyScope(pending.sessionCount));
    }
  }
}
