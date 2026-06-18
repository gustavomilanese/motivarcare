import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import { RELAXATION_CATALOG_FALLBACK } from "../data/relaxationCatalogFallback";
import { groupRelaxationPlaylists } from "../lib/relaxationCategories";
import {
  type RelaxationPlaylistItem,
  fetchRelaxationPlaylists
} from "../services/relaxationPlaylistsApi";
import { normalizeRelaxationEmbedSrc } from "../utils/normalizeRelaxationEmbedSrc";
import {
  extractYoutubeVideoId,
  youtubeThumbnailUrl,
  youtubeWatchUrl
} from "../utils/relaxationYoutube";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";

export interface RelaxationMusicPageProps {
  language: AppLanguage;
}

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

function replaceRelaxationFilterSummary(
  language: AppLanguage,
  categoryLabel: string,
  visibleCount: number,
  totalCount: number
): string {
  const videoWord = t(language, {
    es: visibleCount === 1 ? "video" : "videos",
    en: visibleCount === 1 ? "video" : "videos",
    pt: visibleCount === 1 ? "vídeo" : "vídeos"
  });
  return t(language, {
    es: `Mostrando ${visibleCount} ${videoWord} de «${categoryLabel}» (${totalCount} videos en la biblioteca).`,
    en: `Showing ${visibleCount} ${videoWord} in «${categoryLabel}» (${totalCount} videos in the library).`,
    pt: `Mostrando ${visibleCount} ${videoWord} de «${categoryLabel}» (${totalCount} vídeos na biblioteca).`
  });
}

function resolveOpenUrl(item: RelaxationPlaylistItem): string {
  if (item.openUrl?.trim()) return item.openUrl.trim();
  const videoId = extractYoutubeVideoId(item.embedSrc, "");
  if (videoId) return youtubeWatchUrl(videoId);
  return item.embedSrc;
}

function RelaxationVideoThumb({ videoId }: { videoId: string }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  if (thumbFailed) {
    return (
      <span className="wellbeing-relax-video-thumb-fallback" aria-hidden="true">
        ♪
      </span>
    );
  }
  return (
    <img
      src={youtubeThumbnailUrl(videoId)}
      alt=""
      loading="lazy"
      onError={() => setThumbFailed(true)}
    />
  );
}

