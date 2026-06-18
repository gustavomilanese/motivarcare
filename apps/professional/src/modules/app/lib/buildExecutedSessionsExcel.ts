import {
  type AppLanguage,
  formatDateWithLocale,
  localeFromLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import type { EarningsMovement } from "../types";

export type ExecutedSessionsExportMeta = {
  periodLabel: string;
  generatedAt: Date;
  displayCurrency: string;
  language: AppLanguage;
  professionalName?: string | null;
  filtersSummary?: string | null;
};

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatSessionClock(value: string): string {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

function resolveSessionEnd(startsAt: string, endsAt?: string): string {
  const start = new Date(startsAt);
  let endHour = start.getHours() + 1;
  if (endsAt) {
    const end = new Date(endsAt);
    endHour = end.getMinutes() > 0 || end.getSeconds() > 0 ? end.getHours() + 1 : end.getHours();
  }
  if (endHour <= start.getHours()) {
    endHour = start.getHours() + 1;
  }
  return `${String(endHour).padStart(2, "0")}:00`;
}

function formatSessionDate(startsAt: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value: startsAt,
    language,
    options: { year: "numeric", month: "2-digit", day: "2-digit" }
  });
}

function formatSessionTimeRange(startsAt: string, endsAt: string | undefined, language: AppLanguage): string {
  const connector = t(language, { es: "a", en: "to", pt: "a" });
  return `${formatSessionClock(startsAt)} ${connector} ${resolveSessionEnd(startsAt, endsAt)}`;
}

function sessionNumberLabel(language: AppLanguage, movement: EarningsMovement): string {
  if (movement.isTrial) {
    return t(language, { es: "Prueba", en: "Trial", pt: "Teste" });
  }
  if (movement.pricingSource === "package") {
    const credits = movement.packageCredits ?? 0;
    const sessionNumber = movement.packageSessionNumber ?? 0;
    if (credits > 0 && sessionNumber > 0) {
      return `${sessionNumber}/${credits}`;
    }
  }
  return "—";
}

function minorToMajor(cents: number): number {
  return cents / 100;
}

export type ExecutedSessionExportRow = {
  patientName: string;
  sessionDate: string;
  sessionTime: string;
  sessionNumber: string;
  grossMajor: number;
  feeMajor: number;
  netMajor: number;
};

export function buildExecutedSessionExportRows(input: {
  movements: EarningsMovement[];
  language: AppLanguage;
}): ExecutedSessionExportRow[] {
  return input.movements.map((movement) => ({
    patientName: movement.patientName,
    sessionDate: formatSessionDate(movement.startsAt, input.language),
    sessionTime: formatSessionTimeRange(movement.startsAt, movement.endsAt, input.language),
    sessionNumber: sessionNumberLabel(input.language, movement),
    grossMajor: minorToMajor(movement.grossCents),
    feeMajor: minorToMajor(movement.platformFeeCents),
    netMajor: minorToMajor(movement.amountCents)
  }));
}

export function sumExecutedSessionExportRows(rows: ExecutedSessionExportRow[]): {
  grossMajor: number;
  feeMajor: number;
  netMajor: number;
} {
  return rows.reduce(
    (acc, row) => ({
      grossMajor: acc.grossMajor + row.grossMajor,
      feeMajor: acc.feeMajor + row.feeMajor,
      netMajor: acc.netMajor + row.netMajor
    }),
    { grossMajor: 0, feeMajor: 0, netMajor: 0 }
  );
}

const HEADER_FILL = "FFF3F4F6";
const TOTAL_FILL = "FFE8F0FE";
const TITLE_FONT = { bold: true, size: 14, color: { argb: "FF111827" } };
const META_FONT = { size: 11, color: { argb: "FF4B5563" } };
const HEADER_FONT = { bold: true, color: { argb: "FF1F2937" } };
const TOTAL_FONT = { bold: true, color: { argb: "FF1E3A8A" } };

