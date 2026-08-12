import { afterEach, describe, expect, it, vi } from "vitest";
import {
  armCheckoutCreditProtection,
  clearCheckoutCreditProtection,
  isCheckoutCreditProtectionActive
} from "./checkoutCreditProtection";

describe("checkoutCreditProtection", () => {
  afterEach(() => {
    clearCheckoutCreditProtection();
    vi.useRealTimers();
  });

  it("is active immediately after arming", () => {
    vi.useFakeTimers();
    armCheckoutCreditProtection(5_000);
    expect(isCheckoutCreditProtectionActive()).toBe(true);
  });

  it("expires after the duration", () => {
    vi.useFakeTimers();
    armCheckoutCreditProtection(5_000);
    vi.advanceTimersByTime(5_001);
    expect(isCheckoutCreditProtectionActive()).toBe(false);
  });

  it("extends when armed again with a longer window", () => {
    vi.useFakeTimers();
    armCheckoutCreditProtection(2_000);
    armCheckoutCreditProtection(8_000);
    vi.advanceTimersByTime(3_000);
    expect(isCheckoutCreditProtectionActive()).toBe(true);
    vi.advanceTimersByTime(5_001);
    expect(isCheckoutCreditProtectionActive()).toBe(false);
  });
});
