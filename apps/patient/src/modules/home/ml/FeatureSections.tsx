import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import {
  fetchPublishedExercisesContent,
  type ExercisePost
} from "../../exercises/services/exercisesApi";
import { categoryLabel, durationLabel } from "../../exercises/lib/labels";
import {
  fetchRelaxationPlaylists,
  type RelaxationPlaylistItem
} from "../../wellbeing/services/relaxationPlaylistsApi";
import { groupRelaxationPlaylists } from "../../wellbeing/lib/relaxationCategories";
import {
  extractYoutubeVideoId,
  youtubeThumbnailUrl
} from "../../wellbeing/utils/relaxationYoutube";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const PREVIEW_COUNT = 3;

function HomeFeatureBanner(props: {
  language: AppLanguage;
  titleId: string;
  kicker: LocalizedText;
  title: LocalizedText;
  body: LocalizedText;
  cta: LocalizedText;
  imageSrc: string;
  onCta: () => void;
  tone?: "default" | "purple" | "pistachio";
}) {
  const toneClass =
    props.tone === "purple"
      ? " dashboard-ml-feature-banner--purple"
      : props.tone === "pistachio"
        ? " dashboard-ml-feature-banner--pistachio"
        : "";

  return (
    <article className={`dashboard-ml-feature-banner${toneClass}`}>
      <div className="dashboard-ml-feature-banner-frame">
        <div className="dashboard-ml-feature-banner-copy">
          <p className="dashboard-ml-feature-banner-kicker">{t(props.language, props.kicker)}</p>
          <h2 id={props.titleId} className="dashboard-ml-feature-banner-title">
            {t(props.language, props.title)}
          </h2>
          <p className="dashboard-ml-feature-banner-body">{t(props.language, props.body)}</p>
          <button type="button" className="dashboard-ml-feature-banner-cta" onClick={props.onCta}>
            {t(props.language, props.cta)}
          </button>
        </div>
        <div className="dashboard-ml-feature-banner-media" aria-hidden="true">
          <img className="dashboard-ml-feature-banner-photo" src={props.imageSrc} alt="" decoding="async" />
        </div>
      </div>
    </article>
  );
}

