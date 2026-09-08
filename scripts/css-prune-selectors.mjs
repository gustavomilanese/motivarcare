#!/usr/bin/env node
/**
 * Borra de una hoja las reglas cuyo selector matchea un patrón, incluidas las que
 * están dentro de `@media`, y limpia los bloques que quedan vacíos.
 *
 * Se usa para sacar CSS muerto o ya movido a un componente compartido, sin editar a
 * mano miles de líneas. Siempre correr después `css-cascade-check.mjs` para confirmar
 * que no se llevó puesto nada más.
 *
 *   node scripts/css-prune-selectors.mjs --pattern '\.locale-controls' <archivo...>
 *   node scripts/css-prune-selectors.mjs --pattern '...' --dry-run <archivo...>
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const patternIndex = args.indexOf("--pattern");
if (patternIndex === -1) {
  console.error("Falta --pattern <regex>");
  process.exit(1);
}
const pattern = new RegExp(args[patternIndex + 1]);
const dryRun = args.includes("--dry-run");
const files = args.filter((arg, index) => {
  if (arg.startsWith("--")) return false;
  if (index === patternIndex + 1) return false;
  return true;
});

/**
 * Dónde empieza el selector dentro del texto previo a la llave.
 *
 * Un selector puede ocupar varias líneas (`.a::before,\n.a::after {`), así que no
 * alcanza con quedarse con la última línea: se corta después del último cierre de
 * regla, punto y coma o comentario.
 */
function selectorStartOf(preludeRaw) {
  let start = 0;
  for (const marker of ["}", ";", "*/"]) {
    const position = preludeRaw.lastIndexOf(marker);
    if (position !== -1) start = Math.max(start, position + marker.length);
  }
  // Los saltos y la sangría entre la regla anterior y el selector son parte del "antes",
  // si no el selector que sobrevive queda pegado a la llave de cierre previa.
  while (start < preludeRaw.length && /\s/.test(preludeRaw[start])) start += 1;
  return start;
}

function selectorTextOf(preludeRaw) {
  return preludeRaw.slice(selectorStartOf(preludeRaw)).trim();
}

/** Recorre el CSS respetando el anidado y reescribe sin las reglas que matchean. */
function prune(css, depth = 0) {
  let output = "";
  let index = 0;
  let removed = 0;
  let trimmed = 0;

  while (index < css.length) {
    const braceStart = css.indexOf("{", index);
    if (braceStart === -1) {
      output += css.slice(index);
      break;
    }

    const preludeRaw = css.slice(index, braceStart);
    const prelude = preludeRaw.trim();

    let level = 1;
    let cursor = braceStart + 1;
    while (cursor < css.length && level > 0) {
      if (css[cursor] === "{") level += 1;
      else if (css[cursor] === "}") level -= 1;
      cursor += 1;
    }
    const body = css.slice(braceStart + 1, cursor - 1);
    const whole = css.slice(index, cursor);

    if (/^@(media|supports|layer|container)/.test(prelude.replace(/^[\s\S]*?(?=@)/, ""))) {
      // Bloque contenedor: se poda adentro y se descarta si queda sin reglas.
      const inner = prune(body, depth + 1);
      removed += inner.removed;
      trimmed += inner.trimmed;
      if (inner.css.trim().length === 0) {
        output += preludeRaw.replace(/[^\n]*$/, "").replace(/\n\s*\n\s*$/, "\n");
      } else {
        output += preludeRaw + "{" + inner.css + "}";
      }
    } else if (prelude && !prelude.startsWith("@") && pattern.test(selectorTextOf(preludeRaw))) {
      const before = preludeRaw.slice(0, selectorStartOf(preludeRaw));
      const selectorText = selectorTextOf(preludeRaw);
      const survivors = selectorText.split(",").filter((part) => part.trim() && !pattern.test(part));

      if (survivors.length > 0) {
        // La regla también estiliza clases que siguen vivas: se van sólo las que matchean.
        output += before + survivors.map((part) => part.trim()).join(",\n") + " {" + body + "}";
        trimmed += 1;
      } else {
        // Se conserva lo que venía antes del selector (comentarios, reglas previas del mismo trozo).
        output += before.replace(/\n\s*\n\s*$/, "\n");
        removed += 1;
      }
    } else {
      output += whole;
    }

    index = cursor;
  }

  return { css: output, removed, trimmed };
}

let totalRemoved = 0;
for (const file of files) {
  const before = readFileSync(file, "utf8");
  const result = prune(before);
  const cleaned = result.css.replace(/\n{3,}/g, "\n\n");
  const linesSaved = before.split("\n").length - cleaned.split("\n").length;
  totalRemoved += result.removed;

  const trimmedNote = result.trimmed > 0 ? `, ${result.trimmed} reglas recortadas` : "";
  console.log(`${file}: ${result.removed} reglas, ${linesSaved} lineas${trimmedNote}${dryRun ? " (dry-run)" : ""}`);
  if (!dryRun && (result.removed > 0 || result.trimmed > 0)) {
    writeFileSync(file, cleaned);
  }
}
console.log(`Total: ${totalRemoved} reglas`);
