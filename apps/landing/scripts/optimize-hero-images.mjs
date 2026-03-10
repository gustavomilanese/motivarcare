import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "assets-src");
const OUTPUT_DIR = path.join(ROOT, "public", "images");
const TARGET_WIDTHS = [480, 768, 1280, 1600];

const HERO_IMAGES = [
  { input: "patient-hero.jpg", outputBase: "patient-hero" },
  { input: "professional-hero.jpg", outputBase: "professional-hero" }
];

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function writeFormats({ inputPath, outputBase, width }) {
  const baseName = `${outputBase}-${width}`;
  const avifPath = path.join(OUTPUT_DIR, `${baseName}.avif`);
  const webpPath = path.join(OUTPUT_DIR, `${baseName}.webp`);
  const jpgPath = path.join(OUTPUT_DIR, `${baseName}.jpg`);

  const pipeline = sharp(inputPath).rotate().resize({
    width,
    fit: "inside",
    withoutEnlargement: true
  });

  await Promise.all([
    pipeline
      .clone()
      .avif({ quality: 50, effort: 4 })
      .toFile(avifPath),
    pipeline
      .clone()
      .webp({ quality: 72, effort: 4 })
      .toFile(webpPath),
    pipeline
      .clone()
      .jpeg({ quality: 72, mozjpeg: true, progressive: true })
      .toFile(jpgPath)
  ]);

  const [avifStat, webpStat, jpgStat] = await Promise.all([
    fs.stat(avifPath),
    fs.stat(webpPath),
    fs.stat(jpgPath)
  ]);

  return {
    width,
    avif: avifStat.size,
    webp: webpStat.size,
    jpg: jpgStat.size
  };
}

async function optimizeImage({ input, outputBase }) {
  const inputPath = path.join(SOURCE_DIR, input);

  try {
    await fs.access(inputPath);
  } catch {
    throw new Error(`No existe el archivo fuente: ${inputPath}`);
  }

  const sourceStat = await fs.stat(inputPath);
  const generated = [];

  for (const width of TARGET_WIDTHS) {
    generated.push(await writeFormats({ inputPath, outputBase, width }));
  }

  return {
    input,
    sourceSize: sourceStat.size,
    generated
  };
}

async function run() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  console.log("\\nOptimizing landing hero images...\\n");
  console.log(`Source dir: ${SOURCE_DIR}`);
  console.log(`Output dir: ${OUTPUT_DIR}\\n`);

  for (const image of HERO_IMAGES) {
    const result = await optimizeImage(image);

    console.log(`Source: ${result.input} (${formatKb(result.sourceSize)})`);
    for (const row of result.generated) {
      console.log(
        `  ${row.width}px -> AVIF ${formatKb(row.avif)} | WebP ${formatKb(row.webp)} | JPG ${formatKb(row.jpg)}`
      );
    }
    console.log("");
  }

  console.log("Done. Build only ships optimized images from public/images.\\n");
}

run().catch((error) => {
  console.error("Image optimization failed:", error);
  process.exitCode = 1;
});
