import { useEffect, useState } from "react";
import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import {
  type RelaxationPlaylistItem,
  fetchRelaxationPlaylists
} from "../services/relaxationPlaylistsApi";
import { normalizeRelaxationEmbedSrc } from "../utils/normalizeRelaxationEmbedSrc";

export interface RelaxationMusicPageProps {
  language: AppLanguage;
}

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

export function RelaxationMusicPage(props: RelaxationMusicPageProps) {
  const { language } = props;
  const [playlists, setPlaylists] = useState<RelaxationPlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await fetchRelaxationPlaylists();
      if (!cancelled) {
        setPlaylists(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

      {loading ? (
        <p className="wellbeing-relax-lead" aria-live="polite">
          {t(language, { es: "Cargando playlists…", en: "Loading playlists…", pt: "Carregando playlists…" })}
        </p>
      ) : (
        <ul className="wellbeing-relax-grid">
          {playlists.map((item) => (
            <li key={item.id} className="wellbeing-relax-card">
              <h2>{t(language, item.title)}</h2>
              <p>{t(language, item.blurb)}</p>
              <div className="wellbeing-relax-embed-wrap">
                <iframe
                  title={t(language, item.title)}
                  src={normalizeRelaxationEmbedSrc(item.embedSrc)}
                  loading="lazy"
                  allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
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
      )}

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
