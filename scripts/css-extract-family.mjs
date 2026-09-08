#!/usr/bin/env node
/**
 * Muestra (o compara entre apps) todas las reglas de una "familia" de clases.
 *
 * Paso previo a mover una familia a un componente compartido: sirve para ver de una
 * si las hojas dicen lo mismo o si cada app tiene sus variantes.
 *
 *   node scripts/css-extract-family.mjs --family 'calendar-consent' --apps patient,professional
 *   node scripts/css-extract-family.mjs --family 'calendar-consent' --apps patient,professional --diff
 */
import { readFileSync } from "node:fs";

const LEGACY = {
  patient: "apps/patient/src/styles/legacy.css",
  professional: "apps/professional/src/styles/legacy.css",
  admin: "apps/admin/src/styles/legacy.css"
};

const family = process.argv[process.argv.indexOf("--family") + 1];
const apps = (process.argv[process.argv.indexOf("--apps") + 1] ?? "patient,professional").split(",");
const diffMode = process.argv.includes("--diff");

if (!family) {
  console.error("Falta --family <prefijo>");
  process.exit(1);
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Reglas de la familia, con el `@media` en el que están si corresponde. */
function rulesFor(css, media = null) {
  const found = [];
  let index = 0;
  while (index < css.length) {
    const braceStart = css.indexOf("{", index);
    if (braceStart === -1) break;
    const prelude = css.slice(index, braceStart).trim();

    let level = 1;
    let cursor = braceStart + 1;
    while (cursor < css.length && level > 0) {
      if (css[cursor] === "{") level += 1;
      else if (css[cursor] === "}") level -= 1;
      cursor += 1;
    }
    const body = css.slice(braceStart + 1, cursor - 1);

    if (/^@(media|supports|layer|container)/.test(prelude)) {
      found.push(...rulesFor(body, prelude));
    } else if (prelude.includes(`.${family}`)) {
      found.push({
        media,
        selector: prelude.replace(/\s+/g, " ").trim(),
        body: body
          .split(";")
          .map((line) => line.replace(/\s+/g, " ").trim())
          .filter(Boolean)
      });
    }

    index = cursor;
  }
  return found;
}

const perApp = new Map();
for (const app of apps) {
  perApp.set(app, rulesFor(stripComments(readFileSync(LEGACY[app], "utf8"))));
}

function keyOf(rule) {
  return `${rule.media ? rule.media + " " : ""}${rule.selector}`;
}

if (!diffMode) {
  for (const [app, rules] of perApp) {
    console.log(`\n######## ${app} (${rules.length} reglas) ########`);
    for (const rule of rules) {
      console.log(`${rule.media ? rule.media + " { " : ""}${rule.selector} {`);
      for (const declaration of rule.body) console.log(`  ${declaration};`);
      console.log(rule.media ? "} }" : "}");
    }
  }
} else {
  const keys = new Set();
  for (const rules of perApp.values()) for (const rule of rules) keys.add(keyOf(rule));

  let identical = 0;
  let onlyOne = 0;
  let different = 0;

  for (const key of [...keys].sort()) {
    const bodies = new Map();
    for (const [app, rules] of perApp) {
      const rule = rules.find((candidate) => keyOf(candidate) === key);
      if (rule) bodies.set(app, rule.body.join("; "));
    }

    if (bodies.size === 1) {
      onlyOne += 1;
      console.log(`\n[solo ${[...bodies.keys()][0]}] ${key}`);
      continue;
    }

    const values = [...bodies.values()];
    if (values.every((value) => value === values[0])) {
      identical += 1;
      console.log(`\n[IDENTICO] ${key}`);
    } else {
      different += 1;
      console.log(`\n[DIFIERE] ${key}`);
      for (const [app, body] of bodies) console.log(`   ${app.padEnd(13)} ${body}`);
    }
  }

  console.log(`\nResumen: ${identical} identicas, ${different} distintas, ${onlyOne} en una sola app.`);
}
