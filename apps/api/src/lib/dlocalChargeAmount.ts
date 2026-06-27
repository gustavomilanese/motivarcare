import type { Market } from "@prisma/client";

/**
 * Monto y moneda enviados a dLocal Go.
 * - AR: convertimos a ARS con cotización del día.
 * - Resto de países dLocal: USD; dLocal muestra moneda local al pagador.
 */
export function resolveDlocalChargeAmount(params: {
  market: Market;
  priceUsdCents: number;
  arsPerUsd: number | null;
}): { amountMajor: number; currency: string } {
  if (params.market === "AR") {
    const arsPerUsd = params.arsPerUsd;
    if (arsPerUsd == null || !Number.isFinite(arsPerUsd) || arsPerUsd <= 0) {
      throw new Error("USD/ARS exchange rate unavailable for Argentina checkout");
    }
    const usdMajor = params.priceUsdCents / 100;
    return {
      amountMajor: Math.max(1, Math.round(usdMajor * arsPerUsd)),
      currency: "ARS"
    };
  }

  return {
    amountMajor: Math.max(0.5, Math.round((params.priceUsdCents / 100) * 100) / 100),
    currency: "USD"
  };
}
