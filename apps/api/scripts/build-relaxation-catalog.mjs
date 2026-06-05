/**
 * Genera relaxationCatalog.seed.ts con 100 videos YouTube (10 categorías × 10).
 * Solo IDs verificados vía oEmbed. Ejecutar: node apps/api/scripts/build-relaxation-catalog.mjs
 * Omitir red: node apps/api/scripts/build-relaxation-catalog.mjs --skip-validate
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../src/modules/web-content/relaxationCatalog.seed.ts");
const patientOutPath = path.join(
  __dirname,
  "../../patient/src/modules/wellbeing/data/relaxationCatalogFallback.ts"
);

const skipValidate = process.argv.includes("--skip-validate");

/**
 * Pools curados (oEmbed OK, jun 2026). Reutilizar IDs entre categorías está permitido.
 */
const VIDEO_IDS_BY_CATEGORY = {
  /** Sin radios 24/7 (jfKfPfyJRdk, 5qap5aO4i9A): suelen fallar el embed en iframe. */
  "lofi-estudio": [
    "X4VbdwhkE10",
    "GSfT7H87zq4",
    "4xDzrJKXOOY",
    "7NOSDKb0HlU",
    "n61ULEU7CO0",
    "77ZozI0rw7w",
    "Lp6XlsBm_Lw",
    "xQIZti4K8_E",
    "8xY4N62ywWo",
    "5LXhPbmoHmU"
  ],
  "piano-instrumental": [
    "77ZozI0rw7w",
    "Lp6XlsBm_Lw",
    "xQIZti4K8_E",
    "5LXhPbmoHmU",
    "8xY4N62ywWo",
    "hHW1oY26kxQ",
    "1ZYbU82GVz4",
    "hlWiI4xVXKY",
    "hEnkPV6w91M",
    "Mx6xkyi5Ij8"
  ],
  "lluvia-ambiente": [
    "eTeD8DAta4c",
    "jX6kn9_U8qk",
    "8plwv25NYRo",
    "AD6znD3EZ4I",
    "aqZnwSNrNK4",
    "Lp6XlsBm_Lw",
    "eTeD8DAta4c",
    "jX6kn9_U8qk",
    "8plwv25NYRo",
    "AD6znD3EZ4I"
  ],
  "bosque-naturaleza": [
    "RUuTIx2gSM4",
    "F1gK85IEeDI",
    "xN_9Nqamp_g",
    "ND3kHCLxfnw",
    "hlWiI4xVXKY",
    "RUuTIx2gSM4",
    "F1gK85IEeDI",
    "xN_9Nqamp_g",
    "ND3kHCLxfnw",
    "8plwv25NYRo"
  ],
  "mar-olas": [
    "WHPEKLQID4U",
    "j1lLwUBkOAg",
    "oDw22q2Tw9M",
    "PgkvwG971hw",
    "WHPEKLQID4U",
    "j1lLwUBkOAg",
    "oDw22q2Tw9M",
    "PgkvwG971hw",
    "WHPEKLQID4U",
    "j1lLwUBkOAg"
  ],
  meditacion: [
    "inpok4MKVLM",
    "ZCk23KXDeXY",
    "hHW1oY26kxQ",
    "HLhld_L1WBA",
    "SBiwLibZqfw",
    "5BLZNhGVbEk",
    "8sYK7lm3UKg",
    "inpok4MKVLM",
    "ZCk23KXDeXY",
    "hHW1oY26kxQ"
  ],
  "sueno-dormir": [
    "DnJVE9sqPAM",
    "txQ6t4yPIM0",
    "cEUpHtxcMzE",
    "1ZYbU82GVz4",
    "PgkvwG971hw",
    "DnJVE9sqPAM",
    "txQ6t4yPIM0",
    "cEUpHtxcMzE",
    "1ZYbU82GVz4",
    "eTeD8DAta4c"
  ],
  "flauta-cello": [
    "hEnkPV6w91M",
    "6_pOwQBeHsQ",
    "Mx6xkyi5Ij8",
    "Jhu74v62Mho",
    "wY5ZqkLO9CI",
    "hEnkPV6w91M",
    "6_pOwQBeHsQ",
    "Mx6xkyi5Ij8",
    "Jhu74v62Mho",
    "wY5ZqkLO9CI"
  ],
  "ambient-drone": [
    "GoihJiAqI4s",
    "blsjKG2kZok",
    "XeUP83wRhjQ",
    "LMmuChXra_M",
    "xHKD3ERS-RA",
    "GoihJiAqI4s",
    "blsjKG2kZok",
    "XeUP83wRhjQ",
    "LMmuChXra_M",
    "xHKD3ERS-RA"
  ],
  "cantos-mantras": [
    "HLhld_L1WBA",
    "SBiwLibZqfw",
    "5BLZNhGVbEk",
    "8sYK7lm3UKg",
    "HLhld_L1WBA",
    "SBiwLibZqfw",
    "5BLZNhGVbEk",
    "8sYK7lm3UKg",
    "LMmuChXra_M",
    "xHKD3ERS-RA"
  ]
};

