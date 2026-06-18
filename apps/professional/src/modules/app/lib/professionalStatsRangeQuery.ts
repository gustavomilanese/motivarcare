export type RevenuePreset = "day" | "week" | "month" | "year" | "all";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function ymLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
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
  const s = startOfWeekMonday(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6, 23, 59, 59, 999);
}

function resolveRevenueDateBounds(
  preset: RevenuePreset,
  dayStr: string,
  monthStr: string,
  yearStr: string
): { from: Date; to: Date } {
  if (preset === "all") {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    return { from: new Date(2020, 0, 1, 0, 0, 0, 0), to };
  }

  if (preset === "day") {
    const base = parseYmdLocal(dayStr);
    return {
      from: new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0),
      to: new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999)
    };
  }

  if (preset === "week") {
    const base = parseYmdLocal(dayStr);
    return { from: startOfWeekMonday(base), to: endOfWeekSunday(base) };
  }

  if (preset === "month") {
    const [y, m] = monthStr.split("-").map(Number);
    return {
      from: new Date(y, m - 1, 1, 0, 0, 0, 0),
      to: new Date(y, m, 0, 23, 59, 59, 999)
    };
  }

  const y = Number(yearStr) || new Date().getFullYear();
  return {
    from: new Date(y, 0, 1, 0, 0, 0, 0),
    to: new Date(y, 11, 31, 23, 59, 59, 999)
  };
}

/** Rango YMD para inputs type=date (p. ej. modal de exportación). */
export function resolveRevenueDateRangeYmd(
  preset: RevenuePreset,
  dayStr: string,
  monthStr: string,
  yearStr: string
): { dateFrom: string; dateTo: string } {
  const { from, to } = resolveRevenueDateBounds(preset, dayStr, monthStr, yearStr);
  return { dateFrom: ymdLocal(from), dateTo: ymdLocal(to) };
}

export function buildProfessionalStatsQueryFromYmd(dateFrom: string, dateTo: string): string {
  const from = parseYmdLocal(dateFrom);
  from.setHours(0, 0, 0, 0);
  const to = parseYmdLocal(dateTo);
  to.setHours(23, 59, 59, 999);
  return `?statsFrom=${encodeURIComponent(from.toISOString())}&statsTo=${encodeURIComponent(to.toISOString())}`;
}

/** Query string for GET /dashboard y GET /earnings (statsFrom, statsTo, statsAll). */
export function buildProfessionalStatsQuery(
  preset: RevenuePreset,
  dayStr: string,
  monthStr: string,
  yearStr: string
): string {
  if (preset === "all") {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return `?statsAll=1&statsTo=${encodeURIComponent(end.toISOString())}`;
  }

  const { from, to } = resolveRevenueDateBounds(preset, dayStr, monthStr, yearStr);
  return `?statsFrom=${encodeURIComponent(from.toISOString())}&statsTo=${encodeURIComponent(to.toISOString())}`;
}
