export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

export function formatDate(isoDate: string, locale = "es-AR") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "short"
  }).format(new Date(isoDate));
}

export function formatTime(isoDate: string, locale = "es-AR", timezone?: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    ...(timezone ? { timeZone: timezone } : {})
  }).format(new Date(isoDate));
}

export function formatDateTime(isoDate: string, locale = "es-AR", timezone?: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
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
