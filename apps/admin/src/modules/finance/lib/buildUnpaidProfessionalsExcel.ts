import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import type { AdminUnpaidProfessional } from "../types/finance.types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function minorToMajor(cents: number): number {
  return cents / 100;
}

function effectiveCommissionPercent(row: AdminUnpaidProfessional): number {
  if (row.grossCents <= 0) {
    return 0;
  }
  return Math.round((row.platformFeeCents / row.grossCents) * 1000) / 10;
}

function averageSessionCents(row: AdminUnpaidProfessional): number {
  if (row.sessionsCount <= 0) {
    return 0;
  }
  return Math.round(row.grossCents / row.sessionsCount);
}

const HEADER_FILL = "FFF3F4F6";
const TOTAL_FILL = "FFE8F0FE";
const TITLE_FONT = { bold: true, size: 14, color: { argb: "FF111827" } };
const META_FONT = { size: 11, color: { argb: "FF4B5563" } };
const HEADER_FONT = { bold: true, color: { argb: "FF1F2937" } };
const TOTAL_FONT = { bold: true, color: { argb: "FF1E3A8A" } };
const amountFormat = "#,##0.00";

export async function downloadUnpaidProfessionalsExcel(input: {
  rows: AdminUnpaidProfessional[];
  language: AppLanguage;
  filenameStem: string;
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const generatedAt = new Date();
  workbook.creator = "MotivarCare";
  workbook.created = generatedAt;

  const sheet = workbook.addWorksheet(
    t(input.language, { es: "Pendientes", en: "Unpaid", pt: "Pendentes" })
  );
  sheet.columns = [
    { key: "professional", width: 28 },
    { key: "sessions", width: 12 },
    { key: "unit", width: 14 },
    { key: "pct", width: 12 },
    { key: "gross", width: 14 },
    { key: "fee", width: 14 },
    { key: "net", width: 14 }
  ];

  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = t(input.language, {
    es: "Pendiente de pagar a profesionales",
    en: "Pending professional payouts",
    pt: "Pendente de pagar a profissionais"
  });
  sheet.getCell("A1").font = TITLE_FONT;

  sheet.mergeCells("A2:G2");
  sheet.getCell("A2").value = `${t(input.language, {
    es: "Generado",
    en: "Generated",
    pt: "Gerado"
  })}: ${generatedAt.toISOString()} · USD`;
  sheet.getCell("A2").font = META_FONT;

  const headerRow = sheet.getRow(4);
  headerRow.values = [
    t(input.language, { es: "Profesional", en: "Professional", pt: "Profissional" }),
    t(input.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" }),
    t(input.language, { es: "Valor / sesión", en: "Value / session", pt: "Valor / sessão" }),
    t(input.language, { es: "% comisión", en: "Fee %", pt: "% comissão" }),
    t(input.language, { es: "Ejecutado", en: "Executed", pt: "Executado" }),
    t(input.language, { es: "Comisión", en: "Fee", pt: "Comissão" }),
    t(input.language, { es: "Neto a pagar", en: "Net to pay", pt: "Líquido" })
  ];
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  });
  sheet.views = [{ state: "frozen", ySplit: 4 }];

  let sessionsTotal = 0;
  let grossTotal = 0;
  let feeTotal = 0;
  let netTotal = 0;

  input.rows.forEach((row, index) => {
    const excelRow = sheet.getRow(5 + index);
    const unit = averageSessionCents(row);
    const pct = effectiveCommissionPercent(row);
    excelRow.values = [
      row.professionalName,
      row.sessionsCount,
      minorToMajor(unit),
      pct,
      minorToMajor(row.grossCents),
      minorToMajor(row.platformFeeCents),
      minorToMajor(row.professionalNetCents)
    ];
    for (const col of [3, 5, 6, 7]) {
      excelRow.getCell(col).numFmt = amountFormat;
    }
    sessionsTotal += row.sessionsCount;
    grossTotal += row.grossCents;
    feeTotal += row.platformFeeCents;
    netTotal += row.professionalNetCents;
  });

  const totalRow = sheet.getRow(5 + input.rows.length);
  totalRow.values = [
    t(input.language, { es: "Total", en: "Total", pt: "Total" }),
    sessionsTotal,
    "",
    "",
    minorToMajor(grossTotal),
    minorToMajor(feeTotal),
    minorToMajor(netTotal)
  ];
  totalRow.font = TOTAL_FONT;
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
  });
  for (const col of [5, 6, 7]) {
    totalRow.getCell(col).numFmt = amountFormat;
  }

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: 7 }
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
