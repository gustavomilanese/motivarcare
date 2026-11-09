import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { MOOD_OPTIONS } from "../../emotional-diary/lib/moods";
import type { MoodLevel } from "../../emotional-diary/types";
import { IconCandado, MoodFace } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Escala corta del mock app-usuario (home). El diario sigue con labels de clima. */
const HOME_MOOD_LABELS: Record<MoodLevel, LocalizedText> = {
  very_bad: { es: "Muy mal", en: "Very bad", pt: "Muito mal" },
  bad: { es: "Mal", en: "Bad", pt: "Mal" },
  regular: { es: "Regular", en: "Okay", pt: "Regular" },
  good: { es: "Bien", en: "Good", pt: "Bem" },
  very_good: { es: "Muy bien", en: "Great", pt: "Muito bem" }
};

export function CalmMoodCheckin(props: { language: AppLanguage }) {
  const navigate = useNavigate();

  return (
    <article className="calm-card calm-mood" data-tour="patient-tour-diary">
      <div>
        <h3>
          {t(props.language, {
            es: "¿Cómo estás hoy?",
            en: "How are you today?",
            pt: "Como você está hoje?"
          })}
        </h3>
        <p className="calm-mood__blurb">
          {t(props.language, {
            es: "Un registro rápido para tu diario.",
            en: "A quick note for your diary.",
            pt: "Um registro rápido para o diário."
          })}
        </p>
      </div>
      <div className="calm-mood-row" role="list">
        {MOOD_OPTIONS.map((mood) => (
          <button key={mood.id} type="button" onClick={() => navigate(`/diario/nueva?mood=${mood.id}`)}>
            <span aria-hidden="true">
              <MoodFace face={mood.id} />
            </span>
            {t(props.language, HOME_MOOD_LABELS[mood.id])}
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
