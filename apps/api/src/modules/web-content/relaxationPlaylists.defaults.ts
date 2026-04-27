import { z } from "zod";

/** `SystemConfig.key` — si no hay fila o el valor es inválido/vacío, el API sirve `DEFAULT_RELAXATION_PLAYLISTS`. */
export const WEB_RELAXATION_PLAYLISTS_KEY = "patient-web-relaxation-playlists";

const localizedBlockSchema = z.object({
  es: z.string().min(1).max(400),
  en: z.string().min(1).max(400),
  pt: z.string().min(1).max(400)
});

export const relaxationPlaylistItemSchema = z.object({
  id: z.string().min(1).max(120),
  title: localizedBlockSchema,
  blurb: localizedBlockSchema,
  embedType: z.enum(["spotify", "youtube"]),
  embedSrc: z.string().min(10).max(2048),
  openUrl: z.string().min(10).max(2048)
});

export type RelaxationPlaylistItem = z.infer<typeof relaxationPlaylistItemSchema>;

export const relaxationPlaylistsCollectionSchema = z.array(relaxationPlaylistItemSchema).max(30);

export const relaxationPlaylistsPutSchema = z.object({
  playlists: relaxationPlaylistsCollectionSchema.min(1)
});

export const DEFAULT_RELAXATION_PLAYLISTS: RelaxationPlaylistItem[] = [
  {
    id: "spotify-peaceful-piano",
    title: {
      es: "Piano tranquilo (Spotify)",
      en: "Peaceful Piano (Spotify)",
      pt: "Piano tranquilo (Spotify)"
    },
    blurb: {
      es: "Instrumental suave para concentrarte o bajar el ritmo entre tareas.",
      en: "Soft instrumental to focus or wind down between tasks.",
      pt: "Instrumental suave para focar ou desacelerar entre tarefas."
    },
    embedType: "spotify",
    embedSrc:
      "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LpO?utm_source=generator&theme=0",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LpO"
  },
  {
    id: "spotify-deep-focus",
    title: {
      es: "Enfoque profundo (Spotify)",
      en: "Deep Focus (Spotify)",
      pt: "Foco profundo (Spotify)"
    },
    blurb: {
      es: "Ambiente minimal para leer o trabajar sin distracciones fuertes.",
      en: "Minimal ambience for reading or working without harsh distractions.",
      pt: "Ambiente minimal para ler ou trabalhar sem distrações fortes."
    },
    embedType: "spotify",
    embedSrc:
      "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ"
  },
  {
    id: "youtube-lofi",
    title: {
      es: "Lofi beats (YouTube)",
      en: "Lofi beats (YouTube)",
      pt: "Lofi beats (YouTube)"
    },
    blurb: {
      es: "Stream relajado de fondo — ideal si te gusta un ritmo constante y suave.",
      en: "Relaxed background stream — steady, gentle rhythm.",
      pt: "Stream relaxado de fundo — ritmo constante e suave."
    },
    embedType: "youtube",
    embedSrc: "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?rel=0&autoplay=0",
    openUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk"
  },
  {
    id: "youtube-rain",
    title: {
      es: "Lluvia y ambiente (YouTube)",
      en: "Rain & ambience (YouTube)",
      pt: "Chuva e ambiente (YouTube)"
    },
    blurb: {
      es: "Sonido de lluvia continuo para dormir o desconectar unos minutos.",
      en: "Continuous rain sound to sleep or disconnect for a few minutes.",
      pt: "Som de chuva continuo para dormir ou desligar alguns minutos."
    },
    embedType: "youtube",
    embedSrc: "https://www.youtube-nocookie.com/embed/DWgepKAleTs?rel=0&autoplay=0",
    openUrl: "https://www.youtube.com/watch?v=DWgepKAleTs"
  }
];
