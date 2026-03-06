import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { createAuthToken, hashPassword, requireAuth, type AuthenticatedRequest, verifyPassword } from "../../lib/auth.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["PATIENT", "PROFESSIONAL", "ADMIN"]),
  timezone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function shapeUserResponse(user: {
  id: string;
  email: string;
  fullName: string;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  patient: { id: string } | null;
  professional: { id: string } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    patientProfileId: user.patient?.id ?? null,
    professionalProfileId: user.professional?.id ?? null
  };
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = hashPassword(parsed.data.password);

  const created = await prisma.user.create({
    data: {
      email,
      fullName: parsed.data.fullName.trim(),
      role: parsed.data.role,
      passwordHash,
      patient:
        parsed.data.role === "PATIENT"
          ? {
              create: {
                timezone: parsed.data.timezone ?? "America/New_York"
              }
            }
          : undefined,
      professional:
        parsed.data.role === "PROFESSIONAL"
          ? {
              create: {
                visible: true,
                cancellationHours: 24
              }
            }
          : undefined,
      admin: parsed.data.role === "ADMIN" ? { create: {} } : undefined
    },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  const token = createAuthToken({
    userId: created.id,
    role: created.role,
    email: created.email
  });

  return res.status(201).json({
    token,
    user: shapeUserResponse(created)
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials payload" });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createAuthToken({
    userId: user.id,
    role: user.role,
    email: user.email
  });

  return res.json({
    token,
    user: shapeUserResponse(user)
  });
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user: shapeUserResponse(user) });
});
