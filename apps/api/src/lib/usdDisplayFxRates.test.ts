import { afterEach, describe, expect, it, vi } from "vitest";
import { getUsdDisplayFxRates, resetUsdDisplayFxRatesCacheForTests } from "./usdDisplayFxRates.js";

vi.mock("./usdArsExchange.js", () => ({
  getUsdArsRate: vi.fn(async () => 1400)
}));

describe("getUsdDisplayFxRates", () => {
  afterEach(() => {
    resetUsdDisplayFxRatesCacheForTests();
    vi.restoreAllMocks();
  });

  it("merges live ARS with open.er-api rates for LatAm display currencies", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        result: "success",
        rates: {
          COP: 4200,
          MXN: 18.2,
          CLP: 945,
          BRL: 5.6,
          EUR: 0.91
        }
      })
    } as Response);

    const rates = await getUsdDisplayFxRates();

    expect(rates.ARS).toBe(1400);
    expect(rates.COP).toBe(4200);
    expect(rates.MXN).toBe(18.2);
    expect(rates.CLP).toBe(945);
    expect(rates.BRL).toBe(5.6);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falls back to static rates when remote FX is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const rates = await getUsdDisplayFxRates();

    expect(rates.ARS).toBe(1400);
    expect(rates.COP).toBeGreaterThan(1000);
    expect(rates.MXN).toBeGreaterThan(10);
  });

  it("caches rates within TTL", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result: "success", rates: { COP: 4000 } })
    } as Response);

    await getUsdDisplayFxRates();
    await getUsdDisplayFxRates();

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
