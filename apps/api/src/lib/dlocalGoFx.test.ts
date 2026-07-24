import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDlocalGoUsdFxRates,
  parseExchangeListForTests,
  resetDlocalGoFxCacheForTests
} from "./dlocalGoFx.js";

vi.mock("./dlocalGoClient.js", () => ({
  isDlocalGoConfigured: vi.fn(() => true),
  dlocalGoRequest: vi.fn()
}));

import { dlocalGoRequest, isDlocalGoConfigured } from "./dlocalGoClient.js";

describe("dlocalGoFx", () => {
  afterEach(() => {
    resetDlocalGoFxCacheForTests();
    vi.mocked(isDlocalGoConfigured).mockReset();
    vi.mocked(dlocalGoRequest).mockReset();
    vi.mocked(isDlocalGoConfigured).mockReturnValue(true);
  });

  it("returns empty when dLocal Go is not configured", async () => {
    vi.mocked(isDlocalGoConfigured).mockReturnValue(false);
    await expect(getDlocalGoUsdFxRates()).resolves.toEqual({});
    expect(dlocalGoRequest).not.toHaveBeenCalled();
  });

  it("maps USD→local rates from currency-exchanges", async () => {
    vi.mocked(dlocalGoRequest).mockResolvedValue([
      { source_currency: "USD", target_currency: "COP", value: 4689.8892 },
      { source_currency: "USD", target_currency: "ARS", value: 1320.473 },
      { source_currency: "EUR", target_currency: "USD", value: 1.1 }
    ]);

    const rates = await getDlocalGoUsdFxRates();
    expect(rates.COP).toBe(4689.8892);
    expect(rates.ARS).toBe(1320.473);
    expect(rates.EUR).toBeUndefined();
  });

  it("caches within TTL", async () => {
    vi.mocked(dlocalGoRequest).mockResolvedValue([
      { source_currency: "USD", target_currency: "MXN", value: 21.8 }
    ]);

    await getDlocalGoUsdFxRates();
    await getDlocalGoUsdFxRates();
    expect(dlocalGoRequest).toHaveBeenCalledOnce();
  });
});

describe("parseExchangeListForTests", () => {
  it("ignores invalid rows", () => {
    expect(
      parseExchangeListForTests([
        { source_currency: "USD", target_currency: "CLP", value: 1000 },
        { source_currency: "USD", target_currency: "xx", value: 1 },
        null,
        { source_currency: "USD", target_currency: "PEN", value: -1 }
      ])
    ).toEqual({ CLP: 1000 });
  });
});
