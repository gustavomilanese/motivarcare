import { getRedisClient } from "./redis.js";

const memoryStore = new Map<string, { value: string; expiresAt: number }>();

function sweepExpiredEntries() {
  const now = Date.now();
  for (const [key, item] of memoryStore.entries()) {
    if (item.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

setInterval(sweepExpiredEntries, 30_000).unref();

function normalizeTtlSeconds(ttlSeconds: number): number {
  return Math.max(30, Math.floor(ttlSeconds));
}

export async function getIdempotencyValue(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  if (redis) {
    try {
      return await redis.get(`idem:${key}`);
    } catch {
      // fallback to memory
    }
  }

  const item = memoryStore.get(key);
  if (!item) {
    return null;
  }

  if (item.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }

  return item.value;
}

export async function setIdempotencyValue(params: {
  key: string;
  value: string;
  ttlSeconds: number;
}): Promise<void> {
  const ttlSeconds = normalizeTtlSeconds(params.ttlSeconds);
  const redis = await getRedisClient();

  if (redis) {
    try {
      await redis.set(`idem:${params.key}`, params.value, "EX", ttlSeconds);
      return;
    } catch {
      // fallback to memory
    }
  }

  memoryStore.set(params.key, {
    value: params.value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}
