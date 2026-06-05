import type { RelaxationPlaylistItem } from "../services/relaxationPlaylistsApi";

export interface RelaxationCategoryGroup {
  id: string;
  label: { es: string; en: string; pt: string };
  items: RelaxationPlaylistItem[];
}

const FALLBACK_CATEGORY = {
  es: "Más música",
  en: "More music",
  pt: "Mais música"
};

export function groupRelaxationPlaylists(items: RelaxationPlaylistItem[]): RelaxationCategoryGroup[] {
  const map = new Map<string, RelaxationCategoryGroup>();

  for (const item of items) {
    const categoryId = item.categoryId?.trim() || "general";
    const existing = map.get(categoryId);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    map.set(categoryId, {
      id: categoryId,
      label: item.categoryLabel ?? FALLBACK_CATEGORY,
      items: [item]
    });
  }

  return Array.from(map.values());
}
