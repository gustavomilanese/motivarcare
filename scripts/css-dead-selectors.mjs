#!/usr/bin/env node
/**
 * Busca clases CSS que ya no usa ningún componente.
 *
 * Es deliberadamente conservador: una clase se marca como muerta sólo si su nombre
 * exacto no aparece en NINGÚN archivo fuente. Si el código arma nombres por
 * concatenación (`pro-card--${variant}`), la clase se reporta como "dudosa" y no se
 * toca. Ante la duda, no borrar: revisar a mano.
 *
 *   node scripts/css-dead-selectors.mjs [--app patient] [--list]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const APPS = {
  patient: { css: ["apps/patient/src/styles/legacy.css"], sources: ["apps/patient/src", "packages"] },
  professional: { css: ["apps/professional/src/styles/legacy.css"], sources: ["apps/professional/src", "packages"] },
  admin: { css: ["apps/admin/src/styles/legacy.css"], sources: ["apps/admin/src", "packages"] }
};

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".mdx", ".md"]);
const SKIP_DIRECTORIES = new Set(["node_modules", "dist", "build", ".git", "coverage", ".next"]);

function collectSources(root) {
  const chunks = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (SKIP_DIRECTORIES.has(entry)) continue;
      const path = join(current, entry);
      const stats = statSync(path);
      if (stats.isDirectory()) stack.push(path);
      else if (SOURCE_EXTENSIONS.has(extname(path))) chunks.push(readFileSync(path, "utf8"));
    }
  }
  return chunks.join("\n");
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Todas las clases que define la hoja, con las líneas que ocupa cada una. */
function collectClasses(cssFiles) {
  const classes = new Map();
  for (const file of cssFiles) {
    const css = stripComments(readFileSync(file, "utf8"));
    const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
    let match;
    while ((match = rulePattern.exec(css)) !== null) {
      const prelude = match[1].trim();
      if (!prelude || prelude.startsWith("@")) continue;
      const lines = match[0].split("\n").length;
      for (const found of prelude.matchAll(/\.([a-zA-Z0-9_-]+)/g)) {
        const name = found[1];
        if (!classes.has(name)) classes.set(name, { rules: 0, lines: 0 });
        const entry = classes.get(name);
        entry.rules += 1;
        entry.lines += lines;
      }
    }
  }
  return classes;
}

/** ¿El código arma este nombre por partes? Ej: `pro-card--${variant}`. */
function builtDynamically(name, source) {
  // Por prefijo: `pro-card--${variant}`.
  let candidate = name;
  while (candidate.length > 3) {
    const cut = Math.max(candidate.lastIndexOf("-"), candidate.lastIndexOf("_"));
    if (cut <= 0) break;

    const prefix = candidate.slice(0, cut + 1);
    if (source.includes(prefix + "${") || source.includes(prefix + '" +') || source.includes(prefix + "' +")) {
      return true;
    }
    // Sin el separador, si no el prefijo no se acorta nunca y el bucle no termina.
    candidate = candidate.slice(0, cut);
  }

  // Por sufijo: `${base}-card`.
  let index = name.indexOf("-");
  while (index !== -1) {
    const suffix = name.slice(index);
    if (source.includes("}" + suffix) || source.includes('" + ' + suffix) || source.includes("+ \"" + suffix)) {
      return true;
    }
    index = name.indexOf("-", index + 1);
  }

  return false;
}

const appArgument = process.argv[process.argv.indexOf("--app") + 1];
const wanted = APPS[appArgument] ? [appArgument] : Object.keys(APPS);
const showList = process.argv.includes("--list");

const sourceCache = new Map();
function sourcesFor(paths) {
  const key = paths.join("|");
  if (!sourceCache.has(key)) {
    const text = paths.map(collectSources).join("\n");
    // Índice de tokens: buscar cada clase dentro del texto entero es inviable con miles de clases.
    const tokens = new Set(text.match(/[A-Za-z0-9_-]+/g) ?? []);
    sourceCache.set(key, { text, tokens });
  }
  return sourceCache.get(key);
}

for (const app of wanted) {
  const config = APPS[app];
  const source = sourcesFor(config.sources);
  const classes = collectClasses(config.css);

  const dead = [];
  const uncertain = [];
  for (const [name, stats] of classes) {
    if (source.tokens.has(name)) continue;
    if (builtDynamically(name, source.text)) uncertain.push({ name, ...stats });
    else dead.push({ name, ...stats });
  }

  dead.sort((a, b) => b.lines - a.lines);
  const deadLines = dead.reduce((total, item) => total + item.lines, 0);

  console.log(`\n${app}: ${classes.size} clases definidas`);
  console.log(`  sin ningun uso:  ${dead.length} clases  (~${deadLines} lineas)`);
  console.log(`  dudosas (nombre armado en runtime): ${uncertain.length}`);

  if (process.argv.includes("--dump")) {
    console.log("  sin uso:");
    for (const item of dead) console.log(`    ${item.name.padEnd(46)} ${item.rules} reglas, ~${item.lines} lineas`);
    console.log("  dudosas (NO borrar sin mirar: el nombre se arma en runtime):");
    for (const item of uncertain) console.log(`    ${item.name}`);
  }

  if (showList) {
    const families = new Map();
    for (const item of dead) {
      const family = item.name.split(/[-_]/).slice(0, 2).join("-");
      if (!families.has(family)) families.set(family, { classes: 0, lines: 0 });
      families.get(family).classes += 1;
      families.get(family).lines += item.lines;
    }
    const ranked = [...families.entries()].sort((a, b) => b[1].lines - a[1].lines).slice(0, 20);
    console.log("  familias muertas mas pesadas:");
    for (const [family, stats] of ranked) {
      console.log(`    ${family.padEnd(28)} ${String(stats.classes).padStart(3)} clases  ~${stats.lines} lineas`);
    }
  }
}
