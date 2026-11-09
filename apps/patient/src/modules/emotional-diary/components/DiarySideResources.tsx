import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { IconBienestar, IconFlecha, IconMusica, IconSesiones } from "../../home/calm/calmIcons";
import { navigateToSectionTop } from "../../app/lib/navigateSectionTop";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function ResourceMancha(props: { children: ReactNode }) {
  return (
    <span className="diary-side-mancha" aria-hidden="true">
      <svg className="diary-side-mancha-blob" viewBox="0 0 100 100">
        <path d="M82 64c-6 18-26 28-44 24S8 68 10 48 28 12 50 12s38 34 32 52z" fill="#2F6B51" opacity="0.85" />
      </svg>
      {props.children}
    </span>
  );
}

const RESOURCES: {
  to: string;
  title: LocalizedText;
  body: LocalizedText;
  icon: "music" | "wellbeing" | "sessions";
}[] = [
  {
    to: "/bienestar/musica",
    icon: "music",
    title: { es: "Música relajante", en: "Relaxing music", pt: "Música relaxante" },
    body: {
      es: "Más de 100 videos por categoría: lofi, lluvia, meditación, sueño y más.",
      en: "100+ videos by category: lo-fi, rain, meditation, sleep, and more.",
      pt: "Mais de 100 vídeos por categoria: lofi, chuva, meditação, sono e mais."
    }
  },
  {
    to: "/ejercicios",
    icon: "wellbeing",
    title: { es: "Ejercicio CBT", en: "CBT exercise", pt: "Exercício TCC" },
    body: {
      es: "Herramientas prácticas inspiradas en terapia cognitiva.",
      en: "Practical tools inspired by cognitive therapy.",
      pt: "Ferramentas práticas inspiradas em terapia cognitiva."
    }
  },
  {
    to: "/sessions",
    icon: "sessions",
    title: { es: "Preparar próxima sesión", en: "Prepare next session", pt: "Preparar próxima sessão" },
    body: {
      es: "Revisá tu próximo turno y llegá con lo que quieras conversar.",
      en: "Review your next appointment and arrive with what you want to discuss.",
      pt: "Revise seu próximo horário e chegue com o que quiser conversar."
    }
  }
];

export function DiarySideResources(props: { language: AppLanguage }) {
  const navigate = useNavigate();
  const cta = t(props.language, { es: "Ir al recurso", en: "Open resource", pt: "Ir ao recurso" });

  return (
    <div className="diary-side-resources">
      {RESOURCES.map((item) => (
        <article key={item.to} className="diary-side-card">
          <ResourceMancha>
            {item.icon === "music" ? <IconMusica size={22} /> : null}
            {item.icon === "wellbeing" ? <IconBienestar size={22} /> : null}
            {item.icon === "sessions" ? <IconSesiones size={22} /> : null}
          </ResourceMancha>
          <h2>{t(props.language, item.title)}</h2>
          <p>{t(props.language, item.body)}</p>
          <button type="button" className="diary-side-link" onClick={() => navigateToSectionTop(navigate, item.to)}>
            {cta}
            <IconFlecha size={16} />
          </button>
        </article>
      ))}
    </div>
  );
}
