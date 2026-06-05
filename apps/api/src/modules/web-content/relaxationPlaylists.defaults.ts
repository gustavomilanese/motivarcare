import { z } from "zod";

/** `SystemConfig.key` — si no hay fila o el valor es inválido/vacío, el API sirve `DEFAULT_RELAXATION_PLAYLISTS`. */
export const WEB_RELAXATION_PLAYLISTS_KEY = "patient-web-relaxation-playlists";

const localizedBlockSchema = z.object({
  es: z.string().min(1).max(400),
  en: z.string().min(1).max(400),
  pt: z.string().min(1).max(400)
});

const defaultCategoryLabel = {
  es: "Música relajante",
  en: "Relaxing music",
  pt: "Música relaxante"
};

export const relaxationPlaylistItemSchema = z.object({
  id: z.string().min(1).max(120),
  categoryId: z.string().min(1).max(60).optional().default("general"),
  categoryLabel: localizedBlockSchema.optional().default(defaultCategoryLabel),
  title: localizedBlockSchema,
  blurb: localizedBlockSchema,
  embedType: z.enum(["spotify", "youtube"]),
  embedSrc: z.string().min(10).max(2048),
  openUrl: z.string().min(10).max(2048)
});

export type RelaxationPlaylistItem = z.infer<typeof relaxationPlaylistItemSchema>;

export const relaxationPlaylistsCollectionSchema = z.array(relaxationPlaylistItemSchema).max(120);

export const relaxationPlaylistsPutSchema = z.object({
  playlists: relaxationPlaylistsCollectionSchema.min(1)
});

import { DEFAULT_RELAXATION_CATALOG } from "./relaxationCatalog.seed.js";

export { RELAXATION_CATALOG_CATEGORIES } from "./relaxationCatalog.seed.js";

/** Plantilla del servidor: catálogo YouTube verificado por categoría (generado). */
export const DEFAULT_RELAXATION_PLAYLISTS: RelaxationPlaylistItem[] = DEFAULT_RELAXATION_CATALOG;

/** Por debajo de este umbral, un guardado en admin se trata como overrides parciales (no reemplazo total). */
export const RELAXATION_MIN_STORED_FOR_FULL_CATALOG = 50;

export function mergeRelaxationPlaylistsById(
  base: RelaxationPlaylistItem[],
  overrides: RelaxationPlaylistItem[]
): RelaxationPlaylistItem[] {
  const byId = new Map(base.map((item) => [item.id, item]));
  for (const item of overrides) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

/** Catálogo público: defaults + overrides admin; reemplazo total solo si el admin guardó un catálogo completo. */
export function resolvePublicRelaxationPlaylists(stored: RelaxationPlaylistItem[]): RelaxationPlaylistItem[] {
  if (stored.length === 0) {
    return DEFAULT_RELAXATION_PLAYLISTS;
  }
  if (stored.length >= RELAXATION_MIN_STORED_FOR_FULL_CATALOG) {
    return stored;
  }
  return mergeRelaxationPlaylistsById(DEFAULT_RELAXATION_PLAYLISTS, stored);
}
