/**
 * Conversión USD → moneda local de lista / display / cobro dLocal.
 * Fuente única: ceil al múltiplo de {@link PATIENT_LOCAL_PRICE_ROUND_STEP}.
 */

/** Múltiplo de redondeo local (40.500, 54.500, …). */
export const PATIENT_LOCAL_PRICE_ROUND_STEP = 500;

/** @deprecated Usar {@link PATIENT_LOCAL_PRICE_ROUND_STEP}. */
export const SESSION_PRICE_ARS_ROUND_STEP = PATIENT_LOCAL_PRICE_ROUND_STEP;

/**
 * Convierte USD (unidades mayores) a moneda local con el TC vigente.
 * Siempre redondea **hacia arriba** al múltiplo de {@link PATIENT_LOCAL_PRICE_ROUND_STEP}.
 * Valores positivos muy chicos suben al primer múltiplo válido.
 */
export function ceilUsdToLocalMajor(
  usdMajor: number,
  ratePerUsd: number,
  step: number = PATIENT_LOCAL_PRICE_ROUND_STEP
): number {
  if (
    !Number.isFinite(usdMajor)
    || !Number.isFinite(ratePerUsd)
    || !Number.isFinite(step)
    || usdMajor <= 0
    || ratePerUsd <= 0
    || step <= 0
  ) {
    return 0;
  }

  const raw = usdMajor * ratePerUsd;
  let rounded = Math.ceil(raw / step) * step;

  if (raw > 0 && rounded < step) {
    rounded = step;
  }

  return rounded;
}

/**
 * Compatibilidad: mismo ceil ×500 que el resto de monedas dLocal.
 * Preferir {@link ceilUsdToLocalMajor} en código nuevo.
 */
export function roundSessionPriceArsFromUsd(usdMajor: number, arsPerUsd: number): number {
  return ceilUsdToLocalMajor(usdMajor, arsPerUsd);
}
