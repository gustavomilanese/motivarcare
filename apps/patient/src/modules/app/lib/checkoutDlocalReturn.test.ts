import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_DLOCAL_RETURN_STORAGE_KEY,
  clearPendingCheckoutDlocalReturn,
  readPendingCheckoutDlocalReturn,
  savePendingCheckoutDlocalReturn
} from "./checkoutDlocalReturn";
import {
  acquireDlocalCheckoutIdempotencyKey,
  clearDlocalCheckoutIdempotencyKey,
  dlocalIndividualIdempotencyScope,
  dlocalPackageIdempotencyScope
} from "./dlocalCheckoutIdempotency";

function installWebStorageMock(): void {
  const createStore = () => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      }
    };
  };
  vi.stubGlobal("sessionStorage", createStore());
  vi.stubGlobal("localStorage", createStore());
}

describe("checkoutDlocalReturn", () => {
  beforeEach(() => {
    installWebStorageMock();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("round-trips package pending state with sessionCount", () => {
    savePendingCheckoutDlocalReturn({
      kind: "package",
      packageId: "pkg-8",
      packageName: "Continuidad",
      sessionCount: 8,
      paymentId: "pay-1",
      orderId: "ord-1"
    });

    expect(readPendingCheckoutDlocalReturn()).toEqual({
      kind: "package",
      packageId: "pkg-8",
      packageName: "Continuidad",
      sessionCount: 8,
      paymentId: "pay-1",
      orderId: "ord-1"
    });
  });

  it("round-trips package pending state", () => {
    savePendingCheckoutDlocalReturn({
      kind: "package",
      packageId: "pkg-8",
      packageName: "Continuidad",
      paymentId: "pay-1",
      orderId: "ord-1"
    });

    expect(readPendingCheckoutDlocalReturn()).toEqual({
      kind: "package",
      packageId: "pkg-8",
      packageName: "Continuidad",
      paymentId: "pay-1",
      orderId: "ord-1"
    });
  });

  it("round-trips individual pending state", () => {
    savePendingCheckoutDlocalReturn({
      kind: "individual",
      sessionCount: 3,
      paymentId: "pay-ind",
      orderId: "ord-ind"
    });

    expect(readPendingCheckoutDlocalReturn()?.kind).toBe("individual");
    expect(readPendingCheckoutDlocalReturn()?.sessionCount).toBe(3);
  });

  it("rehydrates from localStorage when sessionStorage is empty", () => {
    savePendingCheckoutDlocalReturn({
      kind: "package",
      packageId: "pkg-4",
      paymentId: "pay-local",
      orderId: "ord-local"
    });
    sessionStorage.removeItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY);

    expect(readPendingCheckoutDlocalReturn()).toMatchObject({
      kind: "package",
      packageId: "pkg-4",
      paymentId: "pay-local"
    });
    expect(sessionStorage.getItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY)).toBeTruthy();
  });

  it("clearPendingCheckoutDlocalReturn removes storage key", () => {
    savePendingCheckoutDlocalReturn({ kind: "package", packageId: "pkg-4" });
    clearPendingCheckoutDlocalReturn();
    expect(sessionStorage.getItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY)).toBeNull();
    expect(readPendingCheckoutDlocalReturn()).toBeNull();
  });

  it("clearPendingCheckoutDlocalReturn with idempotency clears package scope", () => {
    const scope = dlocalPackageIdempotencyScope("pkg-8");
    const key = acquireDlocalCheckoutIdempotencyKey(scope);
    expect(key.length).toBeGreaterThan(8);

    savePendingCheckoutDlocalReturn({ kind: "package", packageId: "pkg-8" });
    clearPendingCheckoutDlocalReturn({ clearIdempotency: true });

    const nextKey = acquireDlocalCheckoutIdempotencyKey(scope);
    expect(nextKey).not.toBe(key);
  });

  it("clearPendingCheckoutDlocalReturn with idempotency clears individual scope", () => {
    const scope = dlocalIndividualIdempotencyScope(2);
    acquireDlocalCheckoutIdempotencyKey(scope);

    savePendingCheckoutDlocalReturn({ kind: "individual", sessionCount: 2 });
    clearPendingCheckoutDlocalReturn({ clearIdempotency: true });

    clearDlocalCheckoutIdempotencyKey(scope);
    expect(acquireDlocalCheckoutIdempotencyKey(scope)).toBeTruthy();
  });

  it("returns null for invalid JSON in storage", () => {
    sessionStorage.setItem(CHECKOUT_DLOCAL_RETURN_STORAGE_KEY, "{not-json");
    expect(readPendingCheckoutDlocalReturn()).toBeNull();
  });
});

describe("dlocalCheckoutIdempotency", () => {
  beforeEach(() => {
    installWebStorageMock();
    sessionStorage.clear();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.useRealTimers();
  });

  it("reuses idempotency key within TTL", () => {
    const scope = dlocalPackageIdempotencyScope("pkg-test");
    const first = acquireDlocalCheckoutIdempotencyKey(scope);
    vi.advanceTimersByTime(5 * 60 * 1000);
    const second = acquireDlocalCheckoutIdempotencyKey(scope);
    expect(second).toBe(first);
  });

  it("issues new key after TTL expires", () => {
    const scope = dlocalIndividualIdempotencyScope(5);
    const first = acquireDlocalCheckoutIdempotencyKey(scope);
    vi.advanceTimersByTime(31 * 60 * 1000);
    const second = acquireDlocalCheckoutIdempotencyKey(scope);
    expect(second).not.toBe(first);
  });
});
