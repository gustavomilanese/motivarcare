import { useEffect, useMemo, useState } from "react";
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

        <p className="exercise-reader-description">{exercise.description}</p>

        {exercise.benefits.length > 0 ? (
          <section className="exercise-reader-section" aria-labelledby="exercise-benefits-title">
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

        <section className="exercise-reader-section" aria-labelledby="exercise-steps-title">
          <h3 id="exercise-steps-title">
            {t(props.language, { es: "Cómo hacerlo", en: "How to do it", pt: "Como fazer" })}
          </h3>
          <ol className="exercise-reader-steps">
            {exercise.steps.map((step, index) => (
              <li key={`step-${index}`}>
                <span className="exercise-reader-step-index" aria-hidden="true">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {exercise.tips.length > 0 ? (
          <section className="exercise-reader-section" aria-labelledby="exercise-tips-title">
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
