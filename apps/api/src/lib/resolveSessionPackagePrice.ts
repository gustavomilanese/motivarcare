import { CANONICAL_BILLING_CURRENCY } from "@therapy/types";

type PriceProfile = {
  sessionPriceArs?: number | null;
  sessionPriceUsd: number | null;
};

/**
 * Precio de lista por sesión en USD (enteros mayores). Fuente única para paquetes y cobro.
 * Si sólo hay ARS legacy, deriva USD con `arsPerUsd`.
 */
export function listPriceUsdMajorUnits(
  profile: PriceProfile,
  arsPerUsd?: number | null
): number | null {
  if (profile.sessionPriceUsd != null && profile.sessionPriceUsd > 0) {
    return profile.sessionPriceUsd;
  }
  if (
    profile.sessionPriceArs != null
    && profile.sessionPriceArs > 0
    && arsPerUsd != null
    && Number.isFinite(arsPerUsd)
    && arsPerUsd > 0
  ) {
    return Math.max(1, Math.round(profile.sessionPriceArs / arsPerUsd));
  }
  return null;
}

/** Convierte filas legacy del catálogo (ARS/BRL) a centavos USD cuando hace falta. */
export function normalizeCatalogFallbackToUsdCents(params: {
  fallbackPriceCents: number;
  fallbackCurrency: string;
  arsPerUsd: number | null;
}): number {
  const sourceCurrency = params.fallbackCurrency.toLowerCase();

  if (sourceCurrency === CANONICAL_BILLING_CURRENCY) {
    return params.fallbackPriceCents;
  }

  if (
    sourceCurrency === "ars"
    && params.arsPerUsd != null
    && Number.isFinite(params.arsPerUsd)
    && params.arsPerUsd > 0
  ) {
    const arsMajor = params.fallbackPriceCents / 100;
    const usdMajor = arsMajor / params.arsPerUsd;
    return Math.max(0, Math.round(usdMajor * 100));
  }

  return params.fallbackPriceCents;
}

export function resolvePackagePriceUsdCents(params: {
  credits: number;
  fallbackPriceCents: number;
  fallbackCurrency: string;
  sessionListPriceUsdMajor: number | null | undefined;
  discountPercent: number;
  arsPerUsd: number | null;
}): number {
  if (params.sessionListPriceUsdMajor != null && params.sessionListPriceUsdMajor > 0) {
    const listPriceCents = params.sessionListPriceUsdMajor * params.credits * 100;
    return Math.max(0, Math.round(listPriceCents * (1 - params.discountPercent / 100)));
  }

  return normalizeCatalogFallbackToUsdCents({
    fallbackPriceCents: params.fallbackPriceCents,
    fallbackCurrency: params.fallbackCurrency,
    arsPerUsd: params.arsPerUsd
  });
}

export function resolvePackagePricingFromUsd(params: {
  credits: number;
  fallbackPriceCents: number;
  fallbackCurrency: string;
  fallbackDiscountPercent: number;
  sessionListPriceUsdMajor: number | null | undefined;
  profileDiscount4: number | null | undefined;
  profileDiscount8: number | null | undefined;
  profileDiscount12: number | null | undefined;
  arsPerUsd: number | null;
}) {
  const discountPercent = resolvePackageDiscountPercent({
    credits: params.credits,
    fallbackDiscountPercent: params.fallbackDiscountPercent,
    profileDiscount4: params.profileDiscount4,
    profileDiscount8: params.profileDiscount8,
    profileDiscount12: params.profileDiscount12
  });

  const listPriceUsdMajor =
    params.sessionListPriceUsdMajor != null && params.sessionListPriceUsdMajor > 0
      ? params.sessionListPriceUsdMajor
      : null;

  const listPriceCents =
    listPriceUsdMajor != null
      ? listPriceUsdMajor * params.credits * 100
      : normalizeCatalogFallbackToUsdCents({
          fallbackPriceCents: params.fallbackPriceCents,
          fallbackCurrency: params.fallbackCurrency,
          arsPerUsd: params.arsPerUsd
        });

  const priceCents =
    listPriceUsdMajor != null
      ? Math.max(0, Math.round(listPriceCents * (1 - discountPercent / 100)))
      : listPriceCents;

  return {
    discountPercent,
    listPriceCents,
    priceCents
  };
}

export function resolvePackageDiscountPercent(params: {
  credits: number;
  fallbackDiscountPercent: number;
  profileDiscount4: number | null | undefined;
  profileDiscount8: number | null | undefined;
  profileDiscount12: number | null | undefined;
}): number {
  if (params.credits === 1) {
    return 0;
  }
  if (params.credits === 4 && params.profileDiscount4 !== null && params.profileDiscount4 !== undefined) {
    return params.profileDiscount4;
  }
  if (params.credits === 8 && params.profileDiscount8 !== null && params.profileDiscount8 !== undefined) {
    return params.profileDiscount8;
  }
  if (params.credits === 12 && params.profileDiscount12 !== null && params.profileDiscount12 !== undefined) {
    return params.profileDiscount12;
  }
  return params.fallbackDiscountPercent;
}