const CATEGORIES = [
  {
    id: "lofi-estudio",
    label: { es: "Lofi y estudio", en: "Lofi & focus", pt: "Lofi e estudo" },
    blurb: {
      es: "Ritmo suave de fondo para concentrarte o desconectar.",
      en: "Gentle background rhythm to focus or unwind.",
      pt: "Ritmo suave de fundo para focar ou relaxar."
    }
  },
  {
    id: "piano-instrumental",
    label: { es: "Piano e instrumental", en: "Piano & instrumental", pt: "Piano e instrumental" },
    blurb: {
      es: "Melodías tranquilas sin letra.",
      en: "Calm melodies without lyrics.",
      pt: "Melodias calmas sem letra."
    }
  },
  {
    id: "lluvia-ambiente",
    label: { es: "Lluvia y ambiente", en: "Rain & ambience", pt: "Chuva e ambiente" },
    blurb: {
      es: "Sonidos de lluvia y atmósfera continua.",
      en: "Rain and continuous atmosphere.",
      pt: "Som de chuva e atmosfera contínua."
    }
  },
  {
    id: "bosque-naturaleza",
    label: { es: "Bosque y naturaleza", en: "Forest & nature", pt: "Floresta e natureza" },
    blurb: {
      es: "Pájaros, viento y paisajes sonoros verdes.",
      en: "Birds, wind, and green soundscapes.",
      pt: "Pássaros, vento e paisagens sonoras."
    }
  },
  {
    id: "mar-olas",
    label: { es: "Mar y olas", en: "Sea & waves", pt: "Mar e ondas" },
    blurb: {
      es: "Olas y brisa para bajar el ritmo mental.",
      en: "Waves and breeze to slow your mind.",
      pt: "Ondas e brisa para acalmar a mente."
    }
  },
  {
    id: "meditacion",
    label: { es: "Meditación", en: "Meditation", pt: "Meditação" },
    blurb: {
      es: "Paisajes sonoros para practicar presencia.",
      en: "Soundscapes for mindful presence.",
      pt: "Paisagens sonoras para presença plena."
    }
  },
  {
    id: "sueno-dormir",
    label: { es: "Sueño y descanso", en: "Sleep & rest", pt: "Sono e descanso" },
    blurb: {
      es: "Temas lentos para preparar el cuerpo a dormir.",
      en: "Slow themes to prepare for sleep.",
      pt: "Temas lentos para preparar o sono."
    }
  },
  {
    id: "flauta-cello",
    label: { es: "Cuerdas y melodías", en: "Strings & melodies", pt: "Cordas e melodias" },
    blurb: {
      es: "Instrumentos suaves y envolventes.",
      en: "Soft, enveloping instruments.",
      pt: "Instrumentos suaves e envolventes."
    }
  },
  {
    id: "ambient-drone",
    label: { es: "Ambiente profundo", en: "Deep ambience", pt: "Ambiente profundo" },
    blurb: {
      es: "Capas sonoras amplias y minimalistas.",
      en: "Wide, minimal sound layers.",
      pt: "Camadas sonoras amplas e minimalistas."
    }
  },
  {
    id: "cantos-mantras",
    label: { es: "Cantos y mantras", en: "Chants & mantras", pt: "Cantos e mantras" },
    blurb: {
      es: "Voces suaves y repetitivas para centrar.",
      en: "Soft repetitive vocals to center.",
      pt: "Vozes suaves e repetitivas para centrar."
    }
  }
];

async function checkYoutubeId(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  return res.ok;
}

async function validateAllIds() {
  const allIds = [...new Set(Object.values(VIDEO_IDS_BY_CATEGORY).flat())];
  const bad = [];
  for (const id of allIds) {
    const ok = await checkYoutubeId(id);
    if (!ok) bad.push(id);
    await new Promise((r) => setTimeout(r, 60));
  }
  return { total: allIds.length, bad };
}

