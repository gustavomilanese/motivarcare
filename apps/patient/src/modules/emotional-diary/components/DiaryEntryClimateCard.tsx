import { type AppLanguage } from "@therapy/i18n-config";
import { IconCandado } from "../../home/calm/calmIcons";
import { MoodClimateIcon } from "../../home/calm/MoodClimateIcon";
import { DiaryMoodPicker } from "./DiaryMoodPicker";
import { t } from "../lib/labels";
import { moodMeta } from "../lib/moods";
import type { MoodLevel } from "../types";

export function DiaryEntryClimateCard(props: {
  language: AppLanguage;
  mood: MoodLevel;
  onMood: (mood: MoodLevel) => void;
}) {
  const selected = moodMeta(props.mood);

  return (
    <article className="diary-entry-card diary-entry-card--menta">
      <h2>{t(props.language, { es: "¿Cómo está tu día?", en: "How is your day?", pt: "Como está o seu dia?" })}</h2>
      <p className="diary-entry-help">
        {t(props.language, {
          es: "El clima de tu día. Elegí el que mejor te representa ahora.",
          en: "The weather of your day. Pick the one that fits you now.",
          pt: "O clima do seu dia. Escolha o que melhor te representa agora."
        })}
      </p>
      <DiaryMoodPicker
        language={props.language}
        activeMood={props.mood}
        onSelect={props.onMood}
        ariaLabel={t(props.language, {
          es: "El clima de tu día",
          en: "The weather of your day",
          pt: "O clima do seu dia"
        })}
      />
      <p className="diary-entry-selected">
        <MoodClimateIcon mood={props.mood} size={22} />
        {t(props.language, { es: selected.labelEs, en: selected.labelEn, pt: selected.labelPt })}
      </p>
      <p className="diary-entry-privacy">
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
