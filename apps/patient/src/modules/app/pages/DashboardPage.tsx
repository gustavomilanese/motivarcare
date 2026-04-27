import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyMajor,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import { AcquireSessionsChoiceModal } from "../components/AcquireSessionsChoiceModal";
import { ProfessionalNameStack, professionalPhotoAlt } from "../components/ProfessionalNameStack";
import { professionalAccessibleName } from "../lib/professionalDisplayName";
import { DEFAULT_PATIENT_HERO_IMAGE } from "../constants";
import { API_BASE, professionalPhotoSrc, resolvePublicAssetUrl } from "../services/api";
import { packageBenefitLines, packageRhythmLabel, loadPublicPackagePlans } from "../lib/packageCatalog";
import { formatSubscriptionPurchasePrice } from "../lib/formatSubscriptionPurchasePrice";
import { findProfessionalById, patientHasAssignedProfessional } from "../lib/professionals";
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

const ASSIGN_PRO_MODAL_DISMISS_KEY = "mc.assignProPromptDismissed";

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

function formatSessionCardDateLine(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      day: "numeric",
      month: "long"
    }
  });
}

/**
 * El monto ya está en la moneda del paquete (no convertimos en cliente).
 * `fallbackCurrency` se usa sólo si el plan no trae código de moneda.
 */
function formatMoney(amountMajor: number, language: AppLanguage, planCurrency: string, fallbackCurrency: SupportedCurrency): string {
  return formatCurrencyMajor({
    amountMajor,
    currency: planCurrency,
    language,
    maximumFractionDigits: 0,
    fallbackCurrency
  });
}

function packageUnitPriceMajor(plan: PackagePlan): number {
  return plan.priceCents / 100 / Math.max(1, plan.credits);
}

