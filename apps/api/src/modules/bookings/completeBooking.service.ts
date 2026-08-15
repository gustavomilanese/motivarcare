import { prisma } from "../../lib/prisma.js";
import { upsertFinanceRecordForBooking } from "../finance/finance.service.js";
import {
  COMPLETE_BOOKING_BATCH_MAX,
  evaluateCompleteBooking,
  evaluateUncompleteBooking,
  uniqueBookingIds
} from "./completeBooking.rules.js";

const BOOKING_STATUS = {
  REQUESTED: "REQUESTED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW"
} as const;

export { COMPLETE_BOOKING_BATCH_MAX, evaluateCompleteBooking, evaluateUncompleteBooking };

export class CompleteBookingError extends Error {
  httpStatus: number;

  constructor(httpStatus: number, message: string) {
    super(message);
    this.name = "CompleteBookingError";
    this.httpStatus = httpStatus;
  }
}

export type CompletedBookingSummary = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  completedAt: Date | null;
};

function toSummary(booking: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  completedAt: Date | null;
}): CompletedBookingSummary {
  return {
    id: booking.id,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    status: booking.status,
    completedAt: booking.completedAt
  };
}

export async function completeProfessionalBooking(params: {
  bookingId: string;
  professionalProfileId: string;
  completedAt?: Date;
  now?: Date;
}): Promise<CompletedBookingSummary> {
  const now = params.now ?? new Date();
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    select: {
      id: true,
      professionalId: true,
      status: true,
      startsAt: true,
      completedAt: true
    }
  });
  const gate = evaluateCompleteBooking(booking, params.professionalProfileId, now);
  if (!gate.ok || !booking) {
    throw new CompleteBookingError(gate.ok ? 404 : gate.httpStatus, gate.ok ? "Booking not found" : gate.error);
  }

  const completedAt = params.completedAt ?? now;
  const previousStatus = booking.status;
  const previousCompletedAt = booking.completedAt;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BOOKING_STATUS.COMPLETED,
      completedAt
    }
  });

  try {
    await upsertFinanceRecordForBooking(updated.id);
  } catch (financeError) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: previousStatus,
        completedAt: previousCompletedAt
      }
    });
    throw new CompleteBookingError(
      409,
      financeError instanceof Error
        ? financeError.message
        : "Could not create finance record for completed session"
    );
  }

  return toSummary(updated);
}

export async function uncompleteProfessionalBooking(params: {
  bookingId: string;
  professionalProfileId: string;
}): Promise<CompletedBookingSummary> {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      financeRecord: { select: { payoutLineId: true } }
    }
  });
  const gate = evaluateUncompleteBooking(booking, params.professionalProfileId);
  if (!gate.ok || !booking) {
    throw new CompleteBookingError(gate.ok ? 404 : gate.httpStatus, gate.ok ? "Booking not found" : gate.error);
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BOOKING_STATUS.CONFIRMED,
      completedAt: null
    }
  });

  try {
    await upsertFinanceRecordForBooking(updated.id);
  } catch (financeError) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BOOKING_STATUS.COMPLETED,
        completedAt: booking.completedAt
      }
    });
    throw new CompleteBookingError(
      409,
      financeError instanceof Error
        ? financeError.message
        : "Could not reverse finance record for this session"
    );
  }

  return toSummary(updated);
}

export async function completeProfessionalBookingsBatch(params: {
  bookingIds: string[];
  professionalProfileId: string;
  now?: Date;
}): Promise<{
  completed: CompletedBookingSummary[];
  failed: Array<{ bookingId: string; error: string }>;
}> {
  const now = params.now ?? new Date();
  const bookingIds = uniqueBookingIds(params.bookingIds);
  const completed: CompletedBookingSummary[] = [];
  const failed: Array<{ bookingId: string; error: string }> = [];

  for (const bookingId of bookingIds) {
    try {
      completed.push(
        await completeProfessionalBooking({
          bookingId,
          professionalProfileId: params.professionalProfileId,
          now
        })
      );
    } catch (error) {
      failed.push({
        bookingId,
        error: error instanceof Error ? error.message : "Could not complete booking"
      });
    }
  }

  return { completed, failed };
}

export async function uncompleteProfessionalBookingsBatch(params: {
  bookingIds: string[];
  professionalProfileId: string;
}): Promise<{
  reverted: CompletedBookingSummary[];
  failed: Array<{ bookingId: string; error: string }>;
}> {
  const bookingIds = uniqueBookingIds(params.bookingIds);
  const reverted: CompletedBookingSummary[] = [];
  const failed: Array<{ bookingId: string; error: string }> = [];

  for (const bookingId of bookingIds) {
    try {
      reverted.push(
        await uncompleteProfessionalBooking({
          bookingId,
          professionalProfileId: params.professionalProfileId
        })
      );
    } catch (error) {
      failed.push({
        bookingId,
        error: error instanceof Error ? error.message : "Could not revert booking"
      });
    }
  }

  return { reverted, failed };
}
