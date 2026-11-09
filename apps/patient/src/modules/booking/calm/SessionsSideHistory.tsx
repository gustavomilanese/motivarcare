import type { Ref } from "react";
import type { AppLanguage, LocalizedText } from "@therapy/i18n-config";
import { formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { findProfessionalById } from "../../app/lib/professionals";
import type { Booking, Professional } from "../../app/types";
import { IconCheck } from "../../home/calm/calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Historial de sesiones, en la columna lateral de Sesiones. */
export function SessionsSideHistory(props: {
  language: AppLanguage;
  timeZone: string;
  bookings: Booking[];
  professionals: Professional[];
  assignedName: string | null;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (bookingId: string) => void;
  sectionRef: Ref<HTMLElement>;
}) {
  const items = props.bookings.slice(0, 10);
  const visible = props.expanded ? items : items.slice(0, 1);
  const fallback = props.assignedName ?? t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" });

  return (
    <section ref={props.sectionRef} className="sessions-side-card" tabIndex={-1}>
      <header>
        <h2>
          <span className="sessions-side-done" aria-hidden="true">
            <IconCheck size={18} />
          </span>
          {t(props.language, { es: "Historial", en: "History", pt: "Histórico" })}
        </h2>
        {items.length > 1 ? (
          <button type="button" aria-expanded={props.expanded} onClick={props.onToggle}>
            {props.expanded
              ? t(props.language, { es: "Ver menos", en: "Show less", pt: "Ver menos" })
              : t(props.language, { es: "Ver todos", en: "See all", pt: "Ver todos" })}
          </button>
        ) : null}
      </header>
      {items.length === 0 ? (
        <p>{t(props.language, { es: "Todavía no hay sesiones en el historial.", en: "You do not have session history yet.", pt: "Voce ainda nao tem historico de sessoes." })}</p>
      ) : (
        <ul>
          {visible.map((booking) => {
            const professional = findProfessionalById(booking.professionalId, props.professionals);
            const when = formatDateWithLocale({
              value: booking.startsAt,
              language: props.language,
              timeZone: props.timeZone,
              options: { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }
            });
            const cancelled = booking.status === "cancelled";
            return (
              <li key={booking.id}>
                <button type="button" onClick={() => props.onOpen(booking.id)}>
                  <strong>{when}</strong>
                  <span>
                    {professionalAccessibleName(professional ?? { fullName: fallback })}
                    {" · "}
                    <em className={cancelled ? "is-cancelled" : ""}>
                      {cancelled
                        ? t(props.language, { es: "Cancelada", en: "Cancelled", pt: "Cancelada" })
                        : t(props.language, { es: "Realizada", en: "Completed", pt: "Realizada" })}
                    </em>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
