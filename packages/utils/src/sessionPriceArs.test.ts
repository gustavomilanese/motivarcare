import { describe, expect, it } from "vitest";
import { roundSessionPriceArsFromUsd, SESSION_PRICE_ARS_ROUND_STEP } from "./sessionPriceArs.js";

describe("roundSessionPriceArsFromUsd", () => {
  it("multiplica USD por la cotización cuando ya cae en múltiplo de 2.000", () => {
    expect(roundSessionPriceArsFromUsd(50, 1400)).toBe(70_000);
    expect(roundSessionPriceArsFromUsd(30, 1000)).toBe(30_000);
  });

  it("redondea al múltiplo de 2.000 más cercano", () => {
    // 50 * 1392.50 = 69_625 → 70_000
    expect(roundSessionPriceArsFromUsd(50, 1392.5)).toBe(70_000);
    // 80 * 1418 = 113_440 → 114_000
    expect(roundSessionPriceArsFromUsd(80, 1418)).toBe(114_000);
    // 40 * 1272.5 = 50_900 → 50_000 (más cerca que 52_000)
    expect(roundSessionPriceArsFromUsd(40, 1272.5)).toBe(50_000);
    // 40 * 1277.5 = 51_100 → 52_000
    expect(roundSessionPriceArsFromUsd(40, 1277.5)).toBe(52_000);
  });

  it("en empate exacto entre dos múltiplos de 2.000 redondea hacia arriba (half-up)", () => {
    // 51_000 está a mitad entre 50_000 y 52_000
    expect(roundSessionPriceArsFromUsd(40, 1275)).toBe(52_000);
  });

  it("sube al primer múltiplo válido cuando el producto es positivo pero muy chico", () => {
    expect(roundSessionPriceArsFromUsd(1, 1)).toBe(SESSION_PRICE_ARS_ROUND_STEP);
  });

  it("devuelve 0 para entradas inválidas o no positivas", () => {
    expect(roundSessionPriceArsFromUsd(0, 1400)).toBe(0);
    expect(roundSessionPriceArsFromUsd(50, 0)).toBe(0);
    expect(roundSessionPriceArsFromUsd(NaN, 1400)).toBe(0);
  });

  it("no infla de más montos apenas por encima de un múltiplo exacto", () => {
    // 50 * 1400.02 = 70_001 → 70_000 (más cerca que 72_000)
    expect(roundSessionPriceArsFromUsd(50, 1400.02)).toBe(70_000);
  });
});
