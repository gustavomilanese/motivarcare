import { type AppLanguage, textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";

const HONORIFIC = /^(dr|dra|lic|licda|psic|mr|mrs|ms|sr|sra)\.?$/i;

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function calmGivenName(professional: {
  firstName?: string;
  lastName?: string;
  fullName: string;
}): string {
  const parts = professionalAccessibleName(professional)
    .trim()
    .split(/\s+/)
    .filter((part) => part && !HONORIFIC.test(part));
  return parts[0] ?? "";
}

export function patientFirstName(fullName: string | undefined, firstName?: string): string {
  const given = (firstName ?? "").trim();
  if (given) return given;
  const full = (fullName ?? "").trim();
  if (!full) return "";
  return full.split(/\s+/)[0] ?? full;
}

function localeTag(language: AppLanguage): string {
  if (language === "en") return "en-US";
  if (language === "pt") return "pt-BR";
  return "es-AR";
}

function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function formatDayHeading(now: Date, timeZone: string, language: AppLanguage): string {
  const zone = safeZone(timeZone);
  const formatted = new Intl.DateTimeFormat(localeTag(language), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: zone
  }).format(now);
  return formatted.toLocaleUpperCase(localeTag(language));
}

export function formatClock(iso: string, timeZone: string, language: AppLanguage): string {
  const zone = safeZone(timeZone);
  return new Intl.DateTimeFormat(localeTag(language), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone
  }).format(new Date(iso));
}

export function formatWeekday(iso: string, timeZone: string, language: AppLanguage): string {
  const zone = safeZone(timeZone);
  const label = new Intl.DateTimeFormat(localeTag(language), {
    weekday: "long",
    timeZone: zone
  }).format(new Date(iso));
  return label.charAt(0).toLocaleUpperCase(localeTag(language)) + label.slice(1);
}

/** Día de semana + fecha corta (ej. «Lunes 16 nov») para listas de sesiones. */
export function formatWeekdayDate(iso: string, timeZone: string, language: AppLanguage): string {
  const zone = safeZone(timeZone);
  const locale = localeTag(language);
  const label = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: zone
  }).format(new Date(iso));
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

export function formatShortDate(iso: string, timeZone: string, language: AppLanguage): string {
  const zone = safeZone(timeZone);
  return new Intl.DateTimeFormat(localeTag(language), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: zone
  }).format(new Date(iso));
}

function zonedParts(date: Date, timeZone: string): { year: string; month: string; day: string } {
  const zone = safeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: zone
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

export function isSameZonedDay(a: Date, b: Date, timeZone: string): boolean {
  const left = zonedParts(a, timeZone);
  const right = zonedParts(b, timeZone);
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

export function sessionLengthMinutes(startsAt: string, endsAt: string): number | null {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.round((end - start) / 60000);
}

export function timezoneCaption(timeZone: string, language: AppLanguage, now = new Date()): string {
  let name = timeZone;
  let offset = "";
  try {
    const parts = new Intl.DateTimeFormat(localeTag(language), {
      timeZone,
      timeZoneName: "longGeneric"
    }).formatToParts(now);
    name = parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
    const short = new Intl.DateTimeFormat(localeTag(language), {
      timeZone,
      timeZoneName: "shortOffset"
    }).formatToParts(now);
    offset = short.find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    return timeZone;
  }
  return offset ? `${name} (${offset})` : name;
}

export type SessionTiming =
  | { kind: "live" }
  | { kind: "soon"; minutes: number }
  | { kind: "today" }
  | { kind: "later" };

export function sessionTiming(startsAt: string, endsAt: string, now: Date, timeZone: string): SessionTiming {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const nowMs = now.getTime();
  if (Number.isFinite(start) && Number.isFinite(end) && nowMs >= start && nowMs <= end) {
    return { kind: "live" };
  }
  if (!Number.isFinite(start) || start <= nowMs) {
    return { kind: "later" };
  }
  const minutes = Math.max(1, Math.round((start - nowMs) / 60000));
  if (minutes <= 90) return { kind: "soon", minutes };
  if (isSameZonedDay(new Date(startsAt), now, timeZone)) return { kind: "today" };
  return { kind: "later" };
}

export function sessionChipLabel(timing: SessionTiming, language: AppLanguage): string {
  if (timing.kind === "live") {
    return t(language, { es: "En curso", en: "In progress", pt: "Em andamento" });
  }
  if (timing.kind === "soon") {
    const minutes = timing.minutes;
    return t(language, {
      es: minutes === 1 ? "Empieza en 1 minuto" : `Empieza en ${minutes} minutos`,
      en: minutes === 1 ? "Starts in 1 minute" : `Starts in ${minutes} minutes`,
      pt: minutes === 1 ? "Começa em 1 minuto" : `Começa em ${minutes} minutos`
    });
  }
  if (timing.kind === "today") {
    return t(language, { es: "Hoy", en: "Today", pt: "Hoje" });
  }
  return t(language, { es: "Próxima", en: "Upcoming", pt: "Próxima" });
}

export function weekdayLabels(now: Date, timeZone: string, language: AppLanguage): string[] {
  const zone = safeZone(timeZone);
  const labels: string[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    labels.push(
      new Intl.DateTimeFormat(localeTag(language), { weekday: "short", timeZone: zone })
        .format(day)
        .replace(".", "")
        .slice(0, 3)
        .toLowerCase()
    );
  }
  return labels;
}
