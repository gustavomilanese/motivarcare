/** Extrae el ID de video de URLs de embed u open de YouTube. */
export function extractYoutubeVideoId(embedSrc: string, openUrl: string): string | null {
  const candidates = [embedSrc, openUrl];
  for (const raw of candidates) {
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      if (!host.includes("youtube") && !host.includes("youtu.be")) continue;
      if (host.includes("youtu.be")) {
        const id = url.pathname.replace(/^\//, "").split("/")[0];
        if (id) return id;
      }
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return fromQuery;
      const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) return embedMatch[1];
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
