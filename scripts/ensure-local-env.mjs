#!/usr/bin/env node
/**
 * Sin .env el API arranca y se cae al primer query (falta DATABASE_URL).
 * Si falta, copiamos desde .env.example para que el local no quede a medias.
 */
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (existsSync(envPath)) {
  process.exit(0);
}

if (!existsSync(examplePath)) {
  process.stderr.write(
    "[env] Falta .env y no hay .env.example. Creá .env en la raíz del repo (Documents/Personal/MotivarCare/therapy-platform).\n"
  );
  process.exit(1);
}

copyFileSync(examplePath, envPath);
process.stderr.write(
  "[env] No había .env: copié .env.example → .env. Revisá DATABASE_URL (MySQL local suele ser mysql://root:root@127.0.0.1:3307/therapy_platform).\n"
);
process.exit(0);
