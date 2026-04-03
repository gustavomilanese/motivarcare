import { config } from "dotenv";
import { z } from "zod";

config({ path: "../../.env" });
config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  /** Vacío = en development escucha en 0.0.0.0 (LAN / móvil); en production, comportamiento por defecto de Node. */
  API_LISTEN_HOST: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  TRUST_PROXY: z.coerce.boolean().default(true),
  DATABASE_URL: z.string().min(1).default("mysql://root:root@localhost:3307/therapy_platform"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .default("http://localhost:5172,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"),
  API_RATE_LIMIT_BACKEND: z.enum(["auto", "memory", "redis"]).default("auto"),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
  API_AUTH_LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(600000),
  API_AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(20),
  API_MAX_INFLIGHT_REQUESTS: z.coerce.number().int().positive().default(500),
  API_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  API_MAX_REQUESTS_PER_SOCKET: z.coerce.number().int().positive().default(1000),
  API_ACCESS_LOG_ENABLED: z.coerce.boolean().default(true),
  API_METRICS_ENABLED: z.coerce.boolean().default(true),
  API_BOOKING_LOCK_TTL_MS: z.coerce.number().int().positive().default(8000),
  API_SHUTDOWN_GRACE_MS: z.coerce.number().int().positive().default(15000),
  OUTBOX_POLL_MS: z.coerce.number().int().positive().default(2000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().max(1000).default(100),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(12),
  OUTBOX_RETRY_BASE_MS: z.coerce.number().int().positive().default(10000),
  EMAIL_VERIFICATION_REQUIRED: z.coerce.boolean().optional(),
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
  PATIENT_APP_URL: z.string().min(1).default("http://localhost:5173"),
  /** Comma-separated URL prefixes (e.g. motivarcare://,exp://) allowed as calendar OAuth return targets for the patient mobile app. */
  PATIENT_MOBILE_CALENDAR_ORIGIN_PREFIXES: z.string().optional().default(""),
  PROFESSIONAL_APP_URL: z.string().min(1).default("http://localhost:5174"),
  ADMIN_APP_URL: z.string().min(1).default("http://localhost:5175"),
  API_PUBLIC_URL: z.string().min(1).default("http://localhost:4000"),
  EMAIL_FROM: z.string().min(1).default("MotivarCare <no-reply@motivacare.app>"),
  RESEND_API_KEY: z.string().optional().default(""),
  JWT_SECRET: z.string().min(1).default("dev-only-change-me"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_PRICE_PACKAGE_4: z.string().optional().default(""),
  STRIPE_PRICE_PACKAGE_8: z.string().optional().default(""),
  STRIPE_PRICE_PACKAGE_12: z.string().optional().default(""),
  STRIPE_PRICE_MAP_JSON: z.string().optional().default(""),
  DAILY_API_KEY: z.string().optional().default(""),
  DAILY_DOMAIN: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_REFRESH_TOKEN: z.string().optional().default(""),
  GOOGLE_CALENDAR_ID: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  AI_AUDIT_ENABLED: z.coerce.boolean().default(false)
});

const parsedEnv = EnvSchema.parse(process.env);

function resolveApiListenHost(): string | undefined {
  const explicit = parsedEnv.API_LISTEN_HOST?.trim();
  if (explicit) return explicit;
  if (parsedEnv.NODE_ENV === "development") return "0.0.0.0";
  return undefined;
}

const patientMobileCalendarOriginPrefixes =
  parsedEnv.PATIENT_MOBILE_CALENDAR_ORIGIN_PREFIXES.trim().length > 0
    ? parsedEnv.PATIENT_MOBILE_CALENDAR_ORIGIN_PREFIXES
    : parsedEnv.NODE_ENV !== "production"
      ? "motivarcare://,exp://"
      : "";

export const env = {
  ...parsedEnv,
  apiListenHost: resolveApiListenHost(),
  PATIENT_MOBILE_CALENDAR_ORIGIN_PREFIXES: patientMobileCalendarOriginPrefixes,
  EMAIL_VERIFICATION_REQUIRED:
    parsedEnv.EMAIL_VERIFICATION_REQUIRED ?? parsedEnv.NODE_ENV === "production"
};
