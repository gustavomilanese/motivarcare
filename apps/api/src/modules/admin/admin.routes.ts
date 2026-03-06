import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

export const adminRouter = Router();

adminRouter.get("/kpis", async (_req, res) => {
  const [activePatients, activeProfessionals, scheduledSessions, completedSessions] = await Promise.all([
    prisma.patientProfile.count({ where: { status: "active" } }),
    prisma.professionalProfile.count({ where: { visible: true } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } })
  ]);

  const sessionFeeCents = 9000;
  const monthlyRevenueCents = completedSessions * sessionFeeCents;

  res.json({
    kpis: {
      activePatients,
      activeProfessionals,
      scheduledSessions,
      monthlyRevenueCents
    },
    note: "KPI values sourced from current database snapshot"
  });
});
