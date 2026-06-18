/** Rango temporal compartido entre ingresos profesional y admin. */

export function firstQueryString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return undefined;
}

export function financeCompletedReferenceWhere(from: Date | null, to: Date) {
  const byCompleted = from
    ? { bookingCompletedAt: { gte: from, lte: to } }
    : { bookingCompletedAt: { lte: to } };
  const byStartFallback = from
    ? { AND: [{ bookingCompletedAt: null }, { bookingStartsAt: { gte: from, lte: to } }] }
    : { AND: [{ bookingCompletedAt: null }, { bookingStartsAt: { lte: to } }] };
  return { OR: [byCompleted, byStartFallback] };
}

function utcStartOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function utcEndOfDayFromDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function parseProfessionalStatsRange(query: Record<string, unknown>): {
  statsFrom: Date | null;
  statsTo: Date;
  statsAll: boolean;
} {
  const now = new Date();
  const statsAll =
    firstQueryString(query.statsAll) === "1" || firstQueryString(query.statsAll) === "true";
  let statsFrom: Date | null = null;
  let statsTo: Date = utcEndOfDayFromDate(now);

  if (statsAll) {
    statsFrom = null;
    const toStr = firstQueryString(query.statsTo);
    if (toStr) {
      const parsed = new Date(toStr);
      if (!Number.isNaN(parsed.getTime())) {
        statsTo = parsed;
      }
    }
  } else {
    const fromStr = firstQueryString(query.statsFrom);
    const toStr = firstQueryString(query.statsTo);
    if (fromStr && toStr) {
      const from = new Date(fromStr);
      const to = new Date(toStr);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        statsFrom = from;
        statsTo = to;
      } else {
        statsFrom = utcStartOfMonth(now);
        statsTo = utcEndOfDayFromDate(now);
      }
    } else {
      statsFrom = utcStartOfMonth(now);
      statsTo = utcEndOfDayFromDate(now);
    }
  }

  return { statsFrom, statsTo, statsAll };
}

export function packagePurchasedAtRangeWhere(from: Date | null, to: Date) {
  return from ? { purchasedAt: { gte: from, lte: to } } : { purchasedAt: { lte: to } };
}
