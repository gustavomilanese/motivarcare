import { getRedisClient } from "./redis.js";

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

export class LockNotAcquiredError extends Error {
  constructor(message = "Lock not acquired") {
    super(message);
    this.name = "LockNotAcquiredError";
  }
}

export async function withDistributedLock<T>(params: {
  key: string;
  ttlMs: number;
  work: () => Promise<T>;
}): Promise<T> {
  const redis = await getRedisClient();
  if (!redis) {
    return params.work();
  }

  const lockKey = `lock:${params.key}`;
  const lockValue = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const acquired = await redis.set(lockKey, lockValue, "PX", params.ttlMs, "NX");
  if (acquired !== "OK") {
    throw new LockNotAcquiredError();
  }

  try {
    return await params.work();
  } finally {
    try {
      await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, lockValue);
    } catch {
      // Ignore release failures; TTL prevents stale locks.
    }
  }
}
