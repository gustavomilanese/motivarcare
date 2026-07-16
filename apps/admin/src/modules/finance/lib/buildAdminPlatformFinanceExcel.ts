import {
  type AppLanguage,
  formatDateWithLocale,
  localeFromLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import type { AdminPlatformMovement, AdminPlatformPurchase } from "../types/finance.types";

export type AdminPlatformExportMeta = {
  tab: "executed" | "purchases";
  periodLabel: string;
  generatedAt: Date;
  language: AppLanguage;
  scopeLabel?: string | null;
  filtersSummary?: string | null;
};

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function minorToMajor(cents: number): number {
  return cents / 100;
}

function formatSessionDate(startsAt: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value: startsAt,
    language,
    options: { year: "numeric", month: "2-digit", day: "2-digit" }
  });
}

function formatPurchasedDate(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: { year: "numeric", month: "2-digit", day: "2-digit" }
  });
}

function sessionNumberLabel(language: AppLanguage, movement: AdminPlatformMovement): string {
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

const HEADER_FILL = "FFF3F4F6";
const TOTAL_FILL = "FFE8F0FE";
const TITLE_FONT = { bold: true, size: 14, color: { argb: "FF111827" } };
const META_FONT = { size: 11, color: { argb: "FF4B5563" } };
const HEADER_FONT = { bold: true, color: { argb: "FF1F2937" } };
const TOTAL_FONT = { bold: true, color: { argb: "FF1E3A8A" } };
const amountFormat = "#,##0";

function writeMetaRows(
  sheet: import("exceljs").Worksheet,
  metaRows: string[],
  headerRowIndex: number,
  lastColumn: string
): void {
  metaRows.forEach((value, index) => {
    const rowNumber = index + 2;
    sheet.mergeCells(`A${rowNumber}:${lastColumn}${rowNumber}`);
    const cell = sheet.getCell(`A${rowNumber}`);
    cell.value = value;
    cell.font = META_FONT;
  });
  sheet.views = [{ state: "frozen", ySplit: headerRowIndex }];
}

function styleHeaderRow(headerRow: import("exceljs").Row, columnCount: number): void {
  headerRow.height = 22;
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber > columnCount) {
      return;
    }
    cell.font = HEADER_FONT;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } }
    };
  });
}

function styleDataRow(excelRow: import("exceljs").Row, rowIndex: number, amountColumns: number[]): void {
  amountColumns.forEach((col) => {
    excelRow.getCell(col).numFmt = amountFormat;
  });
  excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.alignment = {
      vertical: "middle",
      horizontal: amountColumns.includes(colNumber) ? "right" : "left"
    };
    if (rowIndex % 2 === 0) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
    }
  });
}

function buildMetaRows(input: { meta: AdminPlatformExportMeta; rowCount: number }): {
  title: string;
  metaRows: string[];
  headerRowIndex: number;
} {
  const locale = localeFromLanguage(input.meta.language);
  const title =
    input.meta.tab === "executed"
      ? t(input.meta.language, {
          es: "MotivarCare — Sesiones ejecutadas (Admin)",
          en: "MotivarCare — Completed sessions (Admin)",
          pt: "MotivarCare — Sessoes executadas (Admin)"
        })
      : t(input.meta.language, {
          es: "MotivarCare — Ventas (Admin)",
          en: "MotivarCare — Sales (Admin)",
          pt: "MotivarCare — Vendas (Admin)"
        });

  const metaRows: string[] = [];
  if (input.meta.scopeLabel?.trim()) {
    metaRows.push(input.meta.scopeLabel.trim());
  }
  metaRows.push(
    `${t(input.meta.language, { es: "Período", en: "Period", pt: "Periodo" })}: ${input.meta.periodLabel}`
  );
  metaRows.push(
    `${t(input.meta.language, { es: "Generado", en: "Generated", pt: "Gerado" })}: ${input.meta.generatedAt.toLocaleString(locale)}`
  );
  const countLabel =
    input.meta.tab === "executed"
      ? t(input.meta.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })
      : t(input.meta.language, { es: "Ventas", en: "Sales", pt: "Vendas" });
  metaRows.push(`USD · ${countLabel}: ${input.rowCount}`);
  if (input.meta.filtersSummary) {
    metaRows.push(input.meta.filtersSummary);
  }

  return { title, metaRows, headerRowIndex: metaRows.length + 1 };
}

