import { BookingStatus } from "@prisma/client";
import {
  MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW,
  type PendingProfessionalReviewPrompt,
  type ProfessionalReviewPublicItem,
  type ProfessionalReviewStats
} from "@therapy/types";
import {
  professionalPublicListingLabel,
  resolvedFirstLastFromUserRecord
} from "@therapy/types";
import { prisma } from "../../lib/prisma.js";

export { MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW };

export class ProfessionalReviewError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "BAD_REQUEST",
    message: string
  ) {
    super(message);
    this.name = "ProfessionalReviewError";
  }
}

function roundRatingAverage(value: number): number {
  return Math.round(value * 10) / 10;
}

function anonymizedPatientLabel(params: {
  firstName: string;
  lastName: string;
  fullName: string;
}): string {
  const parts = resolvedFirstLastFromUserRecord(params);
  const initial = parts.lastName.trim().charAt(0);
  if (parts.firstName && initial) {
    return `${parts.firstName.trim()} ${initial.toUpperCase()}.`;
  }
  return professionalPublicListingLabel({
    firstName: parts.firstName,
    lastName: parts.lastName,
    fullNameLegacy: params.fullName
  });
}

export async function getReviewStatsByProfessionalIds(
  professionalIds: string[]
): Promise<Map<string, ProfessionalReviewStats>> {
  if (professionalIds.length === 0) {
    return new Map();
  }

  const groups = await prisma.professionalReview.groupBy({
    by: ["professionalId"],
    where: { professionalId: { in: professionalIds } },
    _avg: { rating: true },
    _count: { _all: true }
  });

  return new Map(
    groups.map((row) => [
      row.professionalId,
      {
        averageRating:
          row._count._all > 0 && row._avg.rating != null
            ? roundRatingAverage(row._avg.rating)
            : null,
        reviewCount: row._count._all
      }
    ])
  );
}

