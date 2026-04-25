import { getUsdArsQuote } from "./usdArsExchange.js";

/**
 * Foto del tipo de cambio en el momento del cobro, para liquidar al profesional
 * al rate del momento de la transacción independientemente de cómo se mueva
 * el dólar después. Provider-agnostic (Stripe / Mercado Pago).
 *
 * - currency = "usd" → equivalente USD = priceCents, sin FX.
 * - currency = "ars" → consulta cotización oficial y persiste rate + provider + timestamp.
 *   Si el provider FX falla, NO bloquea la creación de la compra (el paciente ya pagó);
 *   se persiste con campos en null y se loguea para reconciliación manual posterior.
 * - otras monedas (eur/brl/gbp) → no hacemos FX, todo en null.
 */
export type FxSnapshotFields = {
  packagePriceUsdCentsSnapshot: number | null;
  fxArsPerUsdSnapshot: string | null;
  fxProviderSnapshot: string | null;
  fxFetchedAt: Date | null;
};

export async function computeFxSnapshot(params: {
  priceCents: number;
  currency: string;
}): Promise<FxSnapshotFields> {
  const currency = params.currency.toLowerCase();

  if (currency === "usd") {
    return {
      packagePriceUsdCentsSnapshot: params.priceCents,
      fxArsPerUsdSnapshot: null,
      fxProviderSnapshot: "n/a",
      fxFetchedAt: new Date()
    };
  }

  if (currency === "ars") {
    try {
      const quote = await getUsdArsQuote();
      const priceUsdCents = Math.round(params.priceCents / quote.rate);
      return {
        packagePriceUsdCentsSnapshot: priceUsdCents,
        fxArsPerUsdSnapshot: quote.rate.toFixed(4),
        fxProviderSnapshot: quote.provider,
        fxFetchedAt: quote.fetchedAt
      };
    } catch (error) {
      console.warn("[fxSnapshot] FX unavailable for ARS purchase", error);
      return {
        packagePriceUsdCentsSnapshot: null,
        fxArsPerUsdSnapshot: null,
        fxProviderSnapshot: null,
        fxFetchedAt: null
      };
    }
  }

  return {
    packagePriceUsdCentsSnapshot: null,
    fxArsPerUsdSnapshot: null,
    fxProviderSnapshot: null,
    fxFetchedAt: null
  };
}
