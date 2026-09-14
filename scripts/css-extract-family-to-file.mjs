#!/usr/bin/env node
/**
 * Saca de una hoja legacy todas las reglas de una familia (p.ej. `.dashboard-ml`)
 * y las escribe en un archivo destino, respetando `@media` / `@supports`.
 *
 * Misma lógica de prelude que `css-prune-selectors.mjs` (comentarios antes de
 * `@media` no rompen el parseo). Después correr `npm run css:check`.
 *
 *   node scripts/css-extract-family-to-file.mjs \
 *     --family dashboard-ml \
 *     --from apps/patient/src/styles/legacy.css \
 *     --to apps/patient/src/modules/home/home.css
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
}

const family = flag("--family");
const fromFile = flag("--from");
const toFile = flag("--to");
const headerRaw = flag("--header");
const header = headerRaw
  ? headerRaw.replace(/\\n/g, "\n").replace(/\\t/g, "\t")
  : null;

if (!family || !fromFile || !toFile) {
  console.error("Uso: --family <prefijo> --from <legacy.css> --to <destino.css>");
  process.exit(1);
}

const pattern = new RegExp(
  `\\.${family.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`
);

function selectorStartOf(preludeRaw) {
  let start = 0;
  for (const marker of ["}", ";", "*/"]) {
    const position = preludeRaw.lastIndexOf(marker);
    if (position !== -1) start = Math.max(start, position + marker.length);
  }
  while (start < preludeRaw.length && /\s/.test(preludeRaw[start])) start += 1;
  return start;
}

function selectorTextOf(preludeRaw) {
  return preludeRaw.slice(selectorStartOf(preludeRaw)).trim();
}

function atrulePrelude(prelude) {
  return prelude.replace(/^[\s\S]*?(?=@)/, "");
}

/**
 * @returns {{ kept: string, extracted: string, removed: number, trimmed: number }}
 */
function extract(css, mediaStack = []) {
  let kept = "";
  let extracted = "";
  let removed = 0;
  let trimmed = 0;
  let index = 0;

  while (index < css.length) {
    const braceStart = css.indexOf("{", index);
    if (braceStart === -1) {
      kept += css.slice(index);
      break;
    }

    const preludeRaw = css.slice(index, braceStart);
    const prelude = preludeRaw.trim();
    const atPrelude = atrulePrelude(prelude);

    let level = 1;
    let cursor = braceStart + 1;
    while (cursor < css.length && level > 0) {
      if (css[cursor] === "{") level += 1;
      else if (css[cursor] === "}") level -= 1;
      cursor += 1;
    }
    const body = css.slice(braceStart + 1, cursor - 1);
    const whole = css.slice(index, cursor);

    if (/^@(media|supports|layer|container)/.test(atPrelude)) {
      const atIndexInRaw = preludeRaw.search(/@(media|supports|layer|container)/);
      const leading = atIndexInRaw > 0 ? preludeRaw.slice(0, atIndexInRaw) : "";
      const atRaw = atIndexInRaw >= 0 ? preludeRaw.slice(atIndexInRaw) : preludeRaw;

      const inner = extract(body, [...mediaStack, atPrelude]);
      removed += inner.removed;
      trimmed += inner.trimmed;

      if (inner.kept.trim().length > 0) {
        kept += leading + atRaw + "{" + inner.kept + "}";
      } else {
        kept += leading.replace(/\n\s*\n\s*$/, "\n");
      }

      if (inner.extracted.trim().length > 0) {
        extracted += `${atPrelude} {\n${inner.extracted}}\n\n`;
      }
    } else if (prelude && !atPrelude.startsWith("@") && pattern.test(selectorTextOf(preludeRaw))) {
      const before = preludeRaw.slice(0, selectorStartOf(preludeRaw));
      const selectorText = selectorTextOf(preludeRaw);

      // No partir listas dentro de :is()/:where(): el split por coma rompe el prelude.
      const isFunctional =
        /:(is|where|not|has)\s*\(/i.test(selectorText) || selectorText.includes(":is(");

      if (isFunctional) {
        const parts = selectorText.split(",").map((part) => part.trim()).filter(Boolean);
        const moveParts = parts.filter((part) => pattern.test(part));
        const keepParts = parts.filter((part) => !pattern.test(part));
        // Si hay partes ajenas a la familia, dejar la regla entera en legacy.
        if (keepParts.length > 0 && moveParts.length > 0) {
          kept += whole;
        } else if (moveParts.length > 0) {
          kept += before.replace(/\n\s*\n\s*$/, "\n");
          removed += 1;
          const indent = "  ".repeat(Math.max(mediaStack.length, 0));
          extracted += `${indent}${selectorText} {${body}}\n`;
        } else {
          kept += whole;
        }
      } else {
        const parts = selectorText.split(",").map((part) => part.trim()).filter(Boolean);
        const moveParts = parts.filter((part) => pattern.test(part));
        const keepParts = parts.filter((part) => !pattern.test(part));

        kept += before;
        if (keepParts.length > 0) {
          kept += keepParts.join(",\n") + " {" + body + "}";
          trimmed += 1;
        } else {
          kept = kept.replace(/\n\s*\n\s*$/, "\n");
          removed += 1;
        }

        const indent = "  ".repeat(Math.max(mediaStack.length, 0));
        const movedSelector = moveParts.join(",\n" + indent);
        extracted += `${indent}${movedSelector} {${body}}\n`;
      }
    } else {
      kept += whole;
    }

    index = cursor;
  }

  return { kept, extracted, removed, trimmed };
}

const source = readFileSync(fromFile, "utf8");
const result = extract(source);
const cleanedKept = result.kept.replace(/\n{3,}/g, "\n\n");
const banner =
  header ??
  `/* Familia .${family} — extraída de ${fromFile}.\n * Importar desde styles/index.css. No mezclar otras pantallas acá.\n */\n\n`;

writeFileSync(toFile, banner + result.extracted.replace(/\n{3,}/g, "\n\n"));
writeFileSync(fromFile, cleanedKept);

const fromLines = cleanedKept.split("\n").length;
const toLines = (banner + result.extracted).split("\n").length;
console.log(
  `${fromFile}: -${result.removed} reglas (recortadas ${result.trimmed}) → ${fromLines} líneas`
);
console.log(`${toFile}: ${toLines} líneas`);
const left = (cleanedKept.match(pattern) || []).length;
const moved = ((banner + result.extracted).match(pattern) || []).length;
console.log(`ocurrencias .${family}: legacy=${left}, destino=${moved}`);
