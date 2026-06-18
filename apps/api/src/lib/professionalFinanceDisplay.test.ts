import { describe, expect, it } from "vitest";
import {
  buildProfessionalFinanceDisplay,
  convertFinanceMinorToDisplayMinor,
  resolveFxForFinanceRecord
} from "./professionalFinanceDisplay.js";

describe("convertFinanceMinorToDisplayMinor", () => {
  it("converts USD net cents to ARS for AR display", () => {
    const arsMinor = convertFinanceMinorToDisplayMinor(9000, "usd", "ARS", 1400, { arsPerUsd: 1400 });
    expect(arsMinor).toBe(12_600_000);
  });

  it("keeps ARS amounts when display is ARS", () => {
    expect(convertFinanceMinorToDisplayMinor(50_000_00, "ars", "ARS", 1400, {})).toBe(50_000_00);
  });
});

describe("resolveFxForFinanceRecord", () => {
  it("prefers session snapshot over live service rate", () => {
    const fx = resolveFxForFinanceRecord(
      {
        currency: "usd",
        sessionPriceCents: 10_000,
        platformFeeCents: 0,
        professionalNetCents: 10_000,
        fxArsPerUsdSnapshot: 1200
      },
      "ARS",
      { arsPerUsd: 1600 }
    );
    expect(fx).toBe(1200);
  });

  it("falls back to service rate only when session has no snapshot", () => {
    const fx = resolveFxForFinanceRecord(
      {
        currency: "usd",
        sessionPriceCents: 10_000,
        platformFeeCents: 0,
        professionalNetCents: 10_000,
        fxArsPerUsdSnapshot: null
      },
      "ARS",
      { arsPerUsd: 1600 }
    );
    expect(fx).toBe(1600);
  });
});

describe("buildProfessionalFinanceDisplay", () => {
  it("uses each session snapshot when aggregating (TC can differ per session)", () => {
    const display = buildProfessionalFinanceDisplay({
      market: "AR",
      liveFx: { arsPerUsd: 1600 },
      rangeRecords: [
        {
          currency: "usd",
          sessionPriceCents: 10_000,
          platformFeeCents: 0,
          professionalNetCents: 10_000,
          fxArsPerUsdSnapshot: 1200
        },
        {
          currency: "usd",
          sessionPriceCents: 10_000,
          platformFeeCents: 0,
          professionalNetCents: 10_000,
          fxArsPerUsdSnapshot: 1500
        }
      ],
      lifetimeRecords: []
    });

    const netIfAllUsedLiveRate =
      convertFinanceMinorToDisplayMinor(10_000, "usd", "ARS", 1600, { arsPerUsd: 1600 })
      + convertFinanceMinorToDisplayMinor(10_000, "usd", "ARS", 1600, { arsPerUsd: 1600 });

    expect(display.professionalNetCents).toBe(27_000_000);
    expect(display.professionalNetCents).not.toBe(netIfAllUsedLiveRate);
  });

  it("aggregates range and lifetime in market display currency", () => {
    const display = buildProfessionalFinanceDisplay({
      market: "AR",
      liveFx: { arsPerUsd: 1400 },
      rangeRecords: [
        {
          currency: "usd",
          sessionPriceCents: 10_000,
          platformFeeCents: 2_500,
          professionalNetCents: 7_500,
          fxArsPerUsdSnapshot: 1400
        }
      ],
      lifetimeRecords: [
        {
          currency: "usd",
          professionalNetCents: 7_500,
          fxArsPerUsdSnapshot: 1400
        }
      ]
    });

    expect(display.currency).toBe("ARS");
    expect(display.sessions).toBe(1);
    expect(display.professionalNetCents).toBeGreaterThan(0);
    expect(display.lifetimeProfessionalNetCents).toBe(display.professionalNetCents);
  });
});