export async function downloadExecutedSessionsExcel(input: {
  movements: EarningsMovement[];
  meta: ExecutedSessionsExportMeta;
  filenameStem: string;
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const rows = buildExecutedSessionExportRows({
    movements: input.movements,
    language: input.meta.language
  });
  const totals = sumExecutedSessionExportRows(rows);
  const locale = localeFromLanguage(input.meta.language);
  const currencyCode = input.meta.displayCurrency.toUpperCase();
  const amountFormat = `#,##0`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MotivarCare";
  workbook.created = input.meta.generatedAt;

  const sheet = workbook.addWorksheet(
    t(input.meta.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })
  );

  sheet.columns = [
    { key: "patient", width: 28 },
    { key: "date", width: 14 },
    { key: "time", width: 16 },
    { key: "session", width: 12 },
    { key: "gross", width: 16 },
    { key: "fee", width: 16 },
    { key: "net", width: 16 }
  ];

  const title = t(input.meta.language, {
    es: "MotivarCare — Sesiones ejecutadas",
    en: "MotivarCare — Completed sessions",
    pt: "MotivarCare — Sessoes executadas"
  });
  const periodLabel = t(input.meta.language, {
    es: "Período",
    en: "Period",
    pt: "Periodo"
  });
  const generatedLabel = t(input.meta.language, {
    es: "Generado",
    en: "Generated",
    pt: "Gerado"
  });
  const currencyLabel = t(input.meta.language, {
    es: "Moneda",
    en: "Currency",
    pt: "Moeda"
  });
  const sessionsLabel = t(input.meta.language, {
    es: "Sesiones",
    en: "Sessions",
    pt: "Sessoes"
  });
  const professionalLabel = t(input.meta.language, {
    es: "Profesional",
    en: "Professional",
    pt: "Profissional"
  });

  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = TITLE_FONT;

  const metaRows: string[] = [];
  const professionalName = input.meta.professionalName?.trim();
  if (professionalName) {
    metaRows.push(`${professionalLabel}: ${professionalName}`);
  }
  metaRows.push(`${periodLabel}: ${input.meta.periodLabel}`);
  metaRows.push(`${generatedLabel}: ${input.meta.generatedAt.toLocaleString(locale)}`);
  metaRows.push(`${currencyLabel}: ${currencyCode} · ${sessionsLabel}: ${rows.length}`);
  if (input.meta.filtersSummary) {
    metaRows.push(input.meta.filtersSummary);
  }

  metaRows.forEach((value, index) => {
    const rowNumber = index + 2;
    sheet.mergeCells(`A${rowNumber}:G${rowNumber}`);
    const cell = sheet.getCell(`A${rowNumber}`);
    cell.value = value;
    cell.font = META_FONT;
  });

  const headerRowIndex = metaRows.length + 1;
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.values = [
    t(input.meta.language, { es: "Paciente", en: "Patient", pt: "Paciente" }),
    t(input.meta.language, { es: "Fecha", en: "Date", pt: "Data" }),
    t(input.meta.language, { es: "Horario", en: "Time", pt: "Horario" }),
    t(input.meta.language, { es: "# Sesión", en: "# Session", pt: "# Sessao" }),
    t(input.meta.language, { es: "Ejecutado", en: "Executed", pt: "Executado" }),
    t(input.meta.language, { es: "Comisión", en: "Fee", pt: "Comissao" }),
    t(input.meta.language, { es: "Neto", en: "Net", pt: "Liquido" })
  ];
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } }
    };
  });
  sheet.views = [{ state: "frozen", ySplit: headerRowIndex }];

  let rowIndex = headerRowIndex + 1;
  for (const row of rows) {
    const excelRow = sheet.getRow(rowIndex);
    excelRow.values = [
      row.patientName,
      row.sessionDate,
      row.sessionTime,
      row.sessionNumber,
      row.grossMajor,
      row.feeMajor,
      row.netMajor
    ];
    excelRow.getCell(5).numFmt = amountFormat;
    excelRow.getCell(6).numFmt = amountFormat;
    excelRow.getCell(7).numFmt = amountFormat;
    excelRow.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber >= 5 ? "right" : "left"
      };
      if (rowIndex % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
      }
    });
    rowIndex += 1;
  }

  rowIndex += 1;
  const totalRow = sheet.getRow(rowIndex);
  totalRow.values = [
    t(input.meta.language, { es: "Totales", en: "Totals", pt: "Totais" }),
    "",
    "",
    rows.length,
    totals.grossMajor,
    totals.feeMajor,
    totals.netMajor
  ];
  totalRow.eachCell((cell, colNumber) => {
    cell.font = TOTAL_FONT;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
    cell.alignment = {
      vertical: "middle",
      horizontal: colNumber >= 4 ? "right" : "left"
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF93C5FD" } }
    };
  });
  totalRow.getCell(5).numFmt = amountFormat;
  totalRow.getCell(6).numFmt = amountFormat;
  totalRow.getCell(7).numFmt = amountFormat;

  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: 7 }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${input.filenameStem}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
