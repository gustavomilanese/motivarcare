import { env } from "../config/env.js";
import { getRedisClient } from "./redis.js";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
  limit: number;
};

type RateLimiter = {
  consume: (key: string) => Promise<RateLimitResult>;
};

type RateLimiterConfig = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
};

const REDIS_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

function createMemoryRateLimiter(config: RateLimiterConfig): RateLimiter {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  const sweepMs = Math.max(5000, Math.floor(config.windowMs / 2));

  setInterval(() => {
    const now = Date.now();
    for (const [key, tracked] of requestCounts.entries()) {
      if (tracked.resetAt <= now) {
        requestCounts.delete(key);
      }
    }
  }, sweepMs).unref();

  return {
    async consume(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      const tracked = requestCounts.get(key);

      if (!tracked || tracked.resetAt <= now) {
        const resetAt = now + config.windowMs;
        requestCounts.set(key, { count: 1, resetAt });
        return {
          allowed: true,
          remaining: Math.max(0, config.maxRequests - 1),
          retryAfterSeconds: 0,
          resetAt,
          limit: config.maxRequests
        };
      }

      if (tracked.count >= config.maxRequests) {
        const retryAfterSeconds = Math.max(1, Math.ceil((tracked.resetAt - now) / 1000));
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds,
          resetAt: tracked.resetAt,
          limit: config.maxRequests
        };
      }

      tracked.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - tracked.count),
        retryAfterSeconds: 0,
        resetAt: tracked.resetAt,
        limit: config.maxRequests
      };
    }
  };
}

function createRedisRateLimiter(config: RateLimiterConfig): RateLimiter {
  const fallback = createMemoryRateLimiter(config);

  return {
    async consume(key: string): Promise<RateLimitResult> {
      if (env.API_RATE_LIMIT_BACKEND === "memory") {
        return fallback.consume(key);
      }

      const redis = await getRedisClient();
      if (!redis) {
        if (env.API_RATE_LIMIT_BACKEND === "redis" && env.NODE_ENV === "production") {
          throw new Error("Redis unavailable for mandatory rate limiter");
        }
        return fallback.consume(key);
      }

      const now = Date.now();
      const windowStart = now - (now % config.windowMs);
      const resetAt = windowStart + config.windowMs;
      const redisKey = `rl:${config.keyPrefix}:${key}:${windowStart}`;

      try {
        const [rawCount, rawTtl] = (await redis.eval(
          REDIS_WINDOW_SCRIPT,
          1,
          redisKey,
          String(config.windowMs)
        )) as [number, number];

        const count = Number(rawCount);
        const ttlMs = Math.max(0, Number(rawTtl));
        const retryAfterSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
        const allowed = count <= config.maxRequests;

        return {
          allowed,
          remaining: allowed ? Math.max(0, config.maxRequests - count) : 0,
          retryAfterSeconds: allowed ? 0 : retryAfterSeconds,
          resetAt,
          limit: config.maxRequests
        };
      } catch {
        if (env.API_RATE_LIMIT_BACKEND === "redis" && env.NODE_ENV === "production") {
          throw new Error("Redis eval failed for mandatory rate limiter");
        }
        return fallback.consume(key);
      }
    }
  };
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return createRedisRateLimiter(config);
}

export const rateLimiter = createRateLimiter({
  keyPrefix: "global",
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  maxRequests: env.API_RATE_LIMIT_MAX_REQUESTS
});

/** Misma ventana que `rateLimiter`; tope más alto para `Authorization: Bearer` (evita 429 en uso normal del portal). */
export const rateLimiterAuthenticated = createRateLimiter({
  keyPrefix: "global-auth",
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  maxRequests: env.API_RATE_LIMIT_MAX_REQUESTS_AUTHENTICATED
});

export const authLoginRateLimiter = createRateLimiter({
  keyPrefix: "auth_login",
  windowMs: env.API_AUTH_LOGIN_WINDOW_MS,
  maxRequests: env.API_AUTH_LOGIN_MAX_ATTEMPTS
});

/**
 * Limita los mensajes que cada IP puede enviar al treatment-chat por minuto
 * (PR-T5). Sirve para frenar abuso desde una única origen aunque distintos
 * usuarios estén implicados — el cap por usuario lo cubre el counter diario
 * y el limiter `treatmentChatPerUserLimiter`.
 */
export const treatmentChatPerIpLimiter = createRateLimiter({
  keyPrefix: "tchat_ip",
  windowMs: env.TREATMENT_CHAT_RATE_LIMIT_WINDOW_MS,
  maxRequests: env.TREATMENT_CHAT_RATE_LIMIT_MAX_PER_IP
});

/**
 * Limita los mensajes que un mismo `userId` puede enviar al treatment-chat por
 * minuto. Es complementario al cap diario que ya tracking el chat: corta
 * "ráfagas" de spam aunque el cap diario todavía no se haya alcanzado.
 */
export const treatmentChatPerUserLimiter = createRateLimiter({
  keyPrefix: "tchat_user",
  windowMs: env.TREATMENT_CHAT_RATE_LIMIT_WINDOW_MS,
  maxRequests: env.TREATMENT_CHAT_RATE_LIMIT_MAX_PER_USER
});
