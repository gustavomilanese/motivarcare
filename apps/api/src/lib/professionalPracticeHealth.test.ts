import { describe, expect, it } from "vitest";
import { buildProfessionalPracticeHealth } from "./professionalPracticeHealth.js";

const baseInput = {
  listingVisible: true,
  listingHasTitle: true,
  listingHasPriceUsd: true,
  listingMarketIsAr: true,
  listingHasFxForArs: true,
  sessionPriceUsd: 50,
  arsPerUsd: 1200,
  slotsNext7Days: 3,
  weeklySessionsCount: 2,
  upcomingBookingsCount: 5,
  conversionRate: 67,
  conversionBase: 15,
  sessionsCompleted: 10,
  activePatients: 3
};

describe("buildProfessionalPracticeHealth", () => {
  it("marks all signals ok when inputs are healthy", () => {
    const result = buildProfessionalPracticeHealth(baseInput);
    expect(result.variant).toBe("strong");
    expect(result.items.every((item) => item.ok)).toBe(true);
    expect(result.items.find((i) => i.id === "availability_week")?.detail.slotsNext7Days).toBe(3);
  });

  it("flags availability when there are no slots in the next 7 days", () => {
    const result = buildProfessionalPracticeHealth({ ...baseInput, slotsNext7Days: 0 });
    const availability = result.items.find((i) => i.id === "availability_week");
    expect(availability?.ok).toBe(false);
    expect(availability?.detail.slotsNext7Days).toBe(0);
  });

  it("requires visible profile, title, USD price and FX for AR market listing_live", () => {
    const hidden = buildProfessionalPracticeHealth({
      ...baseInput,
      listingVisible: false
    });
    expect(hidden.items.find((i) => i.id === "listing_live")?.ok).toBe(false);

    const noUsd = buildProfessionalPracticeHealth({
      ...baseInput,
      listingHasPriceUsd: false,
      sessionPriceUsd: 0
    });
    expect(noUsd.items.find((i) => i.id === "listing_live")?.ok).toBe(false);

    const noFx = buildProfessionalPracticeHealth({
      ...baseInput,
      listingHasFxForArs: false,
      arsPerUsd: 0
    });
    const listing = noFx.items.find((i) => i.id === "listing_live");
    expect(listing?.ok).toBe(false);
    expect(listing?.detail.requirementsTotal).toBe(4);
  });

  it("does not require FX for non-AR market listing_live", () => {
    const result = buildProfessionalPracticeHealth({
      ...baseInput,
      listingMarketIsAr: false,
      listingHasFxForArs: false,
      arsPerUsd: 0
    });
    const listing = result.items.find((i) => i.id === "listing_live");
    expect(listing?.ok).toBe(true);
    expect(listing?.detail.requirementsTotal).toBe(3);
    expect(listing?.detail.marketIsAr).toBe(false);
  });

  it("skips conversion threshold when sample is too small", () => {
    const result = buildProfessionalPracticeHealth({
      ...baseInput,
      conversionBase: 2,
      conversionRate: 0,
      sessionsCompleted: 0
    });
    const conversion = result.items.find((i) => i.id === "conversion_sound");
    expect(conversion?.ok).toBe(true);
    expect(conversion?.detail.nonCancelledBookings).toBe(2);
  });

  it("applies conversion threshold when there is enough history", () => {
    const low = buildProfessionalPracticeHealth({
      ...baseInput,
      conversionBase: 10,
      conversionRate: 20,
      sessionsCompleted: 2
    });
    expect(low.items.find((i) => i.id === "conversion_sound")?.ok).toBe(false);

    const high = buildProfessionalPracticeHealth({
      ...baseInput,
      conversionBase: 10,
      conversionRate: 40,
      sessionsCompleted: 4
    });
    expect(high.items.find((i) => i.id === "conversion_sound")?.ok).toBe(true);
  });

  it("uses activePatients count for caseload signal", () => {
    const empty = buildProfessionalPracticeHealth({ ...baseInput, activePatients: 0 });
    expect(empty.items.find((i) => i.id === "active_caseload")?.ok).toBe(false);

    const withPatients = buildProfessionalPracticeHealth({ ...baseInput, activePatients: 1 });
    expect(withPatients.items.find((i) => i.id === "active_caseload")?.ok).toBe(true);
  });
});