function titleVariant(cat, index) {
  const n = index + 1;
  const map = {
    "lofi-estudio": { es: `Sesión lofi ${n}`, en: `Lofi session ${n}`, pt: `Sessão lofi ${n}` },
    "piano-instrumental": { es: `Piano tranquilo ${n}`, en: `Peaceful piano ${n}`, pt: `Piano tranquilo ${n}` },
    "lluvia-ambiente": { es: `Lluvia relajante ${n}`, en: `Relaxing rain ${n}`, pt: `Chuva relaxante ${n}` },
    "bosque-naturaleza": { es: `Naturaleza ${n}`, en: `Nature sounds ${n}`, pt: `Natureza ${n}` },
    "mar-olas": { es: `Olas del mar ${n}`, en: `Ocean waves ${n}`, pt: `Ondas do mar ${n}` },
    meditacion: { es: `Meditación ${n}`, en: `Meditation ${n}`, pt: `Meditação ${n}` },
    "sueno-dormir": { es: `Música para dormir ${n}`, en: `Sleep music ${n}`, pt: `Música para dormir ${n}` },
    "flauta-cello": { es: `Melodía suave ${n}`, en: `Soft melody ${n}`, pt: `Melodia suave ${n}` },
    "ambient-drone": { es: `Ambiente ${n}`, en: `Ambience ${n}`, pt: `Ambiente ${n}` },
    "cantos-mantras": { es: `Canto relajante ${n}`, en: `Relaxing chant ${n}`, pt: `Canto relaxante ${n}` }
  };
  return map[cat.id] ?? { es: `Video ${n}`, en: `Video ${n}`, pt: `Vídeo ${n}` };
}

function buildItems() {
  const items = [];
  const seenGlobal = new Set();

  for (const cat of CATEGORIES) {
    const ids = VIDEO_IDS_BY_CATEGORY[cat.id];
    ids.forEach((videoId, index) => {
      let uniqueId = videoId;
      let suffix = 0;
      while (seenGlobal.has(uniqueId)) {
        suffix += 1;
        uniqueId = `${videoId}-${suffix}`;
      }
      seenGlobal.add(uniqueId);
      items.push({
        id: `${cat.id}-${videoId}-${index + 1}`,
        categoryId: cat.id,
        categoryLabel: cat.label,
        title: titleVariant(cat, index),
        blurb: cat.blurb,
        embedType: "youtube",
        embedSrc: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
        openUrl: `https://www.youtube.com/watch?v=${videoId}`
      });
    });
  }
  return items;
}

function writeOutputs(items) {
  const header = `/** Generado por apps/api/scripts/build-relaxation-catalog.mjs — no editar a mano. */\n\n`;
  const body = `import type { RelaxationPlaylistItem } from "./relaxationPlaylists.defaults.js";

export const RELAXATION_CATALOG_CATEGORIES = ${JSON.stringify(
    CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
    null,
    2
  )} as const;

export const DEFAULT_RELAXATION_CATALOG: RelaxationPlaylistItem[] = ${JSON.stringify(items, null, 2)};
`;

  writeFileSync(outPath, header + body, "utf8");

  const patientHeader = `/** Generado por apps/api/scripts/build-relaxation-catalog.mjs */\n\n`;
  const patientBody = `import type { RelaxationPlaylistItem } from "../services/relaxationPlaylistsApi";

export const RELAXATION_CATALOG_FALLBACK: RelaxationPlaylistItem[] = ${JSON.stringify(items, null, 2)};
`;
  mkdirSync(path.dirname(patientOutPath), { recursive: true });
  writeFileSync(patientOutPath, patientHeader + patientBody, "utf8");
}

async function main() {
  if (!skipValidate) {
    console.log("Validating YouTube IDs via oEmbed…");
    const { total, bad } = await validateAllIds();
    if (bad.length > 0) {
      console.error(`Invalid IDs (${bad.length}/${total}):`, bad.join(", "));
      process.exit(1);
    }
    console.log(`All ${total} unique IDs passed oEmbed.`);
  }

  const items = buildItems();
  writeOutputs(items);
  const uniqueVideos = new Set(items.map((i) => i.openUrl?.split("v=")[1] ?? i.embedSrc));
  console.log(`Wrote ${items.length} items (${uniqueVideos.size} unique videos) to:`);
  console.log(`  ${outPath}`);
  console.log(`  ${patientOutPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
