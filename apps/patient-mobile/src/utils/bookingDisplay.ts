/**
 * Helpers para armar UI de reservas (p. ej. sesión de prueba con pastilla de fecha).
 */

export function bookingDurationMinutes(startsAt: string, endsAt: string): number | null {
  const s = new Date(startsAt).getTime();
  const e = new Date(endsAt).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) {
    return null;
  }
  return Math.round((e - s) / 60000);
}

/** Mes tipo "ABR" (3 letras, mayúsculas). */
export function formatMonthAbbrevUpper(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const m = d.toLocaleDateString("es-AR", { month: "short" });
  return m.replace(/\./g, "").trim().toUpperCase().slice(0, 3);
}

export function formatDayTwoDigits(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return String(d.getDate()).padStart(2, "0");
}

/** Ej. "Viernes, 10:00 p. m. – 10:50 p. m." */
export function formatWeekdayTimeRangeEs(startsAt: string, endsAt: string): string {
  const sd = new Date(startsAt);
  const ed = new Date(endsAt);
  if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) {
    return "";
  }
  const weekday = sd.toLocaleDateString("es-AR", { weekday: "long" });
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const t1 = sd.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit" });
  const t2 = ed.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit" });
  return `${cap}, ${t1} – ${t2}`;
}

export function deviceTimeZoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}
