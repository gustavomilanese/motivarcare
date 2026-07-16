import { financeCompletedReferenceWhere } from "./financeStatsRange.js";
export { buildPackageSessionIndexByBookingId } from "./packageSessionAttribution.js";

export type MovementsPricingFilter = "all" | "package" | "list";
export type MovementsSortKey = "date_desc" | "date_asc" | "gross_desc" | "gross_asc";

export function parseMovementsListQuery(query: Record<string, unknown>): {
  page: number;
  pageSize: number;
  search: string;
  pricing: MovementsPricingFilter;
  sort: MovementsSortKey;
} {
  const pageRaw = Number.parseInt(String(query.movementsPage ?? "1"), 10);
  const pageSizeRaw = Number.parseInt(String(query.movementsPageSize ?? "25"), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(100, pageSizeRaw) : 25;

  const pricingRaw = String(query.movementsPricing ?? "");
  const pricing: MovementsPricingFilter =
    pricingRaw === "package" || pricingRaw === "list" ? pricingRaw : "all";

  const sortRaw = String(query.movementsSort ?? "");
  const sort: MovementsSortKey =
    sortRaw === "date_asc" || sortRaw === "gross_desc" || sortRaw === "gross_asc"
      ? sortRaw
      : "date_desc";

  return {
    page,
    pageSize,
    search: String(query.movementsSearch ?? "").trim(),
    pricing,
    sort
  };
}

export function movementsOrderBy(sort: MovementsSortKey) {
  switch (sort) {
    case "date_asc":
      return [{ bookingCompletedAt: "asc" as const }, { bookingStartsAt: "asc" as const }];
    case "gross_desc":
      return [{ sessionPriceCents: "desc" as const }, { bookingCompletedAt: "desc" as const }];
    case "gross_asc":
      return [{ sessionPriceCents: "asc" as const }, { bookingCompletedAt: "desc" as const }];
    default:
      return [{ bookingCompletedAt: "desc" as const }, { bookingStartsAt: "desc" as const }];
  }
}

export function buildMovementsWhere(input: {
  baseCompleted: Record<string, unknown>;
  statsFrom: Date | null;
  statsTo: Date;
  movements: ReturnType<typeof parseMovementsListQuery>;
  professionalId?: string;
  patientId?: string;
}) {
  return {
    ...input.baseCompleted,
    ...financeCompletedReferenceWhere(input.statsFrom, input.statsTo),
    ...(input.professionalId ? { professionalId: input.professionalId } : {}),
    ...(input.patientId ? { patientId: input.patientId } : {}),
    ...(input.movements.pricing === "package"
      ? { packageId: { not: null } }
      : input.movements.pricing === "list"
        ? { packageId: null }
        : {}),
    ...(input.movements.search
      ? {
          OR: [
            {
              patient: {
                user: {
                  fullName: { contains: input.movements.search, mode: "insensitive" as const }
                }
              }
            },
            {
              professional: {
                user: {
                  fullName: { contains: input.movements.search, mode: "insensitive" as const }
                }
              }
            },
            {
              package: {
                name: { contains: input.movements.search, mode: "insensitive" as const }
              }
            }
          ]
        }
      : {})
  };
}

