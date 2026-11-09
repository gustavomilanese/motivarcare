import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { MOOD_OPTIONS } from "../../emotional-diary/lib/moods";
import { CalmFirstTherapyCard } from "./CalmFirstTherapyCard";
import { CalmWeekPlot } from "./CalmWeekPlot";
import { IconCandado, IconFlecha, IconRespira, MoodFace } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmBetweenSessions(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  authToken: string;
  mode?: "between" | "welcome";
}) {
  const navigate = useNavigate();
  const welcome = props.mode === "welcome";

  return (
    <section className="calm-between" aria-labelledby="calm-between-title">
      <header className="calm-between-head">
        <h2 id="calm-between-title">
          {welcome
            ? t(props.language, { es: "Mientras tanto", en: "In the meantime", pt: "Enquanto isso" })
            : t(props.language, { es: "Entre sesiones", en: "Between sessions", pt: "Entre sessões" })}
        </h2>
        {welcome ? null : (
          <button type="button" className="calm-text-link" onClick={() => navigate("/diario")}>
            {t(props.language, { es: "Ir al diario", en: "Open diary", pt: "Ir ao diário" })}
            <IconFlecha size={16} />
          </button>
        )}
      </header>
      <div className="calm-between-grid">
        <article className="calm-card calm-mood" data-tour="patient-tour-diary">
          <div>
            <h3>{t(props.language, { es: "¿Cómo está tu día?", en: "How is your day?", pt: "Como está o seu dia?" })}</h3>
            <p>
              {t(props.language, {
                es: "El clima de tu día. Un registro rápido para tu diario.",
                en: "The weather of your day. A quick note for your diary.",
                pt: "O clima do seu dia. Um registro rápido para o diário."
              })}
            </p>
          </div>
          <div className="calm-mood-row" role="list">
            {MOOD_OPTIONS.map((mood) => (
              <button key={mood.id} type="button" onClick={() => navigate(`/diario/nueva?mood=${mood.id}`)}>
                <span aria-hidden="true">
                  <MoodFace face={mood.id} />
                </span>
                {t(props.language, { es: mood.labelEs, en: mood.labelEn, pt: mood.labelPt })}
              </button>
            ))}
          </div>
          <p className="calm-note">
            <IconCandado size={16} />
            {t(props.language, {
              es: "Solo lo ves vos, salvo que elijas compartirlo.",
              en: "Only you can see it, unless you choose to share it.",
              pt: "Só você vê, a menos que escolha compartilhar."
            })}
          </p>
        </article>

        {welcome ? (
          <CalmFirstTherapyCard language={props.language} />
        ) : (
          <article className="calm-card calm-week">
            <div>
              <h3>{t(props.language, { es: "Tu semana", en: "Your week", pt: "Sua semana" })}</h3>
              <p>
                {t(props.language, {
                  es: "Cómo te sentiste los últimos 7 días",
                  en: "How you felt over the last 7 days",
                  pt: "Como você se sentiu nos últimos 7 dias"
                })}
              </p>
            </div>
            <div className="calm-week-plot">
              <CalmWeekPlot
                language={props.language}
                timeZone={props.timeZone}
                now={props.now}
                authToken={props.authToken}
              />
            </div>
          </article>
        )}

        <article className="calm-card calm-breath" data-tour="patient-tour-exercises">
          <span className="calm-breath-icon" aria-hidden="true">
            <svg className="calm-breath-blob" viewBox="0 0 100 100">
              <path d="M82 64c-6 18-26 28-44 24S8 68 10 48 28 12 50 12s38 34 32 52z" fill="#2F6B51" opacity="0.85" />
            </svg>
            <IconRespira size={26} />
          </span>
          <div>
            <p>
              {welcome
                ? t(props.language, { es: "Para empezar el día · 3 min", en: "To start the day · 3 min", pt: "Para começar o dia · 3 min" })
                : t(props.language, { es: "Antes de tu sesión · 3 min", en: "Before your session · 3 min", pt: "Antes da sessão · 3 min" })}
            </p>
            <h3>
              {welcome
                ? t(props.language, {
                    es: "Respiración para bajar la ansiedad",
                    en: "A breath to ease anxiety",
                    pt: "Respiração para baixar a ansiedade"
                  })
                : t(props.language, {
                    es: "Respiración para llegar con calma",
                    en: "A breath to arrive calmly",
                    pt: "Respiração para chegar com calma"
                  })}
            </h3>
          </div>
          <button type="button" className="calm-text-link" onClick={() => navigate("/ejercicios")}>
            {t(props.language, { es: "Empezar", en: "Start", pt: "Começar" })}
            <IconFlecha size={16} />
          </button>
        </article>
      </div>
    </section>
  );
}
