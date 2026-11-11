import { type AppLanguage, textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import { IconCandado, IconProfesional } from "../../home/calm/calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Intro del cuestionario (paso pre-preguntas): invita a leer, sin look de muro de texto. */
export function IntakeForkGuideCard(props: { language: AppLanguage }) {
  const lead = t(props.language, {
    es: "A continuación te haremos unas breves preguntas para orientarte hacia el profesional más adecuado para tu necesidad particular.",
    en: "Next, we’ll ask you a few short questions to guide you toward the professional best suited to your particular needs.",
    pt: "Em seguida, faremos algumas perguntas breves para orientar você ao profissional mais adequado à sua necessidade."
  });
  const privacy = t(props.language, {
    es: "Toda la información que nos brindes es confidencial y solo se utilizará para alimentar nuestro motor de búsqueda especialmente diseñado para lograr el mejor matcheo entre profesionales y pacientes.",
    en: "Everything you share is confidential and is only used to power our search engine, designed to achieve the best possible match between professionals and patients.",
    pt: "Todas as informações que você compartilhar são confidenciais e serão usadas apenas para alimentar nosso motor de busca, pensado para o melhor match entre profissionais e pacientes."
  });

  return (
    <article className="intake-fork-card intake-fork-card--guide">
      <header className="intake-fork-guide-head">
        <span className="intake-fork-guide-ico" aria-hidden="true">
          <IconProfesional size={20} />
        </span>
        <h2>{t(props.language, { es: "Cuestionario", en: "Questionnaire", pt: "Questionario" })}</h2>
      </header>
      <p className="intake-fork-guide-lead">{lead}</p>
      <p className="intake-fork-guide-note">
        <IconCandado size={16} />
        <span>{privacy}</span>
      </p>
    </article>
  );
}
