import { useNavigate } from "react-router-dom";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { IconCandado } from "../../home/calm/calmIcons";
import { MoodClimateIcon } from "../../home/calm/MoodClimateIcon";
import { MOOD_OPTIONS } from "../lib/moods";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Escala climática del diario (misma definición que home). */
export function DiaryMoodCheckin(props: { language: AppLanguage }) {
  const navigate = useNavigate();

  return (
    <article className="calm-card calm-mood">
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
      <div className="calm-mood-row">
        {MOOD_OPTIONS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            onClick={() => navigate(`/diario/nueva?mood=${mood.id}`)}
          >
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
          es: "Solo lo ves vos, salvo que elijas compartirlo.",
          en: "Only you can see it, unless you choose to share it.",
          pt: "Só você vê, a menos que escolha compartilhar."
        })}
      </p>
    </article>
  );
}
