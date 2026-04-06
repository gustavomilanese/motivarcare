import { type SyntheticEvent, useEffect, useRef, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyAmount,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import { DEFAULT_PATIENT_HERO_IMAGE } from "../constants";
import { API_BASE, professionalPhotoSrc } from "../services/api";
import { packageBenefitLines, packageRhythmLabel, loadPublicPackagePlans } from "../lib/packageCatalog";
import { findProfessionalById } from "../lib/professionals";
import type {
  Booking,
  PackageId,
  PackagePlan,
  PatientAppState,
  Professional,
  TimeSlot
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const PATIENT_RESCHEDULE_NOTICE_HOURS = 24;

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

function formatTimeOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function formatMoney(amountInUsd: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyAmount({
    amountInUsd,
    currency,
    language,
    maximumFractionDigits: 0
  });
}

function getNextBooking(bookings: Booking[]): Booking | null {
  const now = Date.now();

  return (
    bookings
      .filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt).getTime() > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null
  );
}

function canPatientRescheduleBooking(startsAt: string): boolean {
  const minimumStartMs = Date.now() + PATIENT_RESCHEDULE_NOTICE_HOURS * 60 * 60 * 1000;
  return new Date(startsAt).getTime() >= minimumStartMs;
}


export function DashboardPage(props: {
  state: PatientAppState;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  language: AppLanguage;
  currency: SupportedCurrency;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onGoToReservations: () => void;
  onGoToBooking: (professionalId: string) => void;
  onGoToProfessional: (professionalId: string) => void;
  onGoToChat: (professionalId: string) => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onPlanTrialFromDashboard: (professionalId: string, slot: TimeSlot) => void;
  onStartPackagePurchase: (plan: PackagePlan) => void;
}) {
  const now = Date.now();
  const canChangeProfessionalForNewPackage = !props.state.assignedProfessionalId || props.state.subscription.creditsRemaining <= 0;
  const pricingProfessionalId = canChangeProfessionalForNewPackage
    ? props.state.selectedProfessionalId
    : props.state.assignedProfessionalId ?? props.state.selectedProfessionalId;
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialProfessionalId, setTrialProfessionalId] = useState(props.state.assignedProfessionalId ?? props.state.selectedProfessionalId);
  const [trialSlotId, setTrialSlotId] = useState("");
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isPackagesExpanded, setIsPackagesExpanded] = useState(false);
  const [landingPatientHeroImage, setLandingPatientHeroImage] = useState(DEFAULT_PATIENT_HERO_IMAGE);
  const [packagePlans, setPackagePlans] = useState<PackagePlan[]>([]);
  const [featuredPackageId, setFeaturedPackageId] = useState<string | null>(null);
  const packageSectionRef = useRef<HTMLElement | null>(null);
  const defaultPackagePlan = packagePlans.find((plan) => plan.id === featuredPackageId) ?? packagePlans[0] ?? null;
  const nextBooking = getNextBooking(props.state.bookings);
  const confirmedBookings = props.state.bookings.filter((booking) => booking.status === "confirmed");
  const upcomingConfirmedBookings = confirmedBookings
    .filter((booking) => new Date(booking.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const trialBookings = confirmedBookings.filter((booking) => booking.bookingMode === "trial");
  const activeTrialBooking = trialBookings
    .filter((booking) => new Date(booking.endsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;
  const hasTrialPlanned = trialBookings.some((booking) => new Date(booking.endsAt).getTime() >= now);
  const hasCompletedTrial = trialBookings.some((booking) => new Date(booking.endsAt).getTime() < now);
  const trialStatus: "pending" | "reserved" | "completed" = hasCompletedTrial
    ? "completed"
    : hasTrialPlanned
      ? "reserved"
      : "pending";
  const nextConfirmedBooking = nextBooking ?? confirmedBookings[0] ?? null;
  const fallbackBooking = confirmedBookings[0] ?? null;
  const activeProfessionalBooking = nextBooking ?? fallbackBooking;
  const activeProfessional = activeProfessionalBooking
    ? findProfessionalById(activeProfessionalBooking.professionalId, props.professionals)
    : props.state.assignedProfessionalId
      ? props.professionals.find((item) => item.id === props.state.assignedProfessionalId) ?? null
      : null;
  const activeTrialProfessional = activeTrialBooking ? findProfessionalById(activeTrialBooking.professionalId, props.professionals) : null;
  const activeTrialSlotId = activeTrialProfessional
    ? activeTrialProfessional.slots.find(
        (slot) => slot.startsAt === activeTrialBooking?.startsAt && slot.endsAt === activeTrialBooking?.endsAt
      )?.id ?? ""
    : "";
  const trialProfessional = findProfessionalById(trialProfessionalId, props.professionals);
  const availableTrialSlots = trialProfessional.slots.filter(
    (slot) => !props.state.bookedSlotIds.includes(slot.id) || slot.id === activeTrialSlotId
  );
  const selectedTrialSlot = availableTrialSlots.find((slot) => slot.id === trialSlotId) ?? null;

  const openTrialModal = () => {
    if (!hasTrialPlanned || !activeTrialBooking) {
      return;
    }
    const initialProfessionalId = activeTrialBooking?.professionalId ?? props.state.assignedProfessionalId ?? props.state.selectedProfessionalId;
    setTrialProfessionalId(initialProfessionalId);
    setTrialSlotId(activeTrialSlotId);
    setTrialModalOpen(true);
  };

  useEffect(() => {
    setTrialProfessionalId(props.state.assignedProfessionalId ?? props.state.selectedProfessionalId);
  }, [props.state.assignedProfessionalId, props.state.selectedProfessionalId]);

  useEffect(() => {
    setTrialSlotId("");
  }, [trialProfessionalId]);

  useEffect(() => {
    if (!trialModalOpen) {
      return;
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setTrialModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [trialModalOpen]);

  useEffect(() => {
    let active = true;

    async function loadLandingImage() {
      try {
        const response = await fetch(`${API_BASE}/api/public/web-content`);
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          settings?: {
            patientDesktopImageUrl?: string | null;
            patientHeroImageUrl?: string | null;
          };
        };

        if (!active) {
          return;
        }

        const imageFromLanding = data.settings?.patientDesktopImageUrl ?? data.settings?.patientHeroImageUrl;
        if (imageFromLanding) {
          setLandingPatientHeroImage(imageFromLanding);
        }
      } catch {
        // keep default image if API is unavailable
      }
    }

    void loadLandingImage();
    void loadPublicPackagePlans({
      language: props.language,
      professionalId: pricingProfessionalId,
      t: (values) => t(props.language, values)
    }).then((catalog) => {
      if (active) {
        setPackagePlans(catalog.plans);
        setFeaturedPackageId(catalog.featuredPackageId);
      }
    });

    return () => {
      active = false;
    };
  }, [pricingProfessionalId, props.language]);

  return (
    <div className="page-stack sessions-page-layout patient-dashboard-home">
      <section className="hero-composite">
        <div className="hero-media">
          <figure className="hero-photo-tile">
            <img
              src={landingPatientHeroImage}
              alt={t(props.language, {
                es: "Paciente en sesion virtual",
                en: "Patient in a virtual session",
                pt: "Paciente em sessao virtual"
              })}
              loading="lazy"
              onError={props.onHeroFallback}
            />
            <figcaption className="hero-note-card">
              <p>
                {t(props.language, {
                  es: "La paz viene de adentro. No la busques afuera.",
                  en: "Peace comes from within. Do not seek it without.",
                  pt: "A paz vem de dentro. Nao a procure fora."
                })}
              </p>
            </figcaption>
          </figure>
        </div>
        <div className="hero-title-wrap">
          <div className="hero-title-actions">
            <h3>
              {t(props.language, {
                es: "Gestiona tus sesiones de psicologia en un solo lugar",
                en: "Manage your psychology sessions in one place",
                pt: "Gerencie suas sessoes de psicologia em um so lugar"
              })}
            </h3>
          </div>
          <p>
            {t(props.language, {
              es: "Desde aqui puedes ver tu agenda, reservar nuevas sesiones y mantener continuidad terapeutica.",
              en: "From here you can view your schedule, book new sessions, and keep therapeutic continuity.",
              pt: "Daqui voce pode ver sua agenda, reservar novas sessoes e manter continuidade terapeutica."
            })}
          </p>
          {defaultPackagePlan ? (
            <button
              className="sessions-hero-buy-button dashboard-hero-buy-button"
              type="button"
              onClick={() => {
                packageSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {t(props.language, { es: "Comprar paquete", en: "Buy package", pt: "Comprar pacote" })}
            </button>
          ) : null}
        </div>
      </section>

      <section className="content-card trial-priority-banner trial-priority-inline">
        <h2>
          <span className="trial-inline-icon" aria-hidden="true" />
          {trialStatus === "pending"
            ? t(props.language, { es: "Sesion de prueba pendiente", en: "Pending trial session", pt: "Sessao de teste pendente" })
            : trialStatus === "reserved"
              ? t(props.language, { es: "Sesion de prueba planificada", en: "Trial session scheduled", pt: "Sessao de teste agendada" })
              : t(props.language, { es: "Sesion de prueba completada", en: "Trial session completed", pt: "Sessao de teste concluida" })}
        </h2>
        <p>
          {trialStatus === "reserved" && activeTrialBooking
            ? formatDateTime({
                isoDate: activeTrialBooking.startsAt,
                timezone: props.state.profile.timezone,
                language: props.language
              })
            : trialStatus === "completed" && activeTrialBooking
              ? formatDateTime({
                  isoDate: activeTrialBooking.startsAt,
                  timezone: props.state.profile.timezone,
                  language: props.language
                })
              : t(props.language, {
                  es: "Elige un horario para dejar tu primera sesion ya agendada.",
                  en: "Choose a time to leave your first session already scheduled.",
                  pt: "Escolha um horario para deixar sua primeira sessao ja agendada."
                })}
        </p>
        <button className="trial-inline-action" type="button" onClick={openTrialModal} disabled={!hasTrialPlanned}>
          {t(props.language, { es: "Modificar", en: "Modify", pt: "Modificar" })}
        </button>
      </section>

      <section className="hero-grid">
        <article className="hero-card sessions-combined-card">
          <button
            className="sessions-combined-section sessions-combined-action"
            type="button"
            onClick={props.onGoToReservations}
          >
            <span className="label">{t(props.language, { es: "Sesiones confirmadas", en: "Confirmed sessions", pt: "Sessoes confirmadas" })}</span>
            <strong>{props.state.bookings.filter((booking) => booking.status === "confirmed").length}</strong>
            <p>
              {nextBooking
                ? `${t(props.language, { es: "Proxima", en: "Next", pt: "Proxima" })}: ${formatDateTime({
                    isoDate: nextBooking.startsAt,
                    timezone: props.state.profile.timezone,
                    language: props.language
                  })}`
                : t(props.language, {
                    es: "Todavia no tenes sesiones reservadas",
                    en: "You do not have any booked sessions yet",
                    pt: "Voce ainda nao tem sessoes reservadas"
                  })}
            </p>
            <span className="hero-inline-link">
              {nextConfirmedBooking
                ? t(props.language, { es: "Ver detalle", en: "View details", pt: "Ver detalhes" })
                : t(props.language, { es: "Sin sesiones confirmadas", en: "No confirmed sessions", pt: "Sem sessoes confirmadas" })}
            </span>
          </button>

          <button
            className="sessions-combined-section sessions-combined-action"
            type="button"
            onClick={() => props.onGoToBooking(props.state.selectedProfessionalId)}
          >
            <span className="label sessions-available-label">
              <span className="sessions-available-icon" aria-hidden="true">◌</span>
              {t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}
            </span>
            <strong>{props.state.subscription.creditsRemaining}</strong>
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

        <button
          className="hero-card hero-card-button active-professional-card"
          disabled={!activeProfessional}
          type="button"
          onClick={() => {
            if (activeProfessional) {
              props.onGoToProfessional(activeProfessional.id);
            }
          }}
        >
          <span className="label">{t(props.language, { es: "Profesional activo", en: "Active professional", pt: "Profissional ativo" })}</span>
          {activeProfessional ? (
            <>
              <div className="active-professional-row">
                  <img
                  className="active-professional-avatar"
                  src={professionalPhotoSrc(props.professionalPhotoMap[activeProfessional.id])}
                  alt={activeProfessional.fullName}
                  onError={props.onImageFallback}
                />
                <div>
                  <h3>{activeProfessional.fullName}</h3>
                  <p>{activeProfessional.title}</p>
                </div>
              </div>
              <p>
                {replaceTemplate(
                  t(props.language, {
                    es: "{compat}% compatibilidad · {years} anos de experiencia",
                    en: "{compat}% match · {years} years of experience",
                    pt: "{compat}% compatibilidade · {years} anos de experiencia"
                  }),
                  { compat: activeProfessional.compatibility, years: activeProfessional.yearsExperience }
                )}
              </p>
              <button
                className="chat-gradient-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onGoToChat(activeProfessional.id);
                }}
              >
                {t(props.language, { es: "Abrir chat con profesional", en: "Open chat with professional", pt: "Abrir chat com profissional" })}
              </button>
            </>
          ) : (
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
                    es: "Reserva tu primera sesion para ver aqui los datos de tu profesional.",
                    en: "Book your first session to see your professional details here.",
                    pt: "Reserve sua primeira sessao para ver aqui os dados do profissional."
                  })}
            </p>
          )}
        </button>
      </section>

      <section className="content-card booking-session-card booking-card-minimal sessions-confirmed-panel">
        <div className="sessions-panel-head">
          <div>
            <h2>{t(props.language, { es: "Próximas Reservas", en: "Upcoming bookings", pt: "Próximas reservas" })}</h2>
          </div>
          <div className="sessions-panel-actions">
            <button className="sessions-reserve-button dashboard-go-sessions-button" type="button" onClick={props.onGoToReservations}>
              {t(props.language, { es: "Ir a sesiones", en: "Go to sessions", pt: "Ir para sessoes" })}
            </button>
          </div>
        </div>

        {upcomingConfirmedBookings.length === 0 ? (
          <div className="sessions-empty-state">
            <strong>
              {t(props.language, {
                es: "Todavia no tienes sesiones confirmadas",
                en: "You have no confirmed sessions yet",
                pt: "Voce ainda nao tem sessoes confirmadas"
              })}
            </strong>
          </div>
        ) : (
          <div className="sessions-confirmed-list">
            <div className="sessions-reservations-table-head" aria-hidden="true">
              <span>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
              <span>{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
              <span>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
              <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
              <span>{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
            </div>
            {upcomingConfirmedBookings.slice(0, 3).map((booking) => {
              const bookingProfessional = findProfessionalById(booking.professionalId, props.professionals);
              const canReschedule = canPatientRescheduleBooking(booking.startsAt);
              return (
                <article
                  className="session-management-card session-management-card-clickable"
                  key={booking.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => props.onOpenBookingDetail(booking.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      props.onOpenBookingDetail(booking.id);
                    }
                  }}
                >
                  <div className="session-management-main">
                    <div className="session-management-cell session-management-cell-date">
                      <span className="session-management-cell-label">{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
                      <strong>{formatDateOnly({ isoDate: booking.startsAt, timezone: props.state.profile.timezone, language: props.language })}</strong>
                    </div>
                    <div className="session-management-cell session-management-cell-time">
                      <span className="session-management-cell-label">{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
                      <span>{formatTimeOnly({ isoDate: booking.startsAt, timezone: props.state.profile.timezone, language: props.language })}</span>
                    </div>
                    <div className="session-management-cell session-management-meta">
                      <span className="session-management-cell-label">{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
                      <strong>{bookingProfessional.fullName}</strong>
                    </div>
                    <div className="session-management-cell session-management-cell-status">
                      <span className="session-management-cell-label">{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
                      <span className="session-status-pill confirmed">
                        {booking.bookingMode === "trial"
                          ? t(props.language, { es: "Prueba confirmada", en: "Trial confirmed", pt: "Teste confirmado" })
                          : t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" })}
                      </span>
                    </div>
                  </div>
                  <div className="session-management-actions-wrap">
                    <span className="session-management-cell-label">{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
                    {booking.bookingMode === "trial" ? (
                      <div className="session-management-actions">
                        <button
                          type="button"
                          className="session-detail-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            props.onOpenBookingDetail(booking.id);
                          }}
                        >
                          {t(props.language, { es: "Ver detalle", en: "View detail", pt: "Ver detalhe" })}
                        </button>
                      </div>
                    ) : (
                      <div className="session-management-actions">
                        <button
                          type="button"
                          className="icon-only"
                          disabled={!canReschedule}
                          title={canReschedule
                            ? undefined
                            : t(props.language, {
                                es: "Disponible hasta 24 horas antes de la sesión.",
                                en: "Available up to 24 hours before the session.",
                                pt: "Disponivel ate 24 horas antes da sessao."
                              })}
                          aria-label={t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!canReschedule) {
                              return;
                            }
                            props.onGoToReservations();
                          }}
                        >
                          <span className="session-action-icon reschedule" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="sessions-calendar-collapsible sessions-secondary-section dashboard-compact-section">
        <button
          type="button"
          className="sessions-calendar-toggle"
          aria-expanded={isCalendarExpanded}
          onClick={() => setIsCalendarExpanded((current) => !current)}
        >
          <h2 className="sessions-secondary-title">{t(props.language, { es: "Calendario de sesiones", en: "Sessions calendar", pt: "Calendario de sessoes" })}</h2>
          <span className="sessions-secondary-toggle-label">{isCalendarExpanded
            ? t(props.language, { es: "Ocultar", en: "Hide", pt: "Ocultar" })
            : t(props.language, { es: "Expandir", en: "Expand", pt: "Expandir" })}
          </span>
        </button>
        {isCalendarExpanded ? (
          <SessionsCalendar
            bookings={confirmedBookings.filter((booking) => new Date(booking.startsAt).getTime() > now)}
            timezone={props.state.profile.timezone}
            language={props.language}
            onOpenBookingDetail={props.onOpenBookingDetail}
            variant="week"
            hideTitle
          />
        ) : null}
      </section>

      <section className="sessions-secondary-section dashboard-compact-section sessions-purchased-history">
        <button
          type="button"
          className="sessions-calendar-toggle"
          aria-expanded={isPackagesExpanded}
          onClick={() => setIsPackagesExpanded((current) => !current)}
        >
          <h2 className="sessions-secondary-title">{t(props.language, { es: "Paquetes comprados", en: "Purchased packages", pt: "Pacotes comprados" })}</h2>
          <span className="sessions-secondary-toggle-label">{isPackagesExpanded
            ? t(props.language, { es: "Ocultar", en: "Hide", pt: "Ocultar" })
            : t(props.language, { es: "Expandir", en: "Expand", pt: "Expandir" })}
          </span>
        </button>
        {isPackagesExpanded ? (
          props.state.subscription.purchaseHistory.length === 0 ? (
            <p>{t(props.language, { es: "Todavia no tienes paquetes comprados.", en: "You do not have purchased packages yet.", pt: "Voce ainda nao tem pacotes comprados." })}</p>
          ) : (
            <ul className="simple-list session-history-list">
              {props.state.subscription.purchaseHistory.slice(0, 20).map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{replaceTemplate(t(props.language, { es: "{count} sesiones", en: "{count} sessions", pt: "{count} sessoes" }), { count: String(item.credits) })}</span>
                  </div>
                  <span>{formatDateOnly({ isoDate: item.purchasedAt, timezone: props.state.profile.timezone, language: props.language })}</span>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      {packagePlans.length > 0 ? (
        <section ref={packageSectionRef} className="content-card sessions-package-options-panel dashboard-package-options-panel">
          <div className="session-booking-panel-head">
            <div>
              <h3>{t(props.language, { es: "Comprar paquete de sesiones", en: "Buy session package", pt: "Comprar pacote de sessoes" })}</h3>
              <p>{t(props.language, { es: "Elige el plan que mejor acompane tu proceso y confirma la compra.", en: "Choose the plan that best supports your process and confirm the purchase.", pt: "Escolha o plano que melhor acompanha seu processo e confirme a compra." })}</p>
            </div>
          </div>
          <div className="deal-grid sessions-package-options-grid">
            {packagePlans.slice(0, 3).map((plan) => {
              const selectedPlan = featuredPackageId ? featuredPackageId === plan.id : packagePlans[0]?.id === plan.id;
              const listPriceAmount = Math.round(plan.priceCents / 100 / Math.max(0.01, 1 - plan.discountPercent / 100));
              const finalPriceAmount = plan.priceCents / 100;
              const savingAmount = Math.max(0, listPriceAmount - finalPriceAmount);
              const pricePerSession = finalPriceAmount / Math.max(1, plan.credits);
              const benefitLines = packageBenefitLines(plan.credits, (values) => t(props.language, values));

              return (
                <div className={`deal-card-shell ${featuredPackageId === plan.id ? "featured" : ""}`} key={plan.id}>
                  <div className="deal-card-roof" aria-hidden={featuredPackageId !== plan.id}>
                    {featuredPackageId === plan.id ? (
                      <span className="deal-card-featured-kicker">{t(props.language, { es: "Mas elegido", en: "Best seller", pt: "Mais escolhido" })}</span>
                    ) : null}
                  </div>
                  <article
                    className={`deal-card dashboard-deal-card sessions-package-card dashboard-package-card ${featuredPackageId === plan.id ? "featured" : ""} ${selectedPlan ? "selected" : ""}`}
                  >
                    <div className="sessions-package-card-topline">
                      <span className="sessions-package-card-kicker">{packageRhythmLabel(plan.credits, (values) => t(props.language, values))}</span>
                      <span className="sessions-package-card-saving">
                        {replaceTemplate(
                          t(props.language, {
                            es: "Ahorras {amount}",
                            en: "You save {amount}",
                            pt: "Voce economiza {amount}"
                          }),
                          { amount: formatMoney(savingAmount, props.language, props.currency) }
                        )}
                      </span>
                    </div>
                    <h3>{localizedPackageName(plan.id, plan.name, props.language)}</h3>
                    <p className="sessions-package-card-description">{localizedPackageDescription(plan.id, plan.description)}</p>
                    <div className="deal-pricing-top">
                      <span className="deal-list-price">{formatMoney(listPriceAmount, props.language, props.currency)}</span>
                      <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
                    </div>
                    <p className="deal-main-price">{formatMoney(finalPriceAmount, props.language, props.currency)}</p>
                    <p className="sessions-package-card-unit">
                      {replaceTemplate(
                        t(props.language, {
                          es: "Equivale a {amount} por sesion",
                          en: "Equivalent to {amount} per session",
                          pt: "Equivale a {amount} por sessao"
                        }),
                        { amount: formatMoney(pricePerSession, props.language, props.currency) }
                      )}
                    </p>
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
                      className={`deal-select-button ${featuredPackageId === plan.id ? "featured" : ""}`}
                      type="button"
                      onClick={() => props.onStartPackagePurchase(plan)}
                    >
                      {selectedPlan
                        ? t(props.language, { es: "Comprar este paquete", en: "Buy this package", pt: "Comprar este pacote" })
                        : t(props.language, { es: "Elegir paquete", en: "Choose package", pt: "Escolher pacote" })}
                    </button>
                  </article>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {trialModalOpen ? (
        <div className="session-modal-backdrop" role="presentation" onClick={() => setTrialModalOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            className="session-modal trial-plan-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="session-modal-header">
              <h2>{t(props.language, { es: "Modificar sesion de prueba", en: "Edit trial session", pt: "Editar sessao de teste" })}</h2>
            </header>

            <div className="booking-inline-fields">
              <label>
                {t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}
                <select
                  value={trialProfessionalId}
                  onChange={(event) => setTrialProfessionalId(event.target.value)}
                >
                  {props.professionals.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName} - {item.compatibility}%
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t(props.language, { es: "Slot disponible", en: "Available slot", pt: "Horario disponivel" })}
                <select value={trialSlotId} onChange={(event) => setTrialSlotId(event.target.value)}>
                  <option value="">
                    {availableTrialSlots.length === 0
                      ? t(props.language, {
                          es: "Sin slots esta semana",
                          en: "No slots this week",
                          pt: "Sem horarios esta semana"
                        })
                      : t(props.language, {
                          es: "Selecciona un horario",
                          en: "Select a time",
                          pt: "Selecione um horario"
                        })}
                  </option>
                  {availableTrialSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatDateOnly({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })} ·{" "}
                      {formatDateTime({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="booking-confirm-row">
              <p>
                {t(props.language, {
                  es: "Actualizaras la sesion de prueba ya reservada y mantendras el seguimiento en tu agenda.",
                  en: "You will update your already reserved trial session and keep tracking in your schedule.",
                  pt: "Voce atualizara a sessao de teste ja reservada e mantera o acompanhamento na agenda."
                })}
              </p>
              <div className="button-row">
                <button
                  className="primary"
                  type="button"
                  disabled={!selectedTrialSlot || !hasTrialPlanned}
                  onClick={() => {
                    if (!selectedTrialSlot) {
                      return;
                    }
                    props.onPlanTrialFromDashboard(trialProfessionalId, selectedTrialSlot);
                    setTrialModalOpen(false);
                  }}
                >
                  {t(props.language, { es: "Guardar cambios", en: "Save changes", pt: "Salvar alteracoes" })}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
