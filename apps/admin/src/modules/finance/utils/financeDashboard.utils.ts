import type { FinanceFilters, FinanceStripeFilters } from "../types/finance.types";

export function buildFinanceOverviewQuery(filters: FinanceFilters, page: number, pageSize: number): string {
  const query = new URLSearchParams();
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  if (filters.professionalId) query.set("professionalId", filters.professionalId);
  if (filters.patientId) query.set("patientId", filters.patientId);
  if (filters.packageId) query.set("packageId", filters.packageId);
  if (filters.isTrial) query.set("isTrial", filters.isTrial);
  if (filters.bookingStatus) query.set("bookingStatus", filters.bookingStatus);
  if (filters.search.trim()) query.set("search", filters.search.trim());
  query.set("page", String(page));
  query.set("pageSize", String(pageSize));
  return query.toString();
}

export function buildPayoutRunsQuery(status: string, page: number, pageSize: number): string {
  const query = new URLSearchParams();
  if (status) {
    query.set("status", status);
  }
  query.set("page", String(page));
  query.set("pageSize", String(pageSize));
  return query.toString();
}

export function buildStripeOperationsQuery(filters: FinanceStripeFilters, page: number, pageSize: number): string {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  if (filters.search.trim()) query.set("search", filters.search.trim());
  query.set("page", String(page));
  query.set("pageSize", String(pageSize));
  return query.toString();
}

function escapeCsvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildFinanceRecordsCsv(input: {
  records: Array<{
    bookingStartsAt: string;
    patient: { fullName: string };
    professional: { fullName: string };
    package: { name: string } | null;
    isTrial: boolean;
    bookingStatus: string;
    sessionPriceCents: number;
    platformFeeCents: number;
    professionalNetCents: number;
  }>;
  formatDate: (value: string) => string;
}): string {
  const lines = [
    "Fecha,Paciente,Profesional,Paquete,Trial,Estado,Bruto,Plataforma,Neto profesional",
    ...input.records.map((record) =>
      [
        input.formatDate(record.bookingStartsAt),
        record.patient.fullName,
        record.professional.fullName,
        record.package?.name ?? "Sin paquete",
        record.isTrial ? "Si" : "No",
        record.bookingStatus,
        record.sessionPriceCents,
        record.platformFeeCents,
        record.professionalNetCents
      ]
        .map((value) => escapeCsvCell(value))
        .join(",")
    )
  ];

  return lines.join("\n");
}
