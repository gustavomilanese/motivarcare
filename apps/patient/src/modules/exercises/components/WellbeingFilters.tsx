import { type AppLanguage } from "@therapy/i18n-config";
import { ALL_CATEGORIES, categoryLabel, t } from "../lib/labels";
import type { ExerciseCategory, ExercisePost } from "../services/exercisesApi";

export type WellbeingFilter = "all" | ExerciseCategory;

export function WellbeingFilters(props: {
  language: AppLanguage;
  exercises: ExercisePost[];
  filter: WellbeingFilter;
  onChange: (filter: WellbeingFilter) => void;
}) {
  if (props.exercises.length === 0) return null;

  const present = new Set(props.exercises.map((exercise) => exercise.category));
  const categories = ALL_CATEGORIES.filter((category) => present.has(category));

  return (
    <div
      className="wellbeing-filters"
      role="tablist"
      aria-label={t(props.language, {
        es: "Filtrar por categoría",
        en: "Filter by category",
        pt: "Filtrar por categoria"
      })}
    >
      <button
        type="button"
        role="tab"
        aria-selected={props.filter === "all"}
        className={`wellbeing-filter${props.filter === "all" ? " is-active" : ""}`}
        onClick={() => props.onChange("all")}
      >
        {t(props.language, { es: "Todos", en: "All", pt: "Todos" })}
        <span>{props.exercises.length}</span>
      </button>
      {categories.map((category) => {
        const count = props.exercises.filter((exercise) => exercise.category === category).length;
        const active = props.filter === category;
        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={active}
            className={`wellbeing-filter${active ? " is-active" : ""}`}
            onClick={() => props.onChange(category)}
          >
            {categoryLabel(props.language, category)}
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
