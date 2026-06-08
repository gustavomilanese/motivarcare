import type { Market } from "@prisma/client";

type SessionPackageMarketRef = {
  market: Market;
  professionalId: string | null;
};

/**
 * Filas globales del catálogo AR (`professionalId` null) se sirven como plantilla
 * en `/public/session-packages` para otros mercados; el precio se recalcula al comprar.
 */
export function sessionPackageAvailableForPatientMarket(
  sessionPackage: SessionPackageMarketRef,
  patientMarket: Market
): boolean {
  if (sessionPackage.market === patientMarket) {
    return true;
  }

  return sessionPackage.professionalId === null && sessionPackage.market === "AR";
}
