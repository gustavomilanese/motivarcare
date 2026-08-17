import { describe, expect, it } from "vitest";
import {
  filterSettleSessions,
  formatPortalBookingStatus,
  isEnCobroSession,
  isLockedSession,
  isPagadaSession,
  isReadyForCobroSession,
  isReservedBookingStatus,
  isSelectableSession,
  isSettleListSession,
  isUpcomingListSession,
  PORTAL_SESSION_FLOW,
  readyForCobroNetsKnown,
  sumReadyForCobroNetCents,
  type PortalSessionFlags
} from "./sessionLifecycle";
import { resolveSessionPayoutStatus, sessionPayoutStatusLabel } from "./sessionPayoutStatus";

const now = new Date("2026-08-16T15:00:00.000Z");
const monthStart = new Date("2026-08-01T00:00:00.000Z");
const monthEnd = new Date("2026-08-31T23:59:59.999Z");

function session(overrides: Partial<PortalSessionFlags> & { status: string }): PortalSessionFlags {
  return {
    canUncomplete: true,
    submittedForPayout: false,
    payoutPaid: false,
    netDisplayCents: 10_000,
    ...overrides
  };
}

describe("PORTAL_SESSION_FLOW", () => {
  it("keeps the four product labels in order", () => {
    expect(PORTAL_SESSION_FLOW.map((step) => step.id)).toEqual(["reserved", "completed", "payout", "paid"]);
    expect(PORTAL_SESSION_FLOW.map((step) => step.label.es)).toEqual([
      "Reservada",
      "Realizada",
      "En cobro",
      "Pagada"
    ]);
  });
});

describe("formatPortalBookingStatus", () => {
  it("collapses requested and confirmed into Reservada", () => {
    expect(formatPortalBookingStatus("REQUESTED", "es")).toBe("Reservada");
    expect(formatPortalBookingStatus("confirmed", "es")).toBe("Reservada");
    expect(formatPortalBookingStatus("COMPLETED", "es")).toBe("Realizada");
    expect(formatPortalBookingStatus("cancelled", "es")).toBe("Cancelada");
  });
});

describe("payout chips", () => {
  it("treats completed + reversible as ready for cobro", () => {
    const ready = session({ status: "completed" });
    expect(isReadyForCobroSession(ready)).toBe(true);
    expect(isLockedSession(ready)).toBe(false);
    expect(isSelectableSession(ready)).toBe(true);
    expect(resolveSessionPayoutStatus(ready)).toBe("completed");
    expect(sessionPayoutStatusLabel("es", "completed")).toBe("Realizada");
  });

  it("locks submitted and paid sessions", () => {
    const submitted = session({ status: "completed", submittedForPayout: true, canUncomplete: false });
    const paid = session({
      status: "completed",
      submittedForPayout: true,
      payoutPaid: true,
      canUncomplete: false
    });
    expect(isEnCobroSession(submitted)).toBe(true);
    expect(isPagadaSession(paid)).toBe(true);
    expect(isLockedSession(submitted)).toBe(true);
    expect(isSelectableSession(paid)).toBe(false);
    expect(sessionPayoutStatusLabel("es", resolveSessionPayoutStatus(submitted))).toBe("En cobro");
    expect(sessionPayoutStatusLabel("es", resolveSessionPayoutStatus(paid))).toBe("Pagada");
  });

  it("treats missing flags as reversible completed (optimistic)", () => {
    expect(isReadyForCobroSession({ status: "completed" })).toBe(true);
    expect(isLockedSession({ status: "completed" })).toBe(false);
  });

  it("locks when canUncomplete is explicitly false", () => {
    expect(isLockedSession({ status: "completed", canUncomplete: false })).toBe(true);
    expect(isSelectableSession({ status: "completed", canUncomplete: false })).toBe(false);
  });
});

describe("filterSettleSessions", () => {
  const reserved = session({ status: "confirmed" });
  const ready = session({ status: "completed" });
  const submitted = session({ status: "completed", submittedForPayout: true, canUncomplete: false });
  const paid = session({
    status: "completed",
    submittedForPayout: true,
    payoutPaid: true,
    canUncomplete: false
  });
  const all = [reserved, ready, submitted, paid];

  it("splits the settle inbox by product filter", () => {
    expect(filterSettleSessions(all, "reserved")).toEqual([reserved]);
    expect(filterSettleSessions(all, "executed")).toEqual([ready]);
    expect(filterSettleSessions(all, "submitted")).toEqual([submitted]);
    expect(filterSettleSessions(all, "paid")).toEqual([paid]);
    expect(filterSettleSessions(all, "all")).toHaveLength(4);
  });

  it("sums only reversible completed nets", () => {
    expect(sumReadyForCobroNetCents(all)).toBe(10_000);
    expect(readyForCobroNetsKnown(all)).toBe(true);
    expect(readyForCobroNetsKnown([session({ status: "completed", netDisplayCents: null })])).toBe(false);
  });
});

describe("dual dashboard lists", () => {
  it("puts a future reserved session only in Próximas", () => {
    const startsAt = "2026-08-16T16:00:00.000Z";
    expect(isUpcomingListSession("CONFIRMED", startsAt, now)).toBe(true);
    expect(isSettleListSession("CONFIRMED", startsAt, now, monthStart, monthEnd)).toBe(false);
  });

  it("does not treat an in-progress reserved session as upcoming", () => {
    const startsAt = "2026-08-16T14:00:00.000Z";
    const endsAt = "2026-08-16T15:00:00.000Z";
    expect(new Date(endsAt).getTime() >= now.getTime()).toBe(true);
    expect(isUpcomingListSession("CONFIRMED", startsAt, now)).toBe(false);
    expect(isSettleListSession("CONFIRMED", startsAt, now, monthStart, monthEnd)).toBe(true);
  });

  it("never places the same reserved session in both lists, including exactly now", () => {
    const startsAt = now.toISOString();
    const upcoming = isUpcomingListSession("CONFIRMED", startsAt, now);
    const settle = isSettleListSession("CONFIRMED", startsAt, now, monthStart, monthEnd);
    expect(upcoming).toBe(true);
    expect(settle).toBe(false);
    expect(upcoming && settle).toBe(false);
  });

  it("keeps completed sessions in settle even if they already started", () => {
    const startsAt = "2026-08-10T12:00:00.000Z";
    expect(isUpcomingListSession("COMPLETED", startsAt, now)).toBe(false);
    expect(isSettleListSession("COMPLETED", startsAt, now, monthStart, monthEnd)).toBe(true);
  });

  it("excludes last-month uncompleted reserved sessions from the current settle month", () => {
    const startsAt = "2026-07-30T12:00:00.000Z";
    expect(isUpcomingListSession("CONFIRMED", startsAt, now)).toBe(false);
    expect(isSettleListSession("CONFIRMED", startsAt, now, monthStart, monthEnd)).toBe(false);
  });

  it("does not treat cancelled as reserved", () => {
    expect(isReservedBookingStatus("CANCELLED")).toBe(false);
    expect(isUpcomingListSession("CANCELLED", "2026-08-20T12:00:00.000Z", now)).toBe(false);
  });
});
