import type { Market } from "@prisma/client";
import type { FinanceRules } from "../modules/finance/finance.service.js";

/** Precio de lista en unidades mayores (ARS o USD) según el mercado del paquete de catálogo. */
export function listPriceMajorUnitsForPackageMarket(
  profile: { market: Market; sessionPriceArs: number | null; sessionPriceUsd: number | null },
  packageMarket: Market
): number | null {
  if (packageMarket === "AR") {
    if (profile.sessionPriceArs != null && profile.sessionPriceArs > 0) {
      return profile.sessionPriceArs;
    }
    if (profile.market === "AR" && profile.sessionPriceUsd != null && profile.sessionPriceUsd > 0) {
      return profile.sessionPriceUsd;
    }
    return null;
  }
  if (profile.sessionPriceUsd != null && profile.sessionPriceUsd > 0) {
    return profile.sessionPriceUsd;
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
