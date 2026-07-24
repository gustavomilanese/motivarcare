import { afterEach, describe, expect, it, vi } from "vitest";
import { getUsdDisplayFxRates, resetUsdDisplayFxRatesCacheForTests } from "./usdDisplayFxRates.js";

vi.mock("./dlocalGoFx.js", () => ({
  DLOCAL_GO_LATAM_DISPLAY_CURRENCIES: [
    "ARS",
    "BOB",
    "BRL",
    "CLP",
    "COP",
    "CRC",
    "GTQ",
    "MXN",
    "PEN",
    "PYG",
    "UYU"
  ],
  getDlocalGoUsdFxRates: vi.fn(async () => ({}))
}));

vi.mock("./usdArsExchange.js", () => ({
  getUsdArsRate: vi.fn(async () => 1400)
}));

import { getDlocalGoUsdFxRates } from "./dlocalGoFx.js";

describe("getUsdDisplayFxRates", () => {
  afterEach(() => {
    resetUsdDisplayFxRatesCacheForTests();
    vi.mocked(getDlocalGoUsdFxRates).mockReset();
    vi.mocked(getDlocalGoUsdFxRates).mockResolvedValue({});
    vi.restoreAllMocks();
  });

  it("prefers dLocal Go LATAM rates over open.er-api", async () => {
    vi.mocked(getDlocalGoUsdFxRates).mockResolvedValue({
      ARS: 1320.47,
      COP: 4689.89,
      MXN: 21.85,
      CLP: 1083.95,
      BRL: 6.65
    });
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

    expect(rates.ARS).toBe(1320.47);
    expect(rates.COP).toBe(4689.89);
    expect(rates.MXN).toBe(21.85);
    expect(rates.CLP).toBe(1083.95);
    expect(rates.BRL).toBe(6.65);
    expect(rates.EUR).toBe(0.91);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falls back to ARS helper + open.er-api when dLocal is empty", async () => {
    vi.mocked(getDlocalGoUsdFxRates).mockResolvedValue({});
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
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
  });

  it("falls back to static rates when remote FX is unavailable", async () => {
    vi.mocked(getDlocalGoUsdFxRates).mockResolvedValue({});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const rates = await getUsdDisplayFxRates();

    expect(rates.ARS).toBe(1400);
    expect(rates.COP).toBeGreaterThan(1000);
    expect(rates.MXN).toBeGreaterThan(10);
  });

  it("caches rates within TTL", async () => {
    vi.mocked(getDlocalGoUsdFxRates).mockResolvedValue({ COP: 4500 });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result: "success", rates: { EUR: 0.9 } })
    } as Response);

    await getUsdDisplayFxRates();
    await getUsdDisplayFxRates();

    expect(getDlocalGoUsdFxRates).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
