import { isDlocalGoCheckoutAvailable, type Market } from "@therapy/types";

export function patientUsesDlocalCheckout(params: {
  patientMarket: Market;
  residencyCountry: string | null;
}): boolean {
  return isDlocalGoCheckoutAvailable({
    market: params.patientMarket,
    residencyCountry: params.residencyCountry
  });
}
