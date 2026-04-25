import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
  __resetUsdArsCacheForTests,
  getUsdArsQuote,
  getUsdArsRate,
  roundSessionPriceArsFromUsd
} from "./usdArsExchange.js";

type FetchSpy = MockInstance<typeof globalThis.fetch>;

describe("roundSessionPriceArsFromUsd", () => {
  it("multiplica USD por la cotización", () => {
    expect(roundSessionPriceArsFromUsd(50, 1400)).toBe(70_000);
  });

  it("redondea hacia arriba al próximo múltiplo de 1.000", () => {
    // 50 * 1392.50 = 69_625 → ceil al 70_000
    expect(roundSessionPriceArsFromUsd(50, 1392.5)).toBe(70_000);
    // 80 * 1418 = 113_440 → ceil al 114_000
    expect(roundSessionPriceArsFromUsd(80, 1418)).toBe(114_000);
    // 30 * 1000 = 30_000 → ya es múltiplo
    expect(roundSessionPriceArsFromUsd(30, 1000)).toBe(30_000);
    // 1 * 1 = 1 → ceil(0.001) * 1000 = 1_000
    expect(roundSessionPriceArsFromUsd(1, 1)).toBe(1_000);
  });

  it("aplica el redondeo aún si el resultado es exactamente múltiplo + 1", () => {
    // 50 * 1400.02 = 70_001 → ceil al 71_000
    expect(roundSessionPriceArsFromUsd(50, 1400.02)).toBe(71_000);
  });
});

describe("getUsdArsRate", () => {
  const originalEnv = process.env.USD_ARS_RATE_OVERRIDE;
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    __resetUsdArsCacheForTests();
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
});

describe("getUsdArsQuote", () => {
  const originalEnv = process.env.USD_ARS_RATE_OVERRIDE;
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    __resetUsdArsCacheForTests();
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

  it("devuelve provider='bluelytics' cuando es el primario", async () => {
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
