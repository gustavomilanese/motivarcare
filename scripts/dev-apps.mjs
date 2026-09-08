#!/usr/bin/env node
/**
 * Levanta el API + los portales que pidas, en cualquier combinación:
 *   npm run dev:pick professional          → API + profesional
 *   npm run dev:pick patient admin         → API + paciente + admin
 * Los fronts esperan a que el API acepte TCP en :4000 antes de arrancar.
 */
import { spawn } from "node:child_process";

const APPS = {
  patient: { label: "PATIENT", color: "magenta", script: "dev:patient", port: 5173 },
  professional: { label: "PRO", color: "green", script: "dev:professional", port: 5174 },
  admin: { label: "ADMIN", color: "yellow", script: "dev:admin", port: 5175 },
  landing: { label: "LANDING", color: "blue", script: "dev:patient-landing", port: 5172 },
  mobile: { label: "MOBILE", color: "white", script: "dev:patient-mobile", port: null }
};

const ALIASES = {
  paciente: "patient",
  pac: "patient",
  pro: "professional",
  profesional: "professional",
  paciente_mobile: "mobile",
  movil: "mobile",
  land: "landing"
};

function resolveApp(raw) {
  const key = raw.trim().toLowerCase();
  return ALIASES[key] ?? key;
}

const requested = process.argv.slice(2).map(resolveApp).filter(Boolean);
const unique = [...new Set(requested)];
const unknown = unique.filter((app) => !(app in APPS));

if (unique.length === 0 || unknown.length > 0) {
  if (unknown.length > 0) {
    process.stderr.write(`[dev:pick] No conozco: ${unknown.join(", ")}\n`);
  }
  process.stderr.write(
    [
      "",
      "Uso: npm run dev:pick <apps...>",
      `Apps: ${Object.keys(APPS).join(", ")}  (alias: pro, paciente, movil, land)`,
      "",
      "Ejemplos:",
      "  npm run dev:pick professional          → API + profesional",
      "  npm run dev:pick patient professional  → API + paciente + profesional",
      "",
      "Atajos que ya existen: npm run dev (API + paciente), npm run dev:portals (los 3).",
      ""
    ].join("\n")
  );
  process.exit(unknown.length > 0 ? 1 : 0);
}

const names = ["API", ...unique.map((app) => APPS[app].label)];
const colors = ["cyan", ...unique.map((app) => APPS[app].color)];
const commands = [
  "npm run dev:api:serve",
  ...unique.map((app) => `wait-on -t 120000 tcp:127.0.0.1:4000 && npm run ${APPS[app].script}`)
];

for (const app of unique) {
  const { label, port } = APPS[app];
  process.stderr.write(port ? `[dev:pick] ${label} → http://localhost:${port}\n` : `[dev:pick] ${label} (Expo)\n`);
}

const child = spawn(
  "npx",
  ["concurrently", "-n", names.join(","), "-c", colors.join(","), ...commands],
  { stdio: "inherit" }
);

child.on("exit", (code) => process.exit(code ?? 0));
