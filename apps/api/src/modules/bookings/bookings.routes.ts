import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { LockNotAcquiredError, withDistributedLock } from "../../lib/distributedLock.js";
import { getIdempotencyValue, setIdempotencyValue } from "../../lib/idempotencyStore.js";
import { prisma } from "../../lib/prisma.js";
import { upsertFinanceRecordForBooking } from "../finance/finance.service.js";

const createBookingSchema = z.object({
  professionalId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  patientTimezone: z.string().trim().min(3).max(120).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

const rescheduleBookingSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  patientTimezone: z.string().trim().min(3).max(120).optional(),
  professionalTimezone: z.string().trim().min(3).max(120).optional()
});

const cancelBookingSchema = z.object({
  reason: z.string().min(3).optional(),
  cancelledAt: z.string().datetime().optional()
});
const completeBookingSchema = z.object({
  completedAt: z.string().datetime().optional()
});

const FREE_CANCELLATION_HOURS = 24;
const MIN_BOOKING_NOTICE_HOURS = 24;
const BOOKING_STATUS = {
  REQUESTED: "REQUESTED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW"
} as const;
type BookingWithVideoSession = Prisma.BookingGetPayload<{ include: { videoSession: true } }>;

function resolveMinimumBookingNoticeHours(configuredHours: number | null | undefined): number {
  const safeHours = Number.isFinite(Number(configuredHours)) ? Number(configuredHours) : MIN_BOOKING_NOTICE_HOURS;
  return Math.max(MIN_BOOKING_NOTICE_HOURS, Math.round(safeHours));
}

function hasMinimumBookingNotice(startsAt: Date, minimumHours: number): boolean {
  const minimumStartMs = Date.now() + minimumHours * 60 * 60 * 1000;
  return startsAt.getTime() >= minimumStartMs;
}

function normalizeStatus(status: string): string {
  return status.toLowerCase();
}

function sanitizeTimezone(timezone: string): string {
  const candidate = timezone.trim();
  try {
    Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

function normalizeIdempotencyKey(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 120) {
    return null;
  }

  return normalized;
}

function toIdempotencyStoreKey(scope: string, actorId: string, rawKey: string) {
  return `${scope}:${actorId}:${rawKey}`;
}

async function findAvailableSlotForRange(params: {
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
}) {
  return prisma.availabilitySlot.findFirst({
    where: {
      professionalId: params.professionalId,
      isBlocked: false,
      startsAt: { lte: params.startsAt },
      endsAt: { gte: params.endsAt }
    }
  });
}

async function hasVacationBlockForDay(params: {
  professionalId: string;
  startsAt: Date;
}) {
  const dayStart = new Date(params.startsAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(params.startsAt);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const marker = await prisma.availabilitySlot.findFirst({
    where: {
      professionalId: params.professionalId,
      isBlocked: true,
      source: "vacation",
      startsAt: {
        gte: dayStart,
        lte: dayEnd
      }
    },
    select: {
      id: true
    }
  });

  return Boolean(marker);
}

async function findBookingOverlap(params: {
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  ignoreBookingId?: string;
}) {
  return prisma.booking.findFirst({
    where: {
      professionalId: params.professionalId,
      status: { in: [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED] },
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
      ...(params.ignoreBookingId ? { id: { not: params.ignoreBookingId } } : {})
    }
  });
}

async function findBookingForPatientReplay(bookingId: string, patientId: string) {
  return prisma.booking.findFirst({
    where: {
      id: bookingId,
      patientId
    },
    include: {
      professional: {
        include: {
          user: {
            select: { fullName: true }
          }
        }
      },
      videoSession: true
    }
  });
}

export const bookingsRouter = Router();

bookingsRouter.get("/mine", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  if (actor.role === "PATIENT" && actor.patientProfileId) {
    const bookings = await prisma.booking.findMany({
      where: { patientId: actor.patientProfileId },
      include: {
        professional: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true }
            }
          }
        },
        videoSession: true
      },
      orderBy: { startsAt: "asc" }
    });

    return res.json({
      role: actor.role,
      bookings: bookings.map((booking: any) => ({
        id: booking.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: normalizeStatus(booking.status),
        professionalId: booking.professionalId,
        counterpartName: booking.professional.user.fullName,
        counterpartEmail: booking.professional.user.email,
        joinUrl: booking.videoSession?.joinUrlPatient ?? null,
        joinUrlProfessional: booking.videoSession?.joinUrlProfessional ?? null,
        patientTimezoneAtBooking: booking.patientTimezoneAtBooking,
        professionalTimezoneAtBooking: booking.professionalTimezoneAtBooking,
        createdAt: booking.createdAt
      }))
    });
  }

  if (actor.role === "PROFESSIONAL" && actor.professionalProfileId) {
    const bookings = await prisma.booking.findMany({
      where: { professionalId: actor.professionalProfileId },
      include: {
        patient: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true }
            }
          }
        },
        videoSession: true
      },
      orderBy: { startsAt: "asc" }
    });

    return res.json({
      role: actor.role,
      bookings: bookings.map((booking: any) => ({
        id: booking.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: normalizeStatus(booking.status),
        patientId: booking.patientId,
        counterpartName: booking.patient.user.fullName,
        counterpartEmail: booking.patient.user.email,
        joinUrl: booking.videoSession?.joinUrlProfessional ?? null,
        joinUrlPatient: booking.videoSession?.joinUrlPatient ?? null,
        patientTimezoneAtBooking: booking.patientTimezoneAtBooking,
        professionalTimezoneAtBooking: booking.professionalTimezoneAtBooking,
        createdAt: booking.createdAt
      }))
    });
  }

  return res.json({ role: actor.role, bookings: [] });
});

bookingsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid booking payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can create bookings" });
  }
  const patientProfileId = actor.patientProfileId;

  const rawIdempotencyKey = parsed.data.idempotencyKey ?? req.header("x-idempotency-key") ?? null;
  const idempotencyKey = normalizeIdempotencyKey(rawIdempotencyKey);
  if (rawIdempotencyKey && !idempotencyKey) {
    return res.status(400).json({ error: "Invalid idempotency key. Expected 8-120 characters." });
  }
  const idempotencyStoreKey = idempotencyKey
    ? toIdempotencyStoreKey("booking_create", patientProfileId, idempotencyKey)
    : null;

  if (idempotencyStoreKey) {
    const existingBookingId = await getIdempotencyValue(idempotencyStoreKey);
    if (existingBookingId) {
      const replayBooking = await findBookingForPatientReplay(existingBookingId, patientProfileId);
      if (replayBooking) {
        return res.status(200).json({
          idempotentReplay: true,
          policy: {
            freeCancellationHours: FREE_CANCELLATION_HOURS,
            lateCancellationPenalty: "configurable",
            noShowPenalty: "consume_credit"
          },
          booking: {
            id: replayBooking.id,
            patientId: replayBooking.patientId,
            professionalId: replayBooking.professionalId,
            startsAt: replayBooking.startsAt,
            endsAt: replayBooking.endsAt,
            status: normalizeStatus(replayBooking.status),
            patientTimezoneAtBooking: replayBooking.patientTimezoneAtBooking,
            professionalTimezoneAtBooking: replayBooking.professionalTimezoneAtBooking,
            threadId: null,
            joinUrlPatient: replayBooking.videoSession?.joinUrlPatient ?? null,
            joinUrlProfessional: replayBooking.videoSession?.joinUrlProfessional ?? null,
            professionalName: replayBooking.professional.user.fullName
          }
        });
      }
    }
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (startsAt >= endsAt) {
    return res.status(400).json({ error: "startsAt must be before endsAt" });
  }

  const professional = await prisma.professionalProfile.findUnique({
    where: { id: parsed.data.professionalId },
    include: { user: { select: { fullName: true } } }
  });

  if (!professional) {
    return res.status(404).json({ error: "Professional not found" });
  }

  const minimumBookingNoticeHours = resolveMinimumBookingNoticeHours(professional.cancellationHours);
  if (!hasMinimumBookingNotice(startsAt, minimumBookingNoticeHours)) {
    return res.status(409).json({
      error: `Bookings must be scheduled at least ${minimumBookingNoticeHours} hours in advance.`,
      minimumBookingNoticeHours
    });
  }

  const bookingLockKey = `booking_create:${professional.id}:${startsAt.toISOString()}:${endsAt.toISOString()}`;

  let createdBooking:
    | {
        booking: {
          id: string;
          patientId: string;
          professionalId: string;
          startsAt: Date;
          endsAt: Date;
          status: string;
          patientTimezoneAtBooking: string;
          professionalTimezoneAtBooking: string;
        };
        threadId: string;
        joinUrlPatient: string;
        joinUrlProfessional: string;
      }
    | undefined;

  try {
    createdBooking = await withDistributedLock({
      key: bookingLockKey,
      ttlMs: env.API_BOOKING_LOCK_TTL_MS,
      work: async () => {
        return prisma.$transaction(async (tx) => {
          const blockedByVacation = await hasVacationBlockForDay({
            professionalId: professional.id,
            startsAt
          });
          if (blockedByVacation) {
            throw new Error("VACATION_BLOCKED");
          }

          const matchingAvailability = await tx.availabilitySlot.findFirst({
            where: {
              professionalId: professional.id,
              isBlocked: false,
              startsAt: { lte: startsAt },
              endsAt: { gte: endsAt }
            }
          });

          if (!matchingAvailability) {
            throw new Error("SLOT_UNAVAILABLE");
          }

          const overlap = await tx.booking.findFirst({
            where: {
              professionalId: professional.id,
              status: { in: [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED] },
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt }
            }
          });

          if (overlap) {
            throw new Error("SLOT_OVERLAP");
          }

          const patient = await tx.patientProfile.findUnique({
            where: { id: patientProfileId },
            select: {
              id: true,
              timezone: true,
              lastSeenTimezone: true
            }
          });

          if (!patient) {
            throw new Error("PATIENT_PROFILE_NOT_FOUND");
          }

          const latestPurchase = await tx.patientPackagePurchase.findFirst({
            where: { patientId: patientProfileId },
            orderBy: { purchasedAt: "desc" },
            select: { id: true, remainingCredits: true }
          });
          if (!latestPurchase || latestPurchase.remainingCredits <= 0) {
            throw new Error("NO_AVAILABLE_CREDITS");
          }

          if (parsed.data.patientTimezone) {
            const nextSeenTimezone = sanitizeTimezone(parsed.data.patientTimezone);
            if (nextSeenTimezone !== patient.lastSeenTimezone) {
              await tx.patientProfile.update({
                where: { id: patient.id },
                data: {
                  lastSeenTimezone: nextSeenTimezone
                }
              });
              patient.lastSeenTimezone = nextSeenTimezone;
            }
          }

          const decremented = await tx.patientPackagePurchase.updateMany({
            where: {
              id: latestPurchase.id,
              remainingCredits: { gt: 0 }
            },
            data: {
              remainingCredits: { decrement: 1 }
            }
          });
          if (decremented.count === 0) {
            throw new Error("NO_AVAILABLE_CREDITS");
          }

          const patientTimezoneAtBooking = sanitizeTimezone(patient.lastSeenTimezone ?? patient.timezone ?? "UTC");
          const professionalTimezoneAtBooking = sanitizeTimezone(professional.lastSeenTimezone ?? professional.timezone ?? "UTC");

          const booking = await tx.booking.create({
            data: {
              patientId: patientProfileId,
              professionalId: professional.id,
              patientTimezoneAtBooking,
              professionalTimezoneAtBooking,
              startsAt,
              endsAt,
              status: BOOKING_STATUS.CONFIRMED,
              consumedCredits: 1
            }
          });

          await tx.creditLedger.create({
            data: {
              patientId: patientProfileId,
              bookingId: booking.id,
              type: "SESSION_CONSUMED",
              amount: -1,
              note: `Booking ${booking.id}`
            }
          });

          const existingThread = await tx.chatThread.findFirst({
            where: {
              patientId: patientProfileId,
              professionalId: professional.id
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }]
          });

          const thread =
            existingThread
            ?? (await tx.chatThread.create({
              data: {
                patientId: patientProfileId,
                professionalId: professional.id
              }
            }));

          const roomName = `session-${booking.id}`;
          const domain = env.DAILY_DOMAIN || "https://demo.daily.co";

          const videoSession = await tx.videoSession.create({
            data: {
              bookingId: booking.id,
              provider: "daily",
              externalRoomId: roomName,
              joinUrlPatient: `${domain}/${roomName}?role=patient`,
              joinUrlProfessional: `${domain}/${roomName}?role=professional`
            }
          });

          return {
            booking: {
              id: booking.id,
              patientId: booking.patientId,
              professionalId: booking.professionalId,
              startsAt: booking.startsAt,
              endsAt: booking.endsAt,
              status: booking.status,
              patientTimezoneAtBooking: booking.patientTimezoneAtBooking,
              professionalTimezoneAtBooking: booking.professionalTimezoneAtBooking
            },
            threadId: thread.id,
            joinUrlPatient: videoSession.joinUrlPatient,
            joinUrlProfessional: videoSession.joinUrlProfessional
          };
        });
      }
    });
  } catch (error) {
    if (error instanceof LockNotAcquiredError) {
      return res.status(409).json({
        error: "Another request is booking that slot right now. Please retry."
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (idempotencyStoreKey) {
        const existingBookingId = await getIdempotencyValue(idempotencyStoreKey);
        if (existingBookingId) {
          const replayBooking = await findBookingForPatientReplay(existingBookingId, patientProfileId);
          if (replayBooking) {
            return res.status(200).json({
              idempotentReplay: true,
              policy: {
                freeCancellationHours: FREE_CANCELLATION_HOURS,
                lateCancellationPenalty: "configurable",
                noShowPenalty: "consume_credit"
              },
              booking: {
                id: replayBooking.id,
                patientId: replayBooking.patientId,
                professionalId: replayBooking.professionalId,
                startsAt: replayBooking.startsAt,
                endsAt: replayBooking.endsAt,
                status: normalizeStatus(replayBooking.status),
                patientTimezoneAtBooking: replayBooking.patientTimezoneAtBooking,
                professionalTimezoneAtBooking: replayBooking.professionalTimezoneAtBooking,
                threadId: null,
                joinUrlPatient: replayBooking.videoSession?.joinUrlPatient ?? null,
                joinUrlProfessional: replayBooking.videoSession?.joinUrlProfessional ?? null,
                professionalName: replayBooking.professional.user.fullName
              }
            });
          }
        }
      }

      return res.status(409).json({ error: "Professional already booked at that time" });
    }

    if (error instanceof Error) {
      if (error.message === "SLOT_UNAVAILABLE") {
        return res.status(409).json({ error: "Selected time is no longer available" });
      }
      if (error.message === "VACATION_BLOCKED") {
        return res.status(409).json({ error: "This day is blocked by vacation." });
      }
      if (error.message === "SLOT_OVERLAP") {
        return res.status(409).json({ error: "Professional already booked at that time" });
      }
      if (error.message === "PATIENT_PROFILE_NOT_FOUND") {
        return res.status(404).json({ error: "Patient profile not found" });
      }
      if (error.message === "NO_AVAILABLE_CREDITS") {
        return res.status(402).json({ error: "No available session credits. Purchase a package to continue." });
      }
    }

    throw error;
  }

  if (!createdBooking) {
    return res.status(500).json({ error: "Booking could not be created" });
  }

  if (idempotencyStoreKey) {
    await setIdempotencyValue({
      key: idempotencyStoreKey,
      value: createdBooking.booking.id,
      ttlSeconds: 24 * 60 * 60
    });
  }

  return res.status(201).json({
    policy: {
      freeCancellationHours: FREE_CANCELLATION_HOURS,
      lateCancellationPenalty: "configurable",
      noShowPenalty: "consume_credit"
    },
    booking: {
      id: createdBooking.booking.id,
      patientId: createdBooking.booking.patientId,
      professionalId: createdBooking.booking.professionalId,
      startsAt: createdBooking.booking.startsAt,
      endsAt: createdBooking.booking.endsAt,
      status: normalizeStatus(createdBooking.booking.status),
      patientTimezoneAtBooking: createdBooking.booking.patientTimezoneAtBooking,
      professionalTimezoneAtBooking: createdBooking.booking.professionalTimezoneAtBooking,
      threadId: createdBooking.threadId,
      joinUrlPatient: createdBooking.joinUrlPatient,
      joinUrlProfessional: createdBooking.joinUrlProfessional,
      professionalName: professional.user.fullName
    }
  });
});

