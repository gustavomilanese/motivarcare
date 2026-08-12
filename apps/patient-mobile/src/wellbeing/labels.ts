import type { ExerciseCategory, ExerciseDifficulty } from "./types";

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  respiracion: "Respiración",
  postura: "Postura",
  grounding: "Anclaje",
  movimiento: "Movimiento",
  relajacion: "Relajación",
  mindfulness: "Mindfulness"
};

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado"
};

export function categoryLabel(category: ExerciseCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function difficultyLabel(difficulty: ExerciseDifficulty): string {
  return DIFFICULTY_LABELS[difficulty] ?? difficulty;
}

export function categoryAccent(category: ExerciseCategory): { accent: string; accentSoft: string } {
  switch (category) {
    case "respiracion":
      return { accent: "#5b9bd5", accentSoft: "rgba(91, 155, 213, 0.16)" };
    case "postura":
      return { accent: "#7a5cff", accentSoft: "rgba(122, 92, 255, 0.16)" };
    case "grounding":
      return { accent: "#3aa17e", accentSoft: "rgba(58, 161, 126, 0.16)" };
    case "movimiento":
      return { accent: "#f08b3a", accentSoft: "rgba(240, 139, 58, 0.16)" };
    case "relajacion":
      return { accent: "#d97aa6", accentSoft: "rgba(217, 122, 166, 0.16)" };
    case "mindfulness":
      return { accent: "#48a3a8", accentSoft: "rgba(72, 163, 168, 0.16)" };
    default:
      return { accent: "#7a5cff", accentSoft: "rgba(122, 92, 255, 0.14)" };
  }
}

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
      // next
    }
  }
  return null;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function normalizeRelaxationEmbedSrc(embedSrc: string): string {
  try {
    const u = new URL(embedSrc);
    const host = u.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      u.searchParams.set("autoplay", "0");
      return u.toString();
    }
  } catch {
    return embedSrc;
  }
  return embedSrc;
}
