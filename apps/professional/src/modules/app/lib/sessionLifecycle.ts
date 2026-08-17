import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

export const PORTAL_SESSION_FLOW: Array<{
  id: "reserved" | "completed" | "payout" | "paid";
  label: LocalizedText;
}> = [
  { id: "reserved", label: { es: "Reservada", en: "Reserved", pt: "Reservada" } },
  { id: "completed", label: { es: "Realizada", en: "Completed", pt: "Realizada" } },
  { id: "payout", label: { es: "En cobro", en: "In payout", pt: "Em cobranca" } },
  { id: "paid", label: { es: "Pagada", en: "Paid", pt: "Paga" } }
];

export type SessionListFilter = "all" | "reserved" | "executed" | "submitted" | "paid";

export type PortalSessionFlags = {
  status: string;
  canUncomplete?: boolean;
  submittedForPayout?: boolean;
  payoutPaid?: boolean;
  startsAt?: string;
  netDisplayCents?: number | null;
};

export function isReservedBookingStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "confirmed" || normalized === "requested";
}

export function formatPortalBookingStatus(status: string, language: AppLanguage): string {
  const normalized = status.toLowerCase();
  if (isReservedBookingStatus(normalized)) {
    return textByLanguage(language, PORTAL_SESSION_FLOW[0]!.label);
  }
  if (normalized === "completed") {
    return textByLanguage(language, PORTAL_SESSION_FLOW[1]!.label);
  }
  if (normalized === "cancelled") {
    return textByLanguage(language, { es: "Cancelada", en: "Cancelled", pt: "Cancelada" });
  }
  return textByLanguage(language, PORTAL_SESSION_FLOW[0]!.label);
}

export function isCompletedBooking(session: PortalSessionFlags): boolean {
  return session.status.toLowerCase() === "completed";
}

/** Realizada reversible: todavía no se envió a cobro. */
export function isReadyForCobroSession(session: PortalSessionFlags): boolean {
  return (
    isCompletedBooking(session) &&
    session.canUncomplete !== false &&
    !session.submittedForPayout &&
    !session.payoutPaid
  );
}

export function isEnCobroSession(session: PortalSessionFlags): boolean {
  return isCompletedBooking(session) && Boolean(session.submittedForPayout) && !session.payoutPaid;
}

export function isPagadaSession(session: PortalSessionFlags): boolean {
  return isCompletedBooking(session) && Boolean(session.payoutPaid);
}

export function isLockedSession(session: PortalSessionFlags): boolean {
  return isCompletedBooking(session) && !isReadyForCobroSession(session);
}

export function isSelectableSession(session: PortalSessionFlags): boolean {
  return !isLockedSession(session);
}

export function filterSettleSessions<T extends PortalSessionFlags>(
  sessions: T[],
  filter: SessionListFilter
): T[] {
  if (filter === "reserved") {
    return sessions.filter((session) => !isCompletedBooking(session));
  }
  if (filter === "executed") {
    return sessions.filter((session) => isReadyForCobroSession(session));
  }
  if (filter === "submitted") {
    return sessions.filter((session) => isEnCobroSession(session));
  }
  if (filter === "paid") {
    return sessions.filter((session) => isPagadaSession(session));
  }
  return sessions;
}

export function sumReadyForCobroNetCents(sessions: PortalSessionFlags[]): number {
  return sessions
    .filter(isReadyForCobroSession)
    .reduce((sum, session) => sum + (session.netDisplayCents ?? 0), 0);
}

/** False while a just-completed session still has no finance net (optimistic UI). */
export function readyForCobroNetsKnown(sessions: PortalSessionFlags[]): boolean {
  const ready = sessions.filter(isReadyForCobroSession);
  return ready.length === 0 || ready.every((session) => session.netDisplayCents != null);
}

/** Próximas: reservada y todavía no empezó. */
export function isUpcomingListSession(status: string, startsAt: string | Date, now: Date): boolean {
  return isReservedBookingStatus(status) && new Date(startsAt).getTime() >= now.getTime();
}

/** Marcar realizadas: del mes, ya empezada (reservada, estrictamente antes de now) o realizada. */
export function isSettleListSession(
  status: string,
  startsAt: string | Date,
  now: Date,
  monthStart: Date,
  monthEnd: Date
): boolean {
  const startMs = new Date(startsAt).getTime();
  if (startMs < monthStart.getTime() || startMs > monthEnd.getTime()) {
    return false;
  }
  if (status.toLowerCase() === "completed") {
    return true;
  }
  return isReservedBookingStatus(status) && startMs < now.getTime();
}
