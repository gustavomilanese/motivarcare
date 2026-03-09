import { config } from "dotenv";
import { z } from "zod";

config({ path: "../../.env" });
config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  TRUST_PROXY: z.coerce.boolean().default(true),
  DATABASE_URL: z.string().min(1).default("mysql://root:root@localhost:3307/therapy_platform"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  CORS_ORIGINS: z.string().min(1).default("http://localhost:5173,http://localhost:5174,http://localhost:5175"),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
  API_MAX_INFLIGHT_REQUESTS: z.coerce.number().int().positive().default(500),
  API_SHUTDOWN_GRACE_MS: z.coerce.number().int().positive().default(15000),
  JWT_SECRET: z.string().min(1).default("dev-only-change-me"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_PRICE_PACKAGE_4: z.string().optional().default(""),
  STRIPE_PRICE_PACKAGE_8: z.string().optional().default(""),
  STRIPE_PRICE_PACKAGE_12: z.string().optional().default(""),
  STRIPE_PRICE_MAP_JSON: z.string().optional().default(""),
  DAILY_API_KEY: z.string().optional().default(""),
  DAILY_DOMAIN: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  AI_AUDIT_ENABLED: z.coerce.boolean().default(false)
});

export const env = EnvSchema.parse(process.env);
