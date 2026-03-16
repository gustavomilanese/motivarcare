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
  }

  if (client.status === "wait") {
    try {
      await client.connect();
    } catch {
      disableRedisTemporarily();
      return null;
    }
  }

  if (client.status !== "ready") {
    disableRedisTemporarily();
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
    client.disconnect();
  } finally {
    client = null;
  }
}
