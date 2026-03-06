import { config } from "dotenv";
import { z } from "zod";

config({ path: "../../.env" });
config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5433/therapy_platform"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(1).default("dev-only-change-me"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_PRICE_PACKAGE_4: z.string().optional().default(""),
  STRIPE_PRICE_PACKAGE_8: z.string().optional().default(""),
  STRIPE_PRICE_PACKAGE_12: z.string().optional().default(""),
  DAILY_API_KEY: z.string().optional().default(""),
  DAILY_DOMAIN: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  AI_AUDIT_ENABLED: z.coerce.boolean().default(false)
});

export const env = EnvSchema.parse(process.env);
