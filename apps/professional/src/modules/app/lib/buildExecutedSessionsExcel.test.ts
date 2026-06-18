import { describe, expect, it } from "vitest";
import {
  buildExecutedSessionExportRows,
  sumExecutedSessionExportRows
} from "./buildExecutedSessionsExcel";
import { formatRevenuePeriodLabel } from "./formatRevenuePeriodLabel";
import type { EarningsMovement } from "../types";

const sampleMovement: EarningsMovement = {
  bookingId: "b1",
  patientName: "Camila Morales",
  startsAt: "2026-06-04T11:00:00.000Z",
  endsAt: "2026-06-04T12:00:00.000Z",
  isTrial: false,
  pricingSource: "package",
  packageCredits: 4,
  packageSessionNumber: 2,
  grossCents: 580_000,
  platformFeeCents: 145_000,
  amountCents: 435_000,
  status: "COMPLETED",
  currency: "ars"
};

describe("buildExecutedSessionExportRows", () => {
  it("mapea filas con montos en unidades mayores", () => {
    const rows = buildExecutedSessionExportRows({
      movements: [sampleMovement],
      language: "es"
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.patientName).toBe("Camila Morales");
    expect(rows[0]?.sessionNumber).toBe("2/4");
    expect(rows[0]?.grossMajor).toBe(5800);
    expect(rows[0]?.feeMajor).toBe(1450);
    expect(rows[0]?.netMajor).toBe(4350);
  });

  it("suma totales de columnas monetarias", () => {
    const rows = buildExecutedSessionExportRows({
      movements: [sampleMovement, { ...sampleMovement, bookingId: "b2", grossCents: 420_000, platformFeeCents: 105_000, amountCents: 315_000 }],
      language: "es"
    });
    expect(sumExecutedSessionExportRows(rows)).toEqual({
      grossMajor: 10_000,
      feeMajor: 2500,
      netMajor: 7500
    });
  });
});

describe("formatRevenuePeriodLabel", () => {
  it("formatea mes localizado", () => {
    const result = formatRevenuePeriodLabel({
      language: "es",
      preset: "month",
      dayStr: "2026-06-10",
      monthStr: "2026-06",
      yearStr: "2026"
    });
    expect(result.label.toLowerCase()).toContain("junio");
    expect(result.filenameStem).toBe("sesiones-2026-06");
  });

  it("formatea día concreto", () => {
    const result = formatRevenuePeriodLabel({
      language: "es",
      preset: "day",
      dayStr: "2026-06-10",
      monthStr: "2026-06",
      yearStr: "2026"
    });
    expect(result.filenameStem).toBe("sesiones-2026-06-10");
    expect(result.label).toContain("2026");
  });
});
