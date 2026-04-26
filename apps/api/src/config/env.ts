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
  /** Presupuesto mayor por IP cuando el cliente envía Bearer (portales SPA: muchas peticiones legítimas en paralelo). */
  API_RATE_LIMIT_MAX_REQUESTS_AUTHENTICATED: z.coerce.number().int().positive().default(2000),
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
  /** Modelo OpenAI usado por features de IA (intake-chat, ai-audit). gpt-5-mini es el sweet spot costo/calidad. */
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
  AI_AUDIT_ENABLED: z.coerce.boolean().default(false),
  /** Activa el chat conversacional como alternativa al wizard de intake del paciente. */
  INTAKE_CHAT_ENABLED: z.coerce.boolean().default(false),
  /** Cap duro de turnos del usuario por sesión de chat para acotar costo y evitar loops. */
  INTAKE_CHAT_MAX_TURNS: z.coerce.number().int().positive().default(30),
  /** Vida útil de una sesión de chat sin actividad antes de marcarla como `abandoned`. */
  INTAKE_CHAT_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  /** Cap duro de USD (en centavos) que una sesión puede consumir antes de cortarla. */
  INTAKE_CHAT_MAX_COST_USD_CENTS: z.coerce.number().int().positive().default(50),
  /** Provider del intake-chat. `mock` no llama a la API y permite tests / demos sin costo. */
  INTAKE_CHAT_PROVIDER: z.enum(["openai", "mock"]).default("openai"),
  /** Activa el chat IA flotante de acompañamiento del tratamiento (post-intake, durante terapia). */
  TREATMENT_CHAT_ENABLED: z.coerce.boolean().default(false),
  /** Cap diario de turnos del usuario para acotar costo y evitar abuso. */
  TREATMENT_CHAT_DAILY_TURN_LIMIT: z.coerce.number().int().positive().default(30),
  /** Cap por respuesta del LLM (tokens de output) para limitar costo y forzar concisión. */
  TREATMENT_CHAT_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(400),
  /** Cantidad de mensajes recientes que pasamos al LLM como contexto en cada turno. */
  TREATMENT_CHAT_CONTEXT_WINDOW: z.coerce.number().int().positive().default(20),
  /** Provider del treatment-chat. Mock no llama a la API y permite tests / demos sin costo. */
  TREATMENT_CHAT_PROVIDER: z.enum(["openai", "mock"]).default("openai"),
  /** Ventana de rate-limit para POST /messages del treatment chat (PR-T5). */
  TREATMENT_CHAT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  /** Tope de mensajes por minuto, por IP, en el treatment chat (PR-T5). */
  TREATMENT_CHAT_RATE_LIMIT_MAX_PER_IP: z.coerce.number().int().positive().default(8),
  /** Tope de mensajes por minuto, por usuario autenticado, en el treatment chat (PR-T5). */
  TREATMENT_CHAT_RATE_LIMIT_MAX_PER_USER: z.coerce.number().int().positive().default(6),
  /** Secreto Turnstile (registro profesional). Vacío = no se exige token en el API. */
  TURNSTILE_SECRET_KEY: z.string().optional().default("")
});

const parsedEnv = EnvSchema.parse(process.env);

/** Host HTTP explícito o `undefined` = dejar que Node elija el bind por defecto (mejor para PaaS / dual-stack). */
function resolveApiListenHost(): string | undefined {
  const explicit = parsedEnv.API_LISTEN_HOST?.trim();
  if (explicit) return explicit;
  if (parsedEnv.NODE_ENV === "development") {
    return "0.0.0.0";
  }
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
