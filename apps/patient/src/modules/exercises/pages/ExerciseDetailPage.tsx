import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { fetchPublishedExercises, type ExercisePost } from "../services/exercisesApi";
import { categoryAccent, categoryLabel, difficultyLabel, durationLabel, t } from "../lib/labels";

export interface ExerciseDetailPageProps {
  language: AppLanguage;
}

export function ExerciseDetailPage(props: ExerciseDetailPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const [all, setAll] = useState<ExercisePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPublishedExercises()
      .then((data) => {
        if (!active) return;
        setAll(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(
          t(props.language, {
            es: "No pudimos cargar el ejercicio. Probá de nuevo en unos minutos.",
            en: "We couldn’t load the exercise. Please try again in a few minutes.",
            pt: "Não foi possível carregar o exercício. Tente novamente em alguns minutos."
          })
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props.language]);

  const exercise = useMemo(() => {
    if (!slug) return null;
    const decoded = decodeURIComponent(slug);
    return all.find((item) => item.slug === decoded) ?? null;
  }, [all, slug]);

  const related = useMemo(() => {
    if (!exercise) return [];
    return all.filter((item) => item.id !== exercise.id && item.category === exercise.category).slice(0, 3);
  }, [all, exercise]);

  if (loading) {
    return (
      <section className="exercise-reader-page">
        <Link to="/ejercicios" className="exercise-reader-back">
          ← {t(props.language, { es: "Volver a ejercicios", en: "Back to exercises", pt: "Voltar aos exercícios" })}
        </Link>
        <p className="exercises-page-loading">
          {t(props.language, { es: "Cargando ejercicio…", en: "Loading exercise…", pt: "Carregando exercício…" })}
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="exercise-reader-page">
        <Link to="/ejercicios" className="exercise-reader-back">
          ← {t(props.language, { es: "Volver a ejercicios", en: "Back to exercises", pt: "Voltar aos exercícios" })}
        </Link>
        <p className="exercises-page-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!exercise) {
    return (
      <section className="exercise-reader-page">
        <Link to="/ejercicios" className="exercise-reader-back">
          ← {t(props.language, { es: "Volver a ejercicios", en: "Back to exercises", pt: "Voltar aos exercícios" })}
        </Link>
        <p className="exercises-page-empty">
          {t(props.language, {
            es: "No encontramos ese ejercicio.",
            en: "We couldn’t find that exercise.",
            pt: "Não encontramos esse exercício."
          })}
        </p>
      </section>
    );
  }

  const { accent, accentSoft } = categoryAccent(exercise.category);

  return (
    <section
      className="exercise-reader-page"
      style={{ "--exercise-accent": accent, "--exercise-accent-soft": accentSoft } as React.CSSProperties}
    >
      <Link to="/ejercicios" className="exercise-reader-back">
        ← {t(props.language, { es: "Volver a ejercicios", en: "Back to exercises", pt: "Voltar aos exercícios" })}
      </Link>

      <article className="exercise-reader" aria-labelledby="exercise-title">
        <header className="exercise-reader-header">
          <div className="exercise-reader-emoji" aria-hidden="true">
            {exercise.emoji}
          </div>
          <div className="exercise-reader-heading">
            <div className="exercise-reader-pills">
              <span className="exercise-card-pill exercise-card-pill-category">{categoryLabel(props.language, exercise.category)}</span>
              <span className="exercise-card-pill exercise-card-pill-time">⏱ {durationLabel(props.language, exercise.durationMinutes)}</span>
              <span className="exercise-card-pill exercise-card-pill-level">{difficultyLabel(props.language, exercise.difficulty)}</span>
            </div>
            <h2 id="exercise-title">{exercise.title}</h2>
            <p className="exercise-reader-summary">{exercise.summary}</p>
          </div>
        </header>

        <div className="exercise-reader-grid">
          <div className="exercise-reader-main">
            <p className="exercise-reader-description">{exercise.description}</p>

            <ExerciseInteractiveSteps exercise={exercise} language={props.language} />
          </div>

          <aside className="exercise-reader-side" aria-label={t(props.language, { es: "Información adicional", en: "Additional info", pt: "Informação adicional" })}>
            {exercise.benefits.length > 0 ? (
              <section className="exercise-reader-section exercise-reader-side-card" aria-labelledby="exercise-benefits-title">
                <h3 id="exercise-benefits-title">
                  {t(props.language, { es: "Beneficios", en: "Benefits", pt: "Benefícios" })}
                </h3>
                <ul className="exercise-reader-benefits">
                  {exercise.benefits.map((benefit, index) => (
                    <li key={`benefit-${index}`}>{benefit}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {exercise.tips.length > 0 ? (
              <section className="exercise-reader-section exercise-reader-side-card" aria-labelledby="exercise-tips-title">
                <h3 id="exercise-tips-title">{t(props.language, { es: "Tips", en: "Tips", pt: "Dicas" })}</h3>
                <ul className="exercise-reader-tips">
                  {exercise.tips.map((tip, index) => (
                    <li key={`tip-${index}`}>{tip}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {exercise.contraindications.trim().length > 0 ? (
              <aside className="exercise-reader-warning" role="note">
                <strong>
                  {t(props.language, { es: "Atención", en: "Heads up", pt: "Atenção" })}
                </strong>
                <span>{exercise.contraindications}</span>
              </aside>
            ) : null}
          </aside>
        </div>
      </article>

      {related.length > 0 ? (
        <aside className="exercise-reader-related" aria-labelledby="related-title">
          <h3 id="related-title">
            {t(props.language, { es: "También te puede servir", en: "You may also like", pt: "Você também pode gostar" })}
          </h3>
          <ul className="exercise-reader-related-list">
            {related.map((item) => {
              const itemAccent = categoryAccent(item.category);
              return (
                <li key={item.id}>
                  <Link
                    to={`/ejercicios/${encodeURIComponent(item.slug)}`}
                    className="exercise-card exercise-card-compact"
                    style={
                      {
                        "--exercise-accent": itemAccent.accent,
                        "--exercise-accent-soft": itemAccent.accentSoft
                      } as React.CSSProperties
                    }
                  >
                    <div className="exercise-card-emoji" aria-hidden="true">{item.emoji}</div>
                    <div className="exercise-card-body">
                      <h3>{item.title}</h3>
                      <p className="exercise-card-summary">{item.summary}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}

function ExerciseInteractiveSteps({ exercise, language }: { exercise: ExercisePost; language: AppLanguage }) {
  const [stepDone, setStepDone] = useState<boolean[]>(() => exercise.steps.map(() => false));
  const [pauseSec, setPauseSec] = useState<number | null>(null);

  useEffect(() => {
    setStepDone(exercise.steps.map(() => false));
    setPauseSec(null);
  }, [exercise.id]);

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