function DashboardRnUpcomingCard(props: {
  booking: Booking;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  timezone: string;
  language: AppLanguage;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenBookingDetail: (bookingId: string) => void;
}) {
  const bookingProfessional = findProfessionalById(props.booking.professionalId, props.professionals);
  const isTrialBooking = props.booking.bookingMode === "trial";
  const joinUrl = typeof props.booking.joinUrl === "string" ? props.booking.joinUrl.trim() : "";
  const statusConfirmed = t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" });
  const statusLine = isTrialBooking
    ? `${statusConfirmed} · ${t(props.language, { es: "Sesión de prueba", en: "Trial session", pt: "Sessão de teste" })}`
    : statusConfirmed;
  const proPhoto = professionalPhotoSrc(props.professionalPhotoMap[props.booking.professionalId]);

  const handleActivate = () => {
    if (joinUrl) {
      window.open(joinUrl, "_blank", "noopener,noreferrer");
      return;
    }
    props.onOpenBookingDetail(props.booking.id);
  };

  return (
    <button
      type="button"
      className={`session-rn-card session-management-card dashboard-rn-session-pressable ${isTrialBooking ? "session-rn-card--trial" : ""}`}
      onClick={handleActivate}
    >
      <div className="session-rn-top">
        <span className="session-rn-time" aria-hidden="true">
          {formatTimeOnly({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}
        </span>
        <img className="session-rn-avatar" src={proPhoto} alt="" onError={props.onImageFallback} />
        <div className="session-rn-body">
          <div className="session-rn-body-header">
            <div className="session-rn-body-main">
              <span className="session-rn-date-line">
                {formatSessionCardDateLine({
                  isoDate: props.booking.startsAt,
                  timezone: props.timezone,
                  language: props.language
                })}
              </span>
              <strong className="session-rn-name">
                <ProfessionalNameStack professional={bookingProfessional} as="span" />
              </strong>
              <span
                className={`session-rn-status ${isTrialBooking ? "dashboard-rn-status-pending" : "dashboard-rn-status-ok"}`}
              >
                {statusLine}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
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
  /** Abre Sesiones en checkout enfocado en compra suelta (misma UX que el panel de paquetes). */
  onNavigateToIndividualSessions: () => void;
  /** Flujo de matching + reserva de prueba (p. ej. tras posponer onboarding). */
  onNavigateToBookTrial: () => void;
  /** Sin profesional asignado: volver al matching del onboarding para elegir uno. */
  onNavigateToAssignProfessional: () => void;
}) {
  const now = Date.now();
  const hasAssignedProfessional = patientHasAssignedProfessional(props.state.assignedProfessionalId);
  const canChangeProfessionalForNewPackage = !props.state.assignedProfessionalId || props.state.subscription.creditsRemaining <= 0;
  const pricingProfessionalId = canChangeProfessionalForNewPackage
    ? props.state.selectedProfessionalId
    : props.state.assignedProfessionalId ?? props.state.selectedProfessionalId;
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialProfessionalId, setTrialProfessionalId] = useState(props.state.assignedProfessionalId ?? props.state.selectedProfessionalId);
  const [trialSlotId, setTrialSlotId] = useState("");
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isPackagesExpanded, setIsPackagesExpanded] = useState(false);
  const [acquireSessionsModalOpen, setAcquireSessionsModalOpen] = useState(false);
  const [assignProModalOpen, setAssignProModalOpen] = useState(false);
  /** `null` = aún cargando hero desde API (evita mostrar un default distinto y luego reemplazar). */
  const [landingPatientHeroImage, setLandingPatientHeroImage] = useState<string | null>(null);
  const [packagePlans, setPackagePlans] = useState<PackagePlan[]>([]);
  const [featuredPackageId, setFeaturedPackageId] = useState<string | null>(null);
  const [rnMcarePlanId, setRnMcarePlanId] = useState<string | null>(null);
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
      const fallback = DEFAULT_PATIENT_HERO_IMAGE;
      try {
        const response = await fetch(`${API_BASE}/api/public/web-content`, { credentials: "omit" });
        if (!response.ok) {
          if (active) {
            setLandingPatientHeroImage(fallback);
          }
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

        const raw = data.settings?.patientDesktopImageUrl ?? data.settings?.patientHeroImageUrl ?? null;
        const resolved = resolvePublicAssetUrl(raw);
        setLandingPatientHeroImage(resolved ?? fallback);
      } catch {
        if (active) {
          setLandingPatientHeroImage(fallback);
        }
      }
    }

    void loadLandingImage();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!hasAssignedProfessional) {
      setPackagePlans([]);
      setFeaturedPackageId(null);
      return () => {
        active = false;
      };
    }

    void loadPublicPackagePlans({
      language: props.language,
      professionalId: pricingProfessionalId,
      market: props.state.patientMarket,
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
  }, [hasAssignedProfessional, pricingProfessionalId, props.language, props.state.patientMarket]);

  const ASSIGN_PRO_DISMISS_KEY = "mc.assignProPromptDismissed";

  useEffect(() => {
    if (hasAssignedProfessional) {
      try {
        window.sessionStorage.removeItem(ASSIGN_PRO_MODAL_DISMISS_KEY);
      } catch {
        // ignore
      }
      setAssignProModalOpen(false);
      return;
    }
    try {
      if (window.sessionStorage.getItem(ASSIGN_PRO_MODAL_DISMISS_KEY) === "1") {
        setAssignProModalOpen(false);
        return;
      }
    } catch {
      // ignore
    }
    setAssignProModalOpen(true);
  }, [hasAssignedProfessional]);

  const rnPackagePlansSorted = useMemo(
    () => [...packagePlans].sort((a, b) => a.credits - b.credits),
    [packagePlans]
  );
  const individualUnitHome = useMemo(() => {
    const oneCredit = packagePlans.find((plan) => plan.credits === 1);
    if (oneCredit) {
      return oneCredit.priceCents / 100;
    }
    const bundle = packagePlans.find((plan) => plan.credits > 1);
    if (!bundle) {
      return null;
    }
    return bundle.priceCents / 100 / bundle.credits;
  }, [packagePlans]);
  const canIndividualCtaHome = individualUnitHome !== null && packagePlans.length > 0;
  const rnSelectedPlan = rnMcarePlanId ? rnPackagePlansSorted.find((plan) => plan.id === rnMcarePlanId) ?? null : null;
  const availableSessions = props.state.subscription.creditsRemaining;
  const rnUpcomingSlice = upcomingConfirmedBookings.slice(0, 3);

  const dashboardIntroLead = t(props.language, {
    es: "Gestioná desde este panel tu bienestar: reservas y sesiones, música relajante, ejercicios guiados y hablar con Maca cuando la necesites (botón flotante del asistente).",
    en: "Manage your wellbeing from this dashboard: bookings and sessions, relaxing music, guided exercises, and talking to Maca when you need her (floating assistant button).",
    pt: "Gerencie seu bem-estar neste painel: reservas e sessões, música relaxante, exercícios guiados e falar com a Maca quando precisar (botão flutuante da assistente)."
  });

  return (
    <div className="page-stack sessions-page-layout patient-dashboard-home session-rn-root">
      <div className="dashboard-legacy-home">
      <p className="dashboard-home-intro-lead">{dashboardIntroLead}</p>
      <section className="hero-composite hero-composite--media-only">
        <div className="hero-media">
          <figure className={`hero-photo-tile${landingPatientHeroImage === null ? " hero-photo-tile--loading" : ""}`}>
            {landingPatientHeroImage === null ? (
              <span className="hero-photo-tile-skeleton" aria-hidden="true" />
            ) : (
              <img
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
      </section>
      {hasAssignedProfessional && defaultPackagePlan ? (
        <div className="dashboard-hero-purchase-row">
          <button
            className="sessions-hero-buy-button dashboard-hero-buy-button"
            type="button"
            onClick={() => setAcquireSessionsModalOpen(true)}
          >
            {t(props.language, { es: "Adquirir nuevas sesiones", en: "Get new sessions", pt: "Adquirir novas sessoes" })}
          </button>
        </div>
      ) : null}

      <section className="content-card trial-priority-banner trial-priority-inline">
        <h2>
          <span className="trial-inline-icon" aria-hidden="true" />
          {trialStatus === "pending"
            ? t(props.language, { es: "Sesión de prueba pendiente", en: "Pending trial session", pt: "Sessao de teste pendente" })
            : trialStatus === "reserved"
              ? t(props.language, { es: "Sesión de prueba planificada", en: "Trial session scheduled", pt: "Sessao de teste agendada" })
              : t(props.language, { es: "Sesión de prueba completada", en: "Trial session completed", pt: "Sessao de teste concluida" })}
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
                  es: "Elige un horario para dejar tu primera sesión ya agendada.",
                  en: "Choose a time to leave your first session already scheduled.",
                  pt: "Escolha um horario para deixar sua primeira sessao ja agendada."
                })}
        </p>
        {hasTrialPlanned ? (
          <button className="trial-inline-action" type="button" onClick={openTrialModal}>
            {t(props.language, { es: "Modificar", en: "Modify", pt: "Modificar" })}
          </button>
        ) : trialStatus === "pending" ? (
          <button className="trial-inline-action" type="button" onClick={() => props.onNavigateToBookTrial()}>
            {t(props.language, {
              es: "Reservar sesión de prueba",
              en: "Book trial session",
              pt: "Reservar sessao de teste"
            })}
          </button>
        ) : null}
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
                : t(props.language, { es: "Sin sesiones confirmadas", en: "No confirmed sessions", pt: "Sem sessoes confirmadas" })}
            </span>
          </button>

          <button
            className="sessions-combined-section sessions-combined-action"
            type="button"
            onClick={() => {
              const resolvedId = props.state.assignedProfessionalId ?? props.state.selectedProfessionalId;
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
              onClick={() => props.onGoToProfessional(activeProfessional.id)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }
                event.preventDefault();
                props.onGoToProfessional(activeProfessional.id);
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
            <button
              className="chat-gradient-button"
              type="button"
              onClick={() => props.onGoToChat(activeProfessional.id)}
            >
              {t(props.language, { es: "Abrir chat con profesional", en: "Open chat with professional", pt: "Abrir chat com profissional" })}
            </button>
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
                es: "Todavía no tienes sesiones confirmadas",
                en: "You have no confirmed sessions yet",
                pt: "Voce ainda nao tem sessoes confirmadas"
              })}
            </strong>
          </div>
        ) : (
          <div className="dashboard-upcoming-lists-root">
            <div className="dashboard-upcoming-desktop-only">
              <div className="sessions-confirmed-list sessions-confirmed-list--dashboard-desktop">
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
                      key={`dash-d-${booking.id}`}
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
                          <strong>
                            <ProfessionalNameStack professional={bookingProfessional} as="span" />
                          </strong>
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
            </div>

            <div className="dashboard-upcoming-mobile-only">
              <div className="sessions-confirmed-list sessions-confirmed-list--dashboard-mobile">
                {upcomingConfirmedBookings.slice(0, 3).map((booking) => {
                  const bookingProfessional = findProfessionalById(booking.professionalId, props.professionals);
                  const isTrialBooking = booking.bookingMode === "trial";
                  const canReschedule = canPatientRescheduleBooking(booking.startsAt);
                  const joinUrl = typeof booking.joinUrl === "string" ? booking.joinUrl.trim() : "";
                  const statusConfirmed = t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" });
                  const statusLine = isTrialBooking
                    ? `${statusConfirmed} · ${t(props.language, { es: "Sesión de prueba", en: "Trial session", pt: "Sessao de teste" })}`
                    : statusConfirmed;
                  const proPhoto = professionalPhotoSrc(props.professionalPhotoMap[booking.professionalId]);

                  return (
                    <article
                      className={`session-management-card session-rn-card session-management-card-clickable ${isTrialBooking ? "session-rn-card--trial" : ""}`}
                      key={`dash-m-${booking.id}`}
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
                      <div className="session-rn-top">
                        <span className="session-rn-time" aria-hidden="true">
                          {formatTimeOnly({ isoDate: booking.startsAt, timezone: props.state.profile.timezone, language: props.language })}
                        </span>
                        <img
                          className="session-rn-avatar"
                          src={proPhoto}
                          alt=""
                          onError={props.onImageFallback}
                        />
                        <div className="session-rn-body">
                          <div className="session-rn-body-header">
                            <div className="session-rn-body-main">
                              <span className="session-rn-date-line">
                                {formatSessionCardDateLine({
                                  isoDate: booking.startsAt,
                                  timezone: props.state.profile.timezone,
                                  language: props.language
                                })}
                              </span>
                              <strong className="session-rn-name">
                <ProfessionalNameStack professional={bookingProfessional} as="span" />
              </strong>
                              <span className="session-rn-status">{statusLine}</span>
                            </div>
                            {!isTrialBooking ? (
                              <button
                                type="button"
                                className="session-rn-reschedule"
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
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="session-rn-footer">
                        {joinUrl ? (
                          <a
                            className="session-rn-join-btn"
                            href={joinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <svg className="session-rn-join-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                fill="currentColor"
                                d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 2.5v-9l-4 2.5z"
                              />
                            </svg>
                            {t(props.language, {
                              es: "Entrar a la sesión",
                              en: "Join session",
                              pt: "Entrar na sessao"
                            })}
                          </a>
                        ) : (
                          <p className="session-rn-join-pending">
                            {t(props.language, {
                              es: "El enlace se generará al confirmar la sesión.",
                              en: "The link will be available once the session is confirmed.",
                              pt: "O link ficara disponivel quando a sessao for confirmada."
                            })}
                          </p>
                        )}
                        {isTrialBooking ? (
                          <button
                            type="button"
                            className="session-rn-detail-ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              props.onOpenBookingDetail(booking.id);
                            }}
                          >
                            {t(props.language, { es: "Ver detalle", en: "View detail", pt: "Ver detalhe" })}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
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
          <span className="sessions-secondary-toggle-label">{isPackagesExpanded
            ? t(props.language, { es: "Ocultar", en: "Hide", pt: "Ocultar" })
            : t(props.language, { es: "Expandir", en: "Expand", pt: "Expandir" })}
          </span>
        </button>
        {isPackagesExpanded ? (
          props.state.subscription.purchaseHistory.length === 0 ? (
            <p>{t(props.language, { es: "Todavía no tienes paquetes comprados.", en: "You do not have purchased packages yet.", pt: "Voce ainda nao tem pacotes comprados." })}</p>
          ) : (
            <ul className="simple-list session-history-list">
              {props.state.subscription.purchaseHistory.slice(0, 20).map((item) => {
                const amountLabel = formatSubscriptionPurchasePrice({
                  priceCents: item.priceCents,
                  language: props.language,
                  displayCurrency: props.currency,
                  purchaseCurrency: item.currency ?? null
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
          )
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

      {hasAssignedProfessional && packagePlans.length > 0 ? (
        <section ref={packageSectionRef} className="content-card sessions-package-options-panel dashboard-package-options-panel">
          <div className="session-booking-panel-head">
            <div>
              <h3>{t(props.language, { es: "Adquirir nuevas sesiones", en: "Get new sessions", pt: "Adquirir novas sessoes" })}</h3>
              <p>
                {t(props.language, {
                  es: "Elegí un paquete o comprá sesiones sueltas con el enlace debajo de cada plan.",
                  en: "Choose a package or buy individual sessions with the link under each plan.",
                  pt: "Escolha um pacote ou compre sessoes avulsas no link abaixo de cada plano."
                })}
              </p>
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
                      <span className="deal-card-featured-kicker">{t(props.language, { es: "Más elegido", en: "Best seller", pt: "Mais escolhido" })}</span>
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
                          { amount: formatMoney(savingAmount, props.language, plan.currency, props.currency) }
                        )}
                      </span>
                    </div>
                    <h3>{localizedPackageName(plan.id, plan.name, props.language)}</h3>
                    <p className="sessions-package-card-description">{localizedPackageDescription(plan.id, plan.description)}</p>
                    <div className="deal-pricing-top">
                      <span className="deal-list-price">{formatMoney(listPriceAmount, props.language, plan.currency, props.currency)}</span>
                      <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
                    </div>
                    <p className="deal-main-price">{formatMoney(finalPriceAmount, props.language, plan.currency, props.currency)}</p>
                    <p className="sessions-package-card-unit">
                      {replaceTemplate(
                        t(props.language, {
                          es: "Equivale a {amount} por sesión",
                          en: "Equivalent to {amount} per session",
                          pt: "Equivale a {amount} por sessao"
                        }),
                        { amount: formatMoney(pricePerSession, props.language, plan.currency, props.currency) }
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
                      {t(props.language, { es: "Adquirir este paquete", en: "Get this package", pt: "Adquirir este pacote" })}
                    </button>
                    <button
                      type="button"
                      className="sessions-package-individual-link"
                      disabled={!canIndividualCtaHome}
                      onClick={props.onNavigateToIndividualSessions}
                    >
                      {t(props.language, {
                        es: "Comprar sesiones individuales",
                        en: "Buy individual sessions",
                        pt: "Comprar sessoes individuais"
                      })}
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
              <h2>{t(props.language, { es: "Modificar sesión de prueba", en: "Edit trial session", pt: "Editar sessao de teste" })}</h2>
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
                      {professionalAccessibleName(item)} - {item.compatibility}%
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
                  es: "Actualizarás la sesión de prueba ya reservada y mantendras el seguimiento en tu agenda.",
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

      <div className="dashboard-rn-home" aria-label={t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}>
        <div className={`dashboard-rn-scroll${rnSelectedPlan ? " dashboard-rn-scroll--cta" : ""}`}>
          <p className="dashboard-home-intro-lead">{dashboardIntroLead}</p>
          <div className="dashboard-rn-toolbar" aria-label={t(props.language, { es: "Saldo y agendar", en: "Balance and book", pt: "Saldo e agendar" })}>
            <div className="dashboard-rn-toolbar-inner">
              <div className="dashboard-rn-pill-block" aria-live="polite">
                <div
                  className={`dashboard-rn-sessions-pill${availableSessions < 1 ? " dashboard-rn-sessions-pill--muted" : ""}`}
                >
                  {availableSessions > 0 ? (
                    <span className="dashboard-rn-sessions-pill-inner">
                      <span className="dashboard-rn-sessions-num">{availableSessions}</span>
                      <span className="dashboard-rn-sessions-suffix">
                        {availableSessions === 1
                          ? t(props.language, {
                              es: "Sesión disponible",
                              en: "Session available",
                              pt: "Sessao disponivel"
                            })
                          : t(props.language, {
                              es: "Sesiones disponibles",
                              en: "Sessions available",
                              pt: "Sessoes disponiveis"
                            })}
                      </span>
                    </span>
                  ) : (
                    <span className="dashboard-rn-sessions-empty">
                      {t(props.language, {
                        es: "Sin sesiones disponibles",
                        en: "No sessions available",
                        pt: "Sem sessoes disponiveis"
                      })}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="dashboard-rn-fab"
                onClick={() => {
                  if (!hasAssignedProfessional) {
                    props.onNavigateToAssignProfessional();
                    return;
                  }
                  if (pricingProfessionalId) {
                    props.onGoToBooking(pricingProfessionalId);
                    return;
                  }
                  if (trialStatus === "pending") {
                    props.onNavigateToBookTrial();
                  }
                }}
                disabled={hasAssignedProfessional ? !pricingProfessionalId && trialStatus !== "pending" : false}
                aria-label={t(props.language, {
                  es: hasAssignedProfessional ? "Agendar una sesión" : "Elegir profesional",
                  en: hasAssignedProfessional ? "Book a session" : "Choose a professional",
                  pt: hasAssignedProfessional ? "Agendar uma sessao" : "Escolher profissional"
                })}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <section className="dashboard-rn-section">
            <div className="dashboard-rn-section-head">
              <h2 className="dashboard-rn-section-title">
                {t(props.language, { es: "Próximas sesiones", en: "Upcoming sessions", pt: "Proximas sessoes" })}
              </h2>
              <div className="dashboard-rn-section-actions">
                {rnUpcomingSlice.length > 0 ? (
                  <button type="button" className="dashboard-rn-link-all" onClick={props.onGoToReservations}>
                    {t(props.language, { es: "Todas", en: "All", pt: "Todas" })}
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="dashboard-rn-chevron">
                      <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>

            {rnUpcomingSlice.length === 0 ? (
              <div className="dashboard-rn-empty-card">
                <p className="dashboard-rn-empty-title">
                  {t(props.language, { es: "Sin turnos agendados", en: "No appointments scheduled", pt: "Sem horarios agendados" })}
                </p>
                <p className="dashboard-rn-empty-meta">
                  {hasAssignedProfessional
                    ? t(props.language, {
                        es: "Tocá el + al lado de tu saldo para elegir fecha y horario. Si no tenés créditos, comprá un paquete en MCare Plus más abajo.",
                        en: "Tap + next to your balance to pick a date and time. If you are out of credits, buy a package in MCare Plus below.",
                        pt: "Toque no + ao lado do saldo para escolher data e horario. Se nao tiver creditos, compre um pacote no MCare Plus abaixo."
                      })
                    : t(props.language, {
                        es: "Primero elegí un profesional con el botón + (o desde el aviso que apareció al entrar). Después vas a poder agendar y ver opciones de compra.",
                        en: "First pick a professional using the + button (or the notice when you arrived). Then you can book and see purchase options.",
                        pt: "Primeiro escolha um profissional com o botao + (ou pelo aviso ao entrar). Depois voce podera agendar e ver opcoes de compra."
                      })}
                </p>
              </div>
            ) : (
              <div className="dashboard-rn-session-list">
                {rnUpcomingSlice.map((booking) => (
                  <DashboardRnUpcomingCard
                    key={`rn-${booking.id}`}
                    booking={booking}
                    professionals={props.professionals}
                    professionalPhotoMap={props.professionalPhotoMap}
                    timezone={props.state.profile.timezone}
                    language={props.language}
                    onImageFallback={props.onImageFallback}
                    onOpenBookingDetail={props.onOpenBookingDetail}
                  />
                ))}
              </div>
            )}
          </section>

          {hasAssignedProfessional ? (
          <section className="dashboard-rn-mcare-outer">
            <div className="dashboard-rn-mcare-gradient" aria-hidden="true" />
            <div className="dashboard-rn-mcare-inner">
              <div className="dashboard-rn-mcare-head">
                <span className="dashboard-rn-mcare-title">
                  {t(props.language, { es: "Sumá sesiones", en: "Add sessions", pt: "Adicione sessoes" })}
                </span>
              </div>
              <div className="dashboard-rn-mcare-stack">
                {rnPackagePlansSorted.map((plan) => {
                  const selected = rnMcarePlanId === plan.id;
                  const unitLabel = formatMoney(packageUnitPriceMajor(plan), props.language, plan.currency, props.currency);
                  const marketingLabel = packageRhythmLabel(plan.credits, (values) => t(props.language, values));
                  return (
                    <button
                      type="button"
                      key={plan.id}
                      className={`dashboard-rn-mcare-card${selected ? " dashboard-rn-mcare-card--selected" : ""}`}
                      onClick={() => setRnMcarePlanId((current) => (current === plan.id ? null : plan.id))}
                      aria-pressed={selected}
                    >
                      <div className="dashboard-rn-mcare-card-top">
                        <span className="dashboard-rn-mcare-marketing">{marketingLabel}</span>
                        {plan.discountPercent > 0 ? (
                          <span className="dashboard-rn-mcare-save">
                            {replaceTemplate(
                              t(props.language, { es: "Ahorrá {n}%", en: "Save {n}%", pt: "Economize {n}%" }),
                              { n: String(plan.discountPercent) }
                            )}
                          </span>
                        ) : (
                          <span className="dashboard-rn-mcare-marketing-spacer" aria-hidden="true" />
                        )}
                      </div>
                      <div className="dashboard-rn-mcare-divider" />
                      <div className="dashboard-rn-mcare-price-row">
                        <span className="dashboard-rn-mcare-credits-title">
                          {replaceTemplate(t(props.language, { es: "{n} sesiones", en: "{n} sessions", pt: "{n} sessoes" }), {
                            n: String(plan.credits)
                          })}
                        </span>
                        <span className="dashboard-rn-mcare-unit">
                          {replaceTemplate(
                            t(props.language, { es: "{amount} c/u", en: "{amount} each", pt: "{amount} c/u" }),
                            { amount: unitLabel }
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {rnPackagePlansSorted.length === 0 ? (
                  <div className="dashboard-rn-empty-card dashboard-rn-empty-card--plain">
                    <p className="dashboard-rn-empty-meta">
                      {t(props.language, {
                        es: "Todavía no hay paquetes disponibles para compra.",
                        en: "No packages are available for purchase yet.",
                        pt: "Ainda nao ha pacotes disponiveis para compra."
                      })}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
          ) : null}
        </div>

        {hasAssignedProfessional && rnSelectedPlan ? (
          <div className="dashboard-rn-mcare-sticky">
            <button
              type="button"
              className="dashboard-rn-mcare-cta"
              onClick={() => props.onStartPackagePurchase(rnSelectedPlan)}
            >
              {replaceTemplate(
                t(props.language, {
                  es: "Continuar — {total} total",
                  en: "Continue — {total} total",
                  pt: "Continuar — {total} total"
                }),
                {
                  total: formatMoney(rnSelectedPlan.priceCents / 100, props.language, rnSelectedPlan.currency, props.currency)
                }
              )}
            </button>
          </div>
        ) : null}
      </div>

      {assignProModalOpen ? (
        <div
          className="session-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-pro-modal-title"
        >
          <div className="session-modal intake-safety-frequent-modal" onClick={(event) => event.stopPropagation()}>
            <h2 id="assign-pro-modal-title" className="intake-question-title">
              {t(props.language, {
                es: "Elegí un profesional",
                en: "Choose a professional",
                pt: "Escolha um profissional"
              })}
            </h2>
            <p className="intake-question-help">
              {t(props.language, {
                es: "Para ver precios de paquetes y comprar sesiones necesitás tener un profesional asignado. Te llevamos a la selección del onboarding.",
                en: "To see package prices and buy sessions you need an assigned professional. We will take you to the onboarding selection.",
                pt: "Para ver precos de pacotes e comprar sessoes voce precisa de um profissional atribuido. Vamos para a selecao do onboarding."
              })}
            </p>
            <div className="intake-wizard-actions">
              <button
                type="button"
                className="primary intake-wizard-primary"
                onClick={() => {
                  setAssignProModalOpen(false);
                  props.onNavigateToAssignProfessional();
                }}
              >
                {t(props.language, {
                  es: "Ir a elegir profesional",
                  en: "Go to professional selection",
                  pt: "Ir para escolher profissional"
                })}
              </button>
              <button
                type="button"
                className="ghost intake-wizard-secondary"
                onClick={() => {
                  try {
                    window.sessionStorage.setItem(ASSIGN_PRO_MODAL_DISMISS_KEY, "1");
                  } catch {
                    // ignore
                  }
                  setAssignProModalOpen(false);
                }}
              >
                {t(props.language, {
                  es: "Más tarde",
                  en: "Later",
                  pt: "Depois"
                })}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {acquireSessionsModalOpen ? (
        <AcquireSessionsChoiceModal
          language={props.language}
          onClose={() => setAcquireSessionsModalOpen(false)}
          onChoosePackages={() => {
            window.requestAnimationFrame(() => {
              packageSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
          onChooseIndividual={props.onNavigateToIndividualSessions}
        />
      ) : null}
    </div>
  );
}
