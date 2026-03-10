import { Router } from "express";
import { z } from "zod";
import { hashPassword, requireAuth, requireRole } from "../../lib/auth.js";
import { prisma } from "../../lib/prisma.js";

const appRoleSchema = z.enum(["PATIENT", "PROFESSIONAL", "ADMIN"]);
const patientStatusSchema = z.enum(["active", "pause", "cancelled", "trial"]);

const listUsersQuerySchema = z.object({
  role: appRoleSchema.optional(),
  search: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8).max(120),
  role: appRoleSchema,
  timezone: z.string().min(2).max(80).optional(),
  patientStatus: patientStatusSchema.optional(),
  professionalVisible: z.boolean().optional(),
  professionalCancellationHours: z.number().int().min(0).max(168).optional(),
  professionalBio: z.string().max(2000).optional(),
  professionalTherapeuticApproach: z.string().max(500).optional(),
  professionalYearsExperience: z.number().int().min(0).max(80).optional(),
  professionalPhotoUrl: z.string().url().nullable().optional(),
  professionalVideoUrl: z.string().url().nullable().optional()
});

const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(120).optional(),
    patientStatus: patientStatusSchema.optional(),
    patientTimezone: z.string().min(2).max(80).optional(),
    professionalVisible: z.boolean().optional(),
    professionalCancellationHours: z.number().int().min(0).max(168).optional(),
    professionalBio: z.string().max(2000).optional(),
    professionalTherapeuticApproach: z.string().max(500).optional(),
    professionalYearsExperience: z.number().int().min(0).max(80).optional(),
    professionalPhotoUrl: z.string().url().nullable().optional(),
    professionalVideoUrl: z.string().url().nullable().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

const LANDING_SETTINGS_KEY = "landing-settings";
const WEB_REVIEWS_KEY = "landing-web-reviews";
const WEB_BLOG_POSTS_KEY = "landing-web-blog-posts";
const PATIENT_ACTIVE_ASSIGNMENTS_KEY = "patient-active-assignments";
const SESSION_PACKAGES_VISIBILITY_KEY = "session-packages-visibility";
const blogStatusSchema = z.enum(["draft", "published"]);

const imageSourceSchema = z
  .string()
  .trim()
  .max(20_000_000)
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "Invalid image source"
  });

const landingSettingsSchema = z.object({
  patientHeroImageUrl: imageSourceSchema.nullable(),
  patientDesktopImageUrl: imageSourceSchema.nullable().optional(),
  patientMobileImageUrl: imageSourceSchema.nullable().optional(),
  professionalDesktopImageUrl: imageSourceSchema.nullable().optional(),
  professionalMobileImageUrl: imageSourceSchema.nullable().optional()
});

const reviewSchema = z.object({
  id: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  role: z.string().min(2).max(80),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  relativeDate: z.string().min(2).max(80),
  text: z.string().min(5).max(2000),
  rating: z.number().int().min(1).max(5),
  avatar: imageSourceSchema,
  accent: z.string().trim().min(4).max(32).optional()
});

const reviewCreateSchema = reviewSchema.omit({ id: true });
const reviewUpdateSchema = reviewCreateSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field is required"
});
const reviewsCollectionSchema = z.array(reviewSchema);

const blogPostSchema = z.object({
  id: z.string().min(2).max(120),
  title: z.string().min(5).max(200),
  subtitle: z.string().max(240).optional(),
  slug: z.string().min(3).max(160),
  excerpt: z.string().min(10).max(600),
  category: z.string().min(2).max(80),
  coverImage: imageSourceSchema,
  authorName: z.string().min(2).max(120),
  authorRole: z.string().min(2).max(120),
  authorAvatar: imageSourceSchema,
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  readTime: z.number().int().min(1).max(120),
  likes: z.number().int().min(0).max(1_000_000),
  tags: z.array(z.string().min(1).max(48)).max(24),
  status: blogStatusSchema,
  featured: z.boolean(),
  seoTitle: z.string().min(10).max(220),
  seoDescription: z.string().min(20).max(320),
  body: z.string().min(80).max(100_000)
});

const blogPostCreateSchema = blogPostSchema.omit({ id: true });
const blogPostUpdateSchema = blogPostCreateSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field is required"
});
const blogPostsCollectionSchema = z.array(blogPostSchema);
const bookingStatusSchema = z.enum(["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]);

const listPackagesQuerySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
  professionalId: z.string().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional()
});

const createPackageSchema = z.object({
  professionalId: z.string().min(1).nullable().optional(),
  stripePriceId: z.string().trim().min(2).max(120).optional(),
  name: z.string().trim().min(2).max(120),
  credits: z.number().int().min(1).max(200),
  priceCents: z.number().int().min(1).max(100000000),
  discountPercent: z.number().int().min(0).max(100).default(0),
  currency: z.string().trim().min(2).max(8).default("usd"),
  active: z.boolean().default(true)
});