export async function listProfessionalReviews(params: {
  professionalId: string;
  limit: number;
  offset: number;
}): Promise<{ reviews: ProfessionalReviewPublicItem[]; stats: ProfessionalReviewStats }> {
  const professional = await prisma.professionalProfile.findUnique({
    where: { id: params.professionalId },
    select: { id: true }
  });
  if (!professional) {
    throw new ProfessionalReviewError("NOT_FOUND", "Professional not found");
  }

  const [reviews, statsMap] = await Promise.all([
    prisma.professionalReview.findMany({
      where: { professionalId: params.professionalId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit,
      skip: params.offset,
      include: {
        patient: {
          include: {
            user: {
              select: {
                fullName: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    }),
    getReviewStatsByProfessionalIds([params.professionalId])
  ]);

  return {
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      patientLabel: anonymizedPatientLabel({
        firstName: review.patient.user.firstName,
        lastName: review.patient.user.lastName,
        fullName: review.patient.user.fullName
      })
    })),
    stats: statsMap.get(params.professionalId) ?? { averageRating: null, reviewCount: 0 }
  };
}

async function completedSessionsCount(patientId: string, professionalId: string): Promise<number> {
  return prisma.booking.count({
    where: {
      patientId,
      professionalId,
      status: BookingStatus.COMPLETED
    }
  });
}

async function latestCompletedBookingId(
  patientId: string,
  professionalId: string
): Promise<string | null> {
  const booking = await prisma.booking.findFirst({
    where: {
      patientId,
      professionalId,
      status: BookingStatus.COMPLETED
    },
    orderBy: [{ completedAt: "desc" }, { startsAt: "desc" }],
    select: { id: true }
  });
  return booking?.id ?? null;
}

export async function getPendingProfessionalReviewForPatient(params: {
  patientId: string;
  assignedProfessionalId?: string | null;
}): Promise<PendingProfessionalReviewPrompt | null> {
  const pairs = await prisma.booking.groupBy({
    by: ["professionalId"],
    where: {
      patientId: params.patientId,
      status: BookingStatus.COMPLETED
    },
    _count: { _all: true }
  });

  const eligibleProfessionalIds = pairs
    .filter((row) => row._count._all >= MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW)
    .map((row) => row.professionalId);

  if (eligibleProfessionalIds.length === 0) {
    return null;
  }

  const existingReviews = await prisma.professionalReview.findMany({
    where: {
      patientId: params.patientId,
      professionalId: { in: eligibleProfessionalIds }
    },
    select: { professionalId: true }
  });
  const reviewedIds = new Set(existingReviews.map((row) => row.professionalId));
  const pendingIds = eligibleProfessionalIds.filter((id) => !reviewedIds.has(id));
  if (pendingIds.length === 0) {
    return null;
  }

  const assignedId = params.assignedProfessionalId?.trim() ?? "";
  let targetProfessionalId = assignedId && pendingIds.includes(assignedId) ? assignedId : pendingIds[0];

  if (!assignedId || !pendingIds.includes(assignedId)) {
    const latestByPro = await Promise.all(
      pendingIds.map(async (professionalId) => {
        const booking = await prisma.booking.findFirst({
          where: {
            patientId: params.patientId,
            professionalId,
            status: BookingStatus.COMPLETED
          },
          orderBy: [{ completedAt: "desc" }, { startsAt: "desc" }],
          select: { completedAt: true, startsAt: true }
        });
        const sortAt = (booking?.completedAt ?? booking?.startsAt)?.getTime() ?? 0;
        return { professionalId, sortAt };
      })
    );
    latestByPro.sort((a, b) => b.sortAt - a.sortAt);
    targetProfessionalId = latestByPro[0]?.professionalId ?? targetProfessionalId;
  }

  const professional = await prisma.professionalProfile.findUnique({
    where: { id: targetProfessionalId },
    include: {
      user: {
        select: {
          fullName: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });
  if (!professional) {
    return null;
  }

  const nameParts = resolvedFirstLastFromUserRecord({
    firstName: professional.user.firstName,
    lastName: professional.user.lastName,
    fullName: professional.user.fullName
  });

  const completedSessionsCountValue = await completedSessionsCount(params.patientId, targetProfessionalId);
  const triggerBookingId = await latestCompletedBookingId(params.patientId, targetProfessionalId);

  return {
    professionalId: targetProfessionalId,
    professionalName: professionalPublicListingLabel({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      fullNameLegacy: professional.user.fullName
    }),
    completedSessionsCount: completedSessionsCountValue,
    triggerBookingId
  };
}

export async function createProfessionalReview(params: {
  patientId: string;
  professionalId: string;
  rating: number;
  comment?: string | null;
  bookingId?: string | null;
}): Promise<{ id: string; createdAt: string }> {
  const professional = await prisma.professionalProfile.findUnique({
    where: { id: params.professionalId },
    select: { id: true }
  });
  if (!professional) {
    throw new ProfessionalReviewError("NOT_FOUND", "Professional not found");
  }

  const existing = await prisma.professionalReview.findUnique({
    where: {
      patientId_professionalId: {
        patientId: params.patientId,
        professionalId: params.professionalId
      }
    },
    select: { id: true }
  });
  if (existing) {
    throw new ProfessionalReviewError("CONFLICT", "You already reviewed this professional");
  }

  const completedCount = await completedSessionsCount(params.patientId, params.professionalId);
  if (completedCount < MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW) {
    throw new ProfessionalReviewError(
      "BAD_REQUEST",
      `At least ${MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW} completed sessions are required before leaving a review`
    );
  }

  let bookingId = params.bookingId?.trim() || null;
  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, patientId: true, professionalId: true, status: true }
    });
    if (
      !booking
      || booking.patientId !== params.patientId
      || booking.professionalId !== params.professionalId
      || booking.status !== BookingStatus.COMPLETED
    ) {
      bookingId = null;
    }
  }
  if (!bookingId) {
    bookingId = await latestCompletedBookingId(params.patientId, params.professionalId);
  }

  const comment = params.comment?.trim() ? params.comment.trim() : null;

  const created = await prisma.professionalReview.create({
    data: {
      patientId: params.patientId,
      professionalId: params.professionalId,
      bookingId,
      rating: params.rating,
      comment
    },
    select: { id: true, createdAt: true }
  });

  return {
    id: created.id,
    createdAt: created.createdAt.toISOString()
  };
}
