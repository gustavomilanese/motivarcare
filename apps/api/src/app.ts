import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { runtimeState } from "./lib/operational.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { profilesRouter } from "./modules/profiles/profiles.routes.js";
import { availabilityRouter } from "./modules/availability/availability.routes.js";
import { bookingsRouter } from "./modules/bookings/bookings.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { videoRouter } from "./modules/video/video.routes.js";
import { aiAuditRouter } from "./modules/ai-audit/aiAudit.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { professionalRouter } from "./modules/professional/professional.routes.js";
import { publicRouter } from "./modules/public/public.routes.js";

export const app = express();

const allowedOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const rateLimitSweepMs = Math.max(5000, Math.floor(env.API_RATE_LIMIT_WINDOW_MS / 2));

setInterval(() => {
  const now = Date.now();
  for (const [ip, tracked] of requestCounts.entries()) {
    if (tracked.resetAt <= now) {
      requestCounts.delete(ip);
    }
  }
}, rateLimitSweepMs).unref();

function getRequestIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400
  })
);
app.use(express.json({ limit: "35mb" }));

app.use((req, res, next) => {
  if (runtimeState.shuttingDown) {
    res.status(503).json({ error: "Service is shutting down, retry shortly." });
    return;
  }

  const requestIp = getRequestIp(req);
  const now = Date.now();
  const tracked = requestCounts.get(requestIp);

  if (!tracked || tracked.resetAt <= now) {
    requestCounts.set(requestIp, {
      count: 1,
      resetAt: now + env.API_RATE_LIMIT_WINDOW_MS
    });
    next();
    return;
  }

  if (tracked.count >= env.API_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((tracked.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Too many requests. Please retry later." });
    return;
  }

  tracked.count += 1;
  next();
});

app.use((req, res, next) => {
  if (runtimeState.inFlightRequests >= env.API_MAX_INFLIGHT_REQUESTS) {
    res.status(503).json({ error: "Server is busy. Please retry shortly." });
    return;
  }

  runtimeState.inFlightRequests += 1;
  let released = false;
  const release = () => {
    if (released) {
      return;
    }
    released = true;
    runtimeState.inFlightRequests = Math.max(0, runtimeState.inFlightRequests - 1);
  };
  res.on("finish", release);
  res.on("close", release);
  next();
});

app.use((req, res, next) => {
  const requestId = req.header("x-request-id") || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  res.setHeader("x-request-id", requestId);
  next();
});

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
app.use("/api/chat", chatRouter);
app.use("/api/professional", professionalRouter);
app.use("/api/public", publicRouter);
