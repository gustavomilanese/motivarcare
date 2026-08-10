import { useMemo, type SyntheticEvent } from "react";
import {
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import { UpcomingBookingsList } from "../../booking/components/UpcomingBookingsList";
import { DashboardHomeVariantToggle } from "./DashboardHomeVariantToggle";
import { DashboardHomePromoCarousel } from "./DashboardHomePromoCarousel";
import { acquireNewSessionsButtonLabel } from "../lib/acquireSessionsButtonLabel";
import { formatSubscriptionPurchasePrice } from "../lib/formatSubscriptionPurchasePrice";
import { professionalAccessibleName } from "../lib/professionalDisplayName";
import { findProfessionalById } from "../lib/professionals";
import type { Booking, PatientAppState, Professional } from "../types";
import type { DashboardNextActionKind } from "../lib/resolveDashboardNextActionKind";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      month: "short",
      day: "numeric"
    }
  });
}

function formatDateTime(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

export type { DashboardNextActionKind };

export function DashboardNextActionHome(props: {
  language: AppLanguage;
  timezone: string;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  heroImage: string | null;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  availableSessions: number;
  actionKind: DashboardNextActionKind;
  nextBooking: Booking | null;
  activeProfessional: Professional | null;
  professionalPhotoMap: Record<string, string>;
  canSelfChangeProfessional: boolean;
  showGoogleCalendarCta: boolean;
  googleCalendarCtaPulse: boolean;
  onOpenPatientGoogleCalendarConnect?: () => void;
  onNavigateToAssignProfessional: () => void;
  onNavigateToRebookTrial: () => void;
  onNavigateToBookTrial: () => void;
  onGoToBooking: (professionalId: string) => void;
  onBuySessions: () => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
  onGoToChat: (professionalId: string) => void;
  onGoToProfessional: (professionalId: string) => void;
  onNavigateToChangeProfessional: () => void;
  onGoToReservations: () => void;
  upcomingBookings: Booking[];
  allBookings: Booking[];
  professionals: Professional[];
  pricingProfessionalId: string;
  purchaseHistory: PatientAppState["subscription"]["purchaseHistory"];
  isMobilePortal: boolean;
  firstMeetBookingId?: string | null;
  joinTourPulse?: boolean;
  onSelectHomeVariant: (variant: "next" | "classic") => void;
}) {
  const pastBookings = useMemo(() => {
    const now = Date.now();
    return [...props.allBookings]
      .filter((booking) => {
        const status = (booking.status ?? "").toLowerCase();
        if (status === "cancelled") {
          return false;
        }
        return new Date(booking.startsAt).getTime() < now;
      })
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
      .slice(0, 5);
  }, [props.allBookings]);

  const purchasesSorted = useMemo(
    () =>
      [...props.purchaseHistory]
        .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
        .slice(0, 5),
    [props.purchaseHistory]
  );

  const professionalCta = props.activeProfessional
    ? t(props.language, { es: "Abrir chat", en: "Open chat", pt: "Abrir chat" })
    : t(props.language, { es: "Elegir profesional", en: "Choose professional", pt: "Escolher profissional" });

  const upcomingCta =
    props.actionKind === "next_session"
      ? t(props.language, { es: "Ver próxima sesión", en: "View next session", pt: "Ver proxima sessao" })
      : t(props.language, { es: "Ir a Sesiones", en: "Go to Sessions", pt: "Ir para Sessoes" });

  const runProfessionalCard = () => {
    if (props.activeProfessional) {
      props.onGoToChat(props.activeProfessional.id);
      return;
    }
    props.onNavigateToAssignProfessional();
  };

  const runUpcomingCard = () => {
    if (props.actionKind === "next_session" && props.nextBooking) {
      props.onOpenBookingDetail(props.nextBooking.id);
      return;
    }
    props.onGoToReservations();
  };

  return (
    <div className="dashboard-ml-home" aria-label={t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}>
      <div id="dashboard-hero-toolbar-mount" className="dashboard-hero-toolbar-mount dashboard-ml-toolbar-mount" />

      <DashboardHomePromoCarousel language={props.language} />

      <div className="dashboard-ml-surface">
        {props.showGoogleCalendarCta ? (
          <div className="dashboard-ml-calendar-wrap">
            <button
              type="button"
              className={`dashboard-ml-calendar-btn${props.googleCalendarCtaPulse ? " patient-google-calendar-cta--pulse" : ""}`}
              onClick={() => props.onOpenPatientGoogleCalendarConnect?.()}
            >
              {t(props.language, {
                es: "Conectá Google Calendar",
                en: "Connect Google Calendar",
                pt: "Conectar o Google Calendar"
              })}
            </button>
          </div>
        ) : null}

        <section
          className="dashboard-ml-market-cards"
          aria-label={t(props.language, { es: "Accesos", en: "Shortcuts", pt: "Atalhos" })}
          data-tour="patient-tour-kpis"
        >
          <article className="dashboard-ml-market-card" data-tour="patient-tour-hero">
            <h3 className="dashboard-ml-market-card-title">
              {t(props.language, {
                es: "Tu profesional",
                en: "Your professional",
                pt: "Seu profissional"
              })}
            </h3>
            <div className="dashboard-ml-market-card-media">
              <img src="/home/cards/professional.png" alt="" loading="lazy" />
            </div>
            <button type="button" className="dashboard-ml-market-card-cta" onClick={runProfessionalCard}>
              {professionalCta}
            </button>
          </article>

          <article className="dashboard-ml-market-card">
            <h3 className="dashboard-ml-market-card-title">
              {t(props.language, {
                es: "Comprar sesiones",
                en: "Buy sessions",
                pt: "Comprar sessoes"
              })}
            </h3>
            <div className="dashboard-ml-market-card-media">
              <img src="/home/cards/buy-sessions.png" alt="" loading="lazy" />
            </div>
            <button type="button" className="dashboard-ml-market-card-cta" onClick={() => props.onBuySessions()}>
              {acquireNewSessionsButtonLabel(props.language)}
            </button>
          </article>

          <article className="dashboard-ml-market-card" data-tour="patient-tour-trial">
            <h3 className="dashboard-ml-market-card-title">
              {t(props.language, {
                es: "Próximas sesiones",
                en: "Upcoming sessions",
                pt: "Proximas sessoes"
              })}
            </h3>
            <div className="dashboard-ml-market-card-media">
              <img src="/home/cards/upcoming.png" alt="" loading="lazy" />
            </div>
            <button
              type="button"
              className="dashboard-ml-market-card-cta"
              data-tour="patient-tour-next-primary"
              onClick={runUpcomingCard}
            >
              {upcomingCta}
            </button>
          </article>
        </section>

        {/* Sesiones: exploración tipo marketplace (cards), no tabla clásica */}
        <section className="dashboard-ml-sessions" data-tour="patient-tour-bookings" aria-labelledby="dashboard-ml-sessions-title">
          <div className="dashboard-ml-sessions-head">
            <div>
              <h2 id="dashboard-ml-sessions-title">
                {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
              </h2>
              <p className="dashboard-ml-section-lead">
                {t(props.language, {
                  es: "Tus próximas reservas, listas para abrir.",
                  en: "Your upcoming bookings, ready to open.",
                  pt: "Suas proximas reservas, prontas para abrir."
                })}
              </p>
            </div>
            <button type="button" className="dashboard-ml-section-link" onClick={() => props.onGoToReservations()}>
              {t(props.language, { es: "Ver todas", en: "View all", pt: "Ver todas" })}
            </button>
          </div>

          <div className="dashboard-ml-sessions-grid">
            <article className="dashboard-ml-panel dashboard-ml-panel--bookings">
              {props.upcomingBookings.length === 0 ? (
                <div className="dashboard-ml-empty">
                  <strong>
                    {t(props.language, {
                      es: "Todavía no tenés sesiones reservadas",
                      en: "You have no booked sessions yet",
                      pt: "Voce ainda nao tem sessoes reservadas"
                    })}
                  </strong>
                  <button type="button" className="dashboard-ml-market-card-cta" onClick={runUpcomingCard}>
                    {t(props.language, { es: "Ir a Sesiones", en: "Go to Sessions", pt: "Ir para Sessoes" })}
                  </button>
                </div>
              ) : (
                <div className="dashboard-ml-bookings-list dashboard-upcoming-lists-root">
                  <UpcomingBookingsList
                    bookings={props.upcomingBookings.slice(0, 4)}
                    professionals={props.professionals}
                    professionalPhotoMap={props.professionalPhotoMap}
                    timezone={props.timezone}
                    language={props.language}
                    layout="card"
                    surface="dashboard"
                    onImageFallback={props.onImageFallback}
                    onOpenBookingDetail={props.onOpenBookingDetail}
                    onReschedule={(booking) => props.onRescheduleBooking(booking.id)}
                    firstMeetBookingId={props.firstMeetBookingId}
                    joinTourPulse={props.joinTourPulse}
                  />
                </div>
              )}
            </article>

            <article className="dashboard-ml-panel dashboard-ml-panel--calendar">
              <h3 className="dashboard-ml-panel-title">
                {t(props.language, {
                  es: "Calendario de la semana",
                  en: "This week’s calendar",
                  pt: "Calendario da semana"
                })}
              </h3>
              <SessionsCalendar
                bookings={props.upcomingBookings}
                timezone={props.timezone}
                language={props.language}
                onOpenBookingDetail={props.onOpenBookingDetail}
                variant="week"
                hideTitle
              />
            </article>
          </div>
        </section>

        {/* Paneles inferiores: imagen + lista + CTA */}
        <section
          className="dashboard-ml-history-grid"
          aria-label={t(props.language, { es: "Actividad", en: "Activity", pt: "Atividade" })}
        >
          <article className="dashboard-ml-history-card dashboard-ml-history-card--rich">
            <h3 className="dashboard-ml-market-card-title">
              {t(props.language, {
                es: "Paquetes comprados",
                en: "Purchased packages",
                pt: "Pacotes comprados"
              })}
            </h3>
            <div className="dashboard-ml-history-media">
              <img src="/home/cards/packages.png" alt="" loading="lazy" />
            </div>
            {purchasesSorted.length === 0 ? (
              <p className="dashboard-ml-history-empty">
                {t(props.language, {
                  es: "Todavía no tenés paquetes comprados.",
                  en: "You don’t have purchased packages yet.",
                  pt: "Voce ainda nao tem pacotes comprados."
                })}
              </p>
            ) : (
              <ul className="dashboard-ml-history-list">
                {purchasesSorted.map((item) => (
                  <li key={item.id}>
                    <strong>{item.name}</strong>
                    <span>
                      {replaceTemplate(
                        t(props.language, {
                          es: "{count} sesiones",
                          en: "{count} sessions",
                          pt: "{count} sessoes"
                        }),
                        { count: String(item.credits) }
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="dashboard-ml-market-card-cta" onClick={() => props.onBuySessions()}>
              {acquireNewSessionsButtonLabel(props.language)}
            </button>
          </article>

          <article className="dashboard-ml-history-card dashboard-ml-history-card--rich">
            <h3 className="dashboard-ml-market-card-title">
              {t(props.language, {
                es: "Historial de sesiones",
                en: "Session history",
                pt: "Historico de sessoes"
              })}
            </h3>
            <div className="dashboard-ml-history-media">
              <img src="/home/cards/history.png" alt="" loading="lazy" />
            </div>
            {pastBookings.length === 0 ? (
              <p className="dashboard-ml-history-empty">
                {t(props.language, {
                  es: "Todavía no hay sesiones finalizadas.",
                  en: "No completed sessions yet.",
                  pt: "Ainda nao ha sessoes finalizadas."
                })}
              </p>
            ) : (
              <ul className="dashboard-ml-history-list">
                {pastBookings.map((booking) => {
                  const pro = findProfessionalById(booking.professionalId, props.professionals);
                  return (
                    <li key={booking.id}>
                      <button type="button" className="dashboard-ml-history-item" onClick={() => props.onOpenBookingDetail(booking.id)}>
                        <strong>
                          {formatDateTime({
                            isoDate: booking.startsAt,
                            timezone: props.timezone,
                            language: props.language
                          })}
                        </strong>
                        <span>
                          {pro
                            ? professionalAccessibleName(pro)
                            : t(props.language, {
                                es: "Tu profesional",
                                en: "Your professional",
                                pt: "Seu profissional"
                              })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" className="dashboard-ml-market-card-cta" onClick={() => props.onGoToReservations()}>
              {t(props.language, { es: "Ver historial", en: "View history", pt: "Ver historico" })}
            </button>
          </article>

          <article className="dashboard-ml-history-card dashboard-ml-history-card--rich">
            <h3 className="dashboard-ml-market-card-title">
              {t(props.language, {
                es: "Actividad de compras",
                en: "Purchase activity",
                pt: "Atividade de compras"
              })}
            </h3>
            <div className="dashboard-ml-history-media">
              <img src="/home/cards/activity.png" alt="" loading="lazy" />
            </div>
            {purchasesSorted.length === 0 ? (
              <p className="dashboard-ml-history-empty">
                {t(props.language, {
                  es: "Todavía no hay actividad de compras.",
                  en: "No purchase activity yet.",
                  pt: "Ainda nao ha atividade de compras."
                })}
              </p>
            ) : (
              <ul className="dashboard-ml-history-list">
                {purchasesSorted.map((item) => {
                  const amountLabel = formatSubscriptionPurchasePrice({
                    priceCents: item.priceCents,
                    language: props.language,
                    displayCurrency: props.currency,
                    purchaseCurrency: item.currency ?? null,
                    fxRates: props.fxRates
                  });
                  return (
                    <li key={`activity-${item.id}`}>
                      <strong>{item.name}</strong>
                      <span>
                        {formatDateOnly({
                          isoDate: item.purchasedAt,
                          timezone: props.timezone,
                          language: props.language
                        })}
                        {amountLabel ? ` · ${amountLabel}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" className="dashboard-ml-market-card-cta" onClick={() => props.onBuySessions()}>
              {t(props.language, { es: "Comprar de nuevo", en: "Buy again", pt: "Comprar de novo" })}
            </button>
          </article>
        </section>

        <div className="dashboard-ml-foot">
          <DashboardHomeVariantToggle
            language={props.language}
            variant="next"
            onSelect={props.onSelectHomeVariant}
          />
        </div>
      </div>
    </div>
  );
}
