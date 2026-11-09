import { isSameZonedDay } from "./calmHomeFormat";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekdayIndex(date: Date, timeZone: string): number {
  let label = "Mon";
  try {
    label = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(date);
  } catch {
    label = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date);
  }
  const index = WEEKDAYS.indexOf(label);
  return index < 0 ? 1 : index;
}

/** Lunes a domingo de la semana calendario de `now`, en la zona del paciente. */
export function calendarWeek(now: Date, timeZone: string): Date[] {
  const index = weekdayIndex(now, timeZone);
  const mondayOffset = index === 0 ? -6 : 1 - index;
  return Array.from({ length: 7 }, (_, day) => new Date(now.getTime() + (mondayOffset + day) * 86_400_000));
}

export type WeekBooking = {
  id: string;
  startsAt: string;
  status: "confirmed" | "cancelled";
  professionalId: string;
};

export function weekSessions<T extends WeekBooking>(bookings: T[], days: Date[], timeZone: string): T[][] {
  return days.map((day) =>
    bookings
      .filter((booking) => booking.status === "confirmed" && isSameZonedDay(new Date(booking.startsAt), day, timeZone))
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  );
}
