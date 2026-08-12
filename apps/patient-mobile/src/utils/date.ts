export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

/** Reloj 24h (Latam): evita "1 p. m." / AM-PM en pantallas de sesión. */
const TIME_24H: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
};

export function formatDate(isoDate: string, locale = "es-AR") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "short"
  }).format(new Date(isoDate));
}

export function formatTime(isoDate: string, locale = "es-AR", timezone?: string) {
  return new Intl.DateTimeFormat(locale, {
    ...TIME_24H,
    ...(timezone ? { timeZone: timezone } : {})
  }).format(new Date(isoDate));
}

export function formatDateTime(isoDate: string, locale = "es-AR", timezone?: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...TIME_24H,
    ...(timezone ? { timeZone: timezone } : {})
  }).format(new Date(isoDate));
}

export function formatMoneyFromCents(cents: number, currency: string, locale = "es-AR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0
  }).format(cents / 100);
}
