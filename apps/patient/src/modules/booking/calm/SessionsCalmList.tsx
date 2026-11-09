import { useState, type SyntheticEvent } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Booking, Professional } from "../../app/types";
import { SessionsCalmRow } from "./SessionsCalmRow";

const PREVIEW = 3;

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function SessionsCalmList(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  bookings: Booking[];
  professionals: Professional[];
  photoMap: Record<string, string>;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenDetail: (bookingId: string) => void;
  onReschedule: (booking: Booking) => void;
  titled?: "upcoming" | "later";
}) {
  const [expanded, setExpanded] = useState(false);
  if (props.titled === "later" && props.bookings.length === 0) {
    return null;
  }
  const title = props.titled === "later"
    ? t(props.language, { es: "Después", en: "Later", pt: "Depois" })
    : t(props.language, { es: "Próximas sesiones", en: "Upcoming sessions", pt: "Próximas sessões" });
  const hasMore = props.bookings.length > PREVIEW;
  const visible = expanded || !hasMore ? props.bookings : props.bookings.slice(0, PREVIEW);

  return (
    <section className="sessions-calm-list" aria-label={title}>
      <h2>{title}</h2>
      {props.bookings.length === 0 ? (
        <p className="sessions-calm-empty">
          {t(props.language, {
            es: "Todavía no tenés sesiones reservadas.",
            en: "You do not have booked sessions yet.",
            pt: "Você ainda não tem sessões reservadas."
          })}
        </p>
      ) : (
        <>
          {visible.map((booking) => (
            <SessionsCalmRow
              key={booking.id}
              booking={booking}
              language={props.language}
              timeZone={props.timeZone}
              now={props.now}
              professionals={props.professionals}
              photoUrl={props.photoMap[booking.professionalId] ?? null}
              onImageFallback={props.onImageFallback}
              onOpenDetail={props.onOpenDetail}
              onReschedule={props.onReschedule}
            />
          ))}
          {hasMore ? (
            <button
              type="button"
              className="sessions-calm-link sessions-calm-list-more"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded
                ? t(props.language, { es: "Ver menos", en: "Show less", pt: "Ver menos" })
                : t(props.language, {
                    es: `Ver más (${props.bookings.length - PREVIEW})`,
                    en: `See more (${props.bookings.length - PREVIEW})`,
                    pt: `Ver mais (${props.bookings.length - PREVIEW})`
                  })}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
