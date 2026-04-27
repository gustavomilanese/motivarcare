import { apiRequest } from "../../app/services/api";

/** Alineado con `relaxationPlaylistItemSchema` del API. */
export interface RelaxationPlaylistItem {
  id: string;
  title: { es: string; en: string; pt: string };
  blurb: { es: string; en: string; pt: string };
  embedType: "spotify" | "youtube";
  embedSrc: string;
  openUrl: string;
}

interface WebContentRelaxationSlice {
  relaxationPlaylists?: RelaxationPlaylistItem[];
}

/** Copia mínima de `DEFAULT_RELAXATION_PLAYLISTS` del API si falla la red. */
const OFFLINE_FALLBACK: RelaxationPlaylistItem[] = [
  {
    id: "youtube-lofi",
    title: { es: "Lofi beats (YouTube)", en: "Lofi beats (YouTube)", pt: "Lofi beats (YouTube)" },
    blurb: {
      es: "Stream relajado de fondo.",
      en: "Relaxed background stream.",
      pt: "Stream relaxado de fundo."
    },
    embedType: "youtube",
    embedSrc: "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?rel=0",
    openUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk"
  }
];

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
        return list.filter(
          (item): item is RelaxationPlaylistItem =>
            Boolean(item && typeof item === "object" && typeof item.embedSrc === "string")
        );
      }
    } catch {
      // usar fallback
    }
    return OFFLINE_FALLBACK;
  })().finally(() => {
    inflight = null;
  });
  inflight = pending;
  return pending;
}
