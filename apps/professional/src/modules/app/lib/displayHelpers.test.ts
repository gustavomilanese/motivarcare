import { describe, expect, it } from "vitest";
import { buildPatientReviewInviteUrl } from "./buildPatientReviewInviteUrl";
import { countryToFlag } from "./countryFlag";
import { formatRecordedFinanceAmountOnly, formatRecordedFinanceMinor } from "./formatRecordedFinanceMinor";
import {
  buildProfessionalReviewsSummaryLabel,
  DEFAULT_PROFESSIONAL_DISPLAY_RATING,
  renderProfessionalReviewStars,
  resolveProfessionalDisplayRating
} from "./professionalReviewsDisplay";
import { profileExperienceBandOptions, profileTitleOptions } from "./profileFormOptions";

describe("formatRecordedFinanceMinor", () => {
  it("formats recorded cents without fraction digits", () => {
    const label = formatRecordedFinanceMinor(435_000, "ars", "es");
    expect(label.toLowerCase()).toContain("4.350");
    expect(formatRecordedFinanceAmountOnly(435_000, "es")).toBe("4.350");
  });
});

describe("countryToFlag", () => {
  it("maps ISO2, ISO3 and aliases", () => {
    expect(countryToFlag("AR")).toBe("🇦🇷");
    expect(countryToFlag("ARG")).toBe("🇦🇷");
    expect(countryToFlag("Uruguay")).toBe("🇺🇾");
    expect(countryToFlag("")).toBe("");
  });
});

describe("professionalReviewsDisplay", () => {
  it("falls back to the default rating when there are no reviews", () => {
    expect(resolveProfessionalDisplayRating(null, 0)).toBe(DEFAULT_PROFESSIONAL_DISPLAY_RATING);
    expect(resolveProfessionalDisplayRating(4.6, 3)).toBe(4.6);
    expect(renderProfessionalReviewStars(3)).toBe("★★★☆☆");
    expect(buildProfessionalReviewsSummaryLabel("es", null, 0)).toContain("Sin opiniones");
    expect(buildProfessionalReviewsSummaryLabel("es", 4.6, 2)).toContain("opiniones");
  });
});

describe("profileFormOptions", () => {
  it("keeps stable values and localized labels", () => {
    expect(profileTitleOptions("es")[0]).toEqual({ value: "Psicólogo", label: "Psicólogo" });
    expect(profileTitleOptions("en")[0]?.label).toBe("Psychologist");
    expect(profileTitleOptions("en").find((option) => option.value === "Sociólogo")?.label).toBe("Sociologist");
    expect(profileExperienceBandOptions("es").some((option) => option.value === "6-10 anos")).toBe(true);
  });
});

describe("buildPatientReviewInviteUrl", () => {
  it("points to the patient portal leave-review query", () => {
    const url = buildPatientReviewInviteUrl("pro_123");
    expect(url).toContain("/?dejar-opinion=pro_123");
  });
});
