import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUsdArsRate, roundSessionPriceArsFromUsd } from "./usdArsExchange.js";

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
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
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
