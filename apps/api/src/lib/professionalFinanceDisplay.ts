import {
  convertUsdMajorToDisplayMajor,
  displayCurrencyForMarket,
  resolveFxRatePerUsd,
  roundDisplayMajorFromUsd,
  type DisplayFxRates,
  type SupportedCurrency
} from "@therapy/i18n-config";

export type FinanceRecordForDisplay = {
  currency: string;
  sessionPriceCents: number;
  platformFeeCents: number;
  professionalNetCents: number;
  fxArsPerUsdSnapshot?: number | null;
};

export type ProfessionalFinanceDisplaySummary = {
  currency: SupportedCurrency;
  market: string;
  fxRates: DisplayFxRates;
  grossCents: number;
  platformFeeCents: number;
  professionalNetCents: number;
  sessions: number;
  averageNetPerSessionCents: number;
  lifetimeProfessionalNetCents: number;
  lifetimeCompletedSessions: number;
};

/** TC guardado al cobrar (purchase.fxArsPerUsdSnapshot). Solo si falta, usa el del servicio. */
export function readSessionFxArsPerUsdSnapshot(record: FinanceRecordForDisplay): number | null {
  const snapshot = record.fxArsPerUsdSnapshot;
  if (typeof snapshot === "number" && Number.isFinite(snapshot) && snapshot > 0) {
    return snapshot;
  }
  if (typeof snapshot === "object" && snapshot !== null && "toNumber" in snapshot) {
    const n = Number((snapshot as { toNumber: () => number }).toNumber());
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return null;
}

/** Prioridad: TC de la sesión → TC del servicio (solo fallback). */
export function resolveFxForFinanceRecord(
  record: FinanceRecordForDisplay,
  displayCurrency: SupportedCurrency,
  liveFx: DisplayFxRates
): number {
  const from = (record.currency ?? "usd").trim().toLowerCase();
  const to = displayCurrency.toLowerCase();
  if (from === to) {
    return 1;
  }
  if (to === "ars" && from === "usd") {
    return readSessionFxArsPerUsdSnapshot(record) ?? resolveFxRatePerUsd("ARS", liveFx);
  }
  if (to === "usd" && from === "ars") {
    return readSessionFxArsPerUsdSnapshot(record) ?? resolveFxRatePerUsd("ARS", liveFx);
  }
  return resolveFxRatePerUsd(displayCurrency, liveFx);
}

export function convertFinanceMinorToDisplayMinor(
  amountMinor: number,
  fromCurrency: string,
  displayCurrency: SupportedCurrency,
  fxArsPerUsd: number,
  liveFx: DisplayFxRates
): number {
  const from = (fromCurrency ?? "usd").trim().toLowerCase();
  const to = displayCurrency.toLowerCase();

  if (from === to) {
    return amountMinor;
  }

  if (to === "ars" && from === "usd") {
    const usdMajor = amountMinor / 100;
    const arsMajor = roundDisplayMajorFromUsd(usdMajor, "ARS", fxArsPerUsd);
    return Math.round(arsMajor * 100);
  }

  if (to === "usd" && from === "ars") {
    const arsMajor = amountMinor / 100;
    const usdMajor = arsMajor / fxArsPerUsd;
    return Math.round(usdMajor * 100);
  }

  if (from === "usd") {
    const usdMajor = amountMinor / 100;
    const convertedMajor = convertUsdMajorToDisplayMajor(usdMajor, displayCurrency, liveFx);
    return Math.round(convertedMajor * 100);
  }

  return amountMinor;
}

/** Admin: normaliza montos de ledger a centavos USD canónicos. */
export function convertFinanceMinorToUsdMinor(
  amountMinor: number,
  fromCurrency: string,
  fxArsPerUsd: number | null,
  liveFx: DisplayFxRates
): number {
  const from = (fromCurrency ?? "usd").trim().toLowerCase();
  if (from === "usd") {
    return amountMinor;
  }
  if (from === "ars") {
    const rate =
      fxArsPerUsd != null && Number.isFinite(fxArsPerUsd) && fxArsPerUsd > 0
        ? fxArsPerUsd
        : resolveFxRatePerUsd("ARS", liveFx);
    const usdMajor = amountMinor / 100 / rate;
    return Math.round(usdMajor * 100);
  }
  return amountMinor;
}

export function resolvePurchasePriceUsdCents(input: {
  packagePriceUsdCentsSnapshot: number | null;
  packagePriceCentsSnapshot: number | null;
  packageCurrencySnapshot: string | null;
  fxArsPerUsdSnapshot?: unknown;
}): number {
  if (
    input.packagePriceUsdCentsSnapshot != null
    && input.packagePriceUsdCentsSnapshot > 0
  ) {
    return input.packagePriceUsdCentsSnapshot;
  }
  const currency = (input.packageCurrencySnapshot ?? "usd").trim().toLowerCase();
  const price = input.packagePriceCentsSnapshot ?? 0;
  if (price <= 0) {
    return 0;
  }
  if (currency === "usd") {
    return price;
  }
  if (currency === "ars") {
    const raw = input.fxArsPerUsdSnapshot;
    let rate: number | null = null;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      rate = raw;
    } else if (raw != null && typeof raw === "object" && "toNumber" in raw) {
      const n = Number((raw as { toNumber: () => number }).toNumber());
      rate = Number.isFinite(n) && n > 0 ? n : null;
    }
    if (rate != null) {
      return Math.round(price / rate);
    }
  }
  return 0;
}

