import { describe, expect, it } from "vitest";
import {
  ceilUsdToLocalMajor,
  PATIENT_LOCAL_PRICE_ROUND_STEP,
  roundSessionPriceArsFromUsd,
  SESSION_PRICE_ARS_ROUND_STEP
} from "./sessionPriceArs.js";

describe("ceilUsdToLocalMajor / roundSessionPriceArsFromUsd", () => {
  it("exporta el step de 500", () => {
    expect(PATIENT_LOCAL_PRICE_ROUND_STEP).toBe(500);
    expect(SESSION_PRICE_ARS_ROUND_STEP).toBe(500);
  });

  it("multiplica USD por la cotización cuando ya cae en múltiplo de 500", () => {
    expect(ceilUsdToLocalMajor(50, 1400)).toBe(70_000);
    expect(roundSessionPriceArsFromUsd(30, 1000)).toBe(30_000);
    expect(ceilUsdToLocalMajor(81, 500)).toBe(40_500);
  });

  it("siempre redondea hacia arriba al múltiplo de 500", () => {
    // 50 * 1392.50 = 69_625 → 70_000
    expect(ceilUsdToLocalMajor(50, 1392.5)).toBe(70_000);
    // 40 * 1272.5 = 50_900 → 51_000
    expect(ceilUsdToLocalMajor(40, 1272.5)).toBe(51_000);
    // 40.001 * 1000 = 40_001 → 40_500
    expect(ceilUsdToLocalMajor(40.001, 1000)).toBe(40_500);
    // apenas por encima de un múltiplo exacto → siguiente
    expect(ceilUsdToLocalMajor(50, 1400.02)).toBe(70_500);
  });

  it("sube al primer múltiplo válido cuando el producto es positivo pero muy chico", () => {
    expect(ceilUsdToLocalMajor(1, 1)).toBe(PATIENT_LOCAL_PRICE_ROUND_STEP);
  });

  it("devuelve 0 para entradas inválidas o no positivas", () => {
    expect(ceilUsdToLocalMajor(0, 1400)).toBe(0);
    expect(ceilUsdToLocalMajor(50, 0)).toBe(0);
    expect(ceilUsdToLocalMajor(NaN, 1400)).toBe(0);
  });
});
