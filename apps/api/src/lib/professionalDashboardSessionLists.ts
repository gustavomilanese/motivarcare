import { BookingStatus, type Prisma } from "@prisma/client";

const RESERVED_STATUSES: BookingStatus[] = [BookingStatus.REQUESTED, BookingStatus.CONFIRMED];
const RESERVED_STATUS_SET = new Set<string>(RESERVED_STATUSES);

export function isUpcomingDashboardSession(status: string, startsAt: Date, now: Date): boolean {
  return RESERVED_STATUS_SET.has(status.toUpperCase()) && startsAt.getTime() >= now.getTime();
}

export function isSettleDashboardSession(
  status: string,
  startsAt: Date,
  now: Date,
  monthStart: Date,
  monthEnd: Date
): boolean {
  if (startsAt.getTime() < monthStart.getTime() || startsAt.getTime() > monthEnd.getTime()) {
    return false;
  }
  const normalized = status.toUpperCase();
  if (normalized === BookingStatus.COMPLETED) {
    return true;
  }
  return RESERVED_STATUS_SET.has(normalized) && startsAt.getTime() < now.getTime();
}

export function upcomingReservationsWhere(professionalId: string, now: Date): Prisma.BookingWhereInput {
  return {
    professionalId,
    status: { in: RESERVED_STATUSES },
    startsAt: { gte: now }
  };
}

export function pendingExecutionBookingsWhere(
  professionalId: string,
  now: Date,
  monthStart: Date,
  monthEnd: Date
): Prisma.BookingWhereInput {
  return {
    professionalId,
    startsAt: {
      gte: monthStart,
      lte: monthEnd
    },
    OR: [
      {
        status: { in: RESERVED_STATUSES },
        startsAt: { lt: now }
      },
      {
        status: BookingStatus.COMPLETED
      }
    ]
  };
}

export function weeklyUpcomingCountWhere(
  professionalId: string,
  now: Date,
  nextWeek: Date
): Prisma.BookingWhereInput {
  return {
    professionalId,
    status: { in: RESERVED_STATUSES },
    startsAt: {
      gte: now,
      lte: nextWeek
    }
  };
}
