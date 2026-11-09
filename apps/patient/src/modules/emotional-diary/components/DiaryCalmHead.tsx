import { useState } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { formatDayHeading } from "../../home/calm/calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function DiaryCalmHead(props: { language: AppLanguage }) {
  const [now] = useState(() => new Date());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <header className="diary-calm-head">
      <p className="diary-calm-kicker">{formatDayHeading(now, timeZone, props.language)}</p>
      <h1 id="diary-page-title">
        {t(props.language, { es: "Tu ", en: "Your ", pt: "Seu " })}
        <em>{t(props.language, { es: "diario", en: "diary", pt: "diário" })}</em>
      </h1>
    </header>
  );
}
