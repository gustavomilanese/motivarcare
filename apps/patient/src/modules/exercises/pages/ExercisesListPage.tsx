import { useEffect, useMemo, useState } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";
import { CalmPortalToolbarRow } from "../../app/components/CalmPortalToolbarRow";
import { useScrollSectionToTopOnMount } from "../../app/lib/navigateSectionTop";
import { WellbeingCalmHead } from "../components/WellbeingCalmHead";
import { WellbeingExerciseGrid } from "../components/WellbeingExerciseGrid";
import { WellbeingFilters, type WellbeingFilter } from "../components/WellbeingFilters";
import { WellbeingRoutinesSide } from "../components/WellbeingRoutines";
import { t } from "../lib/labels";
import { fetchPublishedExercisesContent, type ExercisePost, type ExerciseRoutine } from "../services/exercisesApi";

export interface ExercisesListPageProps {
  language: AppLanguage;
}

function bySortOrder<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function ExercisesListPage(props: ExercisesListPageProps) {
  useScrollSectionToTopOnMount();
  const [exercises, setExercises] = useState<ExercisePost[]>([]);
  const [routines, setRoutines] = useState<ExerciseRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<WellbeingFilter>("all");

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

  const filtered = useMemo(() => {
    if (filter === "all") return exercises;
    return exercises.filter((exercise) => exercise.category === filter);
  }, [exercises, filter]);

  const pageTitle = t(props.language, { es: "Bienestar", en: "Wellbeing", pt: "Bem-estar" });

  const safetyNote = t(props.language, {
    es: "Si alguno te genera molestia, suspendelo y comentalo en próxima sesión.",
    en: "If any exercise causes discomfort, stop and bring it up in your next session.",
    pt: "Se algum causar desconforto, interrompa e comente na próxima sessão."
  });

  return (
    <section className="exercises-page exercises-page--ml wellbeing-calm" aria-label={pageTitle}>
      <CalmPortalToolbarRow mountId="wellbeing-hero-toolbar-mount" />
      <div className="wellbeing-calm-columns">
        <div className="wellbeing-calm-main">
          <WellbeingCalmHead language={props.language} />
          {loading ? <MotivarCarePageLoader language={props.language} layout="block" /> : null}
          {error ? (
            <p className="wellbeing-error" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !error ? (
            <>
              <WellbeingFilters
                language={props.language}
                exercises={exercises}
                filter={filter}
                onChange={setFilter}
              />
              <div className="wellbeing-routines-slot wellbeing-routines-slot--mobile">
                <WellbeingRoutinesSide language={props.language} routines={routines} />
              </div>
              <WellbeingExerciseGrid
                language={props.language}
                exercises={filtered}
                filter={filter}
                hasRoutines={routines.length > 0}
              />
              <p className="wellbeing-note wellbeing-note--main">{safetyNote}</p>
            </>
          ) : null}
        </div>
        <aside className="wellbeing-calm-side">
          {!loading && !error ? (
            <div className="wellbeing-routines-slot wellbeing-routines-slot--desktop">
              <WellbeingRoutinesSide language={props.language} routines={routines} />
            </div>
          ) : null}
          <p className="wellbeing-note wellbeing-note--side">{safetyNote}</p>
        </aside>
      </div>
    </section>
  );
}
