import cors from "cors";
import express from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { profilesRouter } from "./modules/profiles/profiles.routes.js";
import { availabilityRouter } from "./modules/availability/availability.routes.js";
import { bookingsRouter } from "./modules/bookings/bookings.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { videoRouter } from "./modules/video/video.routes.js";
import { aiAuditRouter } from "./modules/ai-audit/aiAudit.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ service: "therapy-api", status: "running" });
});

app.use("/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/video", videoRouter);
app.use("/api/ai-audit", aiAuditRouter);
app.use("/api/admin", adminRouter);
