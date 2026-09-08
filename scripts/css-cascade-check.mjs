#!/usr/bin/env node
/**
 * Red de seguridad para mover CSS de `legacy.css` a componentes.
 *
 * Sacar una regla de la hoja gigante y ponerla en un archivo que se importa antes
 * cambia su lugar en la cascada, y eso rompe estilos en silencio. Esta herramienta
 * arma la hoja final de cada app (resolviendo los `@import`) y compara contra una
 * foto previa:
 *
 *   - avisa si alguna regla desapareció o cambió de contenido;
 *   - avisa si una regla se adelantó/atrasó respecto de OTRA que pisa las mismas
 *     propiedades y puede afectar al mismo elemento (el reordenamiento peligroso).
 *
 * Uso:
 *   node scripts/css-cascade-check.mjs --save .tmp/css-before.json
 *   ...mover reglas...
 *   node scripts/css-cascade-check.mjs --compare .tmp/css-before.json
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const APP_ENTRIES = [
  ["patient", "apps/patient/src/styles/index.css"],
  ["professional", "apps/professional/src/styles/index.css"],
  ["admin", "apps/admin/src/styles/index.css"]
];

const UI_PACKAGE_PREFIX = "@therapy/ui/";
const UI_PACKAGE_DIR = "packages/ui/src/";

function resolveImport(specifier, fromFile) {
  if (specifier.startsWith(UI_PACKAGE_PREFIX)) {
    return resolve(UI_PACKAGE_DIR + specifier.slice(UI_PACKAGE_PREFIX.length));
  }
  return resolve(dirname(fromFile), specifier);
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Concatena la hoja siguiendo los `@import` en orden, igual que hace el bundler. */
function flattenImports(entryPath) {
  const parts = [];

  function visit(filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`No existe la hoja importada: ${filePath}`);
    }
    const css = stripComments(readFileSync(filePath, "utf8"));
    const importPattern = /@import\s+(?:url\()?["']([^"']+)["']\)?[^;]*;/g;

    let lastIndex = 0;
    let match;
    while ((match = importPattern.exec(css)) !== null) {
      parts.push({ file: filePath, css: css.slice(lastIndex, match.index) });
      visit(resolveImport(match[1], filePath));
      lastIndex = importPattern.lastIndex;
    }
    parts.push({ file: filePath, css: css.slice(lastIndex) });
  }

  visit(resolve(entryPath));
  return parts;
}

function normalizeSelector(selector) {
  return selector.replace(/\s+/g, " ").trim();
}

/** Declaraciones en orden de aparición: importa cuál gana, no cómo está formateado. */
function parseDeclarations(body) {
  const declarations = [];
  for (const chunk of body.split(";")) {
    const text = chunk.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const colon = text.indexOf(":");
    if (colon === -1) continue;
    declarations.push([text.slice(0, colon).trim().toLowerCase(), text.slice(colon + 1).trim()]);
  }
  return declarations;
}

function parseRules(css, file, media, sink) {
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

    if (/^@(media|supports|layer|container)/.test(prelude)) {
      parseRules(body, file, media ? `${media} && ${prelude}` : prelude, sink);
    } else if (prelude.startsWith("@")) {
      // `@keyframes`, `@font-face`: no participan de la cascada por selector.
      sink.push({ file, media, selector: prelude, declarations: parseDeclarations(body), atRule: true });
    } else if (prelude) {
      sink.push({
        file,
        media,
        selector: normalizeSelector(prelude),
        declarations: parseDeclarations(body),
        atRule: false
      });
    }

    index = cursor;
  }
}

function buildRules(entryPath) {
  const rules = [];
  for (const part of flattenImports(entryPath)) {
    parseRules(part.css, part.file, null, rules);
  }
  return rules.map((rule, order) => ({ ...rule, order }));
}

function ruleKey(rule) {
  return `${rule.media ?? ""}||${rule.selector}||${rule.declarations.map(([p, v]) => `${p}:${v}`).join(";")}`;
}

/** Tokens de clase/elemento, para estimar si dos reglas pueden pegarle al mismo nodo. */
function selectorTokens(selector) {
  const tokens = new Set();
  for (const match of selector.matchAll(/\.([a-z0-9_-]+)/gi)) tokens.add(`.${match[1].toLowerCase()}`);
  for (const match of selector.matchAll(/(^|[\s,>+~])([a-z][a-z0-9]*)/gi)) tokens.add(match[2].toLowerCase());
  if (selector.includes("*")) tokens.add("*");
  return tokens;
}

/**
 * Especificidad (ids, clases/atributos/pseudo-clases, elementos/pseudo-elementos).
 * Si dos reglas tienen distinta especificidad, el orden entre ellas no decide nada:
 * gana siempre la más específica. Sólo importa reordenar reglas con la misma.
 */
