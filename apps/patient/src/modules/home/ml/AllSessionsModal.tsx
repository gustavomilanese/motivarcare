import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { type AppLanguage, textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import { UpcomingBookingsList } from "../../booking/components/UpcomingBookingsList";
import type { Booking, Professional } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const PAGE_SIZE = 15;

function sortAllConfirmedBookings(bookings: Booking[], nowMs: number): Booking[] {
  const confirmed = bookings.filter((booking) => booking.status === "confirmed");
  const upcoming = confirmed
    .filter((booking) => new Date(booking.endsAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const past = confirmed
    .filter((booking) => new Date(booking.endsAt).getTime() < nowMs)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  return [...upcoming, ...past];
}

/** Popup desktop: listado completo de sesiones confirmadas, paginado de a 15. */
export function DashboardHomeAllSessionsModal(props: {
  language: AppLanguage;
  timezone: string;
  bookings: Booking[];
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);

  const sortedBookings = useMemo(
    () => sortAllConfirmedBookings(props.bookings, Date.now()),
    [props.bookings]
  );

  const totalPages = Math.max(1, Math.ceil(sortedBookings.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageBookings = sortedBookings.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [props.bookings]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.onClose]);

  const rangeStart = sortedBookings.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(sortedBookings.length, (safePage + 1) * PAGE_SIZE);

  return (
    <div
      className="matching-flow-backdrop dashboard-home-all-sessions-backdrop"
      role="presentation"
      onClick={props.onClose}
    >
      <section
        className="matching-flow-modal dashboard-home-all-sessions-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-home-all-sessions-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dashboard-home-all-sessions-head">
          <div className="dashboard-home-all-sessions-head-copy">
            <h2 id="dashboard-home-all-sessions-title" className="dashboard-home-all-sessions-title">
              {t(props.language, {
                es: "Todas tus sesiones",
                en: "All your sessions",
                pt: "Todas as suas sessoes"
              })}
            </h2>
            <p className="dashboard-home-all-sessions-lead">
              {sortedBookings.length === 0
                ? t(props.language, {
                    es: "Todavía no tenés sesiones confirmadas.",
                    en: "You have no confirmed sessions yet.",
                    pt: "Voce ainda nao tem sessoes confirmadas."
                  })
                : t(props.language, {
                    es: `Mostrando ${rangeStart}–${rangeEnd} de ${sortedBookings.length}`,
                    en: `Showing ${rangeStart}–${rangeEnd} of ${sortedBookings.length}`,
                    pt: `Mostrando ${rangeStart}–${rangeEnd} de ${sortedBookings.length}`
                  })}
            </p>
          </div>
          <button
            type="button"
            className="dashboard-home-all-sessions-close"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>

        <div className="dashboard-home-all-sessions-body">
          {pageBookings.length === 0 ? (
            <p className="dashboard-home-all-sessions-empty">
              {t(props.language, {
                es: "Cuando reserves, van a aparecer acá.",
                en: "When you book, they will show up here.",
                pt: "Quando agendar, elas aparecerao aqui."
              })}
            </p>
          ) : (
            <div className="dashboard-ml-bookings-list dashboard-upcoming-lists-root">
              <UpcomingBookingsList
                bookings={pageBookings}
                professionals={props.professionals}
                professionalPhotoMap={props.professionalPhotoMap}
                timezone={props.timezone}
                language={props.language}
                layout="table"
                surface="dashboard"
                onImageFallback={props.onImageFallback}
                onOpenBookingDetail={(bookingId) => {
                  props.onOpenBookingDetail(bookingId);
                  props.onClose();
                }}
                onReschedule={(booking) => {
                  props.onRescheduleBooking(booking.id);
                  props.onClose();
                }}
              />
            </div>
          )}
        </div>

        {sortedBookings.length > PAGE_SIZE ? (
          <footer className="dashboard-home-all-sessions-pager">
            <button
              type="button"
              className="dashboard-home-all-sessions-pager-btn"
              disabled={safePage <= 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              {t(props.language, { es: "Anterior", en: "Previous", pt: "Anterior" })}
            </button>
            <span className="dashboard-home-all-sessions-pager-meta">
              {t(props.language, {
                es: `Página ${safePage + 1} de ${totalPages}`,
                en: `Page ${safePage + 1} of ${totalPages}`,
                pt: `Pagina ${safePage + 1} de ${totalPages}`
              })}
            </span>
            <button
              type="button"
              className="dashboard-home-all-sessions-pager-btn"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            >
              {t(props.language, { es: "Siguiente", en: "Next", pt: "Proxima" })}
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
