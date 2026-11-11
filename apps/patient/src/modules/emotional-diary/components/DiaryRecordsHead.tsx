import { useNavigate } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { navigateToSectionTop } from "../../app/lib/navigateSectionTop";
import { IconAtras } from "../../home/calm/calmIcons";
import { t } from "../lib/labels";

/** Volver: fila full-width arriba de las columnas (la col3 alinea con «Diario»). */
export function DiaryRecordsBack(props: { language: AppLanguage }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="diary-records-back"
      onClick={() => navigateToSectionTop(navigate, "/diario")}
    >
      <IconAtras size={18} />
      {t(props.language, { es: "Volver al diario", en: "Back to diary", pt: "Voltar ao diário" })}
    </button>
  );
}

export function DiaryRecordsHead(props: { language: AppLanguage }) {
  const navigate = useNavigate();

  return (
    <header className="diary-records-head">
      <div className="diary-records-head-row">
        <div>
          <p className="diary-calm-kicker">{t(props.language, { es: "Diario", en: "Diary", pt: "Diário" })}</p>
          <h1 id="diary-page-title">
            {t(props.language, { es: "Tus ", en: "Your ", pt: "Seus " })}
            <em>{t(props.language, { es: "registros", en: "records", pt: "registros" })}</em>
          </h1>
          <p className="diary-records-lead">
            {t(props.language, {
              es: "Revisá tu historial emocional, identificá patrones y preparate para tus sesiones.",
              en: "Review your emotional history, spot patterns, and prepare for sessions.",
              pt: "Revise seu histórico emocional, identifique padrões e prepare-se para as sessões."
            })}
          </p>
        </div>
        <button
          type="button"
          className="diary-records-new"
          onClick={() => navigateToSectionTop(navigate, "/diario/nueva")}
        >
          {t(props.language, { es: "Nueva entrada", en: "New entry", pt: "Nova entrada" })}
        </button>
      </div>
    </header>
  );
}
