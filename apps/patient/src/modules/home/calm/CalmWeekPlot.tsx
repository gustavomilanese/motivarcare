import { useMemo } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { MOOD_OPTIONS } from "../../emotional-diary/lib/moods";
import { buildWeekMoodPoints } from "./calmWeekMood";
import { useWeekMoodEntries } from "./useWeekMoodEntries";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmWeekPlot(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  authToken: string;
}) {
  const { entries, loading } = useWeekMoodEntries(props.authToken, true);
  const points = useMemo(
    () => buildWeekMoodPoints(entries, props.now, props.timeZone, props.language),
    [entries, props.language, props.now, props.timeZone]
  );
  const plotted = points.filter((point) => point.y != null);
  const last = plotted[plotted.length - 1];
  const lastMood = last?.mood ? MOOD_OPTIONS.find((mood) => mood.id === last.mood) : null;
  const lastLabel = lastMood
    ? t(props.language, { es: lastMood.labelEs, en: lastMood.labelEn, pt: lastMood.labelPt })
    : "";

  if (loading) {
    return (
      <p className="calm-week-empty" aria-busy="true">
        {t(props.language, { es: "Cargando tu semana…", en: "Loading your week…", pt: "Carregando sua semana…" })}
      </p>
    );
  }

  if (!last) {
    return (
      <p className="calm-week-empty">
        {t(props.language, {
          es: "Cuando hagas tu primer registro, tu semana va a aparecer acá.",
          en: "Once you log your first entry, your week will show up here.",
          pt: "Quando você fizer o primeiro registro, sua semana aparece aqui."
        })}
      </p>
    );
  }

  return (
    <svg
      viewBox="0 0 300 110"
      role="img"
      aria-label={t(props.language, { es: "Tu semana", en: "Your week", pt: "Sua semana" })}
    >
      <g stroke="#E2DFD3" strokeWidth="1">
        <line x1="10" y1="20" x2="290" y2="20" />
        <line x1="10" y1="55" x2="290" y2="55" />
        <line x1="10" y1="90" x2="290" y2="90" />
      </g>
      <polyline
        points={plotted.map((point) => `${point.x},${point.y}`).join(" ")}
        fill="none"
        stroke="#2F6B51"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#2F6B51">
        {plotted.slice(0, -1).map((point) => (
          <circle key={point.x} cx={point.x} cy={point.y ?? 0} r="4" />
        ))}
      </g>
      <circle cx={last.x} cy={last.y ?? 0} r="6" fill="#A9CF54" stroke="#1E4033" strokeWidth="2" />
      <text
        x={last.x}
        y={Math.max(12, (last.y ?? 0) - 18)}
        textAnchor="middle"
        fontFamily="Manrope"
        fontWeight="700"
        fontSize="11"
        fill="#1E4033"
      >
        {lastLabel}
      </text>
      <g fontFamily="Manrope" fontSize="10.5" fill="#8A958F" textAnchor="middle">
        {points.map((point) => (
          <text key={point.x} x={point.x} y="107">
            {point.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
