import { useMemo, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { filterUpcomingPatientBookings } from "@therapy/patient-core";
import { findProfessionalById } from "../../app/lib/professionals";
import type { Booking, Professional } from "../../app/types";
import { CalmUpcomingRow } from "./CalmUpcomingRow";
import { IconFlecha } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmUpcomingList(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  bookings: Booking[];
  professionals: Professional[];
  photoMap: Record<string, string>;
  assignedProfessionalId?: string | null;
  /** La sesión del hero no se repite en la lista. */
  excludeBookingId?: string | null;
  limit?: number;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenBooking: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
}) {
  const navigate = useNavigate();
  const limit = props.limit ?? 3;
  const rows = useMemo(() => {
    const exclude = props.excludeBookingId?.trim() ?? "";
    return filterUpcomingPatientBookings(props.bookings, props.now.getTime(), {
      assignedProfessionalId: props.assignedProfessionalId
    })
      .filter((booking) => booking.id !== exclude)
      .slice(0, limit);
  }, [props.assignedProfessionalId, props.bookings, props.excludeBookingId, props.now, limit]);

  if (rows.length === 0) return null;

  return (
    <section className="calm-upcoming" aria-labelledby="calm-upcoming-title">
      <header className="calm-upcoming-head">
        <h2 id="calm-upcoming-title">
          {t(props.language, { es: "Próximas", en: "Upcoming", pt: "Próximas" })}
        </h2>
        <button type="button" className="calm-text-link" onClick={() => navigate("/sessions")}>
          {t(props.language, { es: "Ver todas", en: "See all", pt: "Ver todas" })}
          <IconFlecha size={16} />
        </button>
      </header>
      <div className="calm-upcoming-list">
        {rows.map((booking) => {
          const professional = findProfessionalById(booking.professionalId, props.professionals);
          return (
            <CalmUpcomingRow
              key={booking.id}
              booking={booking}
              language={props.language}
              timeZone={props.timeZone}
              now={props.now}
              professional={professional}
              photoUrl={professional ? props.photoMap[professional.id] ?? null : null}
              onImageFallback={props.onImageFallback}
              onOpen={props.onOpenBooking}
              onReschedule={props.onRescheduleBooking}
            />
          );
        })}
      </div>
    </section>
  );
}
