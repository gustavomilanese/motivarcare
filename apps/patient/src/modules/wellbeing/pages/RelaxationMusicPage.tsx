import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";

export interface RelaxationMusicPageProps {
  language: AppLanguage;
}

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

/** Playlists y streams públicos (embeds oficiales); el audio corre en Spotify/YouTube. */
const PLAYLISTS: Array<{
  id: string;
  title: { es: string; en: string; pt: string };
  blurb: { es: string; en: string; pt: string };
  embedType: "spotify" | "youtube";
  embedSrc: string;
  openUrl: string;
}> = [
  {
    id: "spotify-peaceful-piano",
    title: { es: "Piano tranquilo (Spotify)", en: "Peaceful Piano (Spotify)", pt: "Piano tranquilo (Spotify)" },
    blurb: {
      es: "Instrumental suave para concentrarte o bajar el ritmo entre tareas.",
      en: "Soft instrumental to focus or wind down between tasks.",
      pt: "Instrumental suave para focar ou desacelerar entre tarefas."
    },
    embedType: "spotify",
    embedSrc: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LpO?utm_source=generator&theme=0",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LpO"
  },
  {
    id: "spotify-deep-focus",
    title: { es: "Enfoque profundo (Spotify)", en: "Deep Focus (Spotify)", pt: "Foco profundo (Spotify)" },
    blurb: {
      es: "Ambiente minimal para leer o trabajar sin distracciones fuertes.",
      en: "Minimal ambience for reading or working without harsh distractions.",
      pt: "Ambiente minimal para ler ou trabalhar sem distrações fortes."
    },
    embedType: "spotify",
    embedSrc: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ"
  },
  {
    id: "youtube-lofi",
    title: { es: "Lofi beats (YouTube)", en: "Lofi beats (YouTube)", pt: "Lofi beats (YouTube)" },
    blurb: {
      es: "Stream relajado de fondo — ideal si te gusta un ritmo constante y suave.",
      en: "Relaxed background stream — steady, gentle rhythm.",
      pt: "Stream relaxado de fundo — ritmo constante e suave."
    },
    embedType: "youtube",
    embedSrc: "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?rel=0",
    openUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk"
  },
  {
    id: "youtube-rain",
    title: { es: "Lluvia y ambiente (YouTube)", en: "Rain & ambience (YouTube)", pt: "Chuva e ambiente (YouTube)" },
    blurb: {
      es: "Sonido de lluvia continuo para dormir o desconectar unos minutos.",
      en: "Continuous rain sound to sleep or disconnect for a few minutes.",
      pt: "Som de chuva continuo para dormir ou desligar alguns minutos."
    },
    embedType: "youtube",
    embedSrc: "https://www.youtube-nocookie.com/embed/DWgepKAleTs?rel=0",
    openUrl: "https://www.youtube.com/watch?v=DWgepKAleTs"
  }
];

export function RelaxationMusicPage(props: RelaxationMusicPageProps) {
  const { language } = props;
  return (
    <div className="wellbeing-relax-page page-stack">
      <header className="wellbeing-relax-header">
        <h1>{t(language, { es: "Música para relajar", en: "Relaxation music", pt: "Música para relaxar" })}</h1>
        <p className="wellbeing-relax-lead">
          {t(language, {
            es: "Elegí un ambiente y dejalo sonar mientras respirás, estudiás o hacés una pausa. El audio lo reproduce Spotify o YouTube en su reproductor oficial.",
            en: "Pick a vibe and let it play while you breathe, study, or take a break. Audio plays in Spotify or YouTube’s official player.",
            pt: "Escolha um ambiente e deixe tocar enquanto respira, estuda ou faz uma pausa. O áudio toca no player oficial do Spotify ou YouTube."
          })}
        </p>
      </header>

      <ul className="wellbeing-relax-grid">
        {PLAYLISTS.map((item) => (
          <li key={item.id} className="wellbeing-relax-card">
            <h2>{t(language, item.title)}</h2>
            <p>{t(language, item.blurb)}</p>
            <div className="wellbeing-relax-embed-wrap">
              <iframe
                title={t(language, item.title)}
                src={item.embedSrc}
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                className="wellbeing-relax-iframe"
              />
            </div>
            <a className="wellbeing-relax-external" href={item.openUrl} target="_blank" rel="noopener noreferrer">
              {t(language, { es: "Abrir en pestaña nueva", en: "Open in new tab", pt: "Abrir em nova aba" })}
            </a>
          </li>
        ))}
      </ul>

      <p className="wellbeing-relax-footnote">
        {t(language, {
          es: "Los contenidos son de terceros; MotivarCare no los aloja. Si un embed no carga, usá el enlace externo.",
          en: "Content is from third parties; MotivarCare does not host it. If an embed fails, use the external link.",
          pt: "O conteúdo é de terceiros; a MotivarCare não hospeda. Se o embed falhar, use o link externo."
        })}
      </p>
    </div>
  );
}
