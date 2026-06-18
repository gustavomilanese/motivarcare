import { type AppLanguage, formatDateWithLocale, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { type RevenuePreset, ymLocal, ymdLocal } from "./professionalStatsRangeQuery";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function parseYmdLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeekMonday(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  return c;
}

function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
}

function formatLongDate(value: Date, language: AppLanguage): string {
  return formatDateWithLocale({
    value: value.toISOString(),
    language,
    options: { year: "numeric", month: "long", day: "numeric" }
  });
}

function formatMonthYear(monthStr: string, language: AppLanguage): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return formatDateWithLocale({
    value: date.toISOString(),
    language,
    options: { year: "numeric", month: "long" }
  });
}

function filenameSafe(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function formatRevenuePeriodLabel(input: {
  language: AppLanguage;
  preset: RevenuePreset;
  dayStr: string;
  monthStr: string;
  yearStr: string;
}): { label: string; filenameStem: string } {
  const today = ymdLocal(new Date());

  if (input.preset === "all") {
    const label = t(input.language, {
      es: "Todo el historial",
      en: "All time",
      pt: "Todo o historico"
    });
    return { label, filenameStem: `sesiones-${filenameSafe(label)}-${today}` };
  }

  if (input.preset === "day") {
    const date = parseYmdLocal(input.dayStr);
    const label = formatLongDate(date, input.language);
    return { label, filenameStem: `sesiones-${input.dayStr}` };
  }

  if (input.preset === "week") {
    const base = parseYmdLocal(input.dayStr);
    const from = startOfWeekMonday(base);
    const to = endOfWeekSunday(base);
    const fromLabel = formatLongDate(from, input.language);
    const toLabel = formatLongDate(to, input.language);
    const label = t(input.language, {
      es: `Semana del ${fromLabel} al ${toLabel}`,
      en: `Week of ${fromLabel} to ${toLabel}`,
      pt: `Semana de ${fromLabel} a ${toLabel}`
    });
    return {
      label,
      filenameStem: `sesiones-semana-${ymdLocal(from)}`
    };
  }

  if (input.preset === "month") {
    const label = formatMonthYear(input.monthStr, input.language);
    return { label, filenameStem: `sesiones-${input.monthStr}` };
  }

  const year = Number(input.yearStr) || new Date().getFullYear();
  const label = String(year);
  return { label, filenameStem: `sesiones-${year}` };
}

export function formatExportDateRangeLabel(input: {
  language: AppLanguage;
  dateFrom: string;
  dateTo: string;
}): { label: string; filenameStem: string } {
  const fromDate = parseYmdLocal(input.dateFrom);
  const toDate = parseYmdLocal(input.dateTo);
  const fromLabel = formatLongDate(fromDate, input.language);
  const toLabel = formatLongDate(toDate, input.language);
  const label =
    input.dateFrom === input.dateTo
      ? fromLabel
      : t(input.language, {
          es: `Del ${fromLabel} al ${toLabel}`,
          en: `${fromLabel} to ${toLabel}`,
          pt: `De ${fromLabel} a ${toLabel}`
        });
  return {
    label,
    filenameStem: `sesiones-${input.dateFrom}${input.dateFrom === input.dateTo ? "" : `-a-${input.dateTo}`}`
  };
}
