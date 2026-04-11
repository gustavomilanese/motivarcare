import { Router } from "express";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { runtimeState } from "../../lib/operational.js";
import { isRedisReady } from "../../lib/redis.js";

export const healthRouter = Router();

async function checkDatabase(): Promise<"ok" | "error"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

healthRouter.get("/live", (_req, res) => {
  res.json({
    ok: true,
    service: "therapy-api",
    uptimeSeconds: Math.floor((Date.now() - runtimeState.startedAt) / 1000),
    inFlightRequests: runtimeState.inFlightRequests,
    shuttingDown: runtimeState.shuttingDown,
    timestamp: new Date().toISOString()
  });
});

healthRouter.get("/ready", async (_req, res) => {
  const [database, redis] = await Promise.all([checkDatabase(), isRedisReady()]);
  const redisRequired = env.API_RATE_LIMIT_BACKEND === "redis" && env.NODE_ENV === "production";
  const ready = !runtimeState.shuttingDown && database === "ok" && (!redisRequired || redis);

  res.status(ready ? 200 : 503).json({
    ok: ready,
    service: "therapy-api",
    database,
    redis: redis ? "ok" : "error",
    inFlightRequests: runtimeState.inFlightRequests,
    shuttingDown: runtimeState.shuttingDown,
    timestamp: new Date().toISOString()
  });
});

healthRouter.get("/", async (_req, res) => {
  const database = await checkDatabase();

  res.json({
    ok: database === "ok",
    service: "therapy-api",
    database,
    inFlightRequests: runtimeState.inFlightRequests,
    shuttingDown: runtimeState.shuttingDown,
    timestamp: new Date().toISOString()
  });
});
