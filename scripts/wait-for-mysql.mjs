#!/usr/bin/env node
/**
 * Waits until the host MySQL port (Docker publish) accepts TCP connections.
 * Prevents the API from crashing on startup when `db:up` just started mysqld.
 */
import net from "node:net";

const host = process.env.WAIT_MYSQL_HOST ?? "127.0.0.1";
const port = Number(process.env.WAIT_MYSQL_PORT ?? "3307");
const timeoutMs = Number(process.env.WAIT_MYSQL_TIMEOUT_MS ?? "90000");
const intervalMs = 800;

function tryOnce() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(undefined);
    });
    socket.setTimeout(5000);
    socket.on("error", reject);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("timeout"));
    });
  });
}

const start = Date.now();
process.stderr.write(`Waiting for MySQL at ${host}:${port}...\n`);

for (;;) {
  try {
    await tryOnce();
    process.stderr.write(`MySQL reachable (${Date.now() - start}ms).\n`);
    process.exit(0);
  } catch {
    if (Date.now() - start > timeoutMs) {
      process.stderr.write(
        `\nNo connection to ${host}:${port} after ${timeoutMs}ms. Run "npm run db:up" and ensure Docker is running.\n` +
          `If you use another port, set WAIT_MYSQL_PORT in the environment.\n`
      );
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
