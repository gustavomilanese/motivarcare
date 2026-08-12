import AsyncStorage from "@react-native-async-storage/async-storage";

const IDEMPOTENCY_PREFIX = "mc:dlocal-idempotency:";
const PENDING_KEY = "mc:checkout-dlocal-return:v1";
const MAX_IDEMPOTENCY_AGE_MS = 30 * 60 * 1000;
const PENDING_TTL_MS = 48 * 60 * 60 * 1000;

export type PendingCheckoutDlocalReturn = {
  kind: "individual" | "package";
  sessionCount?: number;
  packageName?: string;
  packageId?: string;
  paymentId?: string;
  orderId?: string;
  savedAt: number;
};

export function dlocalPackageIdempotencyScope(packageId: string): string {
  return `pkg:${packageId}`;
}

export function dlocalIndividualIdempotencyScope(sessionCount: number): string {
  return `ind:${sessionCount}`;
}

export async function acquireDlocalCheckoutIdempotencyKey(scope: string): Promise<string> {
  const storageKey = `${IDEMPOTENCY_PREFIX}${scope}`;
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { key: string; at: number };
      if (Date.now() - parsed.at < MAX_IDEMPOTENCY_AGE_MS && parsed.key.length >= 8) {
        return parsed.key;
      }
    }
  } catch {
    // fall through
  }

  const key = `${scope.replace(/[^a-zA-Z0-9:_-]/g, "-")}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  await AsyncStorage.setItem(storageKey, JSON.stringify({ key, at: Date.now() }));
  return key;
}

export async function clearDlocalCheckoutIdempotencyKey(scope: string): Promise<void> {
  await AsyncStorage.removeItem(`${IDEMPOTENCY_PREFIX}${scope}`);
}

export async function savePendingCheckoutDlocalReturn(
  pending: Omit<PendingCheckoutDlocalReturn, "savedAt">
): Promise<void> {
  const durable: PendingCheckoutDlocalReturn = { ...pending, savedAt: Date.now() };
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(durable));
}

export async function readPendingCheckoutDlocalReturn(): Promise<PendingCheckoutDlocalReturn | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingCheckoutDlocalReturn;
    if (!parsed || (parsed.kind !== "package" && parsed.kind !== "individual")) {
      await AsyncStorage.removeItem(PENDING_KEY);
      return null;
    }
    if (typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt > PENDING_TTL_MS) {
      await AsyncStorage.removeItem(PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingCheckoutDlocalReturn(options?: {
  clearIdempotency?: boolean;
}): Promise<void> {
  const pending = await readPendingCheckoutDlocalReturn();
  await AsyncStorage.removeItem(PENDING_KEY);
  if (options?.clearIdempotency && pending) {
    if (pending.kind === "package" && pending.packageId) {
      await clearDlocalCheckoutIdempotencyKey(dlocalPackageIdempotencyScope(pending.packageId));
    } else if (pending.kind === "individual" && pending.sessionCount) {
      await clearDlocalCheckoutIdempotencyKey(dlocalIndividualIdempotencyScope(pending.sessionCount));
    }
  }
}
