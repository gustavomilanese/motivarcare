export function formatDayShort(iso: string, locale = "es-AR") {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(iso));
}

export function formatWeekday(iso: string, locale = "es-AR") {
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(iso));
}

export function formatTime(iso: string, locale = "es-AR") {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function formatTimeRange(startsAt: string, endsAt?: string, locale = "es-AR") {
  const start = formatTime(startsAt, locale);
  if (!endsAt) {
    return start;
  }
  return `${start} a ${formatTime(endsAt, locale)}`;
}

export function formatMonthLabel(date: Date, locale = "es-AR") {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

export function formatAmount(cents: number, locale = "es-AR") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(cents / 100));
}

export function capitalize(value: string) {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatThreadTime(iso: string, locale = "es-AR") {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return formatTime(iso, locale);
  }
  return formatDayShort(iso, locale);
}

export function formatRelative(iso: string) {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) {
    return iso;
  }
  const diffMin = Math.round((Date.now() - target) / 60000);
  if (diffMin < 1) {
    return "hace instantes";
  }
  if (diffMin < 60) {
    return `hace ${diffMin} min`;
  }
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) {
    return `hace ${diffH} h`;
  }
  return `hace ${Math.round(diffH / 24)} días`;
}

export function formatDateOnly(iso: string | null, locale = "es-AR") {
  if (!iso) {
    return "—";
  }
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}
