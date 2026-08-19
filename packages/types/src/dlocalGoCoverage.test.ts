import { describe, expect, it } from "vitest";
import {
  DLOCAL_CHECKOUT_UNAVAILABLE_ERROR,
  inferDlocalPayerCountryFromTimezone,
  inferPatientPortalResidencyIso2,
  isDlocalGoCheckoutAvailable,
  resolveDlocalPayerCountry,
  resolveHealedDlocalResidencyCountry
} from "./dlocalGoCoverage.js";

describe("dlocalGoCoverage", () => {
  it("routes Colombia by residency even when commercial market is US", () => {
    expect(
      resolveDlocalPayerCountry({ residencyCountry: "CO", market: "US" })
    ).toBe("CO");
    expect(
      isDlocalGoCheckoutAvailable({ residencyCountry: "CO", market: "US" })
    ).toBe(true);
  });

  it("falls back to AR/BR market when residency is missing", () => {
    expect(resolveDlocalPayerCountry({ residencyCountry: null, market: "AR" })).toBe("AR");
    expect(resolveDlocalPayerCountry({ residencyCountry: null, market: "BR" })).toBe("BR");
  });

  it("blocks US and ES payers until another provider is wired", () => {
    expect(resolveDlocalPayerCountry({ residencyCountry: "US", market: "US" })).toBeNull();
    expect(resolveDlocalPayerCountry({ residencyCountry: "ES", market: "ES" })).toBeNull();
    expect(isDlocalGoCheckoutAvailable({ residencyCountry: "US", market: "US" })).toBe(false);
  });

  it("recovers Argentina from timezone when residency was stored as US", () => {
    expect(
      resolveDlocalPayerCountry({
        residencyCountry: "US",
        market: "US",
        timezone: "America/Argentina/Buenos_Aires"
      })
    ).toBe("AR");
    expect(
      isDlocalGoCheckoutAvailable({
        residencyCountry: "US",
        market: "US",
        timezone: "America/Argentina/Buenos_Aires"
      })
    ).toBe(true);
  });

  it("maps IANA timezones to dLocal payer countries", () => {
    expect(inferDlocalPayerCountryFromTimezone("America/Argentina/Cordoba")).toBe("AR");
    expect(inferDlocalPayerCountryFromTimezone("America/Bogota")).toBe("CO");
    expect(inferDlocalPayerCountryFromTimezone("America/New_York")).toBeNull();
  });

  it("infers portal residency from timezone before browser locale", () => {
    expect(
      inferPatientPortalResidencyIso2({
        locales: ["en-US"],
        timezone: "America/Argentina/Buenos_Aires"
      })
    ).toBe("AR");
    expect(
      inferPatientPortalResidencyIso2({
        locales: ["en-US"],
        timezone: "America/New_York"
      })
    ).toBe("US");
  });

  it("heals US residency when timezone is a dLocal country", () => {
    expect(
      resolveHealedDlocalResidencyCountry({
        existingResidency: "US",
        requestedResidency: "US",
        timezone: "America/Argentina/Buenos_Aires"
      })
    ).toBe("AR");
    expect(
      resolveHealedDlocalResidencyCountry({
        existingResidency: "AR",
        requestedResidency: "US",
        timezone: "America/Argentina/Buenos_Aires"
      })
    ).toBeNull();
    expect(
      resolveHealedDlocalResidencyCountry({
        existingResidency: "US",
        requestedResidency: "US",
        timezone: "America/New_York"
      })
    ).toBeNull();
  });

  it("exports a stable unavailable error token", () => {
    expect(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR).toContain("country of residence");
  });
});
