import { Link } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { IconFlecha } from "../../home/calm/calmIcons";
import { durationLabel, t } from "../lib/labels";
import type { ExerciseRoutine } from "../services/exercisesApi";
import { WellbeingMark } from "./WellbeingMark";
import { WellbeingRoutineSteps } from "./WellbeingRoutineSteps";

/** Tarjeta de rutina: mancha + pasos ordenados + CTA. */
export function WellbeingRoutineCard(props: {
  language: AppLanguage;
  routine: ExerciseRoutine;
  compact?: boolean;
  active?: boolean;
}) {
  const { routine, language } = props;
  const leadCategory = routine.exercises[0]?.category ?? "relajacion";
  const href = `/ejercicios/rutinas/${encodeURIComponent(routine.slug)}`;

  return (
    <Link
      className={`wellbeing-routine-card${props.compact ? " is-compact" : ""}${props.active ? " is-active" : ""}`}
      to={href}
      aria-current={props.active ? "page" : undefined}
    >
      <span className="wellbeing-routine-card-top">
        <WellbeingMark category={leadCategory} size={props.compact ? "sm" : "md"} />
        <span className="wellbeing-routine-copy">
          <strong>{routine.title}</strong>
          {props.compact ? null : <span>{routine.summary}</span>}
          <small>
            {routine.exercises.length}{" "}
            {t(language, { es: "ejercicios", en: "exercises", pt: "exercícios" })}
            {" · "}
            {durationLabel(language, routine.totalDurationMinutes)}
          </small>
        </span>
      </span>
      <WellbeingRoutineSteps language={language} steps={routine.exercises} compact={props.compact} />
      <span className="wellbeing-routine-cta">
        {t(language, {
          es: "Empezar paso a paso",
          en: "Start step by step",
          pt: "Começar passo a passo"
        })}
        <IconFlecha size={16} />
      </span>
    </Link>
  );
}
