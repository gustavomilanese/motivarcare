const STORAGE_PREFIX = "mc:dlocal-idempotency";
const MAX_AGE_MS = 30 * 60 * 1000;

export function dlocalPackageIdempotencyScope(packageId: string): string {
  return `pkg:${packageId}`;
}

export function dlocalIndividualIdempotencyScope(sessionCount: number): string {
  return `ind:${sessionCount}`;
}

export function acquireDlocalCheckoutIdempotencyKey(scope: string): string {
  if (typeof sessionStorage === "undefined") {
    return `${scope}-${Date.now()}`;
  }

  const storageKey = `${STORAGE_PREFIX}:${scope}`;
  const raw = sessionStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { key: string; at: number };
      if (Date.now() - parsed.at < MAX_AGE_MS && parsed.key.length >= 8) {
        return parsed.key;
      }
    } catch {
      // fall through
    }
  }

  const key = `${scope.replace(/[^a-zA-Z0-9:_-]/g, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(storageKey, JSON.stringify({ key, at: Date.now() }));
  return key;
}

export function clearDlocalCheckoutIdempotencyKey(scope: string): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.removeItem(`${STORAGE_PREFIX}:${scope}`);
}
