#!/usr/bin/env node
/**
 * Starts MySQL para dev local (compose liviano). Redis solo con DEV_WITH_REDIS=1.
 * Si el contenedor quedó en MariaDB (probado y descartado: error 1020 con updates
 * concurrentes), lo recrea en MySQL y limpia imagen/volúmenes viejos.
 * El schema se aplica después con scripts/db-ensure-schema.mjs (db:pre).
 */
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const composeFile = path.join(repoRoot, "infra/docker/docker-compose.yml");
const freshFlag = path.join(repoRoot, "infra/docker/.fresh-volume");
const COMPOSE = ["compose", "-f", composeFile];
const withRedis = process.env.DEV_WITH_REDIS === "1" || process.env.DEV_WITH_REDIS === "true";
const OLD_VOLUMES = [
  "docker_mysql_data",
  "docker_redis_data",
  "therapy-platform_mysql_data",
  "therapy-platform_redis_data",
  "therapy-local_mariadb_data"
];
const OLD_IMAGES = ["redis:7", "mariadb:lts", "mariadb:11.4-ubi"];

function run(command, args, inherit = true) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    stdio: inherit ? "inherit" : "pipe",
    encoding: "utf8"
  });
}

function inspect(format, name) {
  const result = run("docker", ["inspect", "-f", format, name], false);
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

function assertDockerDaemon() {
  const result = run("docker", ["info"], false);
  if (result.status === 0) {
    return;
  }
  const detail = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
  process.stderr.write(
    [
      "",
      "[db:up] Docker no responde. Abrí Docker Desktop y esperá a que diga Running,",
      "después volvé a correr: npm run dev",
      detail ? `Detalle: ${detail.split("\n")[0]}` : "",
      ""
    ]
      .filter(Boolean)
      .join("\n")
  );
  process.exit(1);
}

function physicalRamGb() {
  if (process.platform !== "darwin") {
    return null;
  }
  const result = run("sysctl", ["-n", "hw.memsize"], false);
  const bytes = Number((result.stdout ?? "").trim());
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }
  return bytes / 1024 ** 3;
}

function dockerVmRamGb() {
  const result = run("docker", ["info", "--format", "{{.MemTotal}}"], false);
  const bytes = Number((result.stdout ?? "").trim());
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }
  return bytes / 1024 ** 3;
}

function isExpectedEngine() {
  const image = inspect("{{.Config.Image}}", "therapy-mysql");
  if (!image) {
    return false;
  }
  const cmd = inspect("{{json .Config.Cmd}}", "therapy-mysql");
  return image.startsWith("mysql:") && cmd.includes("innodb-buffer-pool-size");
}

function markFreshVolume() {
  writeFileSync(freshFlag, `${new Date().toISOString()}\n`);
}

function warnLowRam() {
  const ram = physicalRamGb();
  const dockerRam = dockerVmRamGb();
  const lines = [];
  if (dockerRam != null && dockerRam > 2.2) {
    lines.push(
      `[db:up] Docker Desktop se reserva ~${dockerRam.toFixed(1)} GB aunque la base use ~320 MB.`,
      "  Eso es lo que aplasta la Mac. Docker Desktop → Settings → Resources → Memory → 1.5 GB → Apply."
    );
  }
  if (ram != null && ram <= 10) {
    lines.push(
      `[db:up] Esta Mac tiene ~${ram.toFixed(0)} GB de RAM. Con Docker + 3 Vite se va a swap.`,
      "  • Usá:  npm run dev          → API + portal paciente",
      "  • No uses npm run dev:all    → landings + mobile + 3 portales"
    );
  }
  if (lines.length) {
    process.stderr.write(`\n${lines.join("\n")}\n\n`);
  }
}

function composeArgs(forceRecreate) {
  const args = [...COMPOSE];
  if (withRedis) {
    args.push("--profile", "with-redis");
  }
  args.push("up", "-d");
  if (forceRecreate) {
    args.push("--force-recreate");
  }
  return args;
}

function composeUp(forceRecreate) {
  process.stderr.write(
    forceRecreate
      ? "[db:up] Recreando la base local en MySQL (el volumen del motor anterior no se reutiliza)...\n"
      : "[db:up] docker compose up -d\n"
  );
  return run("docker", composeArgs(forceRecreate));
}

function pruneOldDockerDisk() {
  if (!withRedis) {
    run("docker", ["rm", "-f", "therapy-redis"], false);
  }
  for (const volume of OLD_VOLUMES) {
    // `docker volume rm -f` sale 0 e imprime el nombre aunque el volumen ya no exista.
    if (run("docker", ["volume", "inspect", volume], false).status !== 0) {
      continue;
    }
    const removed = run("docker", ["volume", "rm", "-f", volume], false);
    if (removed.status === 0) {
      process.stderr.write(`[db:up] Volumen viejo borrado: ${volume}\n`);
    }
  }
  const staleImages = [...OLD_IMAGES];
  if (!withRedis) {
    staleImages.push("redis:7-alpine");
  }
  for (const image of staleImages) {
    if (inspect("{{.Id}}", image) === "") {
      continue;
    }
    const removed = run("docker", ["rmi", "-f", image], false);
    if (removed.status === 0) {
      process.stderr.write(`[db:up] Imagen vieja borrada: ${image}\n`);
    }
  }
}

assertDockerDaemon();
warnLowRam();

const mysqlExists = inspect("{{.State.Status}}", "therapy-mysql") !== "";
const needsEngineSwitch = mysqlExists && !isExpectedEngine();
const volumeResult = run("docker", ["volume", "inspect", "therapy-local_mysql_data"], false);
const freshVolume = volumeResult.status !== 0;

if (needsEngineSwitch) {
  process.stderr.write(
    "[db:up] El contenedor no es MySQL (MariaDB rompe con el error 1020). Lo recreo en MySQL 8.4.\n"
  );
  run("docker", ["rm", "-f", "therapy-mysql", "therapy-redis"], false);
}

let result = composeUp(needsEngineSwitch);
if (result.status !== 0) {
  process.stderr.write("[db:up] Compose falló (nombre de contenedor viejo). Recreando contenedores, no la data nueva...\n");
  run("docker", ["rm", "-f", "therapy-mysql", "therapy-redis"], false);
  result = composeUp(true);
}

if (result.status !== 0) {
  process.exit(1);
}

if (needsEngineSwitch || freshVolume) {
  markFreshVolume();
  process.stderr.write(
    "[db:up] Base nueva: en el próximo paso se aplica el schema Prisma. Después: npm run db:seed\n"
  );
}

pruneOldDockerDisk();
process.stderr.write("Database containers ready.\n");
