import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { formatDayHeading } from "../../home/calm/calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function SessionsCalmHead(props: { language: AppLanguage; timeZone: string; now: Date }) {
  return (
    <header className="sessions-calm-head">
      <div>
        <p className="sessions-calm-kicker">{formatDayHeading(props.now, props.timeZone, props.language)}</p>
        <h1 id="sessions-page-title">
          {t(props.language, { es: "Tus ", en: "Your ", pt: "Suas " })}
          <em>{t(props.language, { es: "sesiones", en: "sessions", pt: "sessões" })}</em>
        </h1>
      </div>
    </header>
  );
}