export function RelaxationMusicPage(props: RelaxationMusicPageProps) {
  const { language } = props;
  const [playlists, setPlaylists] = useState<RelaxationPlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await fetchRelaxationPlaylists();
      if (!cancelled) {
        setPlaylists(list.length > 0 ? list : RELAXATION_CATALOG_FALLBACK);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => groupRelaxationPlaylists(playlists), [playlists]);

  const activeCategory = useMemo(
    () => (categoryId === "all" ? null : categories.find((category) => category.id === categoryId) ?? null),
    [categories, categoryId]
  );

  const visibleItems = useMemo(() => {
    if (categoryId === "all") return playlists;
    return playlists.filter((item) => (item.categoryId || "general") === categoryId);
  }, [playlists, categoryId]);

  const selected = useMemo(
    () => playlists.find((item) => item.id === selectedId) ?? null,
    [playlists, selectedId]
  );

  useEffect(() => {
    if (visibleItems.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems[0].id);
    }
  }, [visibleItems, selectedId]);

  function handleSelect(item: RelaxationPlaylistItem) {
    setSelectedId(item.id);
    document.getElementById("wellbeing-relax-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleOpenExternal(item: RelaxationPlaylistItem) {
    window.open(resolveOpenUrl(item), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="wellbeing-relax-page page-stack">
      <header className="wellbeing-relax-header">
        <div id="wellbeing-relax-toolbar-mount" className="wellbeing-relax-toolbar-mount" />
        <h1>{t(language, { es: "Música para relajar", en: "Relaxation music", pt: "Música para relaxar" })}</h1>
        <p className="wellbeing-relax-lead">
          {t(language, {
            es: "Elegí una categoría y un video. Si el reproductor no carga acá, usá «Abrir en YouTube» — siempre funciona.",
            en: "Pick a category and a video. If the player does not load here, use «Open in YouTube» — it always works.",
            pt: "Escolha uma categoria e um vídeo. Se o player não carregar aqui, use «Abrir no YouTube» — sempre funciona."
          })}
        </p>
      </header>

      {loading ? <MotivarCarePageLoader language={language} layout="block" /> : (
        <>
          <nav className="wellbeing-relax-categories" aria-label={t(language, { es: "Categorías", en: "Categories", pt: "Categorias" })}>
            <button
              type="button"
              className={`wellbeing-relax-category-pill ${categoryId === "all" ? "wellbeing-relax-category-pill--active" : ""} ${categoryId !== "all" ? "wellbeing-relax-category-pill--show-all" : ""}`}
              onClick={() => setCategoryId("all")}
            >
              {categoryId !== "all"
                ? t(language, { es: "Ver todos", en: "Show all", pt: "Ver todos" })
                : t(language, { es: "Todos", en: "All", pt: "Todos" })}
              <span className="wellbeing-relax-category-count">{playlists.length}</span>
            </button>
            {categories.map((category) => {
              const isActive = categoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`wellbeing-relax-category-pill ${isActive ? "wellbeing-relax-category-pill--active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => setCategoryId(isActive ? "all" : category.id)}
                >
                  {t(language, category.label)}
                  <span className="wellbeing-relax-category-count">{category.items.length}</span>
                </button>
              );
            })}
          </nav>

          {activeCategory ? (
            <div className="wellbeing-relax-filter-active" role="status">
              <p className="wellbeing-relax-filter-active-copy">
                {replaceRelaxationFilterSummary(
                  language,
                  textByLanguage(language, activeCategory.label),
                  visibleItems.length,
                  playlists.length
                )}
              </p>
              <button type="button" className="wellbeing-relax-filter-clear" onClick={() => setCategoryId("all")}>
                {t(language, {
                  es: "Ver todos los videos",
                  en: "Show all videos",
                  pt: "Ver todos os vídeos"
                })}
              </button>
            </div>
          ) : null}

          {selected ? (
            <section id="wellbeing-relax-player" className="wellbeing-relax-player" aria-live="polite">
              <div className="wellbeing-relax-player-head">
                <div>
                  <p className="wellbeing-relax-player-eyebrow">
                    {t(language, selected.categoryLabel ?? { es: "Reproduciendo", en: "Now playing", pt: "Reproduzindo" })}
                  </p>
                  <p className="wellbeing-relax-player-blurb">{t(language, selected.blurb)}</p>
                </div>
                <button
                  type="button"
                  className="diary-btn diary-btn--primary wellbeing-relax-open-yt"
                  onClick={() => handleOpenExternal(selected)}
                >
                  {t(language, {
                    es: "Abrir en YouTube",
                    en: "Open in YouTube",
                    pt: "Abrir no YouTube"
                  })}
                </button>
              </div>
              <div className="wellbeing-relax-embed-wrap">
                {selected.embedType === "youtube" ? (
                  <iframe
                    key={selected.id}
                    title={t(language, selected.title)}
                    src={normalizeRelaxationEmbedSrc(selected.embedSrc)}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="wellbeing-relax-iframe"
                  />
                ) : (
                  <iframe
                    key={selected.id}
                    title={t(language, selected.title)}
                    src={normalizeRelaxationEmbedSrc(selected.embedSrc)}
                    loading="lazy"
                    allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="wellbeing-relax-iframe"
                  />
                )}
              </div>
            </section>
          ) : null}

          <ul className="wellbeing-relax-video-grid" aria-label={t(language, { es: "Videos", en: "Videos", pt: "Vídeos" })}>
            {visibleItems.map((item) => {
              const videoId =
                item.embedType === "youtube" ? extractYoutubeVideoId(item.embedSrc, item.openUrl) : null;
              const isActive = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`wellbeing-relax-video-card ${isActive ? "wellbeing-relax-video-card--active" : ""}`}
                    onClick={() => handleSelect(item)}
                  >
                    <span className="wellbeing-relax-video-thumb">
                      {videoId ? (
                        <RelaxationVideoThumb videoId={videoId} />
                      ) : (
                        <span className="wellbeing-relax-video-thumb-fallback" aria-hidden="true">
                          ♪
                        </span>
                      )}
                    </span>
                    <span className="wellbeing-relax-video-copy">
                      <strong>{t(language, item.title)}</strong>
                      <span>{t(language, item.categoryLabel ?? { es: "Música", en: "Music", pt: "Música" })}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="wellbeing-relax-footnote">
        {t(language, {
          es: `${playlists.length} videos en ${categories.length} categorías. Contenido de YouTube; MotivarCare no lo aloja.`,
          en: `${playlists.length} videos in ${categories.length} categories. YouTube content; MotivarCare does not host it.`,
          pt: `${playlists.length} vídeos em ${categories.length} categorias. Conteúdo do YouTube; a MotivarCare não hospeda.`
        })}
      </p>
    </div>
  );
}
