import type { KpisResponse } from "../../app/types";

/**
 * Valores demo hasta conectar cobros reales (Stripe / banco).
 * Anclados al mes de KPIs para que suban/bajen con datos reales de actividad.
 */
export function financeSimulatedAccruedCollected(kpis: KpisResponse["kpis"] | undefined): {
  accruedCents: number;
  collectedCents: number;
} {
  if (!kpis) {
    return { accruedCents: 0, collectedCents: 0 };
  }
  const feePackages = kpis.packagePlatformFeeFromPurchasesMonthCents ?? 0;
  const feeSessions = kpis.platformFeeMonthCents ?? 0;
  const grossPkg = kpis.packagePurchasesMonthCents ?? 0;
  const grossSess = kpis.grossSessionsMonthCents ?? 0;
  const base = feePackages + feeSessions + Math.round((grossPkg + grossSess) * 0.06);
  const accruedCents = base > 0 ? Math.round(base * 1.12) : 42_800_00;
  const collectedCents = Math.round(accruedCents * 0.76);
  return { accruedCents, collectedCents };
}