bookingsRouter.post("/:bookingId/reschedule", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = rescheduleBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid reschedule payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.bookingId },
    include: { videoSession: true }
  });

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const canRescheduleAsPatient = actor.patientProfileId && booking.patientId === actor.patientProfileId;
  const canRescheduleAsProfessional = actor.professionalProfileId && booking.professionalId === actor.professionalProfileId;

  if (!canRescheduleAsPatient && !canRescheduleAsProfessional) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.COMPLETED) {
    return res.status(409).json({ error: "Booking cannot be rescheduled in its current state" });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (startsAt >= endsAt) {
    return res.status(400).json({ error: "startsAt must be before endsAt" });
  }

  if (canRescheduleAsPatient) {
    const professionalConfig = await prisma.professionalProfile.findUnique({
      where: { id: booking.professionalId },
      select: { cancellationHours: true }
    });
    const minimumBookingNoticeHours = resolveMinimumBookingNoticeHours(professionalConfig?.cancellationHours);
    if (!hasMinimumBookingNotice(startsAt, minimumBookingNoticeHours)) {
      return res.status(409).json({
        error: `Bookings must be rescheduled at least ${minimumBookingNoticeHours} hours in advance.`,
        minimumBookingNoticeHours
      });
    }
  }

  const lockKey = `booking_reschedule:${booking.professionalId}:${startsAt.toISOString()}:${endsAt.toISOString()}`;

  let updated: BookingWithVideoSession;
  try {
    updated = await withDistributedLock({
      key: lockKey,
      ttlMs: env.API_BOOKING_LOCK_TTL_MS,
      work: async () => {
        const blockedByVacation = await hasVacationBlockForDay({
          professionalId: booking.professionalId,
          startsAt
        });
        if (blockedByVacation) {
          throw new Error("VACATION_BLOCKED");
        }

        const matchingAvailability = await findAvailableSlotForRange({
          professionalId: booking.professionalId,
          startsAt,
          endsAt
        });

        if (!matchingAvailability) {
          throw new Error("SLOT_UNAVAILABLE");
        }

        const overlap = await findBookingOverlap({
          professionalId: booking.professionalId,
          startsAt,
          endsAt,
          ignoreBookingId: booking.id
        });

        if (overlap) {
          throw new Error("SLOT_OVERLAP");
        }

        if (canRescheduleAsPatient && parsed.data.patientTimezone) {
          await prisma.patientProfile.update({
            where: { id: booking.patientId },
            data: {
              lastSeenTimezone: sanitizeTimezone(parsed.data.patientTimezone)
            }
          });
        }

        if (canRescheduleAsProfessional && parsed.data.professionalTimezone) {
          await prisma.professionalProfile.update({
            where: { id: booking.professionalId },
            data: {
              lastSeenTimezone: sanitizeTimezone(parsed.data.professionalTimezone)
            }
          });
        }

        const [patientProfile, professionalProfile] = await Promise.all([
          prisma.patientProfile.findUnique({
            where: { id: booking.patientId },
            select: { timezone: true, lastSeenTimezone: true }
          }),
          prisma.professionalProfile.findUnique({
            where: { id: booking.professionalId },
            select: { timezone: true, lastSeenTimezone: true }
          })
        ]);

        const patientTimezoneAtBooking = sanitizeTimezone(patientProfile?.lastSeenTimezone ?? patientProfile?.timezone ?? "UTC");
        const professionalTimezoneAtBooking = sanitizeTimezone(
          professionalProfile?.lastSeenTimezone ?? professionalProfile?.timezone ?? "UTC"
        );

        return prisma.booking.update({
          where: { id: booking.id },
          data: {
            startsAt,
            endsAt,
            patientTimezoneAtBooking,
            professionalTimezoneAtBooking,
            cancelledAt: null,
            cancellationReason: null
          },
          include: {
            videoSession: true
          }
        });
      }
    });
  } catch (error) {
    if (error instanceof LockNotAcquiredError) {
      return res.status(409).json({
        error: "Another request is updating that slot right now. Please retry."
      });
    }
    if (error instanceof Error && error.message === "SLOT_UNAVAILABLE") {
      return res.status(409).json({ error: "Selected time is no longer available" });
    }
    if (error instanceof Error && error.message === "VACATION_BLOCKED") {
      return res.status(409).json({ error: "This day is blocked by vacation." });
    }
    if (error instanceof Error && error.message === "SLOT_OVERLAP") {
      return res.status(409).json({ error: "Professional already booked at that time" });
    }
    throw error;
  }

  return res.json({
    message: "Booking rescheduled",
    booking: {
      id: updated.id,
      patientId: updated.patientId,
      professionalId: updated.professionalId,
      startsAt: updated.startsAt,
      endsAt: updated.endsAt,
      status: normalizeStatus(updated.status),
      patientTimezoneAtBooking: updated.patientTimezoneAtBooking,
      professionalTimezoneAtBooking: updated.professionalTimezoneAtBooking,
      joinUrlPatient: updated.videoSession?.joinUrlPatient ?? null,
      joinUrlProfessional: updated.videoSession?.joinUrlProfessional ?? null
    }
  });
});

