import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { IconCheck, IconFlecha } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const POINTS: LocalizedText[] = [
  {
    es: "La primera sesión es para conocerse.",
    en: "The first session is for getting to know each other.",
    pt: "A primeira sessão é para se conhecerem."
  },
  {
    es: "Si no te sentís a gusto, podés pedir un cambio de profesional.",
    en: "If it doesn't feel right, you can ask to change professionals.",
    pt: "Se não se sentir à vontade, você pode pedir uma troca de profissional."
  }
];

export function CalmFirstTherapyCard(props: { language: AppLanguage }) {
  const navigate = useNavigate();
  return (
    <article className="calm-card calm-first-note">
      <div>
        <h3>{t(props.language, { es: "¿Es tu primera vez en terapia?", en: "Is this your first time in therapy?", pt: "É sua primeira vez em terapia?" })}</h3>
        <p>{t(props.language, { es: "No hace falta tener todo claro para empezar.", en: "You don't need to have it all figured out to start.", pt: "Não precisa ter tudo claro para começar." })}</p>
      </div>
      <ul>
        {POINTS.map((point) => (
          <li key={point.es}>
            <span aria-hidden="true"><IconCheck size={14} /></span>
            {t(props.language, point)}
          </li>
        ))}
      </ul>
      <button type="button" className="calm-text-link" onClick={() => navigate("/ayuda/preguntas-frecuentes")}>
        {t(props.language, {
          es: "Qué esperar de la primera sesión",
          en: "What to expect from the first session",
          pt: "O que esperar da primeira sessão"
        })}
        <IconFlecha size={16} />
      </button>
    </article>
  );
}
