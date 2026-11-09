import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import {
  fetchPublishedExercisesContent,
  type ExercisePost,
  type ExerciseRoutine
} from "../services/exercisesApi";
import { pickRelatedByCategory, t } from "../lib/labels";
import { ExerciseRelatedSection } from "../components/ExerciseRelatedSection";
import { WellbeingRoutinePlayer } from "../components/WellbeingRoutinePlayer";
import { WellbeingRoutinesSide } from "../components/WellbeingRoutines";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";
import { PortalAccountToolsMount } from "../../app/components/PortalAccountToolsMount";
import { useScrollSectionToTopOnMount } from "../../app/lib/navigateSectionTop";

export interface ExerciseRoutinePageProps {
  language: AppLanguage;
}

function bySortOrder<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function ExerciseRoutinePage(props: ExerciseRoutinePageProps) {
  useScrollSectionToTopOnMount();
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
        setExercises(bySortOrder(data.exercises));
        setRoutines(bySortOrder(data.routines));
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

  const decodedSlug = slug ? decodeURIComponent(slug) : null;
  const routine = useMemo(
    () => (decodedSlug ? routines.find((item) => item.slug === decodedSlug) ?? null : null),
    [decodedSlug, routines]
  );

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

  const related = useMemo(() => {
    if (!activeExercise) return [];
    return pickRelatedByCategory(exercises, activeExercise, 3);
  }, [activeExercise, exercises]);

  const goToNext = useCallback(() => {
    const index = activeExercise
      ? routineExercises.findIndex((exercise) => exercise.id === activeExercise.id)
      : -1;
    if (index < 0 || index >= routineExercises.length - 1) return;
    setActiveExerciseId(routineExercises[index + 1]?.id ?? null);
  }, [activeExercise, routineExercises]);

  const backLabel = t(props.language, {
    es: "Volver a filtros y prácticas",
    en: "Back to filters and practices",
    pt: "Voltar aos filtros e práticas"
  });

  const pageTitle = t(props.language, { es: "Bienestar", en: "Wellbeing", pt: "Bem-estar" });

  return (
    <section className="exercises-page exercises-page--ml wellbeing-calm" aria-label={pageTitle}>
      <div className="wellbeing-calm-columns">
        <div className="wellbeing-calm-main">
          <Link to="/ejercicios" className="exercise-reader-back wellbeing-routine-back">
            ← {backLabel}
          </Link>

          {loading ? <MotivarCarePageLoader language={props.language} layout="block" /> : null}

          {error ? (
            <p className="wellbeing-error" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && !error && (!routine || routineExercises.length === 0) ? (
            <p className="wellbeing-empty">
              {t(props.language, {
                es: "No encontramos esa rutina.",
                en: "We couldn’t find that routine.",
                pt: "Não encontramos essa rotina."
              })}
            </p>
          ) : null}

          {!loading && !error && routine && routineExercises.length > 0 ? (
            <>
              <WellbeingRoutinePlayer
                language={props.language}
                routine={routine}
                exercises={routineExercises}
                activeExerciseId={activeExerciseId}
                onSelectExercise={setActiveExerciseId}
                onNext={goToNext}
              />
              {activeExercise ? (
                <ExerciseRelatedSection
                  language={props.language}
                  category={activeExercise.category}
                  items={related}
                />
              ) : null}
            </>
          ) : null}
        </div>

        <aside className="wellbeing-calm-side">
          <PortalAccountToolsMount id="wellbeing-hero-toolbar-mount" className="wellbeing-calm-tools" />
          {!loading && !error ? (
            <WellbeingRoutinesSide language={props.language} routines={routines} activeSlug={decodedSlug} />
          ) : null}
          <p className="wellbeing-note">
            {t(props.language, {
              es: "Si alguno te genera molestia, suspendelo y comentalo en próxima sesión.",
              en: "If any exercise causes discomfort, stop and bring it up in your next session.",
              pt: "Se algum causar desconforto, interrompa e comente na próxima sessão."
            })}
          </p>
        </aside>
      </div>
    </section>
  );
}
