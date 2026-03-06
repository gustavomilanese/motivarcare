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
    .optional()
});

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8).max(120),
  role: appRoleSchema,
  timezone: z.string().min(2).max(80).optional(),
  patientStatus: patientStatusSchema.optional(),
  professionalVisible: z.boolean().optional(),
  professionalCancellationHours: z.number().int().min(0).max(168).optional()
});

const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    password: z.string().min(8).max(120).optional(),
    patientStatus: patientStatusSchema.optional(),
    patientTimezone: z.string().min(2).max(80).optional(),
    professionalVisible: z.boolean().optional(),
    professionalCancellationHours: z.number().int().min(0).max(168).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

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
          cancellationHours: user.professional.cancellationHours
        }
      : null,
    adminProfile: user.admin
      ? {
          id: user.admin.id
        }
      : null
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

  const users: AdminUserRecord[] = await prisma.user.findMany({
    where: {
      role: parsed.data.role,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { fullName: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
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
          cancellationHours: true
        }
      },
      admin: {
        select: {
          id: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 250
  });

  return res.json({
    users: users.map((user: AdminUserRecord) => shapeAdminUser(user))
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
                cancellationHours: parsed.data.professionalCancellationHours ?? 24
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
          cancellationHours: true
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
    && (parsed.data.professionalVisible !== undefined || parsed.data.professionalCancellationHours !== undefined)
  ) {
    data.professional = {
      upsert: {
        create: {
          visible: parsed.data.professionalVisible ?? true,
          cancellationHours: parsed.data.professionalCancellationHours ?? 24
        },
        update: {
          ...(parsed.data.professionalVisible !== undefined ? { visible: parsed.data.professionalVisible } : {}),
          ...(parsed.data.professionalCancellationHours !== undefined
            ? { cancellationHours: parsed.data.professionalCancellationHours }
            : {})
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
          cancellationHours: true
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