export async function downloadAdminPlatformExecutedExcel(input: {
  movements: AdminPlatformMovement[];
  meta: AdminPlatformExportMeta;
  filenameStem: string;
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MotivarCare";
  workbook.created = input.meta.generatedAt;

  const sheet = workbook.addWorksheet(
    t(input.meta.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })
  );
  sheet.columns = [
    { key: "professional", width: 24 },
    { key: "patient", width: 24 },
    { key: "date", width: 14 },
    { key: "session", width: 12 },
    { key: "gross", width: 14 },
    { key: "fee", width: 14 },
    { key: "net", width: 14 }
  ];

  const { title, metaRows, headerRowIndex } = buildMetaRows({
    meta: input.meta,
    rowCount: input.movements.length
  });

  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = TITLE_FONT;
  writeMetaRows(sheet, metaRows, headerRowIndex, "G");

  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.values = [
    t(input.meta.language, { es: "Profesional", en: "Professional", pt: "Profissional" }),
    t(input.meta.language, { es: "Paciente", en: "Patient", pt: "Paciente" }),
    t(input.meta.language, { es: "Fecha", en: "Date", pt: "Data" }),
    t(input.meta.language, { es: "# Sesión", en: "# Session", pt: "# Sessao" }),
    t(input.meta.language, { es: "Ejecutado", en: "Executed", pt: "Executado" }),
    t(input.meta.language, { es: "Comisión", en: "Fee", pt: "Comissao" }),
    t(input.meta.language, { es: "Neto", en: "Net", pt: "Liquido" })
  ];
  styleHeaderRow(headerRow, 7);

  let grossTotal = 0;
  let feeTotal = 0;
  let netTotal = 0;
  let rowIndex = headerRowIndex + 1;

  for (const movement of input.movements) {
    const gross = minorToMajor(movement.grossCents);
    const fee = minorToMajor(movement.platformFeeCents);
    const net = minorToMajor(movement.amountCents);
    grossTotal += gross;
    feeTotal += fee;
    netTotal += net;

    const excelRow = sheet.getRow(rowIndex);
    excelRow.values = [
      movement.professionalName,
      movement.patientName,
      formatSessionDate(movement.startsAt, input.meta.language),
      sessionNumberLabel(input.meta.language, movement),
      gross,
      fee,
      net
    ];
    styleDataRow(excelRow, rowIndex, [5, 6, 7]);
    rowIndex += 1;
  }

  rowIndex += 1;
  const totalRow = sheet.getRow(rowIndex);
  totalRow.values = [
    t(input.meta.language, { es: "Totales", en: "Totals", pt: "Totais" }),
    "",
    "",
    input.movements.length,
    grossTotal,
    feeTotal,
    netTotal
  ];
  totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
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

  await downloadWorkbook(workbook, input.filenameStem);
}

export async function downloadAdminPlatformPurchasesExcel(input: {
  purchases: AdminPlatformPurchase[];
  meta: AdminPlatformExportMeta;
  filenameStem: string;
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MotivarCare";
  workbook.created = input.meta.generatedAt;

  const sheet = workbook.addWorksheet(
    t(input.meta.language, { es: "Ventas", en: "Sales", pt: "Vendas" })
  );
  sheet.columns = [
    { key: "date", width: 14 },
    { key: "professional", width: 24 },
    { key: "patient", width: 24 },
    { key: "package", width: 28 },
    { key: "credits", width: 12 },
    { key: "gross", width: 14 },
    { key: "fee", width: 14 },
    { key: "net", width: 14 }
  ];

  const { title, metaRows, headerRowIndex } = buildMetaRows({
    meta: input.meta,
    rowCount: input.purchases.length
  });

  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = TITLE_FONT;
  writeMetaRows(sheet, metaRows, headerRowIndex, "H");

  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.values = [
    t(input.meta.language, { es: "Fecha", en: "Date", pt: "Data" }),
    t(input.meta.language, { es: "Profesional", en: "Professional", pt: "Profissional" }),
    t(input.meta.language, { es: "Paciente", en: "Patient", pt: "Paciente" }),
    t(input.meta.language, { es: "Paquete", en: "Package", pt: "Pacote" }),
    t(input.meta.language, { es: "Créditos", en: "Credits", pt: "Creditos" }),
    t(input.meta.language, { es: "Vendido", en: "Sold", pt: "Vendido" }),
    t(input.meta.language, { es: "Comisión", en: "Fee", pt: "Comissao" }),
    t(input.meta.language, { es: "Neto", en: "Net", pt: "Liquido" })
  ];
  styleHeaderRow(headerRow, 8);

  let grossTotal = 0;
  let feeTotal = 0;
  let netTotal = 0;
  let rowIndex = headerRowIndex + 1;

  for (const purchase of input.purchases) {
    const gross = minorToMajor(purchase.grossCents);
    const fee = minorToMajor(purchase.platformFeeCents);
    const net = minorToMajor(purchase.professionalNetCents);
    grossTotal += gross;
    feeTotal += fee;
    netTotal += net;

    const excelRow = sheet.getRow(rowIndex);
    excelRow.values = [
      formatPurchasedDate(purchase.purchasedAt, input.meta.language),
      purchase.professionalName,
      purchase.patientName,
      purchase.packageName,
      `${purchase.remainingCredits}/${purchase.totalCredits}`,
      gross,
      fee,
      net
    ];
    styleDataRow(excelRow, rowIndex, [6, 7, 8]);
    rowIndex += 1;
  }

  rowIndex += 1;
  const totalRow = sheet.getRow(rowIndex);
  totalRow.values = [
    t(input.meta.language, { es: "Totales", en: "Totals", pt: "Totais" }),
    "",
    "",
    "",
    input.purchases.length,
    grossTotal,
    feeTotal,
    netTotal
  ];
  totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = TOTAL_FONT;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
    cell.alignment = {
      vertical: "middle",
      horizontal: colNumber >= 5 ? "right" : "left"
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF93C5FD" } }
    };
  });
  totalRow.getCell(6).numFmt = amountFormat;
  totalRow.getCell(7).numFmt = amountFormat;
  totalRow.getCell(8).numFmt = amountFormat;

  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: 8 }
  };

  await downloadWorkbook(workbook, input.filenameStem);
}

async function downloadWorkbook(workbook: import("exceljs").Workbook, filenameStem: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenameStem}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
