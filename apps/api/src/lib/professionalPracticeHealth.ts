export type PracticeHealthVariant = "strong" | "balanced" | "growth";

export type PracticeHealthItem = {
  id: string;
  ok: boolean;
  detail: Record<string, number | boolean>;
};

export type PracticeHealthSummary = {
  variant: PracticeHealthVariant;
  items: PracticeHealthItem[];
};

export type BuildProfessionalPracticeHealthInput = {
  listingVisible: boolean;
  listingHasTitle: boolean;
  /** Precio de lista en USD cargado (> 0). Fuente canónica de la oferta. */
  listingHasPriceUsd: boolean;
  /** Mercado AR: el precio en pesos se deriva del USD × tipo de cambio. */
  listingMarketIsAr: boolean;
  /** TC USD/ARS disponible para derivar el equivalente local (mercado AR). */
  listingHasFxForArs: boolean;
  sessionPriceUsd?: number;
  arsPerUsd?: number | null;
  slotsNext7Days: number;
  weeklySessionsCount: number;
  upcomingBookingsCount: number;
  conversionRate: number;
  conversionBase: number;
  sessionsCompleted: number;
  activePatients: number;
  /** Mínimo de reservas no canceladas para evaluar conversión. */
  conversionMinBase?: number;
  /** Meta de conversión (%) cuando hay datos suficientes. */
  conversionThresholdPercent?: number;
};

const DEFAULT_CONVERSION_MIN_BASE = 4;
const DEFAULT_CONVERSION_THRESHOLD_PERCENT = 32;

function buildListingLiveItem(input: BuildProfessionalPracticeHealthInput): PracticeHealthItem {
  const requirementChecks = [
    input.listingVisible,
    input.listingHasTitle,
    input.listingHasPriceUsd,
    ...(input.listingMarketIsAr ? [input.listingHasFxForArs] : [])
  ];
  const requirementsMet = requirementChecks.filter(Boolean).length;
  const requirementsTotal = requirementChecks.length;

  const listingLive = requirementsMet === requirementsTotal;

  return {
    id: "listing_live",
    ok: listingLive,
    detail: {
      visible: input.listingVisible,
      hasTitle: input.listingHasTitle,
      hasPriceUsd: input.listingHasPriceUsd,
      marketIsAr: input.listingMarketIsAr,
      hasFxForArs: input.listingHasFxForArs,
      sessionPriceUsd: input.sessionPriceUsd ?? 0,
      arsPerUsd: input.arsPerUsd ?? 0,
      requirementsMet,
      requirementsTotal
    }
  };
}

/**
 * Señales de salud de la práctica profesional — derivadas de perfil, agenda, reservas y pacientes.
 * No usa valores fijos por profesional: cada `ok` depende de los inputs del dashboard.
 */
export function buildProfessionalPracticeHealth(
  input: BuildProfessionalPracticeHealthInput
): PracticeHealthSummary {
  const conversionMinBase = input.conversionMinBase ?? DEFAULT_CONVERSION_MIN_BASE;
  const conversionThresholdPercent = input.conversionThresholdPercent ?? DEFAULT_CONVERSION_THRESHOLD_PERCENT;

  const hasAvailabilityThisWeek = input.slotsNext7Days > 0;

  const items: PracticeHealthItem[] = [
    buildListingLiveItem(input),
    {
      id: "availability_week",
      ok: hasAvailabilityThisWeek,
      detail: { slotsNext7Days: input.slotsNext7Days }
    },
    {
      id: "agenda_active",
      ok: input.weeklySessionsCount > 0 || input.upcomingBookingsCount > 0,
      detail: {
        weeklySessions: input.weeklySessionsCount,
        upcomingBookings: input.upcomingBookingsCount
      }
    },
    {
      id: "conversion_sound",
      ok: input.conversionBase < conversionMinBase ? true : input.conversionRate >= conversionThresholdPercent,
      detail: {
        conversionRate: input.conversionRate,
        nonCancelledBookings: input.conversionBase,
        completedSessions: input.sessionsCompleted,
        minBaseForRule: conversionMinBase,
        thresholdPercent: conversionThresholdPercent
      }
    },
    {
      id: "active_caseload",
      ok: input.activePatients >= 1,
      detail: { activePatients: input.activePatients }
    }
  ];

  const practiceHealthOkCount = items.filter((item) => item.ok).length;
  const variant: PracticeHealthVariant =
    practiceHealthOkCount >= 5 ? "strong" : practiceHealthOkCount >= 3 ? "balanced" : "growth";

  return { variant, items };
}
