import { Link } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { IconFlecha } from "../../home/calm/calmIcons";
import { categoryLabel, difficultyLabel, durationLabel, t } from "../lib/labels";
import type { ExercisePost } from "../services/exercisesApi";
import type { WellbeingFilter } from "./WellbeingFilters";
import { WellbeingMark } from "./WellbeingMark";

export function WellbeingExerciseGrid(props: {
  language: AppLanguage;
  exercises: ExercisePost[];
  filter: WellbeingFilter;
  hasRoutines: boolean;
}) {
  if (props.exercises.length === 0) {
    if (props.hasRoutines && props.filter === "all") return null;
    return (
      <p className="wellbeing-empty">
        {props.hasRoutines && props.filter !== "all"
          ? t(props.language, {
              es: "Todavía no hay ejercicios publicados en esta categoría.",
              en: "No exercises published in this category yet.",
              pt: "Ainda não há exercícios publicados nesta categoria."
            })
          : t(props.language, {
              es: "Todavía no hay ejercicios publicados. El equipo los cargará desde el admin.",
              en: "No exercises published yet. The team will load them from admin.",
              pt: "Ainda não há exercícios publicados. A equipe carregará pelo admin."
            })}
      </p>
    );
  }

  const title = t(props.language, { es: "Prácticas", en: "Practices", pt: "Práticas" });
  const showCount = props.filter === "all";

  return (
    <section className="wellbeing-exercises" aria-labelledby="wellbeing-practices-title">
      <h2 id="wellbeing-practices-title">
        {title}
        {showCount ? <span className="wellbeing-practices-count"> ({props.exercises.length})</span> : null}
      </h2>
      <ul className="wellbeing-exercise-list">
        {props.exercises.map((exercise) => (
          <li key={exercise.id}>
            <Link
              className="wellbeing-exercise-card"
              to={`/ejercicios/${encodeURIComponent(exercise.slug)}`}
              aria-label={`${exercise.title} — ${categoryLabel(props.language, exercise.category)}, ${durationLabel(props.language, exercise.durationMinutes)}`}
            >
              <WellbeingMark category={exercise.category} />
              <span className="wellbeing-exercise-copy">
                <span className="wellbeing-pills">
                  <span>{categoryLabel(props.language, exercise.category)}</span>
                  <span>{durationLabel(props.language, exercise.durationMinutes)}</span>
                  <span>{difficultyLabel(props.language, exercise.difficulty)}</span>
                </span>
                <strong>{exercise.title}</strong>
                <span className="wellbeing-exercise-summary">{exercise.summary}</span>
                <span className="wellbeing-exercise-cta">
                  {t(props.language, { es: "Empezar", en: "Start", pt: "Começar" })}
                  <IconFlecha size={16} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
