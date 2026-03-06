import { Router } from "express";

export const adminRouter = Router();

adminRouter.get("/kpis", (_req, res) => {
  res.json({
    kpis: {
      activePatients: 0,
      activeProfessionals: 0,
      scheduledSessions: 0,
      monthlyRevenueCents: 0
    },
    note: "Admin KPIs scaffold ready"
  });
});
