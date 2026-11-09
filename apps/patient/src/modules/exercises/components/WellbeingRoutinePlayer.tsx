import { type AppLanguage } from "@therapy/i18n-config";
import type { ExercisePost, ExerciseRoutine } from "../services/exercisesApi";
import { categoryLabel, durationLabel, t } from "../lib/labels";
import { ExerciseInteractiveSteps } from "./ExerciseInteractiveSteps";
import { WellbeingMark } from "./WellbeingMark";

/** Paso a paso de una rutina en la columna principal. */
export function WellbeingRoutinePlayer(props: {
  language: AppLanguage;
  routine: ExerciseRoutine;
  exercises: ExercisePost[];
  activeExerciseId: string | null;
  onSelectExercise: (id: string) => void;
  onNext: () => void;
}) {
  const activeIndex = props.activeExerciseId
    ? props.exercises.findIndex((exercise) => exercise.id === props.activeExerciseId)
    : -1;
  const activeExercise = activeIndex >= 0 ? props.exercises[activeIndex] ?? null : null;
  const leadCategory = props.routine.exercises[0]?.category ?? "relajacion";

  return (
    <div className="wellbeing-routine-player">
      <header className="exercise-routine-header">
        <div className="exercise-routine-header-main">
          <WellbeingMark category={leadCategory} size="lg" className="exercise-routine-emoji" />
          <div>
            <p className="exercise-routine-kicker">
              {t(props.language, { es: "Rutina guiada", en: "Guided routine", pt: "Rotina guiada" })}
            </p>
            <h2>{props.routine.title}</h2>
            <p className="exercise-routine-summary">{props.routine.summary}</p>
            <p className="exercise-routine-meta">
              {props.exercises.length}{" "}
              {t(props.language, { es: "ejercicios", en: "exercises", pt: "exercícios" })} ·{" "}
              {durationLabel(props.language, props.routine.totalDurationMinutes)}
            </p>
          </div>
        </div>
      </header>

      <div className="exercise-routine-layout">
        <aside
          className="exercise-routine-sidebar"
          aria-label={t(props.language, {
            es: "Secuencia de la rutina",
            en: "Routine sequence",
            pt: "Sequência da rotina"
          })}
        >
          <h3>{t(props.language, { es: "En esta rutina", en: "In this routine", pt: "Nesta rotina" })}</h3>
          <ol className="exercise-routine-steps">
            {props.exercises.map((exercise, index) => {
              const isActive = exercise.id === props.activeExerciseId;
              const isDone = activeIndex >= 0 && index < activeIndex;
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    className={`exercise-routine-step${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                    onClick={() => props.onSelectExercise(exercise.id)}
                  >
                    <span className="exercise-routine-step-index">{index + 1}</span>
                    <WellbeingMark category={exercise.category} size="sm" className="exercise-routine-step-emoji" />
                    <span className="exercise-routine-step-body">
                      <strong>{exercise.title}</strong>
                      <small>
                        {categoryLabel(props.language, exercise.category)} ·{" "}
                        {durationLabel(props.language, exercise.durationMinutes)}
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
                <WellbeingMark category={activeExercise.category} size="lg" className="exercise-reader-emoji" />
                <div className="exercise-reader-heading">
                  <div className="exercise-reader-pills">
                    <span className="exercise-card-pill exercise-card-pill-category">
                      {categoryLabel(props.language, activeExercise.category)}
                    </span>
                    <span className="exercise-card-pill exercise-card-pill-time">
                      {durationLabel(props.language, activeExercise.durationMinutes)}
                    </span>
                  </div>
                  <h3>{activeExercise.title}</h3>
                  <p className="exercise-reader-summary">{activeExercise.summary}</p>
                </div>
              </header>
              <p className="exercise-reader-description">{activeExercise.description}</p>
              <ExerciseInteractiveSteps exercise={activeExercise} language={props.language} />
              <div className="exercise-routine-nav">
                {activeIndex < props.exercises.length - 1 ? (
                  <button type="button" className="primary exercise-routine-next" onClick={props.onNext}>
                    {t(props.language, {
                      es: "Siguiente en la rutina",
                      en: "Next in routine",
                      pt: "Próximo na rotina"
                    })}
                    : {props.exercises[activeIndex + 1]?.title}
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
    </div>
  );
}
