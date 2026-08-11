import { type KeyboardEvent, type SyntheticEvent, useRef, useState } from "react";
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
import {
  PackageCatalogError,
  PackageCatalogLoading,
  PackageChooseProfessionalCta
} from "../../app/components/booking/PackageCatalogSectionExtras";
import { SessionsCollapsibleToggle } from "../../app/components/SessionsCollapsibleToggle";
import { ProfessionalNameStack, professionalPhotoAlt } from "../../app/components/ProfessionalNameStack";
import { acquireNewSessionsButtonLabel } from "../../app/lib/acquireSessionsButtonLabel";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import { packageBenefitLines } from "../../app/lib/packageCatalog";
import { formatSubscriptionPurchasePrice } from "../../app/lib/formatSubscriptionPurchasePrice";
import {
  formatPackageCardMoney,
  resolvePackageCardDisplayPricing
} from "../../app/lib/packageCardDisplayPricing";
import type { Booking, PackageId, PackagePlan, PatientAppState, Professional } from "../../app/types";
import type { PackagesLoadingHint } from "@therapy/patient-core";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function localizedPackageName(planId: PackageId | null, fallback: string, language: AppLanguage): string {
  if (!planId) {
    return t(language, {
      es: "Sin paquete activo",
      en: "No active package",
      pt: "Sem pacote ativo"
    });
  }
  return fallback;
}

function localizedPackageDescription(_planId: PackageId, fallback: string): string {
  return fallback;
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

function formatDateOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  });
}

export type ClassicHomeProps = {
  language: AppLanguage;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  timezone: string;
  state: PatientAppState;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  landingPatientHeroImage: string | null;
  dashboardIntroTitle: string;
  dashboardIntroBody: string;
  trialStatus: "pending" | "reserved" | "completed" | "rebook";
  activeTrialBooking: Booking | null;
  completedTrialBooking: Booking | null;
  hasTrialPlanned: boolean;
  trialCardClickable: boolean;
  upcomingConfirmedBookings: Booking[];
  upcomingSpotlightRing: boolean;
  nextConfirmedBooking: Booking | null;
  nextBooking: Booking | null;
  availableSessions: number;
  activeProfessional: Professional | null;
  canSelfChangeProfessional: boolean;
  showGoogleCalendarCta: boolean;
  googleCalendarCtaPulse: boolean;
  firstMeetBookingId: string | null;
  meetJoinHighlight: boolean;
  sessionRnLayout: boolean;
  isMobilePortal: boolean;
  showPackageSection: boolean;
  defaultPackagePlan: PackagePlan | null;
  showChooseProfessionalCta: boolean;
  pricingReady: boolean;
  packagesLoadingHint: PackagesLoadingHint;
  canIndividualCtaHome: boolean;
  displayPackagePlans: PackagePlan[];
  displayFeaturedPackageId: string | null;
  packageCheckoutLoading: boolean;
  packageCheckoutError: string | null;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onGoToReservations: () => void;
  onGoToBooking: (professionalId: string) => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
  onNavigateToBookTrial: () => void;
  onNavigateToRebookTrial: () => void;
  onNavigateToChangeProfessional: () => void;
  onNavigateToIndividualSessions: () => void;
  onOpenPatientGoogleCalendarConnect?: () => void;
  onOpenTrialModal: () => void;
  onOpenProfileModal: () => void;
  onOpenChat: (professionalId: string) => void;
  onChooseProfessional: () => void;
  onAcquireSessions: (intent: "buy_cta" | "book_without_credits") => void;
  onStartPackagePurchase: (plan: PackagePlan) => void;
  onNavigateToAssignProfessional: () => void;
};

