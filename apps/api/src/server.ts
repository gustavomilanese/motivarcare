import http from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { markShuttingDown, runtimeState } from "./lib/operational.js";
import { disconnectRedis } from "./lib/redis.js";

const server = http.createServer(app);
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;
server.requestTimeout = env.API_REQUEST_TIMEOUT_MS;
server.maxRequestsPerSocket = env.API_MAX_REQUESTS_PER_SOCKET;

const listenHost = env.apiListenHost;
if (listenHost !== undefined) {
  server.listen(env.PORT, listenHost, () => {
    console.log(`API listening on http://${listenHost}:${env.PORT}`);
  });
} else {
  server.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

let shutdownInProgress = false;

async function shutdown(signal: string): Promise<void> {
  if (shutdownInProgress) {
    return;
  }
  shutdownInProgress = true;
  markShuttingDown();

  console.log(`${signal} received. Starting graceful shutdown...`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timeout reached. Forcing process exit.");
    process.exit(1);
  }, env.API_SHUTDOWN_GRACE_MS);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    const waitStart = Date.now();
    while (runtimeState.inFlightRequests > 0 && Date.now() - waitStart < env.API_SHUTDOWN_GRACE_MS) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await Promise.all([prisma.$disconnect(), disconnectRedis()]);
    clearTimeout(forceExitTimer);
    console.log("Graceful shutdown completed.");
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    console.error("Graceful shutdown failed", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
