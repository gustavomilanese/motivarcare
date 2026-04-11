import { Redis } from "ioredis";
import { env } from "../config/env.js";

let client: Redis | null = null;
let redisDisabledUntil = 0;

function disableRedisTemporarily(cooldownMs = 60_000) {
  redisDisabledUntil = Date.now() + cooldownMs;
}

function isTemporarilyDisabled() {
  return Date.now() < redisDisabledUntil;
}

function resetRedisClient(): void {
  if (!client) {
    return;
  }
  try {
    client.removeAllListeners();
    client.disconnect(false);
  } catch {
    // ignore
  }
  client = null;
}

function attachRedisErrorHandler(instance: Redis): void {
  instance.on("error", (error) => {
    // Evita "Unhandled error event" cuando Redis no está levantado (dev local sin Docker).
    if (env.NODE_ENV === "development") {
      return;
    }
    console.error("[redis] client error", error);
  });
}

export async function getRedisClient(): Promise<Redis | null> {
  if (isTemporarilyDisabled()) {
    return null;
  }

  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true
    });
    attachRedisErrorHandler(client);
  }

  if (client.status === "wait") {
    try {
      await client.connect();
    } catch {
      disableRedisTemporarily();
      resetRedisClient();
      return null;
    }
  }

  if (client.status !== "ready") {
    disableRedisTemporarily();
    resetRedisClient();
    return null;
  }

  return client;
}

export async function isRedisReady(): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    disableRedisTemporarily();
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!client) {
    return;
  }

  try {
    await client.quit();
  } catch {
    try {
      client.disconnect(false);
    } catch {
      // ignore
    }
  } finally {
    client = null;
  }
}