function specificityOf(selector) {
  let best = [0, 0, 0];
  for (const part of selector.split(",")) {
    const clean = part.replace(/\s+/g, " ").trim();
    if (!clean) continue;

    const ids = (clean.match(/#[a-z0-9_-]+/gi) ?? []).length;
    const classes =
      (clean.match(/\.[a-z0-9_-]+/gi) ?? []).length +
      (clean.match(/\[[^\]]*\]/g) ?? []).length +
      (clean.match(/:(?!:)(?!(?:before|after|first-line|first-letter)\b)[a-z-]+(?:\([^)]*\))?/gi) ?? []).length;
    const elements =
      (clean.match(/(^|[\s>+~])([a-z][a-z0-9]*)/gi) ?? []).length +
      (clean.match(/::[a-z-]+/gi) ?? []).length +
      (clean.match(/:(?:before|after|first-line|first-letter)\b/gi) ?? []).length;

    const current = [ids, classes, elements];
    if (current[0] > best[0] || (current[0] === best[0] && (current[1] > best[1] || (current[1] === best[1] && current[2] > best[2])))) {
      best = current;
    }
  }
  return best.join(",");
}

/**
 * "Sujeto" de un selector: el último compuesto, o sea el elemento que realmente estiliza.
 * En `.card .title span` el sujeto es `span`.
 */
function subjectsOf(selector) {
  return selector
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((part) => {
      const last = part.split(/[\s>+~]+/).filter(Boolean).pop() ?? part;
      const tag = last.match(/^([a-z][a-z0-9]*)/i);
      return {
        tag: tag ? tag[1].toLowerCase() : null,
        classes: new Set((last.match(/\.[a-z0-9_-]+/gi) ?? []).map((name) => name.toLowerCase())),
        universal: last.includes("*")
      };
    });
}

/**
 * ¿Pueden las dos reglas caer sobre el mismo elemento?
 *
 * Devuelve `false` (imposible) cuando los sujetos son etiquetas distintas: un `p` y un
 * `h2` nunca son el mismo nodo. Cuando las clases del sujeto no se solapan es
 * "posible pero improbable" (haría falta un elemento con las dos clases): eso se
 * reporta aparte para revisar, no como error.
 */
function collisionKind(a, b) {
  if (a.selector === b.selector) return "seguro";

  let best = null;
  for (const subjectA of subjectsOf(a.selector)) {
    for (const subjectB of subjectsOf(b.selector)) {
      if (subjectA.universal || subjectB.universal) return "seguro";
      if (subjectA.tag && subjectB.tag && subjectA.tag !== subjectB.tag) continue;

      // Sólo son el mismo elemento con seguridad si un conjunto de clases contiene al otro
      // (`.btn` y `.btn.primary`). Compartir un modificador suelto como `.active` no alcanza:
      // `.preferences-option.active` y `.sidebar-link.active` son elementos distintos.
      const subsetRelation =
        [...subjectA.classes].every((name) => subjectB.classes.has(name)) ||
        [...subjectB.classes].every((name) => subjectA.classes.has(name));
      if (!subsetRelation) {
        best = best ?? "posible";
        continue;
      }

      // Mismo tipo de elemento, pero cada regla lo busca dentro de un contenedor distinto:
      // sólo chocan si esos contenedores están anidados uno dentro del otro.
      const ancestorsA = ancestorClassesOf(a.selector, subjectA);
      const ancestorsB = ancestorClassesOf(b.selector, subjectB);
      const disjointContext =
        ancestorsA.size > 0 &&
        ancestorsB.size > 0 &&
        ![...ancestorsA].some((name) => ancestorsB.has(name));

      if (disjointContext) {
        best = best ?? "posible";
        continue;
      }
      return "seguro";
    }
  }
  return best;
}

/** Clases que acotan el contexto del sujeto (todo lo que está a su izquierda). */
function ancestorClassesOf(selector, subject) {
  const classes = new Set();
  for (const part of selector.split(",")) {
    const pieces = part.replace(/\s+/g, " ").trim().split(/[\s>+~]+/).filter(Boolean);
    const last = pieces.pop();
    if (!last) continue;
    const lastClasses = new Set((last.match(/\.[a-z0-9_-]+/gi) ?? []).map((name) => name.toLowerCase()));
    const sameSubject =
      [...lastClasses].every((name) => subject.classes.has(name)) && lastClasses.size === subject.classes.size;
    if (!sameSubject) continue;
    for (const piece of pieces) {
      for (const name of piece.match(/\.[a-z0-9_-]+/gi) ?? []) classes.add(name.toLowerCase());
    }
  }
  return classes;
}

