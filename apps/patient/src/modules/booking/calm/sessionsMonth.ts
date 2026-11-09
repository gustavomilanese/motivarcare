import { calendarWeek } from "../../home/calm/calmWeek";

function zoneOf(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function zonedYmd(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zoneOf(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

export function dateForZonedDay(year: number, month: number, day: number, timeZone: string): Date {
  let guess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedYmd(guess, timeZone);
    if (parts.year === year && parts.month === month && parts.day === day) return guess;
    const target = Date.UTC(year, month - 1, day);
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day);
    guess = new Date(guess.getTime() + (target - actual));
  }
  return guess;
}

export type MonthCell = { date: Date; inMonth: boolean };

/** Seis semanas, de lunes a domingo, con los días del mes de `anchor`. */
export function monthCells(anchor: Date, timeZone: string): MonthCell[] {
  const { year, month } = zonedYmd(anchor, timeZone);
  const first = dateForZonedDay(year, month, 1, timeZone);
  const start = calendarWeek(first, timeZone)[0] ?? first;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000);
    const parts = zonedYmd(date, timeZone);
    return { date, inMonth: parts.year === year && parts.month === month };
  });
}

export function shiftAnchor(anchor: Date, days: number): Date {
  return new Date(anchor.getTime() + days * 86_400_000);
}

/** Desplaza `anchor` N meses en la zona, manteniendo el día cuando se puede. */
export function shiftByMonths(anchor: Date, months: number, timeZone: string): Date {
  const { year, month, day } = zonedYmd(anchor, timeZone);
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  const capped = Math.min(day, 28);
  const candidate = dateForZonedDay(nextYear, nextMonth, capped, timeZone);
  const parts = zonedYmd(candidate, timeZone);
  if (parts.month === nextMonth && day > capped) {
    const lastTry = dateForZonedDay(nextYear, nextMonth, Math.min(day, 31), timeZone);
    const lastParts = zonedYmd(lastTry, timeZone);
    if (lastParts.month === nextMonth) return lastTry;
  }
  return candidate;
}