export function buildProfessionalFinanceDisplay(params: {
  market: string | null | undefined;
  rangeRecords: FinanceRecordForDisplay[];
  lifetimeRecords: Array<Pick<FinanceRecordForDisplay, "currency" | "professionalNetCents" | "fxArsPerUsdSnapshot">>;
  liveFx: DisplayFxRates;
}): ProfessionalFinanceDisplaySummary {
  const market = (params.market ?? "US").trim().toUpperCase() || "US";
  const displayCurrency = displayCurrencyForMarket(market);

  let grossCents = 0;
  let platformFeeCents = 0;
  let professionalNetCents = 0;
  let sessions = 0;

  for (const row of params.rangeRecords) {
    const fx = resolveFxForFinanceRecord(row, displayCurrency, params.liveFx);
    grossCents += convertFinanceMinorToDisplayMinor(
      row.sessionPriceCents,
      row.currency,
      displayCurrency,
      fx,
      params.liveFx
    );
    platformFeeCents += convertFinanceMinorToDisplayMinor(
      row.platformFeeCents,
      row.currency,
      displayCurrency,
      fx,
      params.liveFx
    );
    professionalNetCents += convertFinanceMinorToDisplayMinor(
      row.professionalNetCents,
      row.currency,
      displayCurrency,
      fx,
      params.liveFx
    );
    sessions += 1;
  }

  let lifetimeProfessionalNetCents = 0;
  for (const row of params.lifetimeRecords) {
    const fx = resolveFxForFinanceRecord(row as FinanceRecordForDisplay, displayCurrency, params.liveFx);
    lifetimeProfessionalNetCents += convertFinanceMinorToDisplayMinor(
      row.professionalNetCents,
      row.currency,
      displayCurrency,
      fx,
      params.liveFx
    );
  }

  return {
    currency: displayCurrency,
    market,
    fxRates: params.liveFx,
    grossCents,
    platformFeeCents,
    professionalNetCents,
    sessions,
    averageNetPerSessionCents: sessions > 0 ? Math.round(professionalNetCents / sessions) : 0,
    lifetimeProfessionalNetCents,
    lifetimeCompletedSessions: params.lifetimeRecords.length
  };
}

export function mapFinanceRecordForDisplay(row: {
  currency: string;
  sessionPriceCents: number;
  platformFeeCents: number;
  professionalNetCents: number;
  purchase?: { fxArsPerUsdSnapshot?: unknown } | null;
}): FinanceRecordForDisplay {
  const raw = row.purchase?.fxArsPerUsdSnapshot;
  let fxArsPerUsdSnapshot: number | null = null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    fxArsPerUsdSnapshot = raw;
  } else if (raw != null && typeof raw === "object" && "toNumber" in raw) {
    const n = Number((raw as { toNumber: () => number }).toNumber());
    fxArsPerUsdSnapshot = Number.isFinite(n) ? n : null;
  }
  return {
    currency: row.currency,
    sessionPriceCents: row.sessionPriceCents,
    platformFeeCents: row.platformFeeCents,
    professionalNetCents: row.professionalNetCents,
    fxArsPerUsdSnapshot
  };
}