function snapshot() {
  const result = {};
  for (const [app, entry] of APP_ENTRIES) {
    result[app] = buildRules(entry).map((rule) => ({
      media: rule.media,
      selector: rule.selector,
      declarations: rule.declarations,
      atRule: rule.atRule
    }));
  }
  return result;
}

/**
 * Resultado efectivo por selector: lo que realmente ve el navegador.
 *
 * Se compara esto y no cada regla suelta, porque partir una regla en "base compartida +
 * override de la app" cambia las reglas pero no el resultado, y eso es exactamente lo
 * que hace esta migración.
 */
function effectiveBySelector(rules) {
  const result = new Map();
  for (const rule of rules) {
    if (rule.atRule) continue;
    // `A, B { ... }` son dos selectores independientes: si después se separan o se junta
    // uno con otra regla, el efecto no cambia y no debe reportarse como diferencia.
    for (const part of rule.selector.split(",")) {
      const selector = part.replace(/\s+/g, " ").trim();
      if (!selector) continue;

      const key = `${rule.media ?? ""}||${selector}`;
      if (!result.has(key)) {
        result.set(key, { media: rule.media ?? "", selector, declarations: new Map(), lastOrder: rule.order });
      }
      const entry = result.get(key);
      // Última declaración gana, igual que en la cascada.
      for (const [property, value] of rule.declarations) entry.declarations.set(property, value);
      entry.lastOrder = rule.order;
    }
  }
  return result;
}

function compare(previous) {
  let problems = 0;

  for (const [app, entry] of APP_ENTRIES) {
    const before = (previous[app] ?? []).map((rule, order) => ({ ...rule, order }));
    const after = buildRules(entry);

    const beforeKeys = effectiveBySelector(before);
    const afterKeys = effectiveBySelector(after);

    const removedAll = [...beforeKeys.keys()].filter((key) => !afterKeys.has(key));
    // Borrados declarados a propósito (CSS muerto): se listan aparte, no cuentan como error.
    const removed = removedAll.filter((key) => !allowRemoved.some((rule) => rule.test(key.split("||")[1])));
    const intentional = removedAll.length - removed.length;
    const added = [...afterKeys.keys()].filter((key) => !beforeKeys.has(key));

    const changed = [];
    for (const [key, ruleAfter] of afterKeys) {
      const ruleBefore = beforeKeys.get(key);
      if (!ruleBefore) continue;
      const properties = new Set([...ruleBefore.declarations.keys(), ...ruleAfter.declarations.keys()]);
      const differences = [...properties].filter(
        (property) => ruleBefore.declarations.get(property) !== ruleAfter.declarations.get(property)
      );
      if (differences.length > 0) changed.push({ key, differences });
    }

    // Reordenamiento peligroso: la regla movida cruzó a otra que pisa las mismas
    // propiedades y comparte selector o clase.
    //
    // Comparar todas contra todas son millones de pares, así que sólo se miran las
    // reglas que cambiaron de posición, y contra las candidatas que comparten algún
    // token de selector (índice invertido).
    const risky = [];
    const review = [];
    const common = [...afterKeys.keys()].filter((key) => beforeKeys.has(key));

    const byToken = new Map();
    for (const key of common) {
      for (const token of selectorTokens(afterKeys.get(key).selector)) {
        if (!byToken.has(token)) byToken.set(token, []);
        byToken.get(token).push(key);
      }
    }
    const universalKeys = common.filter((key) => selectorTokens(afterKeys.get(key).selector).has("*"));

    const moved = common.filter((key) => beforeKeys.get(key).lastOrder !== afterKeys.get(key).lastOrder);

    for (const key of moved) {
      const ruleBefore = beforeKeys.get(key);
      const ruleAfter = afterKeys.get(key);
      const properties = new Set(ruleAfter.declarations.keys());
      if (properties.size === 0) continue;

      const candidates = new Set(universalKeys);
      for (const token of selectorTokens(ruleAfter.selector)) {
        for (const candidate of byToken.get(token) ?? []) candidates.add(candidate);
      }

      for (const otherKey of candidates) {
        if (otherKey === key) continue;
        const otherBefore = beforeKeys.get(otherKey);
        const otherAfter = afterKeys.get(otherKey);
        if (ruleBefore.media !== otherBefore.media) continue;

        const wasBefore = ruleBefore.lastOrder < otherBefore.lastOrder;
        const isBefore = ruleAfter.lastOrder < otherAfter.lastOrder;
        if (wasBefore === isBefore) continue;

        const overlap = [...otherAfter.declarations.keys()].filter((property) => properties.has(property));
        if (overlap.length === 0) continue;
        if (specificityOf(ruleAfter.selector) !== specificityOf(otherAfter.selector)) continue;

        const kind = collisionKind(ruleAfter, otherAfter);
        if (!kind) continue;

        const entry = { moved: ruleAfter.selector, against: otherAfter.selector, properties: overlap };
        const verified = allowCrossing.some(
          (rule) => rule.test(entry.moved) || rule.test(entry.against)
        );
        if (verified) continue;
        if (kind === "seguro") risky.push(entry);
        else review.push(entry);
      }
    }

    const clean = removed.length === 0 && added.length === 0 && changed.length === 0 && risky.length === 0;
    const note = intentional > 0 ? ` (${intentional} borrados a proposito)` : "";
    console.log(`\n${app}: ${afterKeys.size} selectores${note} ${clean ? "— resultado identico" : ""}`);

    if (removed.length > 0) {
      problems += removed.length;
      console.log(`  DESAPARECIERON ${removed.length} selectores:`);
      for (const key of removed.slice(0, 12)) console.log(`    - ${key.split("||")[1]}`);
      if (removedOut) {
        // Listado completo a archivo, para cruzarlo contra la lista de borrado aprobada.
        appendFileSync(removedOut, removed.map((key) => `${app}\t${key.split("||")[1]}`).join("\n") + "\n");
      }
    }
    if (added.length > 0) {
      console.log(`  selectores nuevos: ${added.length}`);
      for (const key of added.slice(0, 12)) console.log(`    + ${key.split("||")[1]}`);
    }
    if (changed.length > 0) {
      problems += changed.length;
      console.log(`  CAMBIO EL RESULTADO en ${changed.length} selectores:`);
      for (const item of changed.slice(0, 12)) {
        console.log(`    * ${item.key.split("||")[1]} -> ${item.differences.join(", ")}`);
      }
    }
    if (risky.length > 0) {
      problems += risky.length;
      console.log(`  REORDENAMIENTOS RIESGOSOS: ${risky.length}`);
      const seen = new Set();
      for (const item of risky) {
        const line = `    ! "${item.moved}" cruzó a "${item.against}" en: ${item.properties.join(", ")}`;
        if (seen.has(line)) continue;
        seen.add(line);
        if (seen.size <= 15) console.log(line);
      }
    }
    if (review.length > 0) {
      // Sólo afectaría a un elemento que tenga las dos clases a la vez: mirar y seguir.
      const pairs = new Set(review.map((item) => `${item.moved} / ${item.against}`));
      console.log(`  para mirar (harian falta ambas clases en el mismo elemento): ${pairs.size}`);
      for (const pair of [...pairs].slice(0, 8)) console.log(`    ? ${pair}`);
    }
  }

  console.log(problems === 0 ? "\nOK: la cascada final es equivalente." : `\nRevisar: ${problems} hallazgos.`);
  return problems === 0 ? 0 : 1;
}

