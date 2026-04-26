import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { fetchPublishedExercises, type ExerciseCategory, type ExercisePost } from "../services/exercisesApi";
import {
  ALL_CATEGORIES,
  categoryAccent,
  categoryLabel,
  difficultyLabel,
  durationLabel,
  t
} from "../lib/labels";

export interface ExercisesListPageProps {
  language: AppLanguage;
}

type CategoryFilter = "all" | ExerciseCategory;

export function ExercisesListPage(props: ExercisesListPageProps) {
  const [exercises, setExercises] = useState<ExercisePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPublishedExercises()
      .then((data) => {
        if (!active) return;
        setExercises(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(
          t(props.language, {
            es: "No pudimos cargar los ejercicios en este momento. Probá de nuevo en unos minutos.",
            en: "We couldn’t load the exercises right now. Please try again in a few minutes.",
            pt: "Não foi possível carregar os exercícios agora. Tente novamente em alguns minutos."
          })
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props.language]);

  const visibleCategories = useMemo<ExerciseCategory[]>(() => {
    const present = new Set(exercises.map((exercise) => exercise.category));
    return ALL_CATEGORIES.filter((category) => present.has(category));
  }, [exercises]);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return exercises;
    }
    return exercises.filter((exercise) => exercise.category === filter);
  }, [exercises, filter]);

  return (
    <section className="exercises-page">
      <header className="exercises-page-header">
        <h2>{t(props.language, { es: "Ejercicios", en: "Exercises", pt: "Exercícios" })}</h2>
        <p>
          {t(props.language, {
            es: "Prácticas breves y guiadas para acompañar tu tratamiento entre sesiones: respiración, postura, presencia y movimiento.",
            en: "Short, guided practices to support your treatment between sessions: breathing, posture, presence, and movement.",
            pt: "Práticas breves e guiadas para apoiar seu tratamento entre sessões: respiração, postura, presença e movimento."
          })}
        </p>
        <p className="exercises-page-disclaimer">
          {t(props.language, {
            es: "Si alguno te genera molestia, suspendelo y comentalo en próxima sesión.",
            en: "If any exercise causes discomfort, stop and bring it up in your next session.",
            pt: "Se algum causar desconforto, interrompa e comente na próxima sessão."
          })}
        </p>
      </header>

      {!loading && !error && exercises.length > 0 ? (
        <div className="exercises-filters" role="tablist" aria-label={t(props.language, { es: "Filtrar por categoría", en: "Filter by category", pt: "Filtrar por categoria" })}>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            className={`exercises-filter-chip${filter === "all" ? " is-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            {t(props.language, { es: "Todos", en: "All", pt: "Todos" })}
            <span className="exercises-filter-count">{exercises.length}</span>
          </button>
          {visibleCategories.map((category) => {
            const count = exercises.filter((exercise) => exercise.category === category).length;
            const isActive = filter === category;
            const { accent, accentSoft } = categoryAccent(category);
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`exercises-filter-chip${isActive ? " is-active" : ""}`}
                onClick={() => setFilter(category)}
                style={
                  isActive
                    ? ({ "--filter-accent": accent, "--filter-accent-soft": accentSoft } as React.CSSProperties)
                    : undefined
                }
              >
                {categoryLabel(props.language, category)}
                <span className="exercises-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <p className="exercises-page-loading">
          {t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}
        </p>
      ) : null}

      {error ? <p className="exercises-page-error" role="alert">{error}</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="exercises-page-empty">
          {t(props.language, {
            es: "Todavía no hay ejercicios publicados en esta categoría.",
            en: "No exercises published in this category yet.",
            pt: "Ainda não há exercícios publicados nesta categoria."
          })}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="exercises-grid" aria-label={t(props.language, { es: "Lista de ejercicios", en: "List of exercises", pt: "Lista de exercícios" })}>
          {filtered.map((exercise) => {
            const { accent, accentSoft } = categoryAccent(exercise.category);
            return (
              <li key={exercise.id} className="exercises-grid-item">
                <Link
                  className="exercise-card"
                  to={`/ejercicios/${encodeURIComponent(exercise.slug)}`}
                  aria-label={`${exercise.title} — ${categoryLabel(props.language, exercise.category)}, ${durationLabel(props.language, exercise.durationMinutes)}`}
                  style={{ "--exercise-accent": accent, "--exercise-accent-soft": accentSoft } as React.CSSProperties}
                >
                  <div className="exercise-card-emoji" aria-hidden="true">
                    {exercise.emoji}
                  </div>
                  <div className="exercise-card-body">
                    <div className="exercise-card-meta">
                      <span className="exercise-card-pill exercise-card-pill-category">{categoryLabel(props.language, exercise.category)}</span>
                      <span className="exercise-card-pill exercise-card-pill-time">⏱ {durationLabel(props.language, exercise.durationMinutes)}</span>
                      <span className="exercise-card-pill exercise-card-pill-level">{difficultyLabel(props.language, exercise.difficulty)}</span>
                    </div>
                    <h3>{exercise.title}</h3>
                    <p className="exercise-card-summary">{exercise.summary}</p>
                    <span className="exercise-card-cta">
                      {t(props.language, { es: "Empezar", en: "Start", pt: "Começar" })}
                      <span aria-hidden> →</span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
