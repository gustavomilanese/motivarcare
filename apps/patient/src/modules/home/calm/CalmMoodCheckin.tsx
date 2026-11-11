import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { MOOD_OPTIONS } from "../../emotional-diary/lib/moods";
import { IconCandado } from "./calmIcons";
import { MoodClimateIcon } from "./MoodClimateIcon";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Check-in “El clima de tu día” (home) — definición Alternativa A. */
export function CalmMoodCheckin(props: { language: AppLanguage }) {
  const navigate = useNavigate();

  return (
    <article className="calm-card calm-mood" data-tour="patient-tour-diary">
      <div>
        <h3>
          {t(props.language, {
            es: "¿Cómo está tu día?",
            en: "How is your day?",
            pt: "Como está o seu dia?"
          })}
        </h3>
        <p className="calm-mood__blurb">
          {t(props.language, {
            es: "El clima de tu día. Elegí el que mejor te representa ahora.",
            en: "The weather of your day. Pick the one that fits you now.",
            pt: "O clima do seu dia. Escolha o que melhor te representa agora."
          })}
        </p>
      </div>
      <div className="calm-mood-row" role="list">
        {MOOD_OPTIONS.map((mood) => (
          <button key={mood.id} type="button" onClick={() => navigate(`/diario/nueva?mood=${mood.id}`)}>
            <span className="calm-mood-icon-slot" aria-hidden="true">
              <MoodClimateIcon mood={mood.id} />
            </span>
            {t(props.language, { es: mood.labelEs, en: mood.labelEn, pt: mood.labelPt })}
          </button>
        ))}
      </div>
      <p className="calm-note">
        <IconCandado size={16} />
        {t(props.language, {
          es: "Solo lo ves vos, salvo que elijas compartirlo",
          en: "Only you can see it, unless you choose to share it",
          pt: "Só você vê, a menos que escolha compartilhar"
        })}
      </p>
    </article>
  );
}
