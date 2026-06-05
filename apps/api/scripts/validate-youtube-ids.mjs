/**
 * Valida IDs de YouTube vía oEmbed. Uso: node apps/api/scripts/validate-youtube-ids.mjs id1 id2 ...
 * Sin args: lee VIDEO_IDS_BY_CATEGORY del build script.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function checkId(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { id, ok: false, status: res.status };
    const data = await res.json();
    return { id, ok: true, title: data.title?.slice(0, 80) };
  } catch (e) {
    return { id, ok: false, error: String(e) };
  }
}

function idsFromBuildScript() {
  const src = readFileSync(path.join(__dirname, "build-relaxation-catalog.mjs"), "utf8");
  const matches = [...src.matchAll(/"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]);
  return [...new Set(matches)];
}

function idsFromFile(filePath) {
  const raw = readFileSync(filePath, "utf8");
  return [...new Set(raw.split(/\s+/).map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_-]{11}$/.test(s)))];
}

const fileArg = process.argv.find((a) => a.startsWith("--file="));
const ids = fileArg
  ? idsFromFile(fileArg.slice("--file=".length))
  : process.argv.length > 2
    ? process.argv.slice(2).filter((s) => !s.startsWith("--"))
    : idsFromBuildScript();
const results = [];
for (const id of ids) {
  results.push(await checkId(id));
  await new Promise((r) => setTimeout(r, 80));
}

const ok = results.filter((r) => r.ok);
const bad = results.filter((r) => !r.ok);
console.log(JSON.stringify({ total: ids.length, ok: ok.length, bad: bad.length, okIds: ok.map((r) => r.id), badIds: bad.map((r) => r.id), details: results }, null, 2));
