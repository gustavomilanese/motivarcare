import { formatPackageSessionSourceLabel } from "./packageSessionAttribution.js";

export type PayoutLineSessionSnapshotItem = {
  id: string;
  bookingId: string;
  bookingStartsAt: string;
  bookingCompletedAt: string | null;
  isTrial: boolean;
  sourceKind: "trial" | "package";
  sourceLabel: string;
  purchaseId: string | null;
  packageSessionNumber: number | null;
  packageCredits: number | null;
  packageDiscountPercent: number | null;
  currency: string;
  sessionPriceCents: number;
  platformCommissionPercent: number;
  platformFeeCents: number;
  professionalNetCents: number;
  fxArsPerUsdSnapshot: number | null;
  patientId: string;
  patientName: string;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asFxNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const n = Number((value as { toNumber: () => number }).toNumber());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parsePayoutLineSessionSnapshot(value: unknown): PayoutLineSessionSnapshotItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: PayoutLineSessionSnapshotItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    const id = asString(row.id);
    const bookingId = asString(row.bookingId);
    const bookingStartsAt = asString(row.bookingStartsAt);
    const currency = asString(row.currency);
    const sessionPriceCents = asNumber(row.sessionPriceCents);
    const platformCommissionPercent = asNumber(row.platformCommissionPercent);
    const platformFeeCents = asNumber(row.platformFeeCents);
    const professionalNetCents = asNumber(row.professionalNetCents);
    const patientId = asString(row.patientId);
    const patientName = asString(row.patientName);
    if (
      !id
      || !bookingId
      || !bookingStartsAt
      || !currency
      || sessionPriceCents == null
      || platformCommissionPercent == null
      || platformFeeCents == null
      || professionalNetCents == null
      || !patientId
      || !patientName
    ) {
      continue;
    }
    const sourceKind = row.sourceKind === "trial" ? "trial" : "package";
    rows.push({
      id,
      bookingId,
      bookingStartsAt,
      bookingCompletedAt: asString(row.bookingCompletedAt),
      isTrial: asBoolean(row.isTrial) ?? sourceKind === "trial",
      sourceKind,
      sourceLabel: asString(row.sourceLabel) ?? (sourceKind === "trial" ? "Sesión de prueba" : "Paquete"),
      purchaseId: asString(row.purchaseId),
      packageSessionNumber: asNumber(row.packageSessionNumber),
      packageCredits: asNumber(row.packageCredits),
      packageDiscountPercent: asNumber(row.packageDiscountPercent),
      currency,
      sessionPriceCents,
      platformCommissionPercent,
      platformFeeCents,
      professionalNetCents,
      fxArsPerUsdSnapshot: asFxNumber(row.fxArsPerUsdSnapshot),
      patientId,
      patientName
    });
  }
  return rows;
}

export function buildPayoutLineSessionSnapshot(
  records: Array<{
    id: string;
    bookingId: string;
    bookingStartsAt: Date;
    bookingCompletedAt: Date | null;
    isTrial: boolean;
    currency: string;
    sessionPriceCents: number;
    platformCommissionPercent: number;
    platformFeeCents: number;
    professionalNetCents: number;
    purchaseId: string | null;
    patient: { id: string; user: { fullName: string } };
    package: { name: string; credits: number } | null;
    purchase: {
      packageNameSnapshot: string | null;
      packageCreditsSnapshot: number | null;
      packageDiscountPercentSnapshot: number | null;
      fxArsPerUsdSnapshot: unknown;
    } | null;
    booking: { packageSessionOrdinal: number | null };
  }>
): PayoutLineSessionSnapshotItem[] {
  return records.map((record) => {
    const packageName =
      record.purchase?.packageNameSnapshot?.trim()
      || record.package?.name?.trim()
      || null;
    const packageCredits =
      record.purchase?.packageCreditsSnapshot
      ?? record.package?.credits
      ?? null;
    const packageSessionNumber = record.purchaseId
      ? record.booking.packageSessionOrdinal
      : null;
    const sourceKind = record.isTrial ? ("trial" as const) : ("package" as const);
    const sourceLabel = record.isTrial
      ? "Sesión de prueba"
      : formatPackageSessionSourceLabel({
          packageName: packageName ?? "Paquete",
          packageCredits,
          packageSessionNumber,
          discountPercent: record.purchase?.packageDiscountPercentSnapshot ?? null
        });
    return {
      id: record.id,
      bookingId: record.bookingId,
      bookingStartsAt: record.bookingStartsAt.toISOString(),
      bookingCompletedAt: record.bookingCompletedAt?.toISOString() ?? null,
      isTrial: record.isTrial,
      sourceKind,
      sourceLabel,
      purchaseId: record.purchaseId,
      packageSessionNumber,
      packageCredits,
      packageDiscountPercent: record.purchase?.packageDiscountPercentSnapshot ?? null,
      currency: record.currency,
      sessionPriceCents: record.sessionPriceCents,
      platformCommissionPercent: record.platformCommissionPercent,
      platformFeeCents: record.platformFeeCents,
      professionalNetCents: record.professionalNetCents,
      fxArsPerUsdSnapshot: asFxNumber(record.purchase?.fxArsPerUsdSnapshot),
      patientId: record.patient.id,
      patientName: record.patient.user.fullName
    };
  });
}
