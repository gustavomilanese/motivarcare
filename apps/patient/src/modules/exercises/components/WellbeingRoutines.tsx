import { useState } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import { IconFlecha } from "../../home/calm/calmIcons";
import { t } from "../lib/labels";
import type { ExerciseRoutine } from "../services/exercisesApi";
import { WellbeingRoutineCard } from "./WellbeingRoutineCard";

const SIDE_PREVIEW = 2;

/** Columna lateral: teaser + expandir lista completa. */
export function WellbeingRoutinesSide(props: {
  language: AppLanguage;
  routines: ExerciseRoutine[];
  activeSlug?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  if (props.routines.length === 0) return null;

  const visible = expanded ? props.routines : props.routines.slice(0, SIDE_PREVIEW);
  const hasMore = props.routines.length > SIDE_PREVIEW;

  return (
    <section className="wellbeing-routines wellbeing-routines--side" aria-labelledby="exercise-routines-side-title">
      <div className="wellbeing-section-head">
        <h2 id="exercise-routines-side-title">
          {t(props.language, { es: "Rutinas guiadas", en: "Guided routines", pt: "Rotinas guiadas" })}
        </h2>
        <p>
          {t(props.language, {
            es: "Varios ejercicios, en orden. Al abrirlas se ven en el centro.",
            en: "Several exercises, in order. Opening one shows it in the main column.",
            pt: "Vários exercícios, em ordem. Ao abrir, aparecem na coluna principal."
          })}
        </p>
      </div>
      <ul className="wellbeing-routines-list">
        {visible.map((routine) => (
          <li key={routine.id}>
            <WellbeingRoutineCard
              language={props.language}
              routine={routine}
              compact
              active={props.activeSlug === routine.slug}
            />
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button type="button" className="wellbeing-routines-more" onClick={() => setExpanded((value) => !value)}>
          {expanded
            ? t(props.language, { es: "Ver menos", en: "Show less", pt: "Ver menos" })
            : t(props.language, {
                es: `Ver las ${props.routines.length} rutinas`,
                en: `See all ${props.routines.length} routines`,
                pt: `Ver as ${props.routines.length} rotinas`
              })}
          {expanded ? null : <IconFlecha size={16} />}
        </button>
      ) : null}
    </section>
  );
}