bookingsRouter.post("/:bookingId/cancel", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = cancelBookingSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid cancellation payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const canCancelAsPatient = actor.patientProfileId && booking.patientId === actor.patientProfileId;
  const canCancelAsProfessional = actor.professionalProfileId && booking.professionalId === actor.professionalProfileId;

  if (!canCancelAsPatient && !canCancelAsProfessional) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return res.status(409).json({ error: "Booking already cancelled" });
  }

  const cancelledAt = parsed.data.cancelledAt ? new Date(parsed.data.cancelledAt) : new Date();
  const hoursBeforeSession = (booking.startsAt.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
  const shouldRefundCredits = booking.consumedCredits > 0 && hoursBeforeSession >= FREE_CANCELLATION_HOURS;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BOOKING_STATUS.CANCELLED,
        cancellationReason: parsed.data.reason ?? null,
        cancelledAt
      }
    });

    if (shouldRefundCredits) {
      const latestPurchase = await tx.patientPackagePurchase.findFirst({
        where: { patientId: booking.patientId },
        orderBy: { purchasedAt: "desc" },
        select: { id: true }
      });

      if (latestPurchase) {
        await tx.patientPackagePurchase.update({
          where: { id: latestPurchase.id },
          data: {
            remainingCredits: { increment: booking.consumedCredits }
          }
        });
      }

      await tx.creditLedger.create({
        data: {
          patientId: booking.patientId,
          bookingId: booking.id,
          type: "SESSION_REFUND",
          amount: booking.consumedCredits,
          note: `Booking ${booking.id} cancelled with refund`
        }
      });
    }

    return updatedBooking;
  });

  return res.json({
    message: "Booking cancelled",
    bookingId: updated.id,
    appliedPolicy: hoursBeforeSession >= FREE_CANCELLATION_HOURS ? "24h_free_cancellation" : "late_cancellation",
    refundedCredits: shouldRefundCredits ? booking.consumedCredits : 0,
    freeCancellationHours: FREE_CANCELLATION_HOURS,
    status: normalizeStatus(updated.status)
  });
});

bookingsRouter.post("/:bookingId/complete", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = completeBookingSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid completion payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can mark sessions as completed" });
  }

  const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.professionalId !== actor.professionalProfileId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.NO_SHOW) {
    return res.status(409).json({ error: "Booking cannot be completed in its current state" });
  }

  if (booking.status === BOOKING_STATUS.COMPLETED) {
    return res.status(409).json({ error: "Booking already completed" });
  }

  const now = new Date();
  if (booking.startsAt.getTime() > now.getTime()) {
    return res.status(409).json({ error: "Booking has not started yet" });
  }

  const completedAt = parsed.data.completedAt ? new Date(parsed.data.completedAt) : now;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BOOKING_STATUS.COMPLETED,
      completedAt
    }
  });

  await upsertFinanceRecordForBooking(updated.id);

  return res.json({
    message: "Booking marked as completed",
    booking: {
      id: updated.id,
      startsAt: updated.startsAt,
      endsAt: updated.endsAt,
      status: normalizeStatus(updated.status),
      completedAt: updated.completedAt
    }
  });
});
