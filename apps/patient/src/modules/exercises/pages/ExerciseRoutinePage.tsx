import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import {
  fetchPublishedExercisesContent,
  type ExercisePost,
  type ExerciseRoutine
} from "../services/exercisesApi";
import { categoryAccent, categoryLabel, durationLabel, t } from "../lib/labels";
import { ExerciseInteractiveSteps } from "../components/ExerciseInteractiveSteps";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";

export interface ExerciseRoutinePageProps {
  language: AppLanguage;
}

export function ExerciseRoutinePage(props: ExerciseRoutinePageProps) {
  const { slug } = useParams<{ slug: string }>();
  const [exercises, setExercises] = useState<ExercisePost[]>([]);
  const [routines, setRoutines] = useState<ExerciseRoutine[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPublishedExercisesContent()
      .then((data) => {
        if (!active) return;
        setExercises(data.exercises);
        setRoutines(data.routines);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(
          t(props.language, {
            es: "No pudimos cargar la rutina. Probá de nuevo en unos minutos.",
            en: "We couldn’t load the routine. Please try again in a few minutes.",
            pt: "Não foi possível carregar a rotina. Tente novamente em alguns minutos."
          })
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props.language]);

  const routine = useMemo(() => {
    if (!slug) return null;
    const decoded = decodeURIComponent(slug);
    return routines.find((item) => item.slug === decoded) ?? null;
  }, [routines, slug]);

  const routineExercises = useMemo(() => {
    if (!routine) return [];
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    return routine.exerciseIds
      .map((id) => byId.get(id))
      .filter((exercise): exercise is ExercisePost => Boolean(exercise));
  }, [exercises, routine]);

  useEffect(() => {
    if (routineExercises.length === 0) {
      setActiveExerciseId(null);
      return;
    }
    setActiveExerciseId((current) => {
      if (current && routineExercises.some((exercise) => exercise.id === current)) {
        return current;
      }
      return routineExercises[0]?.id ?? null;
    });
  }, [routineExercises]);

  const activeExercise = useMemo(
    () => routineExercises.find((exercise) => exercise.id === activeExerciseId) ?? null,
    [activeExerciseId, routineExercises]
  );

  const activeIndex = useMemo(
    () => (activeExercise ? routineExercises.findIndex((exercise) => exercise.id === activeExercise.id) : -1),
    [activeExercise, routineExercises]
  );

  const goToNext = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= routineExercises.length - 1) {
      return;
    }
    setActiveExerciseId(routineExercises[activeIndex + 1]?.id ?? null);
  }, [activeIndex, routineExercises]);

  if (loading) {
    return (
      <section className="exercise-routine-page">
        <Link to="/ejercicios" className="exercise-reader-back">
          ← {t(props.language, { es: "Volver a ejercicios", en: "Back to exercises", pt: "Voltar aos exercícios" })}
        </Link>
        <MotivarCarePageLoader language={props.language} layout="block" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="exercise-routine-page">
        <Link to="/ejercicios" className="exercise-reader-back">
          ← {t(props.language, { es: "Volver a ejercicios", en: "Back to exercises", pt: "Voltar aos exercícios" })}
        </Link>
        <p className="exercises-page-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!routine || routineExercises.length === 0) {
    return (
      <section className="exercise-routine-page">
        <Link to="/ejercicios" className="exercise-reader-back">
          ← {t(props.language, { es: "Volver a ejercicios", en: "Back to exercises", pt: "Voltar aos exercícios" })}
        </Link>
        <p className="exercises-page-empty">
          {t(props.language, {
            es: "No encontramos esa rutina.",
            en: "We couldn’t find that routine.",
            pt: "Não encontramos essa rotina."
          })}
        </p>
      </section>
    );
  }

  const accent = "#5F44EB";
  const accentSoft = "rgba(95, 68, 235, 0.08)";

  return (
    <section
      className="exercise-routine-page"
      style={{ "--exercise-accent": accent, "--exercise-accent-soft": accentSoft } as React.CSSProperties}
    >
      <Link to="/ejercicios" className="exercise-reader-back">
        ← {t(props.language, { es: "Volver a ejercicios", en: "Back to exercises", pt: "Voltar aos exercícios" })}
      </Link>

      <header className="exercise-routine-header">
        <div className="exercise-routine-header-main">
          <span className="exercise-routine-emoji" aria-hidden="true">
            {routine.emoji}
          </span>
          <div>
            <p className="exercise-routine-kicker">
              {t(props.language, { es: "Rutina guiada", en: "Guided routine", pt: "Rotina guiada" })}
            </p>
            <h2>{routine.title}</h2>
            <p className="exercise-routine-summary">{routine.summary}</p>
            <p className="exercise-routine-meta">
              {routineExercises.length}{" "}
              {t(props.language, { es: "ejercicios", en: "exercises", pt: "exercícios" })} · ⏱{" "}
              {durationLabel(props.language, routine.totalDurationMinutes)}
            </p>
          </div>
        </div>
      </header>

      <div className="exercise-routine-layout">
        <aside className="exercise-routine-sidebar" aria-label={t(props.language, { es: "Secuencia de la rutina", en: "Routine sequence", pt: "Sequência da rotina" })}>
          <h3>{t(props.language, { es: "En esta rutina", en: "In this routine", pt: "Nesta rotina" })}</h3>
          <ol className="exercise-routine-steps">
            {routineExercises.map((exercise, index) => {
              const isActive = exercise.id === activeExerciseId;
              const isDone = activeIndex >= 0 && index < activeIndex;
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    className={`exercise-routine-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                    onClick={() => setActiveExerciseId(exercise.id)}
                  >
                    <span className="exercise-routine-step-index">{index + 1}</span>
                    <span className="exercise-routine-step-emoji" aria-hidden="true">
                      {exercise.emoji}
                    </span>
                    <span className="exercise-routine-step-body">
                      <strong>{exercise.title}</strong>
                      <small>
                        {categoryLabel(props.language, exercise.category)} · {durationLabel(props.language, exercise.durationMinutes)}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="exercise-routine-main">
          {activeExercise ? (
            <article className="exercise-reader exercise-routine-active-card">
              <header className="exercise-reader-header">
                <div className="exercise-reader-emoji" aria-hidden="true">
                  {activeExercise.emoji}
                </div>
                <div className="exercise-reader-heading">
                  <div className="exercise-reader-pills">
                    <span className="exercise-card-pill exercise-card-pill-category">
                      {categoryLabel(props.language, activeExercise.category)}
                    </span>
                    <span className="exercise-card-pill exercise-card-pill-time">
                      ⏱ {durationLabel(props.language, activeExercise.durationMinutes)}
                    </span>
                  </div>
                  <h3>{activeExercise.title}</h3>
                  <p className="exercise-reader-summary">{activeExercise.summary}</p>
                </div>
              </header>
              <p className="exercise-reader-description">{activeExercise.description}</p>
              <ExerciseInteractiveSteps exercise={activeExercise} language={props.language} />
              <div className="exercise-routine-nav">
                {activeIndex < routineExercises.length - 1 ? (
                  <button type="button" className="primary exercise-routine-next" onClick={goToNext}>
                    {t(props.language, {
                      es: "Siguiente en la rutina",
                      en: "Next in routine",
                      pt: "Próximo na rotina"
                    })}
                    : {routineExercises[activeIndex + 1]?.title}
                  </button>
                ) : (
                  <p className="exercise-routine-complete" role="status">
                    {t(props.language, {
                      es: "Completaste la rutina. Podés repetirla cuando quieras.",
                      en: "You finished the routine. You can repeat it anytime.",
                      pt: "Você concluiu a rotina. Pode repetir quando quiser."
                    })}
                  </p>
                )}
              </div>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
