import type { Market } from "@prisma/client";
import { majorCurrencyCodeForMarket } from "@therapy/types";
import type { FinanceRules } from "../modules/finance/finance.service.js";

const AR_SESSION_LIST_MIN = 2_000;
const AR_SESSION_LIST_MAX = 5_000_000;

export type SessionListPriceValidationError = {
  message: string;
  sessionPriceMin: number;
  sessionPriceMax: number;
  currencyCode: string;
};

export function validateProfessionalSessionListPrice(params: {
  market: Market;
  price: number;
  financeRules: FinanceRules;
}): SessionListPriceValidationError | null {
  if (params.market === "AR") {
    if (params.price < AR_SESSION_LIST_MIN || params.price > AR_SESSION_LIST_MAX) {
      return {
        message: `Session list price must be between ${AR_SESSION_LIST_MIN} and ${AR_SESSION_LIST_MAX} ARS.`,
        sessionPriceMin: AR_SESSION_LIST_MIN,
        sessionPriceMax: AR_SESSION_LIST_MAX,
        currencyCode: "ARS"
      };
    }
    return null;
  }

  const { sessionPriceMinUsd, sessionPriceMaxUsd } = params.financeRules;
  if (params.price < sessionPriceMinUsd || params.price > sessionPriceMaxUsd) {
    const code = majorCurrencyCodeForMarket(params.market);
    return {
      message: `Session list price must be between ${sessionPriceMinUsd} and ${sessionPriceMaxUsd} ${code}.`,
      sessionPriceMin: sessionPriceMinUsd,
      sessionPriceMax: sessionPriceMaxUsd,
      currencyCode: code
    };
  }
  return null;
}
