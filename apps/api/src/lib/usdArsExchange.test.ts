import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
  __resetUsdArsCacheForTests,
  getUsdArsQuote,
  getUsdArsRate
} from "./usdArsExchange.js";
import { roundSessionPriceArsFromUsd } from "@therapy/i18n-config";

vi.mock("./dlocalGoFx.js", () => ({
  getDlocalGoUsdFxRates: vi.fn(async () => ({})),
  resetDlocalGoFxCacheForTests: vi.fn()
}));

import { getDlocalGoUsdFxRates } from "./dlocalGoFx.js";

type FetchSpy = MockInstance<typeof globalThis.fetch>;

describe("roundSessionPriceArsFromUsd (shared)", () => {
  it("re-exporta la regla canónica de @therapy/i18n-config", () => {
    expect(roundSessionPriceArsFromUsd(50, 1400)).toBe(70_000);
    expect(roundSessionPriceArsFromUsd(40, 1275)).toBe(52_000);
  });
});

describe("getUsdArsRate", () => {
  const originalEnv = process.env.USD_ARS_RATE_OVERRIDE;
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    __resetUsdArsCacheForTests();
    vi.mocked(getDlocalGoUsdFxRates).mockReset();
    vi.mocked(getDlocalGoUsdFxRates).mockResolvedValue({});
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    if (originalEnv === undefined) {
      delete process.env.USD_ARS_RATE_OVERRIDE;
    } else {
      process.env.USD_ARS_RATE_OVERRIDE = originalEnv;
    }
  });

  it("respeta USD_ARS_RATE_OVERRIDE y no llama a la red", async () => {
    process.env.USD_ARS_RATE_OVERRIDE = "1500";
    const rate = await getUsdArsRate();
    expect(rate).toBe(1500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignora override inválido (NaN, vacío, negativo) y cae al provider", async () => {
    process.env.USD_ARS_RATE_OVERRIDE = "abc";
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ oficial: { value_avg: 1400 } }), { status: 200 })
    );
    const rate = await getUsdArsRate();
    expect(rate).toBe(1400);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("prioriza FX dLocal Go para ARS cuando está disponible", async () => {
    delete process.env.USD_ARS_RATE_OVERRIDE;
    vi.mocked(getDlocalGoUsdFxRates).mockResolvedValue({ ARS: 1320.5 });
    const rate = await getUsdArsRate();
    expect(rate).toBe(1320.5);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("getUsdArsQuote", () => {
  const originalEnv = process.env.USD_ARS_RATE_OVERRIDE;
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    __resetUsdArsCacheForTests();
    vi.mocked(getDlocalGoUsdFxRates).mockReset();
    vi.mocked(getDlocalGoUsdFxRates).mockResolvedValue({});
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    if (originalEnv === undefined) {
      delete process.env.USD_ARS_RATE_OVERRIDE;
    } else {
      process.env.USD_ARS_RATE_OVERRIDE = originalEnv;
    }
  });

  it("devuelve provider='override' cuando hay USD_ARS_RATE_OVERRIDE válido", async () => {
    process.env.USD_ARS_RATE_OVERRIDE = "1500";
    const quote = await getUsdArsQuote();
    expect(quote.rate).toBe(1500);
    expect(quote.provider).toBe("override");
    expect(quote.fetchedAt).toBeInstanceOf(Date);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("devuelve provider='dlocalgo' cuando currency-exchanges trae ARS", async () => {
    delete process.env.USD_ARS_RATE_OVERRIDE;
    vi.mocked(getDlocalGoUsdFxRates).mockResolvedValue({ ARS: 1320.47 });
    const quote = await getUsdArsQuote();
    expect(quote.rate).toBe(1320.47);
    expect(quote.provider).toBe("dlocalgo");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("devuelve provider='bluelytics' cuando dLocal no trae ARS", async () => {
    delete process.env.USD_ARS_RATE_OVERRIDE;
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ oficial: { value_avg: 1400 } }), { status: 200 })
    );
    const quote = await getUsdArsQuote();
    expect(quote.rate).toBe(1400);
    expect(quote.provider).toBe("bluelytics");
    expect(quote.fetchedAt).toBeInstanceOf(Date);
  });

  it("cae a dolarapi cuando bluelytics falla (no-200)", async () => {
    delete process.env.USD_ARS_RATE_OVERRIDE;
    fetchSpy
      .mockResolvedValueOnce(new Response("oops", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ venta: 1410 }), { status: 200 }));
    const quote = await getUsdArsQuote();
    expect(quote.rate).toBe(1410);
    expect(quote.provider).toBe("dolarapi");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
