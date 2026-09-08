#!/usr/bin/env node
/**
 * Reporte de duplicación entre las hojas `legacy.css` de los portales.
 *
 * Sirve para decidir qué mover a componentes compartidos: prioriza lo que está
 * escrito igual en dos o tres apps, que es lo que hoy hay que tocar por triplicado.
 *
 *   node scripts/css-duplication-report.mjs [--selectors <n>]
 */
import { readFileSync } from "node:fs";

const APPS = [
  ["patient", "apps/patient/src/styles/legacy.css"],
  ["professional", "apps/professional/src/styles/legacy.css"],
  ["admin", "apps/admin/src/styles/legacy.css"]
];

/** Divide una hoja en reglas `{ selector, body, media }`, entrando en los `@media`. */
function parseRules(css, media = null) {
  const rules = [];
  let index = 0;

  while (index < css.length) {
    const braceStart = css.indexOf("{", index);
    if (braceStart === -1) break;

    const prelude = css.slice(index, braceStart).trim();

    let depth = 1;
    let cursor = braceStart + 1;
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === "{") depth += 1;
      else if (css[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    const body = css.slice(braceStart + 1, cursor - 1);

    if (prelude.startsWith("@media") || prelude.startsWith("@supports") || prelude.startsWith("@layer")) {
      rules.push(...parseRules(body, prelude));
    } else if (prelude && !prelude.startsWith("@")) {
      rules.push({ selector: normalizeSelector(prelude), body: normalizeBody(body), media });
    }

    index = cursor;
  }

  return rules;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalizeSelector(selector) {
  return selector.replace(/\s+/g, " ").trim();
}

/** Normaliza el bloque para que diferencias de formato no cuenten como reglas distintas. */
function normalizeBody(body) {
  return body
    .split(";")
    .map((declaration) => declaration.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(";");
}

function keyOf(rule) {
  return `${rule.media ?? ""}||${rule.selector}`;
}

const selectorLimit = Number(process.argv[process.argv.indexOf("--selectors") + 1]) || 40;

/** selector -> app -> lista de cuerpos */
const bySelector = new Map();
const totals = new Map();

for (const [app, path] of APPS) {
  const rules = parseRules(stripComments(readFileSync(path, "utf8")));
  totals.set(app, rules.length);
  for (const rule of rules) {
    const key = keyOf(rule);
    if (!bySelector.has(key)) bySelector.set(key, new Map());
    const perApp = bySelector.get(key);
    if (!perApp.has(app)) perApp.set(app, []);
    perApp.get(app).push(rule.body);
  }
}

const shared = [];
for (const [key, perApp] of bySelector) {
  if (perApp.size < 2) continue;
  const bodies = [...perApp.values()].map((list) => list[0]);
  const identical = bodies.every((body) => body === bodies[0]);
  shared.push({
    key,
    apps: [...perApp.keys()],
    identical,
    weight: bodies[0].split(";").filter(Boolean).length
  });
}

shared.sort((a, b) => b.apps.length - a.apps.length || b.weight - a.weight);

const inThree = shared.filter((entry) => entry.apps.length === 3);
const inTwo = shared.filter((entry) => entry.apps.length === 2);

console.log("Reglas por hoja:");
for (const [app, count] of totals) console.log(`  ${app.padEnd(13)} ${count}`);

console.log(`\nSelectores repetidos en las 3 apps: ${inThree.length}`);
console.log(`  de esos, con el MISMO cuerpo: ${inThree.filter((entry) => entry.identical).length}`);
console.log(`Selectores repetidos en 2 apps: ${inTwo.length}`);
console.log(`  de esos, con el MISMO cuerpo: ${inTwo.filter((entry) => entry.identical).length}`);

console.log(`\nTop ${selectorLimit} candidatos a compartir (los mas pesados primero):`);
for (const entry of shared.slice(0, selectorLimit)) {
  const where = entry.apps.join("+");
  const same = entry.identical ? "identico" : "difiere ";
  console.log(`  [${entry.apps.length}x ${same}] ${String(entry.weight).padStart(3)} props  ${where.padEnd(28)} ${entry.key.replace("||", " ")}`);
}

/** Agrupa por prefijo de clase para ver qué "familia" de componente conviene extraer. */
const families = new Map();
for (const entry of shared) {
  const match = entry.key.match(/\.([a-z0-9]+(?:-[a-z0-9]+)?)/i);
  if (!match) continue;
  const family = match[1];
  if (!families.has(family)) families.set(family, { selectors: 0, props: 0, apps: new Set() });
  const bucket = families.get(family);
  bucket.selectors += 1;
  bucket.props += entry.weight;
  for (const app of entry.apps) bucket.apps.add(app);
}

const rankedFamilies = [...families.entries()]
  .filter(([, bucket]) => bucket.selectors > 2)
  .sort((a, b) => b[1].props - a[1].props)
  .slice(0, 25);

console.log("\nFamilias con mas peso duplicado (candidatas a componente compartido):");
for (const [family, bucket] of rankedFamilies) {
  console.log(
    `  ${family.padEnd(22)} ${String(bucket.selectors).padStart(3)} selectores  ${String(bucket.props).padStart(4)} props  en ${[...bucket.apps].join("+")}`
  );
}
