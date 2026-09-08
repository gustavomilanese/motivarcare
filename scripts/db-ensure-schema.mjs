#!/usr/bin/env node
/**
 * Si db:up acaba de crear una base vacía (MariaDB nueva), aplica el schema Prisma.
 */
import { existsSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const freshFlag = path.join(repoRoot, "infra/docker/.fresh-volume");

if (!existsSync(freshFlag)) {
  process.exit(0);
}

process.stderr.write("[db] Base local nueva. Aplicando schema Prisma...\n");
const result = spawnSync("npm", ["run", "prisma:push", "-w", "@therapy/api"], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env
});

if (result.status !== 0) {
  process.stderr.write(
    "[db] prisma:push falló. Cuando MariaDB esté up: npm run db:push && npm run db:seed\n"
  );
  process.exit(result.status ?? 1);
}

unlinkSync(freshFlag);
process.stderr.write("[db] Schema OK. Usuarios demo: npm run db:seed\n");
