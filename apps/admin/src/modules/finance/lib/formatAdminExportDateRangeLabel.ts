import { type AppLanguage, formatDateWithLocale, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function parseYmdLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLongDate(value: Date, language: AppLanguage): string {
  return formatDateWithLocale({
    value: value.toISOString(),
    language,
    options: { year: "numeric", month: "long", day: "numeric" }
  });
}

export function formatAdminExportDateRangeLabel(input: {
  language: AppLanguage;
  dateFrom: string;
  dateTo: string;
  tab: "executed" | "purchases";
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
  const rangeSuffix = input.dateFrom === input.dateTo ? input.dateFrom : `${input.dateFrom}-a-${input.dateTo}`;
  const filenameStem =
    input.tab === "executed" ? `admin-sesiones-${rangeSuffix}` : `admin-ventas-paquetes-${rangeSuffix}`;
  return { label, filenameStem };
}
