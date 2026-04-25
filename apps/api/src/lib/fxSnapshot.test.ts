import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { computeFxSnapshot } from "./fxSnapshot.js";
import { __resetUsdArsCacheForTests } from "./usdArsExchange.js";

type FetchSpy = MockInstance<typeof globalThis.fetch>;

describe("computeFxSnapshot", () => {
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

  it("USD: equivalente = priceCents, sin FX, provider 'n/a'", async () => {
    const snap = await computeFxSnapshot({ priceCents: 40_000, currency: "usd" });
    expect(snap.packagePriceUsdCentsSnapshot).toBe(40_000);
    expect(snap.fxArsPerUsdSnapshot).toBeNull();
    expect(snap.fxProviderSnapshot).toBe("n/a");
    expect(snap.fxFetchedAt).toBeInstanceOf(Date);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("USD insensible a mayúsculas/espacios", async () => {
    const snap = await computeFxSnapshot({ priceCents: 12_345, currency: "USD" });
    expect(snap.packagePriceUsdCentsSnapshot).toBe(12_345);
    expect(snap.fxProviderSnapshot).toBe("n/a");
  });

  it("ARS: usa override y calcula equivalente USD en centavos", async () => {
    process.env.USD_ARS_RATE_OVERRIDE = "1400";
    // priceCents 28_000_000 = 280.000 ARS centavos = 280_000 ARS
    // a rate 1400 → 200 USD = 20_000 USD cents
    const snap = await computeFxSnapshot({ priceCents: 28_000_000, currency: "ars" });
    expect(snap.packagePriceUsdCentsSnapshot).toBe(20_000);
    expect(snap.fxArsPerUsdSnapshot).toBe("1400.0000");
    expect(snap.fxProviderSnapshot).toBe("override");
    expect(snap.fxFetchedAt).toBeInstanceOf(Date);
  });

  it("ARS: si el provider FX falla, no rompe (todos los campos null) y queda registro para backfill", async () => {
    delete process.env.USD_ARS_RATE_OVERRIDE;
    fetchSpy
      .mockResolvedValueOnce(new Response("oops", { status: 500 }))
      .mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const snap = await computeFxSnapshot({ priceCents: 28_000_000, currency: "ars" });
    expect(snap.packagePriceUsdCentsSnapshot).toBeNull();
    expect(snap.fxArsPerUsdSnapshot).toBeNull();
    expect(snap.fxProviderSnapshot).toBeNull();
    expect(snap.fxFetchedAt).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });

  it("ARS: redondea correctamente cuando el rate da fracciones de centavo", async () => {
    process.env.USD_ARS_RATE_OVERRIDE = "1392.5";
    // priceCents 6_962_500 / 1392.5 = 5_000 USD cents = 50 USD
    const snap = await computeFxSnapshot({ priceCents: 6_962_500, currency: "ars" });
    expect(snap.packagePriceUsdCentsSnapshot).toBe(5_000);
    expect(snap.fxArsPerUsdSnapshot).toBe("1392.5000");
  });

  it("monedas no soportadas (eur, brl): no hace FX, todo null", async () => {
    const snap = await computeFxSnapshot({ priceCents: 5000, currency: "eur" });
    expect(snap.packagePriceUsdCentsSnapshot).toBeNull();
    expect(snap.fxArsPerUsdSnapshot).toBeNull();
    expect(snap.fxProviderSnapshot).toBeNull();
    expect(snap.fxFetchedAt).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
