#!/usr/bin/env node
/**
 * Starts MySQL + Redis for local dev without failing when fixed-name containers
 * already exist (e.g. created by an older compose file or manual docker run).
 */
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const composeFile = path.join(repoRoot, "infra/docker/docker-compose.yml");

const SERVICES = [
  { container: "therapy-mysql", service: "mysql" },
  { container: "therapy-redis", service: "redis" }
];

function run(command, args, inherit = true) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    stdio: inherit ? "inherit" : "pipe",
    encoding: "utf8"
  });
}

function containerState(name) {
  const result = run("docker", ["inspect", "-f", "{{.State.Status}}", name], false);
  if (result.status !== 0) {
    return null;
  }
  return (result.stdout ?? "").trim() || null;
}

function startContainer(name) {
  process.stderr.write(`Starting ${name}...\n`);
  const result = run("docker", ["start", name]);
  if (result.status !== 0) {
    throw new Error(`Could not start container ${name}`);
  }
}

function composeCreate(service) {
  process.stderr.write(`Creating ${service} via docker compose...\n`);
  const result = run("docker", ["compose", "-f", composeFile, "up", "-d", service]);
  if (result.status !== 0) {
    throw new Error(`docker compose up failed for ${service}`);
  }
}

for (const { container, service } of SERVICES) {
  const state = containerState(container);

  if (state === "running") {
    process.stderr.write(`${container} already running.\n`);
    continue;
  }

  if (state !== null) {
    startContainer(container);
    continue;
  }

  composeCreate(service);
}

process.stderr.write("Database containers ready.\n");