export function ClassicHome(props: ClassicHomeProps) {
  const {
    language,
    currency,
    fxRates,
    timezone,
    state,
    professionals,
    professionalPhotoMap,
    landingPatientHeroImage,
    dashboardIntroTitle,
    dashboardIntroBody,
    trialStatus,
    activeTrialBooking,
    completedTrialBooking,
    hasTrialPlanned,
    trialCardClickable,
    upcomingConfirmedBookings,
    upcomingSpotlightRing,
    nextConfirmedBooking,
    nextBooking,
    availableSessions,
    activeProfessional,
    canSelfChangeProfessional,
    showGoogleCalendarCta,
    googleCalendarCtaPulse,
    firstMeetBookingId,
    meetJoinHighlight,
    sessionRnLayout,
    isMobilePortal,
    showPackageSection,
    defaultPackagePlan,
    showChooseProfessionalCta,
    pricingReady,
    packagesLoadingHint,
    canIndividualCtaHome,
    displayPackagePlans,
    displayFeaturedPackageId,
    packageCheckoutLoading,
    packageCheckoutError,
    onHeroFallback,
    onImageFallback,
    onGoToReservations,
    onGoToBooking,
    onOpenBookingDetail,
    onRescheduleBooking,
    onNavigateToBookTrial,
    onNavigateToRebookTrial,
    onNavigateToChangeProfessional,
    onNavigateToIndividualSessions,
    onOpenPatientGoogleCalendarConnect,
    onOpenTrialModal,
    onOpenProfileModal,
    onOpenChat,
    onChooseProfessional,
    onAcquireSessions,
    onStartPackagePurchase,
    onNavigateToAssignProfessional
  } = props;

  const [isPackagesExpanded, setIsPackagesExpanded] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const packageSectionRef = useRef<HTMLElement | null>(null);

  const openTrialDetail = () => {
    const id = activeTrialBooking?.id ?? completedTrialBooking?.id;
    if (id) onOpenBookingDetail(id);
  };

  const handleTrialCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openTrialDetail();
  };

  const openTrialModal = onOpenTrialModal;
  const openChooseProfessional = onChooseProfessional;
  const handleStartPackagePurchase = onStartPackagePurchase;
  const dispatchAcquireSessions = onAcquireSessions;

  return (
      <div className="dashboard-legacy-home">
      <section className="dashboard-hero-immersive" data-tour="patient-tour-hero">
        <div className="dashboard-hero-banner-wrap">
          <div className={`dashboard-hero-banner${landingPatientHeroImage === null ? " dashboard-hero-banner--loading" : ""}`}>
            {landingPatientHeroImage === null ? (
              <span className="dashboard-hero-banner-skeleton" aria-hidden="true" />
            ) : (
              <img
                className="dashboard-hero-banner-photo"
                src={landingPatientHeroImage}
                alt={t(props.language, {
                  es: "Paciente en sesión virtual",
                  en: "Patient in a virtual session",
                  pt: "Paciente em sessao virtual"
                })}
                loading="eager"
                decoding="async"
                onError={props.onHeroFallback}
              />
            )}
            <div className="dashboard-hero-banner-scrim" aria-hidden="true" />
            <div className="dashboard-hero-banner-copy">
              <div className="dashboard-hero-banner-head">
                <h2 className="dashboard-hero-title-on-photo">{dashboardIntroTitle}</h2>
                {showPackageSection && defaultPackagePlan ? (
                  <button
                    className="dashboard-hero-buy-on-photo"
                    type="button"
                    onClick={() => dispatchAcquireSessions("buy_cta")}
                  >
                    {acquireNewSessionsButtonLabel(props.language)}
                  </button>
                ) : null}
              </div>
              <p className="dashboard-hero-subtitle-on-photo">{dashboardIntroBody}</p>
            </div>
          </div>
          <div id="dashboard-hero-toolbar-mount" className="dashboard-hero-toolbar-mount" />
        </div>
      </section>

      {showGoogleCalendarCta ? (
        <div className="dashboard-hero-cta-band">
          <button
            type="button"
            className={`dashboard-hero-google-calendar-button${googleCalendarCtaPulse ? " patient-google-calendar-cta--pulse" : ""}`}
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
        className={`content-card trial-priority-banner trial-priority-inline ${trialCardClickable ? "trial-priority-banner--clickable" : ""}`}
        data-tour="patient-tour-trial"
        role={trialCardClickable ? "button" : undefined}
        tabIndex={trialCardClickable ? 0 : undefined}
        onClick={trialCardClickable ? openTrialDetail : undefined}
        onKeyDown={trialCardClickable ? handleTrialCardKeyDown : undefined}
      >
        <h2>
          <span className="trial-inline-icon" aria-hidden="true" />
          {trialStatus === "pending"
            ? t(props.language, { es: "Sesión de prueba pendiente", en: "Pending trial session", pt: "Sessao de teste pendente" })
            : trialStatus === "reserved"
              ? t(props.language, { es: "Sesión de prueba planificada", en: "Trial session scheduled", pt: "Sessao de teste agendada" })
              : trialStatus === "rebook"
                ? t(props.language, { es: "Sesión de prueba pagada", en: "Trial session paid", pt: "Sessao de teste paga" })
                : t(props.language, { es: "Sesión de prueba completada", en: "Trial session completed", pt: "Sessao de teste concluida" })}
        </h2>
        <p>
          {trialStatus === "reserved" && activeTrialBooking
            ? formatDateTime({
                isoDate: activeTrialBooking.startsAt,
                timezone: props.state.profile.timezone,
                language: props.language
              })
            : trialStatus === "completed" && completedTrialBooking
              ? formatDateTime({
                  isoDate: completedTrialBooking.startsAt,
                  timezone: props.state.profile.timezone,
                  language: props.language
                })
              : trialStatus === "rebook"
                ? t(props.language, {
                    es: "Cancelaste la reserva anterior. Elegí un nuevo horario sin volver a pagar.",
                    en: "You cancelled the previous booking. Pick a new time without paying again.",
                    pt: "Voce cancelou a reserva anterior. Escolha um novo horario sem pagar de novo."
                  })
                : t(props.language, {
                    es: "Elige un horario para dejar tu primera sesión ya agendada.",
                    en: "Choose a time to leave your first session already scheduled.",
                    pt: "Escolha um horario para deixar sua primeira sessao ja agendada."
                  })}
        </p>
        {hasTrialPlanned ? (
          <div className="trial-inline-actions">
            <button
              className="trial-inline-action"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openTrialModal();
              }}
            >
              {t(props.language, { es: "Modificar", en: "Modify", pt: "Modificar" })}
            </button>
          </div>
        ) : trialStatus === "rebook" ? (
          <button
            className="trial-inline-action"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              props.onNavigateToRebookTrial();
            }}
          >
            {t(props.language, {
              es: "Elegir nuevo horario",
              en: "Pick a new time",
              pt: "Escolher novo horario"
            })}
          </button>
        ) : trialStatus === "pending" ? (
          <button
            className="trial-inline-action"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              props.onNavigateToBookTrial();
            }}
          >
            {t(props.language, {
              es: "Reservar sesión de prueba",
              en: "Book trial session",
              pt: "Reservar sessao de teste"
            })}
          </button>
        ) : null}
      </section>

      <section className="hero-grid" data-tour="patient-tour-kpis">
        <article className="hero-card sessions-combined-card">
          <button
            className="sessions-combined-section sessions-combined-action"
            type="button"
            onClick={props.onGoToReservations}
          >
            <span className="label">{t(props.language, { es: "Sesiones reservadas", en: "Booked sessions", pt: "Sessoes reservadas" })}</span>
            <strong>{upcomingConfirmedBookings.length}</strong>
            <p>
              {nextBooking
                ? `${t(props.language, { es: "Próxima", en: "Next", pt: "Proxima" })}: ${formatDateTime({
                    isoDate: nextBooking.startsAt,
                    timezone: props.state.profile.timezone,
                    language: props.language
                  })}`
                : t(props.language, {
                    es: "Todavía no tenés sesiones reservadas",
                    en: "You do not have any booked sessions yet",
                    pt: "Voce ainda nao tem sessoes reservadas"
                  })}
            </p>
            <span className="hero-inline-link">
              {nextConfirmedBooking
                ? t(props.language, { es: "Ver detalle", en: "View details", pt: "Ver detalhes" })
                : t(props.language, { es: "Sin sesiones reservadas", en: "No booked sessions", pt: "Sem sessoes reservadas" })}
            </span>
          </button>

          <button
            className="sessions-combined-section sessions-combined-action"
            type="button"
            onClick={() => {
              const resolvedId = props.state.assignedProfessionalId ?? props.state.selectedProfessionalId;
              if (isMobilePortal && availableSessions <= 0 && resolvedId) {
                dispatchAcquireSessions("book_without_credits");
                return;
              }
              if (resolvedId) {
                props.onGoToBooking(resolvedId);
                return;
              }
              if (trialStatus === "pending") {
                props.onNavigateToBookTrial();
                return;
              }
              props.onGoToReservations();
            }}
          >
            <span className="label sessions-available-label">
              <span className="sessions-available-icon" aria-hidden="true">◌</span>
              {t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}
            </span>
            <strong>{availableSessions}</strong>
            <p>
              {t(props.language, {
                es: "Listas para reservar",
                en: "Ready to book",
                pt: "Prontas para reservar"
              })}
            </p>
            <span className="hero-inline-link dashboard-go-sessions-link">
              {t(props.language, { es: "Ir a sesiones", en: "Go to sessions", pt: "Ir para sessoes" })}
            </span>
          </button>
        </article>

        {activeProfessional ? (
          <div className="hero-card hero-card-button active-professional-card active-professional-card--has-pro">
            <span className="label">{t(props.language, { es: "Profesional activo", en: "Active professional", pt: "Profissional ativo" })}</span>
            <div
              className="active-professional-card-hit"
              role="button"
              tabIndex={0}
              aria-label={t(props.language, {
                es: `Profesional activo: ${professionalAccessibleName(activeProfessional)}. Abrir ficha.`,
                en: `Active professional: ${professionalAccessibleName(activeProfessional)}. Open profile.`,
                pt: `Profissional ativo: ${professionalAccessibleName(activeProfessional)}. Abrir ficha.`
              })}
              onClick={() => onOpenProfileModal()}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }
                event.preventDefault();
                onOpenProfileModal();
              }}
            >
              <div className="active-professional-row">
                <img
                  className="active-professional-avatar"
                  src={professionalPhotoSrc(props.professionalPhotoMap[activeProfessional.id])}
                  alt={professionalPhotoAlt(activeProfessional)}
                  onError={props.onImageFallback}
                />
                <div>
                  <h3>
                    <ProfessionalNameStack professional={activeProfessional} as="span" />
                  </h3>
                  <p>{activeProfessional.title}</p>
                  {(activeProfessional.rating ?? 0) > 0 || (activeProfessional.reviewsCount ?? 0) > 0 ? (
                    <p className="active-professional-rating">
                      <span aria-hidden="true">★</span>{" "}
                      {(activeProfessional.rating ?? 0).toFixed(1)} · {activeProfessional.reviewsCount ?? 0}{" "}
                      {t(props.language, {
                        es: (activeProfessional.reviewsCount ?? 0) === 1 ? "opinión" : "opiniones",
                        en: (activeProfessional.reviewsCount ?? 0) === 1 ? "review" : "reviews",
                        pt: (activeProfessional.reviewsCount ?? 0) === 1 ? "avaliação" : "avaliações"
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
              <p>
                {replaceTemplate(
                  t(props.language, {
                    es: "{compat}% compatibilidad · {years} años de experiencia",
                    en: "{compat}% match · {years} years of experience",
                    pt: "{compat}% compatibilidade · {years} anos de experiencia"
                  }),
                  { compat: activeProfessional.compatibility, years: activeProfessional.yearsExperience }
                )}
              </p>
            </div>
            <div
              className={
                canSelfChangeProfessional
                  ? "active-professional-actions"
                  : "active-professional-actions active-professional-actions--solo"
              }
            >
              <button
                className="active-professional-action-btn active-professional-action-btn--primary"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenChat(activeProfessional.id);
                }}
              >
                {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
              </button>
              {canSelfChangeProfessional ? (
                <button
                  className="active-professional-action-btn active-professional-action-btn--secondary"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onNavigateToChangeProfessional();
                  }}
                >
                  {t(props.language, {
                    es: "Cambiar profesional",
                    en: "Change professional",
                    pt: "Trocar profissional"
                  })}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="hero-card active-professional-card active-professional-card--empty" aria-live="polite">
            <span className="label">{t(props.language, { es: "Profesional activo", en: "Active professional", pt: "Profissional ativo" })}</span>
            <p>
              {props.state.assignedProfessionalName
                ? replaceTemplate(
                    t(props.language, {
                      es: "Profesional asignado desde admin: {name}.",
                      en: "Professional assigned from admin: {name}.",
                      pt: "Profissional atribuido pelo admin: {name}."
                    }),
                    { name: props.state.assignedProfessionalName }
                  )
                : t(props.language, {
                    es: "Se definirá al reservar tu sesión de prueba o una sesión con créditos. Usá el banner de prueba o Ir a sesiones.",
                    en: "We will set this when you book your trial or a credit session. Use the trial banner or Go to sessions.",
                    pt: "Será definido ao reservar sua sessao de teste ou com creditos. Use o banner de teste ou Ir para sessoes."
                  })}
            </p>
            {trialStatus === "pending" && !props.state.assignedProfessionalName ? (
              <button className="chat-gradient-button" type="button" onClick={() => props.onNavigateToBookTrial()}>
                {t(props.language, {
                  es: "Reservar sesión de prueba",
                  en: "Book trial session",
                  pt: "Reservar sessao de teste"
                })}
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section
        className={`content-card booking-session-card booking-card-minimal sessions-confirmed-panel${
          upcomingSpotlightRing ? " patient-dashboard-upcoming-spotlight" : ""
        }`}
        data-tour="patient-tour-bookings"
      >
        <div className="sessions-panel-head">
          <div>
            <h2>{t(props.language, { es: "Próximas Reservas", en: "Upcoming bookings", pt: "Próximas reservas" })}</h2>
          </div>
        </div>

        {upcomingConfirmedBookings.length === 0 ? (
          <div className="sessions-empty-state">
            <strong>
              {t(props.language, {
                es: "Todavía no tienes sesiones reservadas",
                en: "You have no booked sessions yet",
                pt: "Voce ainda nao tem sessoes reservadas"
              })}
            </strong>
          </div>
        ) : (
          <div className="dashboard-upcoming-lists-root">
            <div className={isMobilePortal ? "dashboard-upcoming-mobile-only" : "dashboard-upcoming-desktop-only"}>
              <UpcomingBookingsList
                bookings={upcomingConfirmedBookings}
                professionals={props.professionals}
                professionalPhotoMap={props.professionalPhotoMap}
                timezone={props.state.profile.timezone}
                language={props.language}
                layout={isMobilePortal ? "card" : "table"}
                surface="dashboard"
                onImageFallback={props.onImageFallback}
                onOpenBookingDetail={props.onOpenBookingDetail}
                onReschedule={(booking) => props.onRescheduleBooking(booking.id)}
                firstMeetBookingId={firstMeetBookingId}
                joinTourPulse={meetJoinHighlight && (isMobilePortal ? sessionRnLayout : !sessionRnLayout)}
              />
            </div>
          </div>
        )}
      </section>

      <section className="sessions-secondary-section dashboard-compact-section sessions-purchased-history">
        <button
          type="button"
          className="sessions-calendar-toggle"
          aria-expanded={isPackagesExpanded}
          onClick={() => setIsPackagesExpanded((current) => !current)}
        >
          <h2 className="sessions-secondary-title">{t(props.language, { es: "Paquetes comprados", en: "Purchased packages", pt: "Pacotes comprados" })}</h2>
          <SessionsCollapsibleToggle expanded={isPackagesExpanded} language={props.language} />
        </button>
        {isPackagesExpanded ? (
          <div className="sessions-collapsible-panel">
          {props.state.subscription.purchaseHistory.length === 0 ? (
            <p className="sessions-collapsible-empty">{t(props.language, { es: "Todavía no tienes paquetes comprados.", en: "You do not have purchased packages yet.", pt: "Voce ainda nao tem pacotes comprados." })}</p>
          ) : (
            <ul className="simple-list session-history-list sessions-collapsible-list">
              {[...props.state.subscription.purchaseHistory]
                .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
                .slice(0, 20)
                .map((item) => {
                const amountLabel = formatSubscriptionPurchasePrice({
                  priceCents: item.priceCents,
                  language: props.language,
                  displayCurrency: props.currency,
                  purchaseCurrency: item.currency ?? null,
                  fxRates: props.fxRates
                });
                return (
                  <li key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{replaceTemplate(t(props.language, { es: "{count} sesiones", en: "{count} sessions", pt: "{count} sessoes" }), { count: String(item.credits) })}</span>
                    </div>
                    <div className="session-purchase-row-meta">
                      <span className="session-purchase-row-date">
                        {formatDateOnly({ isoDate: item.purchasedAt, timezone: props.state.profile.timezone, language: props.language })}
                      </span>
                      {amountLabel ? <span className="session-purchase-row-amount">{amountLabel}</span> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </div>
        ) : null}
      </section>

      <section className="sessions-calendar-collapsible sessions-secondary-section dashboard-compact-section">
        <button
          type="button"
          className="sessions-calendar-toggle"
          aria-expanded={isCalendarExpanded}
          onClick={() => setIsCalendarExpanded((current) => !current)}
        >
          <h2 className="sessions-secondary-title">{t(props.language, { es: "Calendario de sesiones", en: "Sessions calendar", pt: "Calendario de sessoes" })}</h2>
          <SessionsCollapsibleToggle expanded={isCalendarExpanded} language={props.language} />
        </button>
        {isCalendarExpanded ? (
          <div className="sessions-collapsible-panel sessions-collapsible-panel--calendar">
          <SessionsCalendar
            bookings={upcomingConfirmedBookings}
            timezone={props.state.profile.timezone}
            language={props.language}
            onOpenBookingDetail={props.onOpenBookingDetail}
            variant="week"
            hideTitle
          />
          </div>
        ) : null}
      </section>

      {showPackageSection ? (
        <section ref={packageSectionRef} className="content-card sessions-package-options-panel dashboard-package-options-panel">
          <div className={`session-booking-panel-head${showGoogleCalendarCta || canIndividualCtaHome ? " session-booking-panel-head--split" : ""}`}>
            <div className="sessions-package-panel-head-copy">
              <h3>{t(props.language, { es: "Adquirir nuevas sesiones", en: "Get new sessions", pt: "Adquirir novas sessoes" })}</h3>
              <p>
                {pricingReady
                  ? t(props.language, {
                      es: "Elegí el paquete que mejor se adapte a tu proceso, o comprá sesiones sueltas arriba a la derecha.",
                      en: "Choose the package that fits your process, or buy individual sessions from the top right.",
                      pt: "Escolha o pacote que melhor se adapta ao seu processo, ou compre sessoes avulsas no canto superior direito."
                    })
                  : packagesLoadingHint === "unpriced_formats"
                    ? t(props.language, {
                        es: "Formatos de 4, 8 y 12 sesiones. Elegí un profesional para ver precios según su tarifa.",
                        en: "4, 8, and 12 session formats. Choose a professional to see prices based on their rate.",
                        pt: "Formatos de 4, 8 e 12 sessoes. Escolha um profissional para ver precos conforme a tarifa."
                      })
                    : t(props.language, {
                        es: "Formatos de 4, 8 y 12 sesiones según la tarifa de tu profesional.",
                        en: "4, 8, and 12 session formats based on your professional's rate.",
                        pt: "Formatos de 4, 8 e 12 sessoes conforme a tarifa do seu profissional."
                      })}
              </p>
              {showChooseProfessionalCta ? (
                <PackageChooseProfessionalCta language={props.language} onClick={openChooseProfessional} />
              ) : null}
            </div>
            <div className="checkout-packages-head-actions">
              {canIndividualCtaHome ? (
                <button
                  type="button"
                  className="checkout-packages-individual-top-link"
                  disabled={!canIndividualCtaHome}
                  onClick={() => {
                    if (!pricingReady) {
                      onChooseProfessional();
                      return;
                    }
                    props.onNavigateToIndividualSessions();
                  }}
                >
                  {t(props.language, {
                    es: "Comprar sesiones individuales",
                    en: "Buy individual sessions",
                    pt: "Comprar sessoes individuais"
                  })}
                </button>
              ) : null}
              {showGoogleCalendarCta ? (
                <button
                  type="button"
                  className={`dashboard-package-google-calendar-button${googleCalendarCtaPulse ? " patient-google-calendar-cta--pulse" : ""}`}
                  onClick={() => props.onOpenPatientGoogleCalendarConnect?.()}
                >
                  {t(props.language, {
                    es: "Conectá Google Calendar",
                    en: "Connect Google Calendar",
                    pt: "Conectar o Google Calendar"
                  })}
                </button>
              ) : null}
            </div>
          </div>
          {packageCheckoutError ? (
            <p className="availability-status-message booking-soft-notice checkout-packages-payment-error" role="alert">
              {packageCheckoutError}
            </p>
          ) : null}
          {packagesLoadingHint === "loading" ? (
            <PackageCatalogLoading language={props.language} />
          ) : packagesLoadingHint === "empty" ? (
            <PackageCatalogError language={props.language} />
          ) : (
          <div className="deal-grid sessions-package-options-grid">
            {displayPackagePlans.slice(0, 3).map((plan) => {
              const pricing = pricingReady
                ? resolvePackageCardDisplayPricing({
                    priceCents: plan.priceCents,
                    discountPercent: plan.discountPercent,
                    credits: plan.credits,
                    displayCurrency: props.currency,
                    fxRates: props.fxRates
                  })
                : null;
              const money = (amountMajor: number) =>
                formatPackageCardMoney({
                  amountMajor,
                  displayCurrency: props.currency,
                  language: props.language,
                  residencyCountry: props.state.profileResidencyCountry
                });
              const benefitLines = packageBenefitLines(plan.credits, (values) => t(props.language, values));

              return (
                <div className={`deal-card-shell ${displayFeaturedPackageId === plan.id ? "featured" : ""}`} key={plan.id}>
                  <div className="deal-card-roof" aria-hidden={displayFeaturedPackageId !== plan.id}>
                    {displayFeaturedPackageId === plan.id ? (
                      <span className="deal-card-featured-kicker">{t(props.language, { es: "Más elegido", en: "Best seller", pt: "Mais escolhido" })}</span>
                    ) : null}
                  </div>
                  <article
                    className={`deal-card dashboard-deal-card sessions-package-card dashboard-package-card ${displayFeaturedPackageId === plan.id ? "featured" : ""}`}
                  >
                    <div className="sessions-package-card-topline">
                      <span className="sessions-package-card-saving">
                        {pricing
                          ? replaceTemplate(
                              t(props.language, {
                                es: "Ahorras {amount}",
                                en: "You save {amount}",
                                pt: "Voce economiza {amount}"
                              }),
                              { amount: money(pricing.savingLocalMajor) }
                            )
                          : t(props.language, {
                              es: "Precio según profesional",
                              en: "Price based on professional",
                              pt: "Preco conforme profissional"
                            })}
                      </span>
                    </div>
                    <h3>{localizedPackageName(plan.id, plan.name, props.language)}</h3>
                    <p className="sessions-package-card-description">{localizedPackageDescription(plan.id, plan.description)}</p>
                    {pricing ? (
                      <>
                        <div className="deal-pricing-top">
                          <span className="deal-list-price">{money(pricing.listLocalMajor)}</span>
                          <span className="deal-discount-badge">{pricing.discountPercent}% OFF</span>
                        </div>
                        <p className="deal-main-price">
                          {money(pricing.perSessionLocalMajor)}
                          <span className="deal-main-price-unit">
                            {t(props.language, { es: "/sesión", en: "/session", pt: "/sessao" })}
                          </span>
                        </p>
                        <p className="sessions-package-card-unit">
                          {replaceTemplate(
                            t(props.language, {
                              es: "Total del paquete {amount}",
                              en: "Package total {amount}",
                              pt: "Total do pacote {amount}"
                            }),
                            { amount: money(pricing.totalLocalMajor) }
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="deal-pricing-top">
                          <span className="deal-price-pending-label">
                            {t(props.language, {
                              es: "Precio al elegir profesional",
                              en: "Price shown after choosing a professional",
                              pt: "Preco ao escolher profissional"
                            })}
                          </span>
                        </div>
                        <p className="deal-main-price deal-main-price--placeholder" aria-hidden="true">
                          —
                        </p>
                        <p className="sessions-package-card-unit">
                          {t(props.language, {
                            es: "Tarifa del profesional × sesiones − descuento del paquete",
                            en: "Professional rate × sessions − package discount",
                            pt: "Tarifa do profissional × sessoes − desconto do pacote"
                          })}
                        </p>
                      </>
                    )}
                    <ul className="sessions-package-benefits">
                      {benefitLines.map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                    <p className="deal-caption-strong">
                      {replaceTemplate(
                        t(props.language, {
                          es: "Incluye {count} sesiones.",
                          en: "Includes {count} sessions.",
                          pt: "Inclui {count} sessoes."
                        }),
                        { count: String(plan.credits) }
                      )}
                    </p>
                    <button
                      className="deal-select-button"
                      type="button"
                      disabled={packageCheckoutLoading}
                      onClick={() => handleStartPackagePurchase(plan)}
                    >
                      {pricingReady
                        ? t(props.language, { es: "Adquirir este paquete", en: "Get this package", pt: "Adquirir este pacote" })
                        : t(props.language, { es: "Elegir profesional", en: "Choose professional", pt: "Escolher profissional" })}
                    </button>
                  </article>
                </div>
              );
            })}
          </div>
          )}
        </section>
      ) : null}

      </div>

  );
}
