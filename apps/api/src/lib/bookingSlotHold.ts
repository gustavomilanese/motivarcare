import { randomUUID } from "node:crypto";
import { LockNotAcquiredError, withDistributedLock } from "./distributedLock.js";
import { deleteIdempotencyValue, getIdempotencyValue, setIdempotencyValue } from "./idempotencyStore.js";
import { prisma } from "./prisma.js";

export const BOOKING_SLOT_HOLD_TTL_SECONDS = 10 * 60;

const ACTIVE_BOOKING_STATUSES = ["REQUESTED", "CONFIRMED"] as const;
const MIN_BOOKING_NOTICE_HOURS = 24;

export type BookingSlotHold = {
  holdId: string;
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
};

export class SlotHoldError extends Error {
  constructor(
    message: string,
    readonly code:
      | "SLOT_UNAVAILABLE"
      | "SLOT_ALREADY_BOOKED"
      | "SLOT_HELD_BY_ANOTHER"
      | "HOLD_NOT_FOUND"
      | "HOLD_EXPIRED"
      | "HOLD_MISMATCH"
  ) {
    super(message);
    this.name = "SlotHoldError";
  }
}

function slotIdentityKey(professionalId: string, startsAt: string, endsAt: string): string {
  return `${professionalId}|${startsAt}|${endsAt}`;
}

function holdBySlotStoreKey(identity: string): string {
  return `booking-slot-hold:slot:${identity}`;
}

function holdByIdStoreKey(holdId: string): string {
  return `booking-slot-hold:id:${holdId}`;
}

function parseHold(raw: string | null): BookingSlotHold | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as BookingSlotHold;
  } catch {
    return null;
  }
}

function isHoldActive(hold: BookingSlotHold): boolean {
  return Date.parse(hold.expiresAt) > Date.now();
}