function MusicThumb(props: { item: RelaxationPlaylistItem }) {
  const videoId = extractYoutubeVideoId(props.item.embedSrc, props.item.openUrl);
  const [failed, setFailed] = useState(false);
  if (!videoId || failed) {
    return (
      <span className="dashboard-ml-feature-media-fallback" aria-hidden="true">
        ♪
      </span>
    );
  }
  return (
    <img
      className="dashboard-ml-feature-media-thumb"
      src={youtubeThumbnailUrl(videoId)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function FeaturePreviewOpen(props: {
  language: AppLanguage;
  label: LocalizedText;
  loading: boolean;
  empty: LocalizedText;
  moreLabel: LocalizedText;
  onMore: () => void;
  children: ReactNode;
  hasItems: boolean;
}) {
  const showChrome = props.hasItems;
  const isEmptyState = !props.hasItems;

  return (
    <div
      className={`dashboard-ml-feature-panel is-expanded dashboard-ml-feature-panel--open${
        isEmptyState ? " dashboard-ml-feature-panel--empty" : ""
      }`}
    >
      {showChrome ? (
        <div className="dashboard-ml-feature-toggle dashboard-ml-feature-toggle--static">
          <span className="dashboard-ml-feature-toggle-label">{t(props.language, props.label)}</span>
        </div>
      ) : null}
      {props.loading ? (
        <p className="dashboard-ml-feature-empty dashboard-ml-feature-empty--solo">
          {t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}
        </p>
      ) : !props.hasItems ? (
        <p className="dashboard-ml-feature-empty dashboard-ml-feature-empty--solo">
          {t(props.language, props.empty)}
        </p>
      ) : (
        props.children
      )}
      {props.hasItems ? (
        <button type="button" className="dashboard-ml-feature-more" onClick={props.onMore}>
          {t(props.language, props.moreLabel)}
        </button>
      ) : null}
    </div>
  );
}

export function DashboardHomeExercisesSection(props: { language: AppLanguage }) {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<ExercisePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchPublishedExercisesContent()
      .then((data) => {
        if (!active) return;
        setExercises(data.exercises);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setExercises([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const firstRow = useMemo(() => {
    const featured = exercises.filter((exercise) => exercise.featured);
    const rest = exercises.filter((exercise) => !exercise.featured);
    return [...featured, ...rest].slice(0, PREVIEW_COUNT);
  }, [exercises]);

  return (
    <section className="dashboard-ml-feature-section" data-tour="patient-tour-exercises" aria-labelledby="dashboard-ml-exercises-title">
      <HomeFeatureBanner
        language={props.language}
        titleId="dashboard-ml-exercises-title"
        kicker={{ es: "Entre sesiones", en: "Between sessions", pt: "Entre sessoes" }}
        title={{
          es: "Ejercicios para acompañar tu proceso",
          en: "Exercises to support your care",
          pt: "Exercicios para acompanhar seu processo"
        }}
        body={{
          es: "Prácticas breves de respiración, postura y presencia para sumar claridad entre turnos.",
          en: "Short breathing, posture, and presence practices to add clarity between sessions.",
          pt: "Praticas breves de respiracao, postura e presenca para somar clareza entre sessoes."
        }}
        cta={{ es: "Ver ejercicios", en: "View exercises", pt: "Ver exercicios" }}
        imageSrc="/home/banner-home-exercises.png?v=4"
        tone="purple"
        onCta={() => navigate("/ejercicios")}
      />

      <FeaturePreviewOpen
        language={props.language}
        label={{ es: "Prácticas destacadas", en: "Featured practices", pt: "Praticas em destaque" }}
        loading={loading}
        empty={{
          es: "Pronto vas a ver prácticas disponibles acá.",
          en: "Practices will show up here soon.",
          pt: "Em breve voce vera praticas disponiveis aqui."
        }}
        moreLabel={{
          es: "Ver todos los ejercicios",
          en: "View all exercises",
          pt: "Ver todos os exercicios"
        }}
        onMore={() => navigate("/ejercicios")}
        hasItems={firstRow.length > 0}
      >
        <div className="dashboard-ml-feature-preview-row">
          {firstRow.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              className="dashboard-ml-feature-preview-card"
              onClick={() => navigate(`/ejercicios/${encodeURIComponent(exercise.slug)}`)}
            >
              <span className="dashboard-ml-feature-preview-emoji" aria-hidden="true">
                {exercise.emoji || "✦"}
              </span>
              <strong>{exercise.title}</strong>
              <span>
                {categoryLabel(props.language, exercise.category)}
                {exercise.durationMinutes > 0
                  ? ` · ${durationLabel(props.language, exercise.durationMinutes)}`
                  : ""}
              </span>
            </button>
          ))}
        </div>
      </FeaturePreviewOpen>
    </section>
  );
}

export function DashboardHomeMusicSection(props: { language: AppLanguage }) {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<RelaxationPlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchRelaxationPlaylists()
      .then((list) => {
        if (!active) return;
        setPlaylists(list);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setPlaylists([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => groupRelaxationPlaylists(playlists), [playlists]);
  const firstRow = useMemo(() => {
    if (categories.length > 0) {
      return categories.slice(0, PREVIEW_COUNT).map((category) => ({
        id: category.id,
        title: textByLanguage(props.language, category.label),
        meta: replaceTemplate(
          t(props.language, {
            es: "{count} videos",
            en: "{count} videos",
            pt: "{count} videos"
          }),
          { count: String(category.items.length) }
        ),
        sample: category.items[0] ?? null
      }));
    }
    return playlists.slice(0, PREVIEW_COUNT).map((item) => ({
      id: item.id,
      title: textByLanguage(props.language, item.title),
      meta: textByLanguage(props.language, item.categoryLabel),
      sample: item
    }));
  }, [categories, playlists, props.language]);

  return (
    <section className="dashboard-ml-feature-section" data-tour="patient-tour-music" aria-labelledby="dashboard-ml-music-title">
      <HomeFeatureBanner
        language={props.language}
        titleId="dashboard-ml-music-title"
        kicker={{ es: "Bienestar", en: "Wellbeing", pt: "Bem-estar" }}
        title={{
          es: "Música para relajar y acompañarte",
          en: "Music to relax and support you",
          pt: "Musica para relaxar e acompanhar voce"
        }}
        body={{
          es: "Playlists por clima: lofi, lluvia, meditación, sueño y más, listas para escuchar cuando las necesites.",
          en: "Playlists by mood: lofi, rain, meditation, sleep, and more—ready when you need them.",
          pt: "Playlists por clima: lofi, chuva, meditacao, sono e mais, prontas quando precisar."
        }}
        cta={{ es: "Abrir música", en: "Open music", pt: "Abrir musica" }}
        imageSrc="/home/banner-home-music.png?v=4"
        tone="pistachio"
        onCta={() => navigate("/bienestar/musica")}
      />

      <FeaturePreviewOpen
        language={props.language}
        label={{ es: "Categorías para empezar", en: "Categories to start", pt: "Categorias para comecar" }}
        loading={loading}
        empty={{
          es: "Pronto vas a ver música disponible acá.",
          en: "Music will show up here soon.",
          pt: "Em breve voce vera musica disponivel aqui."
        }}
        moreLabel={{
          es: "Ver toda la música",
          en: "View all music",
          pt: "Ver toda a musica"
        }}
        onMore={() => navigate("/bienestar/musica")}
        hasItems={firstRow.length > 0}
      >
        <div className="dashboard-ml-feature-preview-row">
          {firstRow.map((item) => (
            <button
              key={item.id}
              type="button"
              className="dashboard-ml-feature-preview-card dashboard-ml-feature-preview-card--media"
              onClick={() => navigate("/bienestar/musica")}
            >
              <span className="dashboard-ml-feature-preview-media" aria-hidden="true">
                {item.sample ? (
                  <MusicThumb item={item.sample} />
                ) : (
                  <span className="dashboard-ml-feature-media-fallback">♪</span>
                )}
              </span>
              <strong>{item.title}</strong>
              <span>{item.meta}</span>
            </button>
          ))}
        </div>
      </FeaturePreviewOpen>
    </section>
  );
}