const saveIndex = process.argv.indexOf("--save");
const compareIndex = process.argv.indexOf("--compare");

/**
 * Excepciones ya revisadas. Viven en `css-migration.config.json` con el motivo de cada
 * una, así el próximo que corra esto no vuelve a investigar lo mismo. Se pueden sumar
 * más desde la línea de comandos con `--allow-removed` / `--allow-crossing`.
 */
function configuredExceptions(field) {
  const path = resolve("scripts/css-migration.config.json");
  if (!existsSync(path)) return [];
  const config = JSON.parse(readFileSync(path, "utf8"));
  return (config[field] ?? []).map((entry) => new RegExp(entry.selector));
}

function flagValues(flag) {
  return process.argv
    .map((arg, index) => (arg === flag ? process.argv[index + 1] : null))
    .filter(Boolean)
    .map((source) => new RegExp(source));
}

/** `--removed-out <archivo>`: vuelca todos los selectores que desaparecieron. */
const removedOutIndex = process.argv.indexOf("--removed-out");
const removedOut = removedOutIndex === -1 ? null : resolve(process.argv[removedOutIndex + 1]);
if (removedOut && existsSync(removedOut)) rmSync(removedOut);

const allowRemoved = [...configuredExceptions("allowRemoved"), ...flagValues("--allow-removed")];
const allowCrossing = [...configuredExceptions("allowCrossing"), ...flagValues("--allow-crossing")];

if (saveIndex !== -1) {
  const target = process.argv[saveIndex + 1];
  mkdirSync(dirname(resolve(target)), { recursive: true });
  writeFileSync(resolve(target), JSON.stringify(snapshot()));
  const counts = Object.entries(snapshot()).map(([app, rules]) => `${app}: ${rules.length}`);
  console.log(`Foto guardada en ${target} (${counts.join(", ")})`);
} else if (compareIndex !== -1) {
  const source = process.argv[compareIndex + 1];
  process.exit(compare(JSON.parse(readFileSync(resolve(source), "utf8"))));
} else {
  console.log("Uso: --save <archivo> | --compare <archivo>");
  process.exit(1);
}
