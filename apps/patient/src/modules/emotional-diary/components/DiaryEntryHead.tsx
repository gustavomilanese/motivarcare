import { useNavigate } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { navigateToSectionTop } from "../../app/lib/navigateSectionTop";
import { IconAtras } from "../../home/calm/calmIcons";
import { t } from "../lib/labels";

export function DiaryEntryHead(props: {
  language: AppLanguage;
  isDirty: boolean;
  onConfirmLeave: () => boolean;
}) {
  const navigate = useNavigate();

  return (
    <header className="diary-entry-head">
      <button
        type="button"
        className="diary-entry-back"
        onClick={() => {
          if (!props.onConfirmLeave()) return;
          navigateToSectionTop(navigate, "/diario");
        }}
      >
        <IconAtras size={18} />
        {t(props.language, { es: "Volver al diario", en: "Back to diary", pt: "Voltar ao diário" })}
      </button>
      <p className="diary-calm-kicker">{t(props.language, { es: "Diario", en: "Diary", pt: "Diário" })}</p>
      <h1 id="diary-page-title">
        {t(props.language, { es: "Contale a tu ", en: "Tell your ", pt: "Conte ao seu " })}
        <em>{t(props.language, { es: "diario", en: "diary", pt: "diário" })}</em>
      </h1>
      <p className="diary-entry-lead">
        {t(props.language, {
          es: "Cómo te sentís hoy, en tus palabras.",
          en: "How you feel today, in your words.",
          pt: "Como você se sente hoje, com suas palavras."
        })}
      </p>
    </header>
  );
}
