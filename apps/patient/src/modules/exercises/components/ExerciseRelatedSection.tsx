import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import type { ExercisePost } from "../services/exercisesApi";
import { categoryAccent, categoryLabel, difficultyLabel, durationLabel, t } from "../lib/labels";

/** Bloque tipo “productos relacionados” de un portal de compra. */
export function ExerciseRelatedSection(props: {
  language: AppLanguage;
  category: ExercisePost["category"];
  items: ExercisePost[];
}) {
  if (props.items.length === 0) {
    return null;
  }

  return (
    <aside className="exercise-related-section" aria-labelledby="exercise-related-title">
      <header className="exercise-related-header">
        <p className="exercise-related-eyebrow">
          {t(props.language, {
            es: "También te puede servir",
            en: "You may also like",
            pt: "Você também pode gostar"
          })}
        </p>
        <h3 id="exercise-related-title">
          {t(props.language, {
            es: `Más ejercicios de ${categoryLabel(props.language, props.category)}`,
            en: `More ${categoryLabel(props.language, props.category)} exercises`,
            pt: `Mais exercícios de ${categoryLabel(props.language, props.category)}`
          })}
        </h3>
        <p className="exercise-related-lead">
          {t(props.language, {
            es: "Seguí tu tratamiento con estas sugerencias de la misma categoría.",
            en: "Keep going with these suggestions from the same category.",
            pt: "Continue seu tratamento com estas sugestões da mesma categoria."
          })}
        </p>
      </header>
      <ul className="exercise-related-grid">
        {props.items.map((item) => {
          const itemAccent = categoryAccent(item.category);
          return (
            <li key={item.id}>
              <Link
                to={`/ejercicios/${encodeURIComponent(item.slug)}`}
                className="exercise-related-card"
                style={
                  {
                    "--exercise-accent": itemAccent.accent,
                    "--exercise-accent-soft": itemAccent.accentSoft
                  } as CSSProperties
                }
              >
                <span className="exercise-related-card-emoji" aria-hidden="true">
                  {item.emoji}
                </span>
                <span className="exercise-related-card-pills">
                  <span>{categoryLabel(props.language, item.category)}</span>
                  <span>⏱ {durationLabel(props.language, item.durationMinutes)}</span>
                  <span>{difficultyLabel(props.language, item.difficulty)}</span>
                </span>
                <strong className="exercise-related-card-title">{item.title}</strong>
                <span className="exercise-related-card-summary">{item.summary}</span>
                <span className="exercise-related-card-cta">
                  {t(props.language, { es: "Ver ejercicio →", en: "View exercise →", pt: "Ver exercício →" })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
