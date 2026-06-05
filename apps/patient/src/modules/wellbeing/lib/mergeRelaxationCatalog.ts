import type { RelaxationPlaylistItem } from "../services/relaxationPlaylistsApi";

/** Por debajo de este umbral, la respuesta del API se fusiona con el catálogo embebido (overrides parciales). */
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

export function resolveRelaxationPlaylistsFromApi(
  remote: RelaxationPlaylistItem[],
  fallback: RelaxationPlaylistItem[]
): RelaxationPlaylistItem[] {
  if (remote.length === 0) {
    return fallback;
  }
  if (remote.length >= RELAXATION_MIN_STORED_FOR_FULL_CATALOG) {
    return remote;
  }
  return mergeRelaxationPlaylistsById(fallback, remote);
}
