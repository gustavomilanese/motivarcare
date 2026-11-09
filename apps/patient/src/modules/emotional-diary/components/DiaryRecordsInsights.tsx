import { type AppLanguage } from "@therapy/i18n-config";
import type { EmotionalDiaryInsight } from "@therapy/types";
import { t } from "../lib/labels";

export function DiaryRecordsInsights(props: { language: AppLanguage; insights: EmotionalDiaryInsight[] }) {
  return (
    <section className="diary-records-side-card" aria-labelledby="diary-records-insights-title">
      <h2 id="diary-records-insights-title">
        {t(props.language, { es: "Insights de la semana", en: "Weekly insights", pt: "Insights da semana" })}
      </h2>
      <p>{t(props.language, { es: "Reflexiones generadas para vos.", en: "Reflections generated for you.", pt: "Reflexões geradas para você." })}</p>
      <ul className="diary-records-insights">
        {props.insights.length === 0 ? (
          <li>
            {t(props.language, {
              es: "Seguí registrando para ver insights acá.",
              en: "Keep logging to see insights here.",
              pt: "Continue registrando para ver insights aqui."
            })}
          </li>
        ) : (
          props.insights.map((insight) => (
            <li key={insight.id}>
              <span aria-hidden="true">{insight.icon}</span>
              <p>{t(props.language, { es: insight.textEs, en: insight.textEn, pt: insight.textPt })}</p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
