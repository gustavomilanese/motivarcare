import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Booking, Professional } from "../../app/types";
import { findProfessionalById } from "../../app/lib/professionals";
import { calmGivenName, formatClock, isSameZonedDay } from "../../home/calm/calmHomeFormat";
import { monthCells, zonedYmd } from "./sessionsMonth";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const WEEKDAY_LABELS: Record<AppLanguage, string[]> = {
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  pt: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
};

export function SessionsCalmMonth(props: {
  language: AppLanguage;
  timeZone: string;
  anchor: Date;
  now: Date;
  bookings: Booking[];
  professionals: Professional[];
  onOpenDetail: (bookingId: string) => void;
}) {
  const cells = monthCells(props.anchor, props.timeZone);
  const confirmed = props.bookings.filter((booking) => booking.status === "confirmed");

  return (
    <div className="sessions-calm-month">
      <div className="sessions-calm-month-names">
        {WEEKDAY_LABELS[props.language].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="sessions-calm-month-grid">
        {cells.map((cell) => {
          const sessions = confirmed.filter((booking) => isSameZonedDay(new Date(booking.startsAt), cell.date, props.timeZone));
          const today = isSameZonedDay(cell.date, props.now, props.timeZone);
          return (
            <div key={cell.date.toISOString()} className={`sessions-calm-cell${cell.inMonth ? "" : " is-out"}${today ? " is-today" : ""}`}>
              <b>{zonedYmd(cell.date, props.timeZone).day}</b>
              {sessions.map((booking) => {
                const professional = findProfessionalById(booking.professionalId, props.professionals);
                const given = professional ? calmGivenName(professional) : "";
                return (
                  <button key={booking.id} type="button" onClick={() => props.onOpenDetail(booking.id)}>
                    {given ? `${given} ` : ""}
                    {formatClock(booking.startsAt, props.timeZone, props.language)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="sr-only">{t(props.language, { es: "Mes completo", en: "Full month", pt: "Mês completo" })}</p>
    </div>
  );
}
