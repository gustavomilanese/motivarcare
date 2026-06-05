import { apiRequest } from "../../app/services/api";
import { RELAXATION_CATALOG_FALLBACK } from "../data/relaxationCatalogFallback";
import { resolveRelaxationPlaylistsFromApi } from "../lib/mergeRelaxationCatalog";

/** Alineado con `relaxationPlaylistItemSchema` del API. */
export interface RelaxationPlaylistItem {
  id: string;
  categoryId: string;
  categoryLabel: { es: string; en: string; pt: string };
  title: { es: string; en: string; pt: string };
  blurb: { es: string; en: string; pt: string };
  embedType: "spotify" | "youtube";
  embedSrc: string;
  openUrl: string;
}

interface WebContentRelaxationSlice {
  relaxationPlaylists?: RelaxationPlaylistItem[];
}

function normalizePlaylistItem(raw: unknown): RelaxationPlaylistItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<RelaxationPlaylistItem>;
  if (typeof item.id !== "string" || typeof item.embedSrc !== "string" || typeof item.openUrl !== "string") {
    return null;
  }
  if (!item.title || !item.blurb) return null;
  const categoryId = typeof item.categoryId === "string" ? item.categoryId : "general";
  const categoryLabel = item.categoryLabel ?? {
    es: "Música relajante",
    en: "Relaxing music",
    pt: "Música relaxante"
  };
  return {
    id: item.id,
    categoryId,
    categoryLabel,
    title: item.title,
    blurb: item.blurb,
    embedType: item.embedType === "spotify" ? "spotify" : "youtube",
    embedSrc: item.embedSrc,
    openUrl: item.openUrl
  };
}

let inflight: Promise<RelaxationPlaylistItem[]> | null = null;

export async function fetchRelaxationPlaylists(): Promise<RelaxationPlaylistItem[]> {
  if (inflight) {
    return inflight;
  }
  const pending = (async (): Promise<RelaxationPlaylistItem[]> => {
    try {
      const response = await apiRequest<WebContentRelaxationSlice>("/api/public/web-content?audience=patient", {});
      const list = response.relaxationPlaylists;
      if (Array.isArray(list) && list.length > 0) {
        const normalized = list
          .map((item) => normalizePlaylistItem(item))
          .filter((item): item is RelaxationPlaylistItem => item !== null);
        if (normalized.length > 0) {
          return resolveRelaxationPlaylistsFromApi(normalized, RELAXATION_CATALOG_FALLBACK);
        }
      }
    } catch {
      // usar fallback
    }
    return RELAXATION_CATALOG_FALLBACK;
  })().finally(() => {
    inflight = null;
  });
  inflight = pending;
  return pending;
}
