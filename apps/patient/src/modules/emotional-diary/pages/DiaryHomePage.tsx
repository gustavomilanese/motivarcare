import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { DiaryEntriesTimeline } from "../components/DiaryEntriesTimeline";
import { DiaryEntryDetailModal } from "../components/DiaryEntryDetailModal";
import { DiaryMoodPicker } from "../components/DiaryMoodPicker";
import { DiaryHomeHero, DiaryShell, DiarySubNav } from "../components/DiaryChrome";
import { t } from "../lib/labels";
import { fetchDiaryEntries, migrateLocalDiaryIfNeeded } from "../services/emotionalDiaryApi";
import type { DiaryEntry, MoodLevel } from "../types";

export interface DiaryHomePageProps {
  language: AppLanguage;
  authToken: string;
}

function formatEntryDate(iso: string, language: AppLanguage): string {
  return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function DiaryHomePage(props: DiaryHomePageProps) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await migrateLocalDiaryIfNeeded(props.authToken);
        const published = await fetchDiaryEntries(props.authToken, "published");
        if (cancelled) return;
        setEntries(published);
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : "Error al cargar el diario");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.authToken]);

  const recent = useMemo(() => entries.slice(0, 3), [entries]);
  const detailEntry = useMemo(
    () => (detailEntryId ? entries.find((entry) => entry.id === detailEntryId) ?? null : null),
    [detailEntryId, entries]
  );

  const homeResources = useMemo(
    () => [
      {
        to: "/bienestar/musica",
        title: t(props.language, { es: "Música relajante", en: "Relaxing music", pt: "Música relaxante" }),
        description: t(props.language, {
          es: "Más de 100 videos por categoría: lofi, lluvia, meditación, sueño y más.",
          en: "100+ videos by category: lofi, rain, meditation, sleep, and more.",
          pt: "Mais de 100 vídeos por categoria: lofi, chuva, meditação, sono e mais."
        })
      },
      {
        to: "/ejercicios",
        title: t(props.language, { es: "Ejercicio CBT", en: "CBT exercise", pt: "Exercício TCC" }),
        description: t(props.language, {
          es: "Herramientas prácticas inspiradas en terapia cognitiva.",
          en: "Practical tools inspired by cognitive therapy.",
          pt: "Ferramentas práticas inspiradas em terapia cognitiva."
        })
      },
      {
        to: "/sessions",
        title: t(props.language, { es: "Preparar próxima sesión", en: "Prepare next session", pt: "Preparar próxima sessão" }),
        description: t(props.language, {
          es: "Revisá tu próximo turno y llegá con lo que quieras conversar.",
          en: "Review your next appointment and arrive with what you want to discuss.",
          pt: "Revise seu próximo horário e chegue com o que quiser conversar."
        })
      }
    ],
    [props.language]
  );

  function handleMoodQuickPick(mood: MoodLevel) {
    navigate(`/diario/nueva?mood=${mood}`);
  }

  const heroTitle = t(props.language, { es: "Diario emocional", en: "Emotional diary", pt: "Diário emocional" });
  const heroSubtitle = t(props.language, {
    es: "Un check-in rápido entre sesiones. Te guiamos paso a paso al escribir.",
    en: "A quick check-in between sessions. We guide you step by step as you write.",
    pt: "Um check-in rápido entre sessões. Guiamos você passo a passo ao escrever."
  });

  if (loading) {
    return (
      <DiaryShell language={props.language} className="diary-page--home">
        <div className="page-stack diary-home-page">
          <DiaryHomeHero title={heroTitle} subtitle={heroSubtitle} />
          <section className="sessions-hero-actions-band diary-home-subnav-band" aria-label={t(props.language, { es: "Secciones del diario", en: "Diary sections", pt: "Seções do diário" })}>
            <DiarySubNav language={props.language} />
          </section>
          <p className="diary-muted diary-home-band-pad">{t(props.language, { es: "Cargando diario…", en: "Loading diary…", pt: "Carregando diário…" })}</p>
        </div>
      </DiaryShell>
    );
  }

  return (
    <DiaryShell language={props.language} className="diary-page--home">
      <div className="page-stack diary-home-page">
        <DiaryHomeHero title={heroTitle} subtitle={heroSubtitle} />
        <section className="sessions-hero-actions-band diary-home-subnav-band" aria-label={t(props.language, { es: "Secciones del diario", en: "Diary sections", pt: "Seções do diário" })}>
          <DiarySubNav language={props.language} />
        </section>

        {error ? <p className="diary-error diary-home-band-pad">{error}</p> : null}

        <section
          className="diary-home-band diary-home-band--checkin"
          aria-label={t(props.language, { es: "Check-in de hoy", en: "Today's check-in", pt: "Check-in de hoje" })}
        >
          <article className="diary-hero-card diary-hero-card--elevated">
            <h3 className="diary-hero-card-title">
              <span className="diary-home-eyebrow diary-home-eyebrow--inline">
                {t(props.language, { es: "Paso 1", en: "Step 1", pt: "Passo 1" })}
              </span>
              <span className="diary-hero-card-title-text">
                {t(props.language, { es: "¿Cómo te sentís hoy?", en: "How do you feel today?", pt: "Como você se sente hoje?" })}
              </span>
            </h3>
            <p>
              {t(props.language, {
                es: "Elegí un estado o empezá directo. En la entrada te hacemos preguntas cortas. Escribí en tu diario cuando te sirva — te guiamos paso a paso en cada sección.",
                en: "Pick a mood or start right away. Short guided prompts in the entry flow. Write in your diary when it works for you — we guide you step by step in each section.",
                pt: "Escolha um humor ou comece direto. Perguntas curtas na entrada. Escreva no seu diário quando fizer sentido — guiamos você passo a passo em cada seção."
              })}
            </p>
            <DiaryMoodPicker
              language={props.language}
              ariaLabel={t(props.language, {
                es: "Elegí cómo te sentís hoy",
                en: "Choose how you feel today",
                pt: "Escolha como você se sente hoje"
              })}
              onSelect={handleMoodQuickPick}
            />
          </article>
          <div className="diary-checkin-actions">
            <Link className="diary-btn diary-btn--primary diary-btn--wide" to="/diario/nueva">
              <span aria-hidden="true">✏️</span>
              {t(props.language, { es: "Nueva entrada", en: "New entry", pt: "Nova entrada" })}
            </Link>
            <Link className="diary-soft-link" to="/diario/registros">
              {t(props.language, {
                es: "Ver historial y estadísticas →",
                en: "View history and stats →",
                pt: "Ver histórico e estatísticas →"
              })}
            </Link>
          </div>
        </section>

        <section
          className="diary-home-band diary-home-band--history"
          aria-label={t(props.language, { es: "Historial reciente", en: "Recent history", pt: "Histórico recente" })}
        >
          <header className="diary-recent-head">
            <h3 className="diary-recent-title">
              {t(props.language, { es: "Últimas entradas", en: "Recent entries", pt: "Últimas entradas" })}
            </h3>
            {recent.length > 0 ? (
              <Link className="diary-recent-link" to="/diario/registros">
                {t(props.language, { es: "Ver todas", en: "See all", pt: "Ver todas" })}
              </Link>
            ) : null}
          </header>
          <DiaryEntriesTimeline
            language={props.language}
            entries={recent}
            variant="minimal"
            onOpenDetail={setDetailEntryId}
            ariaLabel={t(props.language, { es: "Últimas entradas", en: "Recent entries", pt: "Últimas entradas" })}
            emptyMessage={t(props.language, {
              es: "Todavía no tenés entradas. Tu primera puede tomar unos minutos.",
              en: "No entries yet. Your first one only takes a few minutes.",
              pt: "Ainda não há entradas. A primeira leva só alguns minutos."
            })}
          />
        </section>

        <section
          className="diary-home-band diary-home-band--extras"
          aria-labelledby="diary-home-more-title"
        >
          <h2 id="diary-home-more-title" className="diary-home-section-title">
            {t(props.language, { es: "Más opciones", en: "More options", pt: "Mais opções" })}
          </h2>
          <p className="diary-home-section-lead">
            {t(props.language, {
              es: "Recursos útiles para acompañarte entre sesiones.",
              en: "Helpful resources to support you between sessions.",
              pt: "Recursos úteis para acompanhar você entre sessões."
            })}
          </p>
          <ul className="diary-resource-list">
            {homeResources.map((resource) => (
              <li key={`${resource.to}-${resource.title}`}>
                <Link className="diary-resource-card" to={resource.to}>
                  <strong>{resource.title}</strong>
                  <span className="diary-resource-desc">{resource.description}</span>
                  <span className="diary-resource-cta">
                    {t(props.language, { es: "Ir al recurso →", en: "Go to resource →", pt: "Ir ao recurso →" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {detailEntry ? (
        <DiaryEntryDetailModal
          language={props.language}
          entry={detailEntry}
          formattedDate={formatEntryDate(detailEntry.createdAt, props.language)}
          onClose={() => setDetailEntryId(null)}
        />
      ) : null}
    </DiaryShell>
  );
}
