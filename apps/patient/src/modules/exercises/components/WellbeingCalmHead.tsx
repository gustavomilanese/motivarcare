import { useState } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import { formatDayHeading } from "../../home/calm/calmHomeFormat";
import { t } from "../lib/labels";

export function WellbeingCalmHead(props: { language: AppLanguage }) {
  const [now] = useState(() => new Date());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <header className="wellbeing-calm-head">
      <p className="wellbeing-calm-kicker">{formatDayHeading(now, timeZone, props.language)}</p>
      <h1 id="exercises-page-title">
        {t(props.language, { es: "Tu ", en: "Your ", pt: "Seu " })}
        <em>{t(props.language, { es: "bienestar", en: "wellbeing", pt: "bem-estar" })}</em>
      </h1>
      <p className="wellbeing-calm-lead">
        {t(props.language, {
          es: "Prácticas breves de respiración, postura y presencia para sumar claridad entre turnos.",
          en: "Short breathing, posture, and presence practices to add clarity between sessions.",
          pt: "Práticas breves de respiração, postura e presença para somar clareza entre sessões."
        })}
      </p>
    </header>
  );
}
