import type { ExerciseCategory } from "../services/exercisesApi";
import { wellbeingMarkIcon } from "../lib/wellbeingMarkIcon";
import { wellbeingMarkTone } from "../lib/wellbeingMarkTone";

/** Mancha + ícono de línea del DS (`icono-mancha` de app-usuario). */
export function WellbeingMark(props: {
  category?: ExerciseCategory | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const size = props.size ?? "md";
  const iconPx = size === "sm" ? 18 : size === "lg" ? 26 : 22;
  const tone = wellbeingMarkTone(props.category);

  return (
    <span
      className={`wellbeing-mark wellbeing-mark--${size}${props.className ? ` ${props.className}` : ""}`}
      style={{ color: tone.icon }}
      aria-hidden="true"
    >
      <svg className="wellbeing-mark-blob" viewBox="0 0 100 100">
        <path d="M82 64c-6 18-26 28-44 24S8 68 10 48 28 12 50 12s38 34 32 52z" fill={tone.mancha} opacity="0.9" />
      </svg>
      {wellbeingMarkIcon(props.category, iconPx)}
    </span>
  );
}
