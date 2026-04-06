import { type SyntheticEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { defaultPackagePlans } from "../constants";
import { apiRequest, professionalPhotoSrc } from "../services/api";
import { loadPublicPackagePlans } from "../lib/packageCatalog";
import { findProfessionalById, findSlotIdForBooking } from "../lib/professionals";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import { PaymentMethodModal } from "../../matching/components/PaymentMethodModal";
import { BookingActionModal } from "../components/booking/BookingActionModal";
import { CheckoutPackagesPanel } from "../components/booking/CheckoutPackagesPanel";
import type {
  AvailabilitySlotsApiResponse,
  Booking,
  PackagePlan,
  PatientAppState,
  Professional,
  TimeSlot
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const PATIENT_RESCHEDULE_NOTICE_HOURS = 24;

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(endA).getTime() > new Date(startB).getTime();
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

function canPatientRescheduleBooking(startsAt: string): boolean {
  const minimumStartMs = Date.now() + PATIENT_RESCHEDULE_NOTICE_HOURS * 60 * 60 * 1000;
  return new Date(startsAt).getTime() >= minimumStartMs;
}

export function BookingPage(props: {
  state: PatientAppState;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  sessionTimezone: string;
  language: AppLanguage;
  currency: SupportedCurrency;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onSelectProfessional: (professionalId: string) => void;
  onConfirmBooking: (
    professionalId: string,
    slot: TimeSlot,
    useTrialSession: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  onRescheduleBooking: (bookingId: string, professionalId: string, slot: TimeSlot) => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onPurchasePackage: (plan: PackagePlan) => Promise<boolean>;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [panelMode, setPanelMode] = useState<"new" | "reschedule" | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isPackagesExpanded, setIsPackagesExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [remoteSlots, setRemoteSlots] = useState<TimeSlot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [packagePlans, setPackagePlans] = useState<PackagePlan[]>([]);
  const [featuredPackageId, setFeaturedPackageId] = useState<string | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [checkoutPaymentPlanId, setCheckoutPaymentPlanId] = useState<string | null>(null);
  const [checkoutPaymentLoading, setCheckoutPaymentLoading] = useState(false);
  const [checkoutPaymentError, setCheckoutPaymentError] = useState("");
  const [bookingActionError, setBookingActionError] = useState("");
  const [showNoCreditsAlert, setShowNoCreditsAlert] = useState(false);
  const reservationsFocusRef = useRef<HTMLDivElement | null>(null);
  const checkoutSectionRef = useRef<HTMLElement | null>(null);
  const isCheckoutFlow = searchParams.get("flow") === "checkout";
  const selectedCheckoutPlanId = searchParams.get("plan");
  const checkoutSource = searchParams.get("source");

  const assignedProfessionalId = props.state.assignedProfessionalId;
  const canChangeProfessionalForNewPackage = !assignedProfessionalId || props.state.subscription.creditsRemaining <= 0;
  const effectiveProfessionalId = canChangeProfessionalForNewPackage
    ? props.state.selectedProfessionalId
    : assignedProfessionalId ?? props.state.selectedProfessionalId;
  const professional = findProfessionalById(effectiveProfessionalId, props.professionals);
  const now = Date.now();

  const upcomingConfirmedBookings = props.state.bookings
    .filter(
      (booking) =>
        booking.status === "confirmed" &&
        new Date(booking.startsAt).getTime() > now
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const upcomingRegularBookings = props.state.bookings
    .filter(
      (booking) =>
        booking.status === "confirmed" &&
        booking.bookingMode !== "trial" &&
        new Date(booking.startsAt).getTime() > now
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const historyRegularBookings = props.state.bookings
    .filter(
      (booking) =>
        booking.bookingMode !== "trial" &&
        (booking.status !== "confirmed" || new Date(booking.startsAt).getTime() <= now)
    )
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const editingBooking = editingBookingId
    ? upcomingRegularBookings.find((booking) => booking.id === editingBookingId) ?? null
    : null;
  const editableProfessional = editingBooking ? findProfessionalById(editingBooking.professionalId, props.professionals) : professional;
  const modalProfessional = panelMode === "reschedule" && editingBooking
    ? findProfessionalById(editingBooking.professionalId, props.professionals)
    : props.state.assignedProfessionalId
      ? findProfessionalById(props.state.assignedProfessionalId, props.professionals)
      : editableProfessional;
  const modalProfessionalPhoto = professionalPhotoSrc(props.professionalPhotoMap[modalProfessional.id]);
  const editingSlotId = editingBooking
    ? findSlotIdForBooking(editingBooking.professionalId, editingBooking.startsAt, editingBooking.endsAt, props.professionals)
    : null;
  const slotSource = props.state.authToken ? (remoteSlots ?? []) : editableProfessional.slots;
  const availableSlots = slotSource.filter((slot) => {
    // El API ya devuelve solo slots con startsAt >= ahora + aviso mínimo (24h+); esto evita horarios pasados
    // si el listado viene del catálogo demo sin token o por desfase de reloj.
    if (new Date(slot.startsAt).getTime() <= now) {
      return false;
    }
    const localSlotIsFree = !props.state.bookedSlotIds.includes(slot.id) || slot.id === editingSlotId;
    const overlapsAnotherBooking = upcomingConfirmedBookings.some((booking) => {
      if (editingBooking && booking.id === editingBooking.id) {
        return false;
      }
      return rangesOverlap(slot.startsAt, slot.endsAt, booking.startsAt, booking.endsAt);
    });
    return localSlotIsFree && !overlapsAnotherBooking;
  });
  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId) ?? null;
  const pendingSessions = props.state.subscription.creditsRemaining;
  const canConfirmBooking = panelMode === "reschedule"
    ? Boolean(selectedSlot && editingBooking)
    : Boolean(selectedSlot) && pendingSessions > 0;
  const checkoutPaymentPlan = checkoutPaymentPlanId
    ? packagePlans.find((plan) => plan.id === checkoutPaymentPlanId) ?? null
    : null;

  const setCheckoutFlow = (active: boolean, nextPlanId?: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (active) {
      nextParams.set("flow", "checkout");
      if (nextPlanId) {
        nextParams.set("plan", nextPlanId);
      } else {
        nextParams.delete("plan");
      }
    } else {
      nextParams.delete("flow");
      nextParams.delete("plan");
    }
    setSearchParams(nextParams);
  };

  useEffect(() => {
    if (searchParams.get("focus") !== "reservations") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      reservationsFocusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      reservationsFocusRef.current?.focus();
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("focus");
    setSearchParams(nextParams, { replace: true });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!isCheckoutFlow) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      checkoutSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isCheckoutFlow]);

  useEffect(() => {
    if (!isCheckoutFlow || checkoutSource !== "dashboard" || !selectedCheckoutPlanId || checkoutPaymentPlanId) {
      return;
    }
    setCheckoutPaymentPlanId(selectedCheckoutPlanId);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("source");
    setSearchParams(nextParams, { replace: true });
  }, [checkoutPaymentPlanId, checkoutSource, isCheckoutFlow, searchParams, selectedCheckoutPlanId, setSearchParams]);

  useEffect(() => {
    if (panelMode === "new") {
      setPanelMode(null);
      setSelectedSlotId("");
    }
  }, [professional.id]);

  useEffect(() => {
    if (!props.state.authToken) {
      setRemoteSlots(null);
      return;
    }

    const targetProfessionalId = panelMode === "reschedule" && editingBooking
      ? editingBooking.professionalId
      : professional.id;

    let active = true;
    setSlotsLoading(true);

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 45);

    void apiRequest<AvailabilitySlotsApiResponse>(
      `/api/availability/${targetProfessionalId}/slots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      {},
      props.state.authToken
    )
      .then((response) => {
        if (!active) {
          return;
        }
        setRemoteSlots(
          (response.slots ?? []).map((slot) => ({
            id: slot.id,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt
          }))
        );
      })
      .catch(() => {
        if (active) {
          setRemoteSlots([]);
        }
      })
      .finally(() => {
        if (active) {
          setSlotsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [editingBooking, panelMode, professional.id, props.state.authToken]);

  useEffect(() => {
    let active = true;
    setPackagesLoading(true);

    void loadPublicPackagePlans({
      language: props.language,
      professionalId: professional.id,
      t: (values) => t(props.language, values),
      fallbackPlans: defaultPackagePlans
    })
      .then((catalog) => {
        if (!active) {
          return;
        }
        setPackagePlans(catalog.plans);
        setFeaturedPackageId(catalog.featuredPackageId);
      })
      .finally(() => {
        if (active) {
          setPackagesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [professional.id, props.language]);

  useEffect(() => {
    if (!panelMode) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeBookingPanel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [panelMode]);

  const handleBooking = async () => {
    if (!selectedSlot || !canConfirmBooking) {
      return;
    }

    if (panelMode === "reschedule" && editingBooking) {
      if (!canPatientRescheduleBooking(editingBooking.startsAt)) {
        setBookingActionError(
          t(props.language, {
            es: "Solo puedes reprogramar hasta 24 horas antes del inicio de la sesión.",
            en: "You can reschedule only up to 24 hours before the session starts.",
            pt: "Voce pode reagendar somente ate 24 horas antes do inicio da sessao."
          })
        );
        return;
      }
      await props.onRescheduleBooking(editingBooking.id, editingBooking.professionalId, selectedSlot);
      closeBookingPanel();
      return;
    }

    const result = await props.onConfirmBooking(professional.id, selectedSlot, false);
    if (!result.ok) {
      setBookingActionError(
        result.error?.trim()
          ? result.error
          : t(props.language, {
              es: "No se pudo confirmar la reserva. Es posible que el horario ya no este disponible o que no tengas sesiones.",
              en: "Could not confirm the booking. The slot may no longer be available or you may not have available sessions.",
              pt: "Nao foi possivel confirmar a reserva. O horario pode nao estar mais disponivel ou voce pode nao ter sessoes."
            })
      );
      return;
    }

    setBookingActionError("");
    closeBookingPanel();
  };

  const closeBookingPanel = () => {
    setPanelMode(null);
    setEditingBookingId(null);
    setSelectedSlotId("");
    setBookingActionError("");
  };

  const handleOpenPackages = () => {
    setShowNoCreditsAlert(false);
    setPanelMode(null);
    setEditingBookingId(null);
    setSelectedSlotId("");
    setBookingActionError("");
    setCheckoutPaymentLoading(false);
    setCheckoutPaymentPlanId(null);
    setCheckoutPaymentError("");
    setCheckoutFlow(true, selectedCheckoutPlanId ?? featuredPackageId ?? packagePlans[0]?.id ?? null);
  };

  const toggleNewBookingPanel = () => {
    if (isCheckoutFlow) {
      setCheckoutPaymentLoading(false);
      setCheckoutPaymentPlanId(null);
      setCheckoutPaymentError("");
      setCheckoutFlow(false);
    }
    setEditingBookingId(null);
    setSelectedSlotId("");
    setBookingActionError("");
    setPanelMode((current) => {
      if (current === "new") {
        setShowNoCreditsAlert(false);
        return null;
      }
      if (pendingSessions <= 0) {
        setShowNoCreditsAlert(true);
        return null;
      }
      setShowNoCreditsAlert(false);
      return "new";
    });
  };

  useEffect(() => {
    if (pendingSessions > 0 && showNoCreditsAlert) {
      setShowNoCreditsAlert(false);
    }
  }, [pendingSessions, showNoCreditsAlert]);

  const handlePurchasePlan = (plan: PackagePlan) => {
    setCheckoutPaymentError("");
    setCheckoutPaymentPlanId(plan.id);
  };

  const handleConfirmPackagePayment = async () => {
    if (!checkoutPaymentPlan) {
      return;
    }

    setCheckoutPaymentLoading(true);
    setCheckoutPaymentError("");
    try {
      const purchased = await props.onPurchasePackage(checkoutPaymentPlan);
      if (!purchased) {
        setCheckoutPaymentError(
          t(props.language, {
            es: "No se pudo confirmar el pago del paquete. Intenta nuevamente.",
            en: "Could not confirm package payment. Please try again.",
            pt: "Nao foi possivel confirmar o pagamento do pacote. Tente novamente."
          })
        );
        return;
      }
      setCheckoutPaymentPlanId(null);
      setCheckoutPaymentError("");
      setCheckoutFlow(false);
    } catch (error) {
      setCheckoutPaymentError(
        error instanceof Error
          ? error.message
          : t(props.language, {
              es: "No se pudo confirmar el pago del paquete. Intenta nuevamente.",
              en: "Could not confirm package payment. Please try again.",
              pt: "Nao foi possivel confirmar o pagamento do pacote. Tente novamente."
            })
      );
    } finally {
      setCheckoutPaymentLoading(false);
    }
  };

  if (props.state.intake?.riskBlocked) {
    return (
      <section className="content-card danger">
        <h2>
          {t(props.language, {
            es: "Reserva deshabilitada por screening de seguridad",
            en: "Booking disabled by safety screening",
            pt: "Reserva desabilitada por triagem de seguranca"
          })}
        </h2>
        <p>
          {t(props.language, {
            es: "El cuestionario clínico detectó un posible riesgo urgente. Por seguridad, la agenda queda bloqueada hasta triaje manual.",
            en: "The clinical questionnaire detected possible urgent risk. For safety, booking stays blocked until manual triage.",
            pt: "O questionario clínico detectou possivel risco urgente. Por seguranca, a agenda fica bloqueada ate triagem manual."
          })}
        </p>
      </section>
    );
  }

  return (
    <div className="page-stack sessions-booking-page">
      <section className="sessions-page-hero sessions-page-hero-plain">
        <div className="sessions-page-hero-copy sessions-booking-hero-layout">
          <div className="sessions-hero-title-main">
            <span className="sessions-hero-icon" aria-hidden="true">◔</span>
            <h2>{t(props.language, { es: "Gestiona tus Reservas", en: "Manage your bookings", pt: "Gerencie suas reservas" })}</h2>
          </div>
          <div className="sessions-hero-actions sessions-booking-hero-actions">
            <button
              className="sessions-hero-buy-button"
              type="button"
              onClick={handleOpenPackages}
            >
              {t(props.language, { es: "Comprar paquete", en: "Buy package", pt: "Comprar pacote" })}
            </button>
          </div>
          <button
            type="button"
            className={`sessions-balance sessions-balance--interactive sessions-booking-hero-balance ${pendingSessions <= 0 ? "sessions-balance--zero" : ""}`}
            onClick={toggleNewBookingPanel}
            aria-label={
              pendingSessions > 0
                ? replaceTemplate(
                    t(props.language, {
                      es: "Reservar sesion. Te quedan {count} en tu paquete.",
                      en: "Book a session. You have {count} left in your package.",
                      pt: "Reservar sessao. Restam {count} no seu pacote."
                    }),
                    { count: String(pendingSessions) }
                  )
                : t(props.language, {
                    es: "Sin sesiones en el paquete. Ver opciones para comprar.",
                    en: "No sessions left in your package. View purchase options.",
                    pt: "Sem sessoes no pacote. Ver opcoes de compra."
                  })
            }
          >
            <div className="sessions-balance-figure" aria-hidden="true">
              {pendingSessions}
            </div>
            <div className="sessions-balance-copy">
              <span className="sessions-balance-title">
                {pendingSessions > 0
                  ? t(props.language, {
                      es: "Sesiones listas para agendar",
                      en: "Sessions ready to book",
                      pt: "Sessoes prontas para agendar"
                    })
                  : t(props.language, {
                      es: "Sin creditos de sesion",
                      en: "No session credits left",
                      pt: "Sem creditos de sessao"
                    })}
              </span>
              <span className="sessions-balance-sub">
                {pendingSessions > 0
                  ? replaceTemplate(
                      t(props.language, {
                        es: "Te quedan {count} en tu paquete actual.",
                        en: "You have {count} left in your current package.",
                        pt: "Restam {count} no seu pacote atual."
                      }),
                      { count: String(pendingSessions) }
                    )
                  : t(props.language, {
                      es: "Compra un paquete para volver a reservar con tu profesional.",
                      en: "Buy a package to book again with your professional.",
                      pt: "Compre um pacote para reservar novamente com seu profissional."
                    })}
              </span>
              {pendingSessions > 0 ? (
                <span className="sessions-balance-cta-hint">
                  {t(props.language, {
                    es: "Pulsa para elegir horario",
                    en: "Tap to pick a time",
                    pt: "Toque para escolher horario"
                  })}
                </span>
              ) : null}
            </div>
          </button>
        </div>
      </section>

      <section className="content-card booking-session-card booking-card-minimal sessions-confirmed-panel">
        <div className="sessions-panel-head">
          <div>
            <h2>{t(props.language, { es: "Próximas Reservas", en: "Upcoming bookings", pt: "Próximas reservas" })}</h2>
          </div>
          <div className="sessions-panel-actions">
            <button className="sessions-reserve-button" type="button" onClick={toggleNewBookingPanel}>
              {panelMode === "new"
                ? t(props.language, { es: "Cerrar panel", en: "Close panel", pt: "Fechar painel" })
                : t(props.language, { es: "Reservar nueva sesion", en: "Reserve new session", pt: "Reservar nova sessao" })}
            </button>
          </div>
        </div>

        {showNoCreditsAlert ? (
          <div className="sessions-credit-alert" role="alert">
            <div className="sessions-credit-alert-main">
              <span className="sessions-credit-alert-icon" aria-hidden="true">!</span>
              <div>
                <strong>{t(props.language, { es: "No tienes sesiones disponibles", en: "You have no available sessions", pt: "Voce nao tem sessoes disponiveis" })}</strong>
                <p>{t(props.language, { es: "Compra un paquete para reservar una nueva sesion.", en: "Buy a package to reserve a new session.", pt: "Compre um pacote para reservar uma nova sessao." })}</p>
              </div>
            </div>
            <button type="button" className="sessions-credit-alert-action" onClick={handleOpenPackages}>
              {t(props.language, { es: "Ir a comprar", en: "Go to buy", pt: "Ir para compra" })}
            </button>
          </div>
        ) : null}

        {upcomingConfirmedBookings.length === 0 ? (
          <div className="sessions-empty-state">
            <strong>{t(props.language, { es: "Todavia no tienes sesiones confirmadas", en: "You have no confirmed sessions yet", pt: "Voce ainda nao tem sessoes confirmadas" })}</strong>
          </div>
        ) : (
          <div
            className="sessions-confirmed-list"
            ref={reservationsFocusRef}
            tabIndex={-1}
          >
            <div className="sessions-reservations-table-head" aria-hidden="true">
              <span>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
              <span>{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
              <span>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
              <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
              <span>{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
            </div>
            {upcomingConfirmedBookings.map((booking) => {
              const bookingProfessional = findProfessionalById(booking.professionalId, props.professionals);
              const isEditing = editingBookingId === booking.id && panelMode === "reschedule";
              const isTrialBooking = booking.bookingMode === "trial";
              const canReschedule = canPatientRescheduleBooking(booking.startsAt);
              const openBookingDetail = () => props.onOpenBookingDetail(booking.id);

              return (
                <article
                  className={`session-management-card session-management-card-clickable ${isEditing ? "editing" : ""}`}
                  key={booking.id}
                  role="button"
                  tabIndex={0}
                  onClick={openBookingDetail}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openBookingDetail();
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
                        {isTrialBooking
                          ? t(props.language, { es: "Prueba confirmada", en: "Trial confirmed", pt: "Teste confirmado" })
                          : t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" })}
                      </span>
                    </div>
                  </div>
                  <div className="session-management-actions-wrap">
                    <span className="session-management-cell-label">{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
                    {isTrialBooking ? (
                      <div className="session-management-actions">
                        <button
                          type="button"
                          className="session-detail-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openBookingDetail();
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
                            setEditingBookingId(booking.id);
                            setSelectedSlotId(findSlotIdForBooking(
                              booking.professionalId,
                              booking.startsAt,
                              booking.endsAt,
                              props.professionals
                            ) ?? "");
                            setPanelMode("reschedule");
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

      {isCheckoutFlow ? (
        <section ref={checkoutSectionRef} className="content-card booking-session-card booking-card-minimal sessions-package-options-panel">
          <CheckoutPackagesPanel
            language={props.language}
            currency={props.currency}
            packagesLoading={packagesLoading}
            packagePlans={packagePlans}
            featuredPackageId={featuredPackageId}
            selectedCheckoutPlanId={selectedCheckoutPlanId}
            onClose={() => {
              setCheckoutPaymentLoading(false);
              setCheckoutPaymentPlanId(null);
              setCheckoutPaymentError("");
              setCheckoutFlow(false);
            }}
            onSelectCard={(planId) => setCheckoutFlow(true, planId)}
            onSelectPlan={handlePurchasePlan}
          />
        </section>
      ) : null}

      <section className="sessions-calendar-collapsible sessions-secondary-section">
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
            bookings={upcomingConfirmedBookings}
            timezone={props.state.profile.timezone}
            language={props.language}
            onOpenBookingDetail={props.onOpenBookingDetail}
            hideTitle
          />
        ) : null}
      </section>

      <section className="sessions-secondary-section sessions-purchased-history">
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

      <BookingActionModal
        panelMode={panelMode}
        modalProfessional={modalProfessional}
        modalProfessionalPhoto={modalProfessionalPhoto}
        onImageFallback={props.onImageFallback}
        selectedSlotId={selectedSlotId}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading}
        pendingSessions={pendingSessions}
        bookingActionError={bookingActionError}
        canConfirmBooking={canConfirmBooking}
        language={props.language}
        sessionTimezone={props.sessionTimezone}
        onSelectSlot={(slotId) => {
          setSelectedSlotId(slotId);
          setBookingActionError("");
        }}
        onClose={closeBookingPanel}
        onConfirm={handleBooking}
        formatDateOnly={formatDateOnly}
        formatDateTime={formatDateTime}
      />

      <section className="sessions-history-section sessions-secondary-section">
        <button
          type="button"
          className="sessions-calendar-toggle"
          aria-expanded={isHistoryExpanded}
          onClick={() => setIsHistoryExpanded((current) => !current)}
        >
          <h2 className="sessions-secondary-title">{t(props.language, { es: "Historial de sesiones", en: "Session history", pt: "Historico de sessoes" })}</h2>
          <span className="sessions-secondary-toggle-label">{isHistoryExpanded
            ? t(props.language, { es: "Ocultar", en: "Hide", pt: "Ocultar" })
            : t(props.language, { es: "Expandir", en: "Expand", pt: "Expandir" })}
          </span>
        </button>
        {isHistoryExpanded ? (
          historyRegularBookings.length === 0 ? (
            <p>
              {t(props.language, {
                es: "Todavia no tienes historial de sesiones.",
                en: "You do not have session history yet.",
                pt: "Voce ainda nao tem historico de sessoes."
              })}
            </p>
          ) : (
            <ul className="simple-list session-history-list">
              {historyRegularBookings.slice(0, 10).map((booking) => {
                const bookingProfessional = findProfessionalById(booking.professionalId, props.professionals);
                const statusLabel =
                  booking.status === "cancelled"
                    ? t(props.language, { es: "Cancelada", en: "Cancelled", pt: "Cancelada" })
                    : t(props.language, { es: "Completada", en: "Completed", pt: "Concluida" });
                return (
                  <li key={booking.id}>
                    <div>
                      <strong>{formatDateTime({ isoDate: booking.startsAt, timezone: props.state.profile.timezone, language: props.language })}</strong>
                      <span>{bookingProfessional.fullName}</span>
                    </div>
                    <span className={`session-status-pill ${booking.status}`}>{statusLabel}</span>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </section>

      {isCheckoutFlow && checkoutPaymentPlan ? (
        <PaymentMethodModal
          language={props.language}
          amountUsd={checkoutPaymentPlan.priceCents / 100}
          loading={checkoutPaymentLoading}
          error={checkoutPaymentError}
          onBack={() => {
            setCheckoutPaymentPlanId(null);
            setCheckoutPaymentError("");
          }}
          onClose={() => {
            setCheckoutPaymentPlanId(null);
            setCheckoutPaymentError("");
            setCheckoutFlow(false);
          }}
          onPay={handleConfirmPackagePayment}
        />
      ) : null}
    </div>
  );
}
