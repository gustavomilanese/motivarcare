import { type AppLanguage } from "@therapy/i18n-config";
import { IconFlecha } from "../../home/calm/calmIcons";
import type { ExerciseRoutineStep } from "../services/exercisesApi";
import { WellbeingMark } from "./WellbeingMark";

/** Mini secuencia paso a paso de una rutina. */
export function WellbeingRoutineSteps(props: {
  language: AppLanguage;
  steps: ExerciseRoutineStep[];
  compact?: boolean;
}) {
  if (props.steps.length === 0) return null;

  return (
    <ol className={`wellbeing-routine-steps${props.compact ? " is-compact" : ""}`}>
      {props.steps.map((step, index) => (
        <li key={step.id}>
          {index > 0 ? (
            <span className="wellbeing-routine-steps-arrow" aria-hidden="true">
              <IconFlecha size={14} />
            </span>
          ) : null}
          <span className="wellbeing-routine-step">
            <span className="wellbeing-routine-step-num">{index + 1}</span>
            <WellbeingMark category={step.category} size="sm" />
            <span className="wellbeing-routine-step-title">{step.title}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