async function assertSlotBookable(params: {
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<void> {
  if (params.startsAt >= params.endsAt) {
    throw new SlotHoldError("Invalid slot range", "SLOT_UNAVAILABLE");
  }

  const professional = await prisma.professionalProfile.findUnique({
    where: { id: params.professionalId },
    select: { id: true, cancellationHours: true }
  });
  if (!professional) {
    throw new SlotHoldError("Professional not found", "SLOT_UNAVAILABLE");
  }

  const configuredHours = Number.isFinite(Number(professional.cancellationHours))
    ? Number(professional.cancellationHours)
    : MIN_BOOKING_NOTICE_HOURS;
  const minimumBookingNoticeHours = Math.max(MIN_BOOKING_NOTICE_HOURS, Math.round(configuredHours));
  const earliestBookableMs = Date.now() + minimumBookingNoticeHours * 60 * 60 * 1000;
  if (params.startsAt.getTime() < earliestBookableMs) {
    throw new SlotHoldError("Selected time is no longer available", "SLOT_UNAVAILABLE");
  }

  const vacationDay = await prisma.availabilitySlot.findFirst({
    where: {
      professionalId: params.professionalId,
      isBlocked: true,
      source: "vacation",
      startsAt: {
        gte: new Date(params.startsAt.toISOString().slice(0, 10)),
        lt: new Date(new Date(params.startsAt.toISOString().slice(0, 10)).getTime() + 24 * 60 * 60 * 1000)
      }
    },
    select: { id: true }
  });
  if (vacationDay) {
    throw new SlotHoldError("This day is blocked by vacation", "SLOT_UNAVAILABLE");
  }

  const matchingAvailability = await prisma.availabilitySlot.findFirst({
    where: {
      professionalId: params.professionalId,
      isBlocked: false,
      startsAt: { lte: params.startsAt },
      endsAt: { gte: params.endsAt }
    },
    select: { id: true }
  });
  if (!matchingAvailability) {
    throw new SlotHoldError("Selected time is no longer available", "SLOT_UNAVAILABLE");
  }

  const overlap = await prisma.booking.findFirst({
    where: {
      professionalId: params.professionalId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt }
    },
    select: { id: true }
  });
  if (overlap) {
    throw new SlotHoldError("Professional already booked at that time", "SLOT_ALREADY_BOOKED");
  }
}

export async function acquireBookingSlotHold(params: {
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
}): Promise<BookingSlotHold> {
  const startsAt = new Date(params.startsAt);
  const endsAt = new Date(params.endsAt);
  const identity = slotIdentityKey(params.professionalId, params.startsAt, params.endsAt);
  const lockKey = `booking-slot-hold-acquire:${identity}`;

  try {
    return await withDistributedLock({
      key: lockKey,
      ttlMs: 8_000,
      work: async () => {
        await assertSlotBookable({
          professionalId: params.professionalId,
          startsAt,
          endsAt
        });

        const existingRaw = await getIdempotencyValue(holdBySlotStoreKey(identity));
        const existing = parseHold(existingRaw);
        if (existing && isHoldActive(existing) && existing.patientId !== params.patientId) {
          throw new SlotHoldError(
            "Another patient is completing checkout for this time",
            "SLOT_HELD_BY_ANOTHER"
          );
        }

        const holdId = existing?.patientId === params.patientId && existing?.holdId ? existing.holdId : randomUUID();
        const expiresAt = new Date(Date.now() + BOOKING_SLOT_HOLD_TTL_SECONDS * 1000).toISOString();
        const hold: BookingSlotHold = {
          holdId,
          patientId: params.patientId,
          professionalId: params.professionalId,
          startsAt: params.startsAt,
          endsAt: params.endsAt,
          expiresAt
        };

        await setIdempotencyValue({
          key: holdBySlotStoreKey(identity),
          value: JSON.stringify(hold),
          ttlSeconds: BOOKING_SLOT_HOLD_TTL_SECONDS
        });
        await setIdempotencyValue({
          key: holdByIdStoreKey(holdId),
          value: identity,
          ttlSeconds: BOOKING_SLOT_HOLD_TTL_SECONDS
        });

        return hold;
      }
    });
  } catch (error) {
    if (error instanceof SlotHoldError) {
      throw error;
    }
    if (error instanceof LockNotAcquiredError) {
      throw new SlotHoldError(
        "Another request is reserving that slot right now. Please retry.",
        "SLOT_HELD_BY_ANOTHER"
      );
    }
    throw error;
  }
}

export async function loadBookingSlotHold(holdId: string): Promise<BookingSlotHold | null> {
  const identity = await getIdempotencyValue(holdByIdStoreKey(holdId));
  if (!identity) {
    return null;
  }
  const hold = parseHold(await getIdempotencyValue(holdBySlotStoreKey(identity)));
  if (!hold || hold.holdId !== holdId) {
    return null;
  }
  if (!isHoldActive(hold)) {
    return null;
  }
  return hold;
}

export async function requireBookingSlotHoldForPatient(params: {
  holdId: string;
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
}): Promise<BookingSlotHold> {
  const hold = await loadBookingSlotHold(params.holdId);
  if (!hold) {
    throw new SlotHoldError("Slot hold expired or not found", "HOLD_EXPIRED");
  }
  if (hold.patientId !== params.patientId) {
    throw new SlotHoldError("Slot hold does not belong to this patient", "HOLD_MISMATCH");
  }
  if (
    hold.professionalId !== params.professionalId
    || hold.startsAt !== params.startsAt
    || hold.endsAt !== params.endsAt
  ) {
    throw new SlotHoldError("Slot hold does not match checkout details", "HOLD_MISMATCH");
  }

  await assertSlotBookable({
    professionalId: params.professionalId,
    startsAt: new Date(params.startsAt),
    endsAt: new Date(params.endsAt)
  });

  return hold;
}

export const BOOKING_SLOT_HOLD_CHECKOUT_TTL_SECONDS = 15 * 60;

export async function extendBookingSlotHold(holdId: string, patientId: string): Promise<BookingSlotHold | null> {
  const hold = await loadBookingSlotHold(holdId);
  if (!hold || hold.patientId !== patientId) {
    return null;
  }

  const identity = slotIdentityKey(hold.professionalId, hold.startsAt, hold.endsAt);
  const expiresAt = new Date(Date.now() + BOOKING_SLOT_HOLD_CHECKOUT_TTL_SECONDS * 1000).toISOString();
  const refreshed: BookingSlotHold = { ...hold, expiresAt };

  await setIdempotencyValue({
    key: holdBySlotStoreKey(identity),
    value: JSON.stringify(refreshed),
    ttlSeconds: BOOKING_SLOT_HOLD_CHECKOUT_TTL_SECONDS
  });
  await setIdempotencyValue({
    key: holdByIdStoreKey(holdId),
    value: identity,
    ttlSeconds: BOOKING_SLOT_HOLD_CHECKOUT_TTL_SECONDS
  });

  return refreshed;
}

export async function releaseBookingSlotHold(holdId: string, patientId: string): Promise<void> {
  const identity = await getIdempotencyValue(holdByIdStoreKey(holdId));
  if (!identity) {
    return;
  }
  const hold = parseHold(await getIdempotencyValue(holdBySlotStoreKey(identity)));
  if (!hold || hold.patientId !== patientId) {
    return;
  }
  await deleteIdempotencyValue(holdBySlotStoreKey(identity));
  await deleteIdempotencyValue(holdByIdStoreKey(holdId));
}
