import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { CalmFirstTherapyCard } from "./CalmFirstTherapyCard";
import { CalmMoodCheckin } from "./CalmMoodCheckin";
import { CalmWeekPlot } from "./CalmWeekPlot";
import { IconFlecha, IconRespira } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmBetweenSessions(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  authToken: string | null;
  mode?: "between" | "welcome" | "assigned";
}) {
  const navigate = useNavigate();
  const welcome = props.mode === "welcome";
  const assigned = props.mode === "assigned";
  const phoneCompact = assigned || props.mode === "between";

  return (
    <section
      className={`calm-between${phoneCompact ? " calm-between--phone-compact" : ""}${assigned ? " calm-between--assigned" : ""}`}
      aria-labelledby="calm-between-title"
    >
      <header className="calm-between-head">
        <h2 id="calm-between-title">
          {welcome || assigned
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
        <CalmMoodCheckin language={props.language} />

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
              {welcome || assigned
                ? t(props.language, { es: "Para empezar el día · 3 min", en: "To start the day · 3 min", pt: "Para começar o dia · 3 min" })
                : t(props.language, { es: "Antes de tu sesión · 3 min", en: "Before your session · 3 min", pt: "Antes da sessão · 3 min" })}
            </p>
            <h3>
              {welcome || assigned
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
