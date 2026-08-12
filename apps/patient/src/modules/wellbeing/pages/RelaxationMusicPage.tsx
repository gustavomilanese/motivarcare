import { useEffect, useMemo, useRef, useState } from "react";
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
  youtubeThumbnailUrl
} from "../utils/relaxationYoutube";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";
import { useScrollSectionToTopOnMount } from "../../app/lib/navigateSectionTop";

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
  useScrollSectionToTopOnMount();
  const [playlists, setPlaylists] = useState<RelaxationPlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const packRef = useRef<HTMLDivElement | null>(null);

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

  function scrollToLibrary() {
    packRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToPlayer() {
    document.getElementById("wellbeing-relax-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const pageTitle = t(language, {
    es: "Música para relajar",
    en: "Relaxation music",
    pt: "Música para relaxar"
  });

  return (
    <div className="wellbeing-relax-page wellbeing-relax-page--ml page-stack" aria-label={pageTitle}>
      <div className="wellbeing-relax-page-ml">
        <article className="dashboard-ml-feature-banner dashboard-ml-feature-banner--pistachio wellbeing-relax-page-ml-banner">
          <div className="dashboard-ml-feature-banner-frame">
            <div className="dashboard-ml-feature-banner-copy">
              <p className="dashboard-ml-feature-banner-kicker">
                {t(language, {
                  es: "Bienestar",
                  en: "Wellbeing",
                  pt: "Bem-estar"
                })}
              </p>
              <h1 id="wellbeing-relax-page-title" className="dashboard-ml-feature-banner-title">
                {pageTitle}
              </h1>
              <p className="dashboard-ml-feature-banner-body">
                {t(language, {
                  es: "Playlists por clima: lofi, lluvia, meditación, sueño y más, listas para escuchar cuando las necesites.",
                  en: "Playlists by mood: lofi, rain, meditation, sleep, and more—ready when you need them.",
                  pt: "Playlists por clima: lofi, chuva, meditacao, sono e mais, prontas quando precisar."
                })}
              </p>
              <div className="dashboard-ml-feature-banner-actions wellbeing-relax-page-ml-actions">
                <button type="button" className="dashboard-ml-feature-banner-cta" onClick={scrollToLibrary}>
                  {t(language, {
                    es: "Explorar biblioteca",
                    en: "Browse library",
                    pt: "Explorar biblioteca"
                  })}
                </button>
                {selected ? (
                  <button type="button" className="wellbeing-relax-page-ml-banner-link" onClick={scrollToPlayer}>
                    {t(language, {
                      es: "Ir al reproductor",
                      en: "Go to player",
                      pt: "Ir ao player"
                    })}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="dashboard-ml-feature-banner-media" aria-hidden="true">
              <img
                className="dashboard-ml-feature-banner-photo"
                src="/home/banner-home-music.png?v=4"
                alt=""
                decoding="async"
              />
            </div>
          </div>
          <div id="wellbeing-relax-toolbar-mount" className="wellbeing-relax-toolbar-mount wellbeing-relax-page-ml-toolbar" />
        </article>

        <div
          ref={packRef}
          className="dashboard-ml-feature-panel dashboard-ml-feature-panel--open wellbeing-relax-page-ml-pack"
        >
          {loading ? (
            <MotivarCarePageLoader language={language} layout="block" />
          ) : (
            <>
              <label className="wellbeing-relax-filter">
                <span className="wellbeing-relax-filter-label">
                  {t(language, { es: "Categoría", en: "Category", pt: "Categoria" })}
                </span>
                <div className="wellbeing-relax-filter-combo">
                  <select
                    className="wellbeing-relax-filter-select"
                    value={categoryId}
                    aria-label={t(language, { es: "Filtrar por categoría", en: "Filter by category", pt: "Filtrar por categoria" })}
                    onChange={(event) => {
                      const next = event.target.value;
                      setCategoryId(next === "all" ? "all" : next);
                    }}
                  >
                    <option value="all">
                      {t(language, { es: "Todas", en: "All", pt: "Todas" })} · {playlists.length}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {t(language, category.label)} · {category.items.length}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              {activeCategory ? (
                <p className="wellbeing-relax-filter-hint" role="status">
                  {replaceRelaxationFilterSummary(
                    language,
                    textByLanguage(language, activeCategory.label),
                    visibleItems.length,
                    playlists.length
                  )}
                </p>
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

              <ul
                className="wellbeing-relax-video-grid"
                aria-label={t(language, { es: "Videos", en: "Videos", pt: "Vídeos" })}
              >
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
      </div>
    </div>
  );
}
