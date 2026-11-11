import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { Booking } from "../../app/types";
import { formatClock, formatWeekday } from "../../home/calm/calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Col 3: próxima sesión → Sesiones. */
export function AssignedProUpcomingCard(props: {
  language: AppLanguage;
  timeZone: string;
  booking: Booking | null;
}) {
  const when = props.booking
    ? `${formatWeekday(props.booking.startsAt, props.timeZone, props.language)}, ${formatClock(props.booking.startsAt, props.timeZone, props.language)}`
    : null;

  return (
    <article className="assigned-pro-rail-card">
      <p className="assigned-pro-rail-kicker">
        {t(props.language, { es: "Próximas sesiones", en: "Upcoming sessions", pt: "Próximas sessões" })}
      </p>
      {when ? (
        <>
          <h3 className="assigned-pro-rail-title">{when}</h3>
          <p className="assigned-pro-rail-copy">
            {t(props.language, {
              es: "Videollamada de 50 min",
              en: "50 min video call",
              pt: "Videochamada de 50 min"
            })}
          </p>
        </>
      ) : (
        <p className="assigned-pro-rail-copy">
          {t(props.language, {
            es: "Todavía no tenés una sesión agendada.",
            en: "You don’t have a session scheduled yet.",
            pt: "Ainda não há uma sessão agendada."
          })}
        </p>
      )}
      <Link className="assigned-pro-rail-link" to="/sessions">
        {t(props.language, {
          es: "Ir a Sesiones",
          en: "Go to Sessions",
          pt: "Ir para Sessões"
        })}
      </Link>
    </article>
  );
}
