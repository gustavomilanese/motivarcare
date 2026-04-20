import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { sendApiError } from "./lib/http.js";
import { metricsContentType, metricsSnapshot, observeHttpRequest } from "./lib/metrics.js";
import { runtimeState } from "./lib/operational.js";
import { rateLimiter, rateLimiterAuthenticated } from "./lib/rateLimiter.js";
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
const allowedLocalHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function browserOriginFromAppUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!u.protocol.startsWith("http")) {
      return null;
    }
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

const allowedOriginSet = new Set<string>(allowedOrigins);
for (const candidate of [env.PATIENT_APP_URL, env.PROFESSIONAL_APP_URL, env.ADMIN_APP_URL]) {
  const origin = browserOriginFromAppUrl(candidate);
  if (origin) {
    allowedOriginSet.add(origin);
  }
}

function isAllowedOrigin(origin: string): boolean {
  if (allowedOriginSet.has(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return allowedLocalHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);

function getRequestIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  // same-site rompe fetch() desde apps nativas (p. ej. Expo en iOS) hacia la IP LAN del dev server.
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key", "X-Client-Version"],
    maxAge: 86400
  })
);
const jsonParser = express.json({ limit: "35mb" });
app.use((req, res, next) => {
  if (req.path === "/api/payments/stripe/webhook" || req.path === "/api/v1/payments/stripe/webhook") {
    next();
    return;
  }
  jsonParser(req, res, next);
});
app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!(error instanceof SyntaxError) || !("body" in (error as object))) {
    next(error);
    return;
  }
  sendApiError({
    res,
    status: 400,
    code: "BAD_REQUEST",
    message: "Invalid JSON payload"
  });
});

app.use((req, res, next) => {
  if (runtimeState.shuttingDown) {
    sendApiError({
      res,
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Service is shutting down, retry shortly."
    });
    return;
  }

  if (req.path.startsWith("/health") || (env.API_METRICS_ENABLED && req.path === "/metrics")) {
    next();
    return;
  }

  const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization.trim() : "";
  const bearerToken =
    authHeader.length > 7 && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
  /** JWT real; evita que `Bearer x` dispare el toque alto en rutas públicas (p. ej. login). */
  const useAuthenticatedBudget = bearerToken.length >= 32;
  const limiter = useAuthenticatedBudget ? rateLimiterAuthenticated : rateLimiter;

  void limiter.consume(getRequestIp(req)).then((result) => {
    res.setHeader("X-RateLimit-Limit", String(result.limit));
    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.floor(result.resetAt / 1000)));

    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSeconds));
      sendApiError({
        res,
        status: 429,
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please retry later."
      });
      return;
    }

    next();
  }).catch(() => {
    sendApiError({
      res,
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Rate limiter unavailable. Retry shortly."
    });
  });
});

app.use((req, res, next) => {
  if (runtimeState.inFlightRequests >= env.API_MAX_INFLIGHT_REQUESTS) {
    sendApiError({
      res,
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Server is busy. Please retry shortly."
    });
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

app.use((req, res, next) => {
  if (!env.API_ACCESS_LOG_ENABLED) {
    next();
    return;
  }

  const startedAt = Date.now();
  res.on("finish", () => {
    const elapsedMs = Date.now() - startedAt;
    const requestId = String(res.getHeader("x-request-id") ?? "");
    const logLine = {
      level: "info",
      type: "http_access",
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      elapsedMs,
      ip: getRequestIp(req),
      requestId,
      timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(logLine));
  });

  next();
});

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    observeHttpRequest({
      req,
      statusCode: res.statusCode,
      elapsedMs: Date.now() - startedAt
    });
  });
  next();
});

app.get("/", (_req, res) => {
  res.json({ service: "therapy-api", status: "running" });
});

if (env.API_METRICS_ENABLED) {
  app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", metricsContentType());
    res.send(await metricsSnapshot());
  });
}

app.use("/health", healthRouter);
function mountApiRoutes(prefix: "/api" | "/api/v1") {
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/profiles`, profilesRouter);
  app.use(`${prefix}/availability`, availabilityRouter);
  app.use(`${prefix}/bookings`, bookingsRouter);
  app.use(`${prefix}/payments`, paymentsRouter);
  app.use(`${prefix}/video`, videoRouter);
  app.use(`${prefix}/ai-audit`, aiAuditRouter);
  app.use(`${prefix}/admin`, adminRouter);
  app.use(`${prefix}/chat`, chatRouter);
  app.use(`${prefix}/professional`, professionalRouter);
  app.use(`${prefix}/public`, publicRouter);
}

mountApiRoutes("/api");
mountApiRoutes("/api/v1");
