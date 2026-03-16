import { describe, expect, it } from "vitest";
import {
  buildFinanceOverviewQuery,
  buildFinanceRecordsCsv,
  buildPayoutRunsQuery,
  buildStripeOperationsQuery
} from "./financeDashboard.utils";

describe("financeDashboard.utils", () => {
  it("buildFinanceOverviewQuery should include only filled filters", () => {
    const query = buildFinanceOverviewQuery(
      {
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        professionalId: "pro-1",
        patientId: "",
        packageId: "",
        isTrial: "true",
        bookingStatus: "COMPLETED",
        search: " ana "
      },
      2,
      50
    );

    expect(query).toContain("dateFrom=2026-03-01");
    expect(query).toContain("dateTo=2026-03-31");
    expect(query).toContain("professionalId=pro-1");
    expect(query).toContain("isTrial=true");
    expect(query).toContain("bookingStatus=COMPLETED");
    expect(query).toContain("search=ana");
    expect(query).toContain("page=2");
    expect(query).toContain("pageSize=50");
    expect(query).not.toContain("patientId=");
  });

  it("buildPayoutRunsQuery should include status and pagination", () => {
    const query = buildPayoutRunsQuery("DRAFT", 3, 20);
    expect(query).toBe("status=DRAFT&page=3&pageSize=20");
  });

  it("buildStripeOperationsQuery should include only active filters", () => {
    const query = buildStripeOperationsQuery(
      {
        status: "DEAD_LETTER",
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        search: " stripe.checkout "
      },
      2,
      15
    );

    expect(query).toContain("status=DEAD_LETTER");
    expect(query).toContain("dateFrom=2026-03-01");
    expect(query).toContain("dateTo=2026-03-31");
    expect(query).toContain("search=stripe.checkout");
    expect(query).toContain("page=2");
    expect(query).toContain("pageSize=15");
  });

  it("buildFinanceRecordsCsv should quote values and include header", () => {
    const csv = buildFinanceRecordsCsv({
      records: [
        {
          bookingStartsAt: "2026-03-10T12:00:00.000Z",
          patient: { fullName: 'Ana "Test"' },
          professional: { fullName: "Dr. Pro" },
          package: { name: "Pack 4" },
          isTrial: false,
          bookingStatus: "COMPLETED",
          sessionPriceCents: 10000,
          platformFeeCents: 2500,
          professionalNetCents: 7500
        }
      ],
      formatDate: () => "10 mar 2026"
    });

    expect(csv).toContain("Fecha,Paciente,Profesional,Paquete,Trial,Estado,Bruto,Plataforma,Neto profesional");
    expect(csv).toContain('"Ana ""Test"""');
    expect(csv).toContain('"10000"');
    expect(csv.split("\n")).toHaveLength(2);
  });
});