const updatePackageSchema = z
  .object({
    professionalId: z.string().min(1).nullable().optional(),
    stripePriceId: z.string().trim().min(2).max(120).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    credits: z.number().int().min(1).max(200).optional(),
    priceCents: z.number().int().min(1).max(100000000).optional(),
    discountPercent: z.number().int().min(0).max(100).optional(),
    currency: z.string().trim().min(2).max(8).optional(),
    active: z.boolean().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

const sessionPackagesVisibilitySchema = z.object({
  landing: z.array(z.string().min(1)).max(3),
  patient: z.array(z.string().min(1)).max(3),
  featuredLanding: z.string().min(1).nullable().optional(),
  featuredPatient: z.string().min(1).nullable().optional()
});

const listBookingsQuerySchema = z.object({
  status: bookingStatusSchema.optional(),
  patientId: z.string().min(1).optional(),
  professionalId: z.string().min(1).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const updateBookingSchema = z
  .object({
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    status: bookingStatusSchema.optional(),
    professionalId: z.string().min(1).optional(),
    patientId: z.string().min(1).optional(),
    cancellationReason: z.string().trim().max(400).nullable().optional(),
    consumedCredits: z.number().int().min(0).max(100).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

const listProfessionalsQuerySchema = z.object({
  visible: z.enum(["true", "false"]).optional(),
  search: z.string().trim().min(1).max(120).optional()
});

const updateProfessionalSchema = z
  .object({
    visible: z.boolean().optional(),
    cancellationHours: z.number().int().min(0).max(168).optional(),
    bio: z.string().trim().max(2000).nullable().optional(),
    therapeuticApproach: z.string().trim().max(500).nullable().optional(),
    yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
    photoUrl: z.string().url().nullable().optional(),
    videoUrl: z.string().url().nullable().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

const createAvailabilitySlotSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isBlocked: z.boolean().optional(),
  source: z.string().trim().min(2).max(80).optional()
});

const listPatientsQuerySchema = z.object({
  status: patientStatusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});

const creditAdjustmentSchema = z.object({
  amount: z.number().int().min(-100).max(100).refine((value) => value !== 0, "amount must not be 0"),
  note: z.string().trim().max(300).optional()
});

const patientActiveProfessionalSchema = z.object({
  professionalId: z.string().min(1).nullable()
});

const patientSessionsAvailableSchema = z.object({
  remainingCredits: z.number().int().min(0),
  reason: z.string().trim().max(200).optional()
});

const patientSessionsContractedSchema = z.object({
  totalCredits: z.number().int().min(0),
  reason: z.string().trim().max(200).optional()
});

const patientAssignmentsSchema = z.record(z.string(), z.string().min(1).nullable());

type AdminUserRecord = {
  id: string;
  email: string;
  fullName: string;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    timezone: string;
    status: string;
  } | null;
  professional: {
    id: string;
    visible: boolean;
    cancellationHours: number;
    bio: string | null;
    therapeuticApproach: string | null;
    yearsExperience: number | null;
    photoUrl: string | null;
    videoUrl: string | null;
  } | null;
  admin: {
    id: string;
  } | null;
};

function shapeAdminUser(user: AdminUserRecord) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    patientProfile: user.patient
      ? {
          id: user.patient.id,
          timezone: user.patient.timezone,
          status: user.patient.status
        }
      : null,
    professionalProfile: user.professional
      ? {
          id: user.professional.id,
          visible: user.professional.visible,
          cancellationHours: user.professional.cancellationHours,
          bio: user.professional.bio,
          therapeuticApproach: user.professional.therapeuticApproach,
          yearsExperience: user.professional.yearsExperience,
          photoUrl: user.professional.photoUrl,
          videoUrl: user.professional.videoUrl
        }
      : null,
    adminProfile: user.admin
      ? {
          id: user.admin.id
        }
      : null
  };
}

function parseSessionPackagesVisibility(value: unknown) {
  const parsed = sessionPackagesVisibilitySchema.safeParse(value);
  if (!parsed.success) {
    return { landing: [] as string[], patient: [] as string[], featuredLanding: null as string | null, featuredPatient: null as string | null };
  }

  const landing = Array.from(new Set(parsed.data.landing));
  const patient = Array.from(new Set(parsed.data.patient));

  return {
    landing,
    patient,
    featuredLanding: parsed.data.featuredLanding && landing.includes(parsed.data.featuredLanding) ? parsed.data.featuredLanding : null,
    featuredPatient: parsed.data.featuredPatient && patient.includes(parsed.data.featuredPatient) ? parsed.data.featuredPatient : null
  };
}

function buildId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePatientAssignments(value: unknown): Record<string, string | null> {
  const parsed = patientAssignmentsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

async function ensureLatestPurchaseForPatient(patientId: string) {
  const latestPurchase = await prisma.patientPackagePurchase.findFirst({
    where: { patientId },
    include: { sessionPackage: { select: { id: true, name: true } } },
    orderBy: { purchasedAt: "desc" }
  });

  if (latestPurchase) {
    return latestPurchase;
  }

  const fallbackPackage =
    (await prisma.sessionPackage.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" }
    })) ??
    (await prisma.sessionPackage.findFirst({
      orderBy: { createdAt: "asc" }
    }));

  if (!fallbackPackage) {
    return null;
  }

  const manualSessionId = `manual-admin-${patientId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return prisma.patientPackagePurchase.create({
    data: {
      patientId,
      packageId: fallbackPackage.id,
      stripeCheckoutSessionId: manualSessionId,
      totalCredits: 0,
      remainingCredits: 0
    },
    include: { sessionPackage: { select: { id: true, name: true } } }
  });
}

function parseLandingSettings(value: unknown) {
  const parsed = landingSettingsSchema.safeParse(value);
  if (parsed.success) {
    return {
      patientHeroImageUrl: parsed.data.patientHeroImageUrl,
      patientDesktopImageUrl: parsed.data.patientDesktopImageUrl ?? parsed.data.patientHeroImageUrl,
      patientMobileImageUrl: parsed.data.patientMobileImageUrl ?? parsed.data.patientHeroImageUrl,
      professionalDesktopImageUrl: parsed.data.professionalDesktopImageUrl ?? null,
      professionalMobileImageUrl: parsed.data.professionalMobileImageUrl ?? null
    };
  }

  return {
    patientHeroImageUrl: null,
    patientDesktopImageUrl: null,
    patientMobileImageUrl: null,
    professionalDesktopImageUrl: null,
    professionalMobileImageUrl: null
  };
}

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["ADMIN"]));

adminRouter.get("/kpis", async (_req, res) => {
  const [activePatients, activeProfessionals, scheduledSessions, completedSessions] = await Promise.all([
    prisma.patientProfile.count({ where: { status: "active" } }),
    prisma.professionalProfile.count({ where: { visible: true } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } })
  ]);

  const sessionFeeCents = 9000;
  const monthlyRevenueCents = completedSessions * sessionFeeCents;

  return res.json({
    kpis: {
      activePatients,
      activeProfessionals,
      scheduledSessions,
      monthlyRevenueCents
    },
    note: "KPI values sourced from current database snapshot"
  });
});

adminRouter.get("/users", async (req, res) => {
  const parsed = listUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const search = parsed.data.search?.toLowerCase();
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const where = {
    role: parsed.data.role,
    ...(search
      ? {
          OR: [
            { email: { contains: search } },
            { fullName: { contains: search } }
          ]
        }
      : {})
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            timezone: true,
            status: true
          }
        },
        professional: {
          select: {
            id: true,
            visible: true,
            cancellationHours: true,
            bio: true,
            therapeuticApproach: true,
            yearsExperience: true,
            photoUrl: true,
            videoUrl: true
          }
        },
        admin: {
          select: {
            id: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return res.json({
    users: users.map((user: AdminUserRecord) => shapeAdminUser(user)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  });
});

adminRouter.post("/users", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const created = await prisma.user.create({
    data: {
      email,
      fullName: parsed.data.fullName.trim(),
      passwordHash: hashPassword(parsed.data.password),
      role: parsed.data.role,
      patient:
        parsed.data.role === "PATIENT"
          ? {
              create: {
                timezone: parsed.data.timezone ?? "America/New_York",
                status: parsed.data.patientStatus ?? "active"
              }
            }
          : undefined,
      professional:
        parsed.data.role === "PROFESSIONAL"
          ? {
              create: {
                visible: parsed.data.professionalVisible ?? true,
                cancellationHours: parsed.data.professionalCancellationHours ?? 24,
                bio: parsed.data.professionalBio?.trim() || null,
                therapeuticApproach: parsed.data.professionalTherapeuticApproach?.trim() || null,
                yearsExperience: parsed.data.professionalYearsExperience ?? null,
                photoUrl: parsed.data.professionalPhotoUrl ?? null,
                videoUrl: parsed.data.professionalVideoUrl ?? null
              }
            }
          : undefined,
      admin: parsed.data.role === "ADMIN" ? { create: {} } : undefined
    },
    include: {
      patient: {
        select: {
          id: true,
          timezone: true,
          status: true
        }
      },
      professional: {
        select: {
          id: true,
          visible: true,
          cancellationHours: true,
          bio: true,
          therapeuticApproach: true,
          yearsExperience: true,
          photoUrl: true,
          videoUrl: true
        }
      },
      admin: {
        select: {
          id: true
        }
      }
    }
  });

  return res.status(201).json({
    user: shapeAdminUser(created)
  });
});

adminRouter.patch("/users/:userId", async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existing = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: {
      id: true,
      role: true
    }
  });

  if (!existing) {
    return res.status(404).json({ error: "User not found" });
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.fullName) {
    data.fullName = parsed.data.fullName.trim();
  }

  if (parsed.data.email) {
    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingByEmail && existingByEmail.id !== existing.id) {
      return res.status(409).json({ error: "Email already in use" });
    }
    data.email = normalizedEmail;
  }

  if (parsed.data.password) {
    data.passwordHash = hashPassword(parsed.data.password);
  }

  if (existing.role === "PATIENT" && (parsed.data.patientStatus || parsed.data.patientTimezone)) {
    data.patient = {
      upsert: {
        create: {
          timezone: parsed.data.patientTimezone ?? "America/New_York",
          status: parsed.data.patientStatus ?? "active"
        },
        update: {
          ...(parsed.data.patientStatus ? { status: parsed.data.patientStatus } : {}),
          ...(parsed.data.patientTimezone ? { timezone: parsed.data.patientTimezone } : {})
        }
      }
    };
  }

  if (
    existing.role === "PROFESSIONAL"
    && (
      parsed.data.professionalVisible !== undefined
      || parsed.data.professionalCancellationHours !== undefined
      || parsed.data.professionalBio !== undefined
      || parsed.data.professionalTherapeuticApproach !== undefined
      || parsed.data.professionalYearsExperience !== undefined
      || parsed.data.professionalPhotoUrl !== undefined
      || parsed.data.professionalVideoUrl !== undefined
    )
  ) {
    data.professional = {
      upsert: {
        create: {
          visible: parsed.data.professionalVisible ?? true,
          cancellationHours: parsed.data.professionalCancellationHours ?? 24,
          bio: parsed.data.professionalBio?.trim() || null,
          therapeuticApproach: parsed.data.professionalTherapeuticApproach?.trim() || null,
          yearsExperience: parsed.data.professionalYearsExperience ?? null,
          photoUrl: parsed.data.professionalPhotoUrl ?? null,
          videoUrl: parsed.data.professionalVideoUrl ?? null
        },
        update: {
          ...(parsed.data.professionalVisible !== undefined ? { visible: parsed.data.professionalVisible } : {}),
          ...(parsed.data.professionalCancellationHours !== undefined
            ? { cancellationHours: parsed.data.professionalCancellationHours }
            : {}),
          ...(parsed.data.professionalBio !== undefined ? { bio: parsed.data.professionalBio.trim() || null } : {}),
          ...(parsed.data.professionalTherapeuticApproach !== undefined
            ? { therapeuticApproach: parsed.data.professionalTherapeuticApproach.trim() || null }
            : {}),
          ...(parsed.data.professionalYearsExperience !== undefined
            ? { yearsExperience: parsed.data.professionalYearsExperience }
            : {}),
          ...(parsed.data.professionalPhotoUrl !== undefined ? { photoUrl: parsed.data.professionalPhotoUrl || null } : {}),
          ...(parsed.data.professionalVideoUrl !== undefined ? { videoUrl: parsed.data.professionalVideoUrl || null } : {})
        }
      }
    };
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: data as any,
    include: {
      patient: {
        select: {
          id: true,
          timezone: true,
          status: true
        }
      },
      professional: {
        select: {
          id: true,
          visible: true,
          cancellationHours: true,
          bio: true,
          therapeuticApproach: true,
          yearsExperience: true,
          photoUrl: true,
          videoUrl: true
        }
      },
      admin: {
        select: {
          id: true
        }
      }
    }
  });

  return res.json({
    user: shapeAdminUser(updated)
  });
});

adminRouter.get("/session-packages", async (req, res) => {
  const parsed = listPackagesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const search = parsed.data.search?.toLowerCase();
  const [packages, visibilityConfig] = await Promise.all([
    prisma.sessionPackage.findMany({
      where: {
        ...(parsed.data.active ? { active: parsed.data.active === "true" } : {}),
        ...(parsed.data.professionalId ? { professionalId: parsed.data.professionalId } : {}),
        ...(search ? { name: { contains: search } } : {})
      },
      include: {
        professional: { select: { id: true, user: { select: { fullName: true } } } },
        _count: { select: { purchases: true } }
      },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }]
    }),
    prisma.systemConfig.findUnique({ where: { key: SESSION_PACKAGES_VISIBILITY_KEY } })
  ]);
  const visibility = parseSessionPackagesVisibility(visibilityConfig?.value);

  return res.json({
    visibility,
    sessionPackages: packages.map((item) => ({
      id: item.id,
      professionalId: item.professionalId,
      professionalName: item.professional?.user.fullName ?? null,
      stripePriceId: item.stripePriceId,
      name: item.name,
      credits: item.credits,
      priceCents: item.priceCents,
      discountPercent: item.discountPercent,
      currency: item.currency,
      active: item.active,
      createdAt: item.createdAt,
      purchasesCount: item._count.purchases,
      landingPublished: visibility.landing.includes(item.id),
      patientPublished: visibility.patient.includes(item.id)
    }))
  });
});

adminRouter.put("/session-packages/visibility", async (req, res) => {
  const parsed = sessionPackagesVisibilitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const requestedIds = Array.from(new Set([...parsed.data.landing, ...parsed.data.patient]));
  const existingPackages = requestedIds.length
    ? await prisma.sessionPackage.findMany({
        where: {
          id: { in: requestedIds },
          active: true
        },
        select: { id: true }
      })
    : [];

  if (existingPackages.length !== requestedIds.length) {
    return res.status(400).json({ error: "Only active packages can be published." });
  }

  const visibility = {
    landing: Array.from(new Set(parsed.data.landing)),
    patient: Array.from(new Set(parsed.data.patient)),
    featuredLanding:
      parsed.data.featuredLanding && parsed.data.landing.includes(parsed.data.featuredLanding)
        ? parsed.data.featuredLanding
        : null,
    featuredPatient:
      parsed.data.featuredPatient && parsed.data.patient.includes(parsed.data.featuredPatient)
        ? parsed.data.featuredPatient
        : null
  };

  const saved = await prisma.systemConfig.upsert({
    where: { key: SESSION_PACKAGES_VISIBILITY_KEY },
    update: { value: visibility },
    create: { key: SESSION_PACKAGES_VISIBILITY_KEY, value: visibility }
  });

  return res.json({ visibility: parseSessionPackagesVisibility(saved.value) });
});

adminRouter.post("/session-packages", async (req, res) => {
  const parsed = createPackageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const packageData = parsed.data;
  const stripePriceId = packageData.stripePriceId?.trim() || `pkg-admin-${Date.now().toString(36)}`;

  const created = await prisma.sessionPackage.create({
    data: {
      professionalId: packageData.professionalId ?? null,
      stripePriceId,
      name: packageData.name.trim(),
      credits: packageData.credits,
      priceCents: packageData.priceCents,
      discountPercent: packageData.discountPercent,
      currency: packageData.currency.trim().toLowerCase(),
      active: packageData.active
    }
  });

  return res.status(201).json({ sessionPackage: created });
});

adminRouter.patch("/session-packages/:packageId", async (req, res) => {
  const parsed = updatePackageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existing = await prisma.sessionPackage.findUnique({ where: { id: req.params.packageId } });
  if (!existing) {
    return res.status(404).json({ error: "Session package not found" });
  }

  const updated = await prisma.sessionPackage.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.professionalId !== undefined ? { professionalId: parsed.data.professionalId } : {}),
      ...(parsed.data.stripePriceId !== undefined ? { stripePriceId: parsed.data.stripePriceId } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.credits !== undefined ? { credits: parsed.data.credits } : {}),
      ...(parsed.data.priceCents !== undefined ? { priceCents: parsed.data.priceCents } : {}),
      ...(parsed.data.discountPercent !== undefined ? { discountPercent: parsed.data.discountPercent } : {}),
      ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency.trim().toLowerCase() } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {})
    }
  });

  return res.json({ sessionPackage: updated });
});

adminRouter.delete("/session-packages/:packageId", async (req, res) => {
  const existing = await prisma.sessionPackage.findUnique({
    where: { id: req.params.packageId },
    include: { _count: { select: { purchases: true } } }
  });
  if (!existing) {
    return res.status(404).json({ error: "Session package not found" });
  }

  if (existing._count.purchases > 0) {
    const updated = await prisma.sessionPackage.update({
      where: { id: existing.id },
      data: { active: false }
    });
    return res.json({ sessionPackage: updated, note: "Package has purchases and was deactivated instead of deleted." });
  }

  await prisma.sessionPackage.delete({ where: { id: existing.id } });
  return res.json({ success: true });
});

adminRouter.get("/bookings", async (req, res) => {
  const parsed = listBookingsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const dateFrom = parsed.data.dateFrom ? new Date(`${parsed.data.dateFrom}T00:00:00.000Z`) : null;
  const dateTo = parsed.data.dateTo ? new Date(`${parsed.data.dateTo}T23:59:59.999Z`) : null;

  const bookings = await prisma.booking.findMany({
    where: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.patientId ? { patientId: parsed.data.patientId } : {}),
      ...(parsed.data.professionalId ? { professionalId: parsed.data.professionalId } : {}),
      ...(dateFrom || dateTo
        ? {
            startsAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {})
            }
          }
        : {})
    },
    include: {
      patient: { select: { id: true, user: { select: { fullName: true, email: true } } } },
      professional: { select: { id: true, user: { select: { fullName: true, email: true } } } },
      videoSession: { select: { id: true, joinUrlPatient: true, joinUrlProfessional: true } }
    },
    orderBy: { startsAt: "desc" },
    take: 500
  });

  return res.json({
    bookings: bookings.map((booking) => ({
      id: booking.id,
      patientId: booking.patientId,
      patientName: booking.patient.user.fullName,
      professionalId: booking.professionalId,
      professionalName: booking.professional.user.fullName,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status,
      consumedCredits: booking.consumedCredits,
      cancellationReason: booking.cancellationReason,
      cancelledAt: booking.cancelledAt,
      completedAt: booking.completedAt,
      joinUrlPatient: booking.videoSession?.joinUrlPatient ?? null,
      joinUrlProfessional: booking.videoSession?.joinUrlProfessional ?? null
    }))
  });
});

adminRouter.patch("/bookings/:bookingId", async (req, res) => {
  const parsed = updateBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existing = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
  if (!existing) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  const nextStatus = parsed.data.status ?? existing.status;
  const now = new Date();

  const updated = await prisma.booking.update({
    where: { id: existing.id },
    data: {
      ...(startsAt ? { startsAt } : {}),
      ...(endsAt ? { endsAt } : {}),
      ...(parsed.data.patientId ? { patientId: parsed.data.patientId } : {}),
      ...(parsed.data.professionalId ? { professionalId: parsed.data.professionalId } : {}),
      ...(parsed.data.consumedCredits !== undefined ? { consumedCredits: parsed.data.consumedCredits } : {}),
      ...(parsed.data.cancellationReason !== undefined ? { cancellationReason: parsed.data.cancellationReason } : {}),
      status: nextStatus,
      ...(nextStatus === "CANCELLED" ? { cancelledAt: now } : {}),
      ...(nextStatus === "COMPLETED" ? { completedAt: now } : {})
    }
  });

  return res.json({ booking: updated });
});

adminRouter.get("/professionals", async (req, res) => {
  const parsed = listProfessionalsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const search = parsed.data.search?.toLowerCase();
  const professionals = await prisma.professionalProfile.findMany({
    where: {
      ...(parsed.data.visible ? { visible: parsed.data.visible === "true" } : {}),
      ...(search
        ? {
            user: {
              OR: [{ fullName: { contains: search } }, { email: { contains: search } }]
            }
          }
        : {})
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      availabilitySlots: {
        where: { startsAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) } },
        orderBy: { startsAt: "asc" },
        take: 60
      },
      _count: { select: { bookings: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return res.json({
    professionals: professionals.map((item) => ({
      id: item.id,
      userId: item.userId,
      fullName: item.user.fullName,
      email: item.user.email,
      visible: item.visible,
      cancellationHours: item.cancellationHours,
      bio: item.bio,
      therapeuticApproach: item.therapeuticApproach,
      yearsExperience: item.yearsExperience,
      photoUrl: item.photoUrl,
      videoUrl: item.videoUrl,
      bookingsCount: item._count.bookings,
      slots: item.availabilitySlots
    }))
  });
});

adminRouter.patch("/professionals/:professionalId", async (req, res) => {
  const parsed = updateProfessionalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existing = await prisma.professionalProfile.findUnique({ where: { id: req.params.professionalId } });
  if (!existing) {
    return res.status(404).json({ error: "Professional not found" });
  }

  const updated = await prisma.professionalProfile.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.visible !== undefined ? { visible: parsed.data.visible } : {}),
      ...(parsed.data.cancellationHours !== undefined ? { cancellationHours: parsed.data.cancellationHours } : {}),
      ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
      ...(parsed.data.therapeuticApproach !== undefined ? { therapeuticApproach: parsed.data.therapeuticApproach } : {}),
      ...(parsed.data.yearsExperience !== undefined ? { yearsExperience: parsed.data.yearsExperience } : {}),
      ...(parsed.data.photoUrl !== undefined ? { photoUrl: parsed.data.photoUrl } : {}),
      ...(parsed.data.videoUrl !== undefined ? { videoUrl: parsed.data.videoUrl } : {})
    }
  });

  return res.json({ professional: updated });
});

adminRouter.post("/professionals/:professionalId/slots", async (req, res) => {
  const parsed = createAvailabilitySlotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (endsAt <= startsAt) {
    return res.status(400).json({ error: "endsAt must be after startsAt" });
  }

  const professionalExists = await prisma.professionalProfile.findUnique({ where: { id: req.params.professionalId } });
  if (!professionalExists) {
    return res.status(404).json({ error: "Professional not found" });
  }

  const created = await prisma.availabilitySlot.create({
    data: {
      professionalId: req.params.professionalId,
      startsAt,
      endsAt,
      isBlocked: parsed.data.isBlocked ?? false,
      source: parsed.data.source ?? "admin"
    }
  });

  return res.status(201).json({ slot: created });
});

adminRouter.delete("/professionals/:professionalId/slots/:slotId", async (req, res) => {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
  if (!slot || slot.professionalId !== req.params.professionalId) {
    return res.status(404).json({ error: "Slot not found" });
  }

  await prisma.availabilitySlot.delete({ where: { id: slot.id } });
  return res.json({ success: true });
});

adminRouter.get("/patients", async (req, res) => {
  const parsed = listPatientsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const rawSearch = parsed.data.search?.toLowerCase().trim();
  const isWildcardSearch = rawSearch === "*";
  const search = rawSearch && !isWildcardSearch ? rawSearch : undefined;

  const page = parsed.data.page ?? 1;
  const defaultPageSize = isWildcardSearch ? 10 : 250;
  const pageSize = parsed.data.pageSize ?? defaultPageSize;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(search
      ? {
          user: {
            OR: [{ fullName: { contains: search } }, { email: { contains: search } }]
          }
        }
      : {})
  };

  const [total, patients] = await Promise.all([
    prisma.patientProfile.count({ where }),
    prisma.patientProfile.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        purchases: {
          include: { sessionPackage: { select: { id: true, name: true } } },
          orderBy: { purchasedAt: "desc" },
          take: 10
        },
        bookings: {
          orderBy: { startsAt: "desc" },
          take: 10
        },
        creditLedger: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return res.json({
    patients: patients.map((patient) => ({
      id: patient.id,
      userId: patient.userId,
      fullName: patient.user.fullName,
      email: patient.user.email,
      timezone: patient.timezone,
      status: patient.status,
      purchases: patient.purchases.map((purchase) => ({
        id: purchase.id,
        packageId: purchase.packageId,
        packageName: purchase.sessionPackage.name,
        totalCredits: purchase.totalCredits,
        remainingCredits: purchase.remainingCredits,
        purchasedAt: purchase.purchasedAt
      })),
      latestPurchase: patient.purchases[0]
        ? {
            id: patient.purchases[0].id,
            packageName: patient.purchases[0].sessionPackage.name,
            totalCredits: patient.purchases[0].totalCredits,
            remainingCredits: patient.purchases[0].remainingCredits,
            purchasedAt: patient.purchases[0].purchasedAt
          }
        : null,
      bookingsCount: patient.bookings.length,
      creditBalance: patient.creditLedger.reduce((acc, movement) => acc + movement.amount, 0)
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  });
});

adminRouter.post("/patients/:patientId/credits", async (req, res) => {
  const parsed = creditAdjustmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: req.params.patientId },
    include: { purchases: { orderBy: { purchasedAt: "desc" }, take: 1 } }
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const adjustment = await prisma.creditLedger.create({
    data: {
      patientId: patient.id,
      bookingId: null,
      type: "ADJUSTMENT",
      amount: parsed.data.amount,
      note: parsed.data.note?.trim() || "Admin adjustment"
    }
  });

  if (patient.purchases[0]) {
    const nextCredits = Math.max(0, patient.purchases[0].remainingCredits + parsed.data.amount);
    await prisma.patientPackagePurchase.update({
      where: { id: patient.purchases[0].id },
      data: { remainingCredits: nextCredits }
    });
  }

  return res.status(201).json({ creditMovement: adjustment });
});

adminRouter.get("/patients/:patientId/management", async (req, res) => {
  const patient = await prisma.patientProfile.findUnique({
    where: { id: req.params.patientId },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      purchases: {
        include: { sessionPackage: { select: { id: true, name: true } } },
        orderBy: { purchasedAt: "desc" },
        take: 1
      },
      bookings: {
        where: { status: "CONFIRMED" },
        include: { professional: { select: { id: true, user: { select: { fullName: true } } } } },
        orderBy: { startsAt: "desc" },
        take: 50
      }
    }
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const assignmentConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } });
  const assignments = parsePatientAssignments(assignmentConfig?.value);
  const activeProfessionalId = assignments[patient.id] ?? null;

  let activeProfessionalName: string | null = null;
  if (activeProfessionalId) {
    const professional = await prisma.professionalProfile.findUnique({
      where: { id: activeProfessionalId },
      include: { user: { select: { fullName: true } } }
    });
    activeProfessionalName = professional?.user.fullName ?? null;
  }

  return res.json({
    patient: {
      id: patient.id,
      userId: patient.userId,
      fullName: patient.user.fullName,
      email: patient.user.email,
      timezone: patient.timezone,
      status: patient.status,
      activeProfessionalId,
      activeProfessionalName,
      assignmentStatus: activeProfessionalId ? "assigned" : "pending",
      latestPurchase: patient.purchases[0]
        ? {
            id: patient.purchases[0].id,
            packageId: patient.purchases[0].packageId,
            packageName: patient.purchases[0].sessionPackage.name,
            totalCredits: patient.purchases[0].totalCredits,
            remainingCredits: patient.purchases[0].remainingCredits,
            purchasedAt: patient.purchases[0].purchasedAt
          }
        : null,
      confirmedBookings: patient.bookings.map((booking) => ({
        id: booking.id,
        patientId: booking.patientId,
        patientName: patient.user.fullName,
        professionalId: booking.professionalId,
        professionalName: booking.professional.user.fullName,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status,
        consumedCredits: booking.consumedCredits,
        cancellationReason: booking.cancellationReason,
        cancelledAt: booking.cancelledAt,
        completedAt: booking.completedAt
      }))
    }
  });
});

adminRouter.patch("/patients/:patientId/active-professional", async (req, res) => {
  const parsed = patientActiveProfessionalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const patient = await prisma.patientProfile.findUnique({ where: { id: req.params.patientId } });
  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  let professionalName: string | null = null;
  if (parsed.data.professionalId) {
    const professional = await prisma.professionalProfile.findUnique({
      where: { id: parsed.data.professionalId },
      include: { user: { select: { fullName: true } } }
    });

    if (!professional) {
      return res.status(404).json({ error: "Professional not found" });
    }

    professionalName = professional.user.fullName;
  }

  const existingConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } });
  const currentAssignments = parsePatientAssignments(existingConfig?.value);

  if (parsed.data.professionalId) {
    currentAssignments[patient.id] = parsed.data.professionalId;
  } else {
    delete currentAssignments[patient.id];
  }

  await prisma.systemConfig.upsert({
    where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY },
    update: { value: currentAssignments },
    create: {
      key: PATIENT_ACTIVE_ASSIGNMENTS_KEY,
      value: currentAssignments
    }
  });

  return res.json({
    patientId: patient.id,
    activeProfessionalId: parsed.data.professionalId,
    activeProfessionalName: professionalName,
    assignmentStatus: parsed.data.professionalId ? "assigned" : "pending"
  });
});

adminRouter.patch("/patients/:patientId/sessions-available", async (req, res) => {
  const parsed = patientSessionsAvailableSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: req.params.patientId },
    include: {
      purchases: {
        include: { sessionPackage: { select: { id: true, name: true } } },
        orderBy: { purchasedAt: "desc" },
        take: 1
      }
    }
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const latestPurchase = patient.purchases[0] ?? (await ensureLatestPurchaseForPatient(patient.id));
  if (!latestPurchase) {
    return res.status(400).json({ error: "No session packages configured. Create one first." });
  }

  const delta = parsed.data.remainingCredits - latestPurchase.remainingCredits;

  const updatedPurchase = await prisma.patientPackagePurchase.update({
    where: { id: latestPurchase.id },
    data: { remainingCredits: parsed.data.remainingCredits }
  });

  if (delta !== 0) {
    await prisma.creditLedger.create({
      data: {
        patientId: patient.id,
        bookingId: null,
        type: "ADJUSTMENT",
        amount: delta,
        note:
          "Admin set remaining sessions to " +
          parsed.data.remainingCredits +
          (parsed.data.reason && parsed.data.reason.length > 0 ? " | motivo: " + parsed.data.reason : "")
      }
    });
  }

  return res.json({
    patientId: patient.id,
    latestPurchase: {
      id: updatedPurchase.id,
      packageId: updatedPurchase.packageId,
      packageName: latestPurchase.sessionPackage.name,
      totalCredits: updatedPurchase.totalCredits,
      remainingCredits: updatedPurchase.remainingCredits,
      purchasedAt: updatedPurchase.purchasedAt
    }
  });
});

adminRouter.patch("/patients/:patientId/sessions-contracted", async (req, res) => {
  const parsed = patientSessionsContractedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: req.params.patientId },
    include: {
      purchases: {
        include: { sessionPackage: { select: { id: true, name: true } } },
        orderBy: { purchasedAt: "desc" },
        take: 1
      }
    }
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const latestPurchase = patient.purchases[0] ?? (await ensureLatestPurchaseForPatient(patient.id));
  if (!latestPurchase) {
    return res.status(400).json({ error: "No session packages configured. Create one first." });
  }

  const previousTotal = latestPurchase.totalCredits;
  const nextTotal = parsed.data.totalCredits;
  const nextRemaining = Math.min(latestPurchase.remainingCredits, nextTotal);

  const updatedPurchase = await prisma.patientPackagePurchase.update({
    where: { id: latestPurchase.id },
    data: {
      totalCredits: nextTotal,
      remainingCredits: nextRemaining
    }
  });

  if (previousTotal !== nextTotal) {
    await prisma.creditLedger.create({
      data: {
        patientId: patient.id,
        bookingId: null,
        type: "ADJUSTMENT",
        amount: nextTotal - previousTotal,
        note:
          "Admin set contracted sessions to " +
          nextTotal +
          (parsed.data.reason && parsed.data.reason.length > 0 ? " | motivo: " + parsed.data.reason : "")
      }
    });
  }

  return res.json({
    patientId: patient.id,
    latestPurchase: {
      id: updatedPurchase.id,
      packageId: updatedPurchase.packageId,
      packageName: latestPurchase.sessionPackage.name,
      totalCredits: updatedPurchase.totalCredits,
      remainingCredits: updatedPurchase.remainingCredits,
      purchasedAt: updatedPurchase.purchasedAt
    }
  });

});

adminRouter.get("/landing-settings", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({
    where: { key: LANDING_SETTINGS_KEY }
  });

  if (!config) {
    return res.json({
      settings: parseLandingSettings(null),
      updatedAt: null
    });
  }

  return res.json({
    settings: parseLandingSettings(config.value),
    updatedAt: config.updatedAt
  });
});

adminRouter.put("/landing-settings", async (req, res) => {
  const parsed = landingSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.upsert({
    where: { key: LANDING_SETTINGS_KEY },
    update: { value: parsed.data },
    create: {
      key: LANDING_SETTINGS_KEY,
      value: parsed.data
    }
  });

  return res.json({
    message: "Landing settings saved",
    settings: parseLandingSettings(parsed.data),
    updatedAt: config.updatedAt
  });
});

adminRouter.get("/web-content", async (_req, res) => {
  const [settingsConfig, reviewsConfig, blogConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: LANDING_SETTINGS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } })
  ]);

  const reviewsParsed = reviewsCollectionSchema.safeParse(reviewsConfig?.value);
  const postsParsed = blogPostsCollectionSchema.safeParse(blogConfig?.value);

  return res.json({
    settings: parseLandingSettings(settingsConfig?.value),
    reviews: reviewsParsed.success ? reviewsParsed.data : [],
    blogPosts: postsParsed.success ? postsParsed.data : [],
    updatedAt: {
      settings: settingsConfig?.updatedAt ?? null,
      reviews: reviewsConfig?.updatedAt ?? null,
      blogPosts: blogConfig?.updatedAt ?? null
    }
  });
});

adminRouter.get("/web-content/reviews", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } });
  const parsed = reviewsCollectionSchema.safeParse(config?.value);
  return res.json({
    reviews: parsed.success ? parsed.data : [],
    updatedAt: config?.updatedAt ?? null
  });
});

adminRouter.post("/web-content/reviews", async (req, res) => {
  const parsed = reviewCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } });
  const current = reviewsCollectionSchema.safeParse(config?.value);
  const reviews = current.success ? current.data : [];
  const createdReview = { id: buildId("review"), accent: parsed.data.accent ?? "#7a5cff", ...parsed.data };
  const next = [createdReview, ...reviews];

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_REVIEWS_KEY },
    update: { value: next },
    create: { key: WEB_REVIEWS_KEY, value: next }
  });

  return res.status(201).json({ review: createdReview, updatedAt: saved.updatedAt });
});

adminRouter.put("/web-content/reviews/:reviewId", async (req, res) => {
  const parsed = reviewUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } });
  const current = reviewsCollectionSchema.safeParse(config?.value);
  const reviews = current.success ? current.data : [];
  const targetIndex = reviews.findIndex((review) => review.id === req.params.reviewId);

  if (targetIndex < 0) {
    return res.status(404).json({ error: "Review not found" });
  }

  const updatedReview = { ...reviews[targetIndex], ...parsed.data, accent: parsed.data.accent ?? reviews[targetIndex].accent ?? "#7a5cff" };
  const next = [...reviews];
  next[targetIndex] = updatedReview;

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_REVIEWS_KEY },
    update: { value: next },
    create: { key: WEB_REVIEWS_KEY, value: next }
  });

  return res.json({ review: updatedReview, updatedAt: saved.updatedAt });
});

adminRouter.delete("/web-content/reviews/:reviewId", async (req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } });
  const current = reviewsCollectionSchema.safeParse(config?.value);
  const reviews = current.success ? current.data : [];
  const next = reviews.filter((review) => review.id !== req.params.reviewId);

  if (next.length === reviews.length) {
    return res.status(404).json({ error: "Review not found" });
  }

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_REVIEWS_KEY },
    update: { value: next },
    create: { key: WEB_REVIEWS_KEY, value: next }
  });

  return res.json({ success: true, updatedAt: saved.updatedAt });
});

adminRouter.get("/web-content/blog-posts", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } });
  const parsed = blogPostsCollectionSchema.safeParse(config?.value);
  return res.json({
    blogPosts: parsed.success ? parsed.data : [],
    updatedAt: config?.updatedAt ?? null
  });
});

adminRouter.post("/web-content/blog-posts", async (req, res) => {
  const parsed = blogPostCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } });
  const current = blogPostsCollectionSchema.safeParse(config?.value);
  const posts = current.success ? current.data : [];
  const createdPost = { id: buildId("blog"), ...parsed.data };

  const next = [createdPost, ...posts];
  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_BLOG_POSTS_KEY },
    update: { value: next },
    create: { key: WEB_BLOG_POSTS_KEY, value: next }
  });

  return res.status(201).json({ blogPost: createdPost, updatedAt: saved.updatedAt });
});

adminRouter.put("/web-content/blog-posts/:postId", async (req, res) => {
  const parsed = blogPostUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } });
  const current = blogPostsCollectionSchema.safeParse(config?.value);
  const posts = current.success ? current.data : [];
  const targetIndex = posts.findIndex((post) => post.id === req.params.postId);

  if (targetIndex < 0) {
    return res.status(404).json({ error: "Blog post not found" });
  }

  const updatedPost = { ...posts[targetIndex], ...parsed.data };
  const next = [...posts];
  next[targetIndex] = updatedPost;

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_BLOG_POSTS_KEY },
    update: { value: next },
    create: { key: WEB_BLOG_POSTS_KEY, value: next }
  });

  return res.json({ blogPost: updatedPost, updatedAt: saved.updatedAt });
});

adminRouter.delete("/web-content/blog-posts/:postId", async (req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } });
  const current = blogPostsCollectionSchema.safeParse(config?.value);
  const posts = current.success ? current.data : [];
  const next = posts.filter((post) => post.id !== req.params.postId);

  if (next.length === posts.length) {
    return res.status(404).json({ error: "Blog post not found" });
  }

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_BLOG_POSTS_KEY },
    update: { value: next },
    create: { key: WEB_BLOG_POSTS_KEY, value: next }
  });

  return res.json({ success: true, updatedAt: saved.updatedAt });
});
