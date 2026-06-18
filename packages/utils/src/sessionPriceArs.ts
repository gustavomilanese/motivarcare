/**
 * Precio de lista ARS derivado de USD × tipo de cambio.
 * Fuente única de verdad para persistencia, display y validación.
 */

/** Múltiplo de redondeo ARS ("pares": 50.000, 52.000, …). */
export const SESSION_PRICE_ARS_ROUND_STEP = 2_000;

/**
 * Convierte USD (enteros mayores) a ARS de lista con el TC vigente.
 * Redondea al múltiplo de {@link SESSION_PRICE_ARS_ROUND_STEP} más cercano (half-up).
 * Valores positivos muy chicos suben al primer múltiplo válido.
 */
export function roundSessionPriceArsFromUsd(usdMajor: number, arsPerUsd: number): number {
  if (!Number.isFinite(usdMajor) || !Number.isFinite(arsPerUsd) || usdMajor <= 0 || arsPerUsd <= 0) {
    return 0;
  }

  const raw = usdMajor * arsPerUsd;
  let rounded = Math.round(raw / SESSION_PRICE_ARS_ROUND_STEP) * SESSION_PRICE_ARS_ROUND_STEP;

  if (raw > 0 && rounded < SESSION_PRICE_ARS_ROUND_STEP) {
    rounded = SESSION_PRICE_ARS_ROUND_STEP;
  }

  return rounded;
}
