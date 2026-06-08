import { useCallback, useEffect, useState } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import type { ExercisePost } from "../services/exercisesApi";
import { t } from "../lib/labels";

export function ExerciseInteractiveSteps(props: { exercise: ExercisePost; language: AppLanguage }) {
  const { exercise, language } = props;
  const [stepDone, setStepDone] = useState<boolean[]>(() => exercise.steps.map(() => false));
  const [pauseSec, setPauseSec] = useState<number | null>(null);

  useEffect(() => {
    setStepDone(exercise.steps.map(() => false));
    setPauseSec(null);
  }, [exercise.id, exercise.steps]);

  useEffect(() => {
    if (pauseSec === null || pauseSec <= 0) {
      return;
    }
    const id = window.setTimeout(() => setPauseSec((s) => (s !== null && s > 0 ? s - 1 : null)), 1000);
    return () => window.clearTimeout(id);
  }, [pauseSec]);

  const toggleStep = useCallback((index: number) => {
    setStepDone((prev) => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = !next[index];
      return next;
    });
  }, []);

  const doneCount = stepDone.filter(Boolean).length;
  const total = exercise.steps.length;
  const pct = total > 0 ? Math.round((100 * doneCount) / total) : 0;

  const startPause = (seconds: number) => {
    setPauseSec(seconds);
  };

  return (
    <section className="exercise-interactive exercise-reader-section" aria-labelledby="exercise-steps-title">
      <div className="exercise-interactive-head">
        <h3 id="exercise-steps-title">
          {t(language, { es: "Cómo hacerlo", en: "How to do it", pt: "Como fazer" })}
        </h3>
        <p className="exercise-interactive-lead">
          {t(language, {
            es: "Marcá cada paso cuando lo hayas hecho. Usá el temporizador para pausas o respiraciones.",
            en: "Check off each step as you go. Use the timer for pauses or breaths.",
            pt: "Marque cada passo ao concluir. Use o temporizador para pausas ou respirações."
          })}
        </p>
      </div>

      <div className="exercise-interactive-timers" role="group" aria-label={t(language, { es: "Temporizadores", en: "Timers", pt: "Temporizadores" })}>
        <button type="button" className="exercise-timer-btn" onClick={() => startPause(30)} disabled={pauseSec !== null && pauseSec > 0}>
          {t(language, { es: "Pausa 30 s", en: "30s pause", pt: "Pausa 30 s" })}
        </button>
        <button type="button" className="exercise-timer-btn" onClick={() => startPause(60)} disabled={pauseSec !== null && pauseSec > 0}>
          {t(language, { es: "Pausa 60 s", en: "60s pause", pt: "Pausa 60 s" })}
        </button>
        <button type="button" className="exercise-timer-btn" onClick={() => startPause(120)} disabled={pauseSec !== null && pauseSec > 0}>
          {t(language, { es: "Pausa 2 min", en: "2 min pause", pt: "Pausa 2 min" })}
        </button>
        {(pauseSec ?? 0) > 0 ? (
          <span className="exercise-timer-count" aria-live="polite">
            {pauseSec}s
          </span>
        ) : pauseSec === 0 ? (
          <span className="exercise-timer-done" role="status">
            {t(language, { es: "Listo", en: "Done", pt: "Pronto" })}
          </span>
        ) : null}
        {(pauseSec ?? 0) > 0 || pauseSec === 0 ? (
          <button type="button" className="exercise-timer-cancel" onClick={() => setPauseSec(null)}>
            {t(language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </button>
        ) : null}
      </div>

      <div
        className="exercise-interactive-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={t(language, { es: "Progreso del ejercicio", en: "Exercise progress", pt: "Progresso do exercício" })}
      >
        <div className="exercise-interactive-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="exercise-interactive-progress-label">
        {doneCount}/{total}{" "}
        {t(language, { es: "pasos", en: "steps", pt: "passos" })}
      </p>

      <ol className="exercise-interactive-steps">
        {exercise.steps.map((step, index) => (
          <li key={`ix-${index}`}>
            <label className="exercise-interactive-step-label">
              <input type="checkbox" checked={stepDone[index] ?? false} onChange={() => toggleStep(index)} />
              <span className="exercise-interactive-step-index" aria-hidden="true">
                {index + 1}
              </span>
              <span className="exercise-interactive-step-text">{step}</span>
            </label>
          </li>
        ))}
      </ol>

      {doneCount === total && total > 0 ? (
        <p className="exercise-interactive-celebrate" role="status">
          {t(language, {
            es: "¡Listo! Si querés, repetí el circuito o probá otro ejercicio del menú.",
            en: "Nice work! Repeat the flow or try another exercise from the menu.",
            pt: "Ótimo! Repita o fluxo ou experimente outro exercício do menu."
          })}
        </p>
      ) : null}
    </section>
  );
}
