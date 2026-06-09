import { formatDateWithLocale, type AppLanguage } from "@therapy/i18n-config";

type SessionDateParams = { isoDate: string; timezone: string; language: AppLanguage };

export function formatSessionDateOnly(params: SessionDateParams): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  });
}

export function formatSessionTimeOnly(params: SessionDateParams): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

/** Día corto + fecha legible en cards mobile. */
export function formatSessionCardDateLine(params: SessionDateParams): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      day: "numeric",
      month: "long"
    }
  });
}

/** Día + hora en una línea para cards mobile (ej. «Mié, 24 de junio, 9:00 a. m.»). */
export function formatSessionCardDateTimeLine(params: SessionDateParams): string {
  const datePart = formatSessionCardDateLine(params);
  const timePart = formatSessionTimeOnly(params);
  return `${datePart}, ${timePart}`;
}
