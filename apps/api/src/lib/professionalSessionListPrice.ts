import type { Market } from "@prisma/client";
import type { FinanceRules } from "../modules/finance/finance.service.js";
import { roundSessionPriceArsFromUsd } from "./usdArsExchange.js";
import { listPriceUsdMajorUnits } from "./resolveSessionPackagePrice.js";

type PriceProfile = {
  market: Market;
  sessionPriceArs: number | null;
  sessionPriceUsd: number | null;
};

/**
 * Precio de lista en USD (enteros mayores). Fuente canónica para catálogo y compras.
 */
export function listPriceMajorUnitsForPackageMarket(
  profile: PriceProfile,
  _packageMarket: Market,
  arsPerUsd?: number | null
): number | null {
  return listPriceUsdMajorUnits(profile, arsPerUsd);
}

export { listPriceUsdMajorUnits };

/**
 * ARS derivado para vistas locales (directorio, admin). No usar para cobro.
 * Si hay USD canónico, siempre se deriva del TC; `sessionPriceArs` almacenado es legacy.
 */
export function effectiveSessionPriceArs(profile: PriceProfile, arsPerUsd: number | null): number | null {
  if (
    arsPerUsd != null
    && Number.isFinite(arsPerUsd)
    && arsPerUsd > 0
    && profile.sessionPriceUsd != null
    && profile.sessionPriceUsd > 0
  ) {
    return roundSessionPriceArsFromUsd(profile.sessionPriceUsd, arsPerUsd);
  }
  if (profile.sessionPriceArs != null && profile.sessionPriceArs > 0) {
    return profile.sessionPriceArs;
  }
  return null;
}

export const AR_SESSION_LIST_MIN = 2_000;
export const AR_SESSION_LIST_MAX = 5_000_000;

export type SessionListPriceValidationError = {
  message: string;
  sessionPriceMin: number;
  sessionPriceMax: number;
  currencyCode: string;
};

export function validateProfessionalSessionListArs(price: number): SessionListPriceValidationError | null {
  if (price < AR_SESSION_LIST_MIN || price > AR_SESSION_LIST_MAX) {
    return {
      message: `Session list price must be between ${AR_SESSION_LIST_MIN} and ${AR_SESSION_LIST_MAX} ARS.`,
      sessionPriceMin: AR_SESSION_LIST_MIN,
      sessionPriceMax: AR_SESSION_LIST_MAX,
      currencyCode: "ARS"
    };
  }
  return null;
}

export function validateProfessionalSessionListUsd(price: number, financeRules: FinanceRules): SessionListPriceValidationError | null {
  const { sessionPriceMinUsd, sessionPriceMaxUsd } = financeRules;
  if (price < sessionPriceMinUsd || price > sessionPriceMaxUsd) {
    return {
      message: `Session list price must be between ${sessionPriceMinUsd} and ${sessionPriceMaxUsd} USD.`,
      sessionPriceMin: sessionPriceMinUsd,
      sessionPriceMax: sessionPriceMaxUsd,
      currencyCode: "USD"
    };
  }
  return null;
}

/** @deprecated Usar validateProfessionalSessionListArs / validateProfessionalSessionListUsd según campo. */
export function validateProfessionalSessionListPrice(params: {
  market: Market;
  price: number;
  financeRules: FinanceRules;
}): SessionListPriceValidationError | null {
  if (params.market === "AR") {
    return validateProfessionalSessionListArs(params.price);
  }
  return validateProfessionalSessionListUsd(params.price, params.financeRules);
}
