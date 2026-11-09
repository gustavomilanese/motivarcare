import { type AppLanguage } from "@therapy/i18n-config";
import type { EmotionalDiaryStats } from "@therapy/types";
import { MoodFace } from "../../home/calm/calmIcons";
import { formatDiaryEntryDate } from "../hooks/useDiaryRecords";
import { t } from "../lib/labels";
import { moodLabelForStats } from "../lib/analytics";

export function DiaryRecordsStats(props: { language: AppLanguage; stats: EmotionalDiaryStats | null }) {
  const stats = props.stats;
  const monthDelta = stats ? stats.entriesThisMonth - stats.entriesPrevMonth : 0;
  const lastShared = stats?.lastSharedAt ? formatDiaryEntryDate(stats.lastSharedAt, props.language) : "—";

  return (
    <div className="diary-records-stats">
      <article>
        <p>{t(props.language, { es: "Entradas este mes", en: "Entries this month", pt: "Entradas este mês" })}</p>
        <strong>{stats?.entriesThisMonth ?? 0}</strong>
        <span>
          {monthDelta >= 0 ? "+" : ""}
          {monthDelta} {t(props.language, { es: "vs. mes anterior", en: "vs. previous month", pt: "vs. mês anterior" })}
        </span>
      </article>
      <article>
        <p>{t(props.language, { es: "Mood más frecuente", en: "Most frequent mood", pt: "Humor mais frequente" })}</p>
        <strong className="diary-records-stat-mood">
          {stats ? <MoodFace face={stats.mostFrequentMood} /> : null}
          {moodLabelForStats(stats?.mostFrequentMood ?? "regular", props.language)}
        </strong>
        <span>
          {stats?.mostFrequentMoodPct ?? 0}%{" "}
          {t(props.language, { es: "de tus registros", en: "of your entries", pt: "dos seus registros" })}
        </span>
      </article>
      <article>
        <p>{t(props.language, { es: "Días consecutivos registrando", en: "Consecutive logging days", pt: "Dias consecutivos registrando" })}</p>
        <strong>
          {stats?.consecutiveDays ?? 0} {t(props.language, { es: "días", en: "days", pt: "dias" })}
        </strong>
        <span>{t(props.language, { es: "¡Seguí así!", en: "Keep it up!", pt: "Continue assim!" })}</span>
      </article>
      <article>
        <p>{t(props.language, { es: "Compartidas con psicólogo", en: "Shared with therapist", pt: "Compartilhadas com psicólogo" })}</p>
        <strong>{stats?.sharedWithPsychologist ?? 0}</strong>
        <span>
          {t(props.language, { es: "Última:", en: "Last:", pt: "Última:" })} {lastShared}
        </span>
      </article>
    </div>
  );
}
