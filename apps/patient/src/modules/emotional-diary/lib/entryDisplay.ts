import type { DiaryEntry } from "../types";

function normalizeEntryText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Quita elipsis final del título auto-generado (p. ej. «…»). */
function stripTrailingEllipsis(value: string): string {
  return value.replace(/…+$/u, "").trim();
}

function firstLineOf(text: string): string {
  return text.trim().split(/\n/)[0]?.trim() ?? "";
}

/** El título suele ser el primer renglón truncado de «qué pasó»; evita mostrar ambos iguales. */
export function entryTextsDuplicate(title: string, whatHappened: string): boolean {
  const titleNorm = normalizeEntryText(stripTrailingEllipsis(title));
  const bodyNorm = normalizeEntryText(whatHappened);
  if (!titleNorm || !bodyNorm) return true;
  if (titleNorm === bodyNorm) return true;
  if (bodyNorm.startsWith(titleNorm) || titleNorm.startsWith(bodyNorm)) return true;

  const firstLineNorm = normalizeEntryText(stripTrailingEllipsis(firstLineOf(whatHappened)));
  if (!firstLineNorm) return false;
  if (titleNorm === firstLineNorm) return true;
  if (firstLineNorm.startsWith(titleNorm) || titleNorm.startsWith(firstLineNorm)) return true;
  return false;
}

/** Si el cuerpo repite la misma línea al inicio, deja una sola. */
function dedupeLeadingRepeatedLine(text: string): string {
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return text.trim();
  if (normalizeEntryText(lines[0]) === normalizeEntryText(lines[1])) {
    return lines.slice(1).join("\n").trim() || lines[0];
  }
  return text.trim();
}

/** Un solo texto para filas del timeline / listado (nunca título + cuerpo). */
export function entryListDisplayText(entry: Pick<DiaryEntry, "title" | "whatHappened">): string {
  const body = entry.whatHappened.trim();
  const title = entry.title.trim();

  if (!body) return title;
  if (!title || entryTextsDuplicate(title, body)) {
    return dedupeLeadingRepeatedLine(body);
  }
  return body;
}

/** @deprecated Usar entryListDisplayText */
export function entryTimelinePreview(entry: Pick<DiaryEntry, "title" | "whatHappened">): string {
  return entryListDisplayText(entry);
}

/** Texto corto para la columna título del timeline (una línea). */
export function entryTimelineTitle(entry: Pick<DiaryEntry, "title" | "whatHappened">): string {
  const title = entry.title.trim();
  if (title && !entryTextsDuplicate(title, entry.whatHappened)) return title;
  return entryListDisplayText(entry);
}

/** Título aparte en el detalle solo si aporta algo distinto al cuerpo. */
export function entryDetailHeading(entry: Pick<DiaryEntry, "title" | "whatHappened">): string | null {
  const title = entry.title.trim();
  if (!title || entryTextsDuplicate(title, entry.whatHappened)) return null;
  return title;
}
