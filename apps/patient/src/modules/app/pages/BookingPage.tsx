import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyAmount,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { defaultPackagePlans } from "../constants";
import { professionalPhotoSrc } from "../services/api";
import { fetchSharedPatientAvailabilitySlots } from "../lib/fetchPatientAvailabilitySlotsShared";
import { loadPublicPackagePlans } from "../lib/packageCatalog";
import { formatSubscriptionPurchasePrice } from "../lib/formatSubscriptionPurchasePrice";
import { findProfessionalById, findSlotIdForBooking, patientHasAssignedProfessional } from "../lib/professionals";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import { PaymentMethodModal } from "../../matching/components/PaymentMethodModal";
import { friendlyCheckoutPackageMessage } from "../lib/friendlyPatientMessages";
import { isSlotStillListedAfterFreshFetch } from "../../matching/services/availability";
import { AcquireSessionsChoiceModal } from "../components/AcquireSessionsChoiceModal";
import { BookingActionModal } from "../components/booking/BookingActionModal";
import { CheckoutPackagesPanel } from "../components/booking/CheckoutPackagesPanel";
import type {
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
/** Evita ráfagas al hidratar (Strict Mode + sync portal): mismo efecto con deps estables en ms. */
const BOOKING_REMOTE_FETCH_DEBOUNCE_MS = 140;

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

/** Misma idea que patient-mobile `UpcomingSessionCard`: día corto + fecha legible. */
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
  onPurchaseIndividualSessions: (sessionCount: number) => Promise<boolean>;
  onNavigateToAssignProfessional: () => void;
}) {
  const hasAssignedProfessional = patientHasAssignedProfessional(props.state.assignedProfessionalId);
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
  const [individualQtyOpen, setIndividualQtyOpen] = useState(false);
  const [individualQtyDraft, setIndividualQtyDraft] = useState("1");
  const [individualPaymentCount, setIndividualPaymentCount] = useState<number | null>(null);
  const [individualPaymentLoading, setIndividualPaymentLoading] = useState(false);
  const [individualPaymentError, setIndividualPaymentError] = useState("");
  const [bookingActionError, setBookingActionError] = useState("");
  const [showNoCreditsAlert, setShowNoCreditsAlert] = useState(false);
  const [acquireSessionsModalOpen, setAcquireSessionsModalOpen] = useState(false);
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

  const slotsRequestDepsRef = useRef({
    editingBookingId: null as string | null,
    panelMode: null as "new" | "reschedule" | null,
    professionalId: "",
    authToken: null as string | null,
    bookings: props.state.bookings
  });
  slotsRequestDepsRef.current = {
    editingBookingId,
    panelMode,
    professionalId: professional.id,
    authToken: props.state.authToken,
    bookings: props.state.bookings
  };

  const packageCatalogDepsRef = useRef({
    hasAssignedProfessional,
    professionalId: professional.id,
    language: props.language,
    patientMarket: props.state.patientMarket
  });
  packageCatalogDepsRef.current = {
    hasAssignedProfessional,
    professionalId: professional.id,
    language: props.language,
    patientMarket: props.state.patientMarket
  };

  const slotsFetchGenerationRef = useRef(0);
  const packagesFetchGenerationRef = useRef(0);

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

  const individualUnitPriceUsd = useMemo(() => {
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

  const resetIndividualPurchaseUi = () => {
    setIndividualQtyOpen(false);
    setIndividualQtyDraft("1");
    setIndividualPaymentCount(null);
    setIndividualPaymentLoading(false);
    setIndividualPaymentError("");
  };

  const openIndividualPurchase = useCallback(() => {
    setCheckoutPaymentError("");
    setCheckoutPaymentPlanId(null);
    setIndividualPaymentError("");
    setIndividualQtyDraft("1");
    setIndividualPaymentCount(null);
    setIndividualQtyOpen(true);
  }, []);

  const setCheckoutFlow = (active: boolean, nextPlanId?: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (active) {
      nextParams.set("flow", "checkout");
      nextParams.delete("purchase");
      if (nextPlanId) {
        nextParams.set("plan", nextPlanId);
      } else {
        nextParams.delete("plan");
      }
    } else {
      nextParams.delete("flow");
      nextParams.delete("plan");
      nextParams.delete("purchase");
      resetIndividualPurchaseUi();
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
    if (searchParams.get("focus") !== "new-booking") {
      return;
    }

    if (isCheckoutFlow) {
      setCheckoutPaymentLoading(false);
      setCheckoutPaymentPlanId(null);
      setCheckoutPaymentError("");
      resetIndividualPurchaseUi();
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("focus");
    nextParams.delete("flow");
    nextParams.delete("plan");
    nextParams.delete("purchase");
    nextParams.delete("source");
    setSearchParams(nextParams, { replace: true });

    setEditingBookingId(null);
    setSelectedSlotId("");
    setBookingActionError("");

    if (pendingSessions <= 0) {
      setShowNoCreditsAlert(true);
      setPanelMode(null);
    } else {
      setShowNoCreditsAlert(false);
      setPanelMode("new");
    }
  }, [isCheckoutFlow, pendingSessions, searchParams, setSearchParams]);

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
    if (
      !isCheckoutFlow
      || checkoutSource !== "dashboard"
      || !selectedCheckoutPlanId
      || checkoutPaymentPlanId
      || searchParams.get("purchase") === "individual"
    ) {
      return;
    }
    setCheckoutPaymentPlanId(selectedCheckoutPlanId);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("source");
    setSearchParams(nextParams, { replace: true });
  }, [checkoutPaymentPlanId, checkoutSource, isCheckoutFlow, searchParams, selectedCheckoutPlanId, setSearchParams]);

  const individualPurchaseDeepLinkConsumed = useRef(false);

  useEffect(() => {
    if (!isCheckoutFlow || searchParams.get("purchase") !== "individual") {
      individualPurchaseDeepLinkConsumed.current = false;
      return;
    }
    if (packagesLoading || individualUnitPriceUsd === null) {
      return;
    }
    if (individualPurchaseDeepLinkConsumed.current) {
      return;
    }
    individualPurchaseDeepLinkConsumed.current = true;
    openIndividualPurchase();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("purchase");
    setSearchParams(nextParams, { replace: true });
  }, [isCheckoutFlow, individualUnitPriceUsd, openIndividualPurchase, packagesLoading, searchParams, setSearchParams]);

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

    const gen = ++slotsFetchGenerationRef.current;
    const timer = window.setTimeout(() => {
      if (gen !== slotsFetchGenerationRef.current) {
        return;
      }

      const snap = slotsRequestDepsRef.current;
      if (!snap.authToken) {
        return;
      }

      /**
       * No depender de `bookings` en el array de deps del efecto: el ref trae la última fila al disparar
       * (reprogramación) sin re-ejecutar en cada sync del portal.
       */
      const rescheduleTarget =
        snap.panelMode === "reschedule" && snap.editingBookingId
          ? snap.bookings.find((b) => b.id === snap.editingBookingId) ?? null
          : null;
      const targetProfessionalId = rescheduleTarget?.professionalId ?? snap.professionalId;

      setSlotsLoading(true);

      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 45);

      void fetchSharedPatientAvailabilitySlots({
        token: snap.authToken,
        professionalId: targetProfessionalId,
        from,
        to
      })
        .then((response) => {
          if (gen !== slotsFetchGenerationRef.current) {
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
          if (gen !== slotsFetchGenerationRef.current) {
            return;
          }
          setRemoteSlots([]);
        })
        .finally(() => {
          if (gen !== slotsFetchGenerationRef.current) {
            return;
          }
          setSlotsLoading(false);
        });
    }, BOOKING_REMOTE_FETCH_DEBOUNCE_MS);

    return () => {
      slotsFetchGenerationRef.current += 1;
      window.clearTimeout(timer);
    };
  }, [editingBookingId, panelMode, professional.id, props.state.authToken]);

  useEffect(() => {
    setPackagesLoading(true);

    if (!hasAssignedProfessional) {
      setPackagePlans([]);
      setFeaturedPackageId(null);
      setPackagesLoading(false);
      return;
    }

    const gen = ++packagesFetchGenerationRef.current;
    const timer = window.setTimeout(() => {
      if (gen !== packagesFetchGenerationRef.current) {
        return;
      }
      const snap = packageCatalogDepsRef.current;
      if (!snap.hasAssignedProfessional) {
        setPackagesLoading(false);
        return;
      }

      void loadPublicPackagePlans({
        language: snap.language,
        professionalId: snap.professionalId,
        market: snap.patientMarket,
        t: (values) => t(snap.language, values),
        fallbackPlans: defaultPackagePlans
      })
        .then((catalog) => {
          if (gen !== packagesFetchGenerationRef.current) {
            return;
          }
          setPackagePlans(catalog.plans);
          setFeaturedPackageId(catalog.featuredPackageId);
        })
        .finally(() => {
          if (gen !== packagesFetchGenerationRef.current) {
            return;
          }
          setPackagesLoading(false);
        });
    }, BOOKING_REMOTE_FETCH_DEBOUNCE_MS);

    return () => {
      packagesFetchGenerationRef.current += 1;
      window.clearTimeout(timer);
    };
  }, [hasAssignedProfessional, professional.id, props.language, props.state.patientMarket]);

  useEffect(() => {
    if (hasAssignedProfessional || !isCheckoutFlow) {
      return;
    }
    setCheckoutPaymentLoading(false);
    setCheckoutPaymentPlanId(null);
    setCheckoutPaymentError("");
    resetIndividualPurchaseUi();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("flow");
      next.delete("plan");
      next.delete("purchase");
      next.delete("source");
      return next;
    });
  }, [hasAssignedProfessional, isCheckoutFlow, setSearchParams]);

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

    const stillListed = await isSlotStillListedAfterFreshFetch(professional.id, selectedSlot, props.state.authToken);
    if (!stillListed) {
      setBookingActionError(
        t(props.language, {
          es: "Ese horario se llenó recién. Elegí otro desde el calendario cuando puedas.",
          en: "That time just filled up. Please pick another from the calendar when you’re ready.",
          pt: "Esse horario acabou de ficar cheio. Escolha outro no calendario quando puder."
        })
      );
      return;
    }

    const result = await props.onConfirmBooking(professional.id, selectedSlot, false);
    if (!result.ok) {
      setBookingActionError(
        result.error?.trim()
          ? result.error
          : t(props.language, {
              es: "No pudimos terminar la reserva. Quizá ese horario ya no estaba libre, o no tenías sesiones para usar. Revisá y probá con otro turno.",
              en: "We couldn’t finish the booking. That time may no longer be free, or you may not have sessions left. Check and try another time.",
              pt: "Nao foi possivel concluir a reserva. Esse horario pode nao estar mais livre, ou voce pode nao ter sessoes. Confira e tente outro horario."
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
    resetIndividualPurchaseUi();
    const firstBundle = packagePlans.find((plan) => plan.credits > 1) ?? null;
    setCheckoutFlow(true, selectedCheckoutPlanId ?? featuredPackageId ?? firstBundle?.id ?? null);
  };

  const openIndividualSessionsCheckoutFromModal = () => {
    setShowNoCreditsAlert(false);
    setPanelMode(null);
    setEditingBookingId(null);
    setSelectedSlotId("");
    setBookingActionError("");
    setCheckoutPaymentLoading(false);
    setCheckoutPaymentPlanId(null);
    setCheckoutPaymentError("");
    resetIndividualPurchaseUi();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("flow", "checkout");
      next.delete("plan");
      next.set("purchase", "individual");
      return next;
    });
  };

  const toggleNewBookingPanel = () => {
    if (isCheckoutFlow) {
      setCheckoutPaymentLoading(false);
      setCheckoutPaymentPlanId(null);
      setCheckoutPaymentError("");
      resetIndividualPurchaseUi();
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
    resetIndividualPurchaseUi();
    setCheckoutPaymentPlanId(plan.id);
  };

  const proceedIndividualToPayment = () => {
    const n = Number.parseInt(individualQtyDraft.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 99 || individualUnitPriceUsd === null) {
      return;
    }
    setIndividualQtyOpen(false);
    setIndividualPaymentCount(n);
    setIndividualPaymentError("");
  };

  const handleConfirmIndividualPayment = async () => {
    if (!individualPaymentCount) {
      return;
    }

    setIndividualPaymentLoading(true);
    setIndividualPaymentError("");
    try {
      await props.onPurchaseIndividualSessions(individualPaymentCount);
      resetIndividualPurchaseUi();
      setCheckoutFlow(false);
    } catch (error) {
      setIndividualPaymentError(
        friendlyCheckoutPackageMessage(error instanceof Error ? error.message : "", props.language)
      );
    } finally {
      setIndividualPaymentLoading(false);
    }
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
        setCheckoutPaymentError(friendlyCheckoutPackageMessage("", props.language));
        return;
      }
      setCheckoutPaymentPlanId(null);
      setCheckoutPaymentError("");
      setCheckoutFlow(false);
    } catch (error) {
      setCheckoutPaymentError(
        friendlyCheckoutPackageMessage(error instanceof Error ? error.message : "", props.language)
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
    <div className="page-stack sessions-booking-page session-rn-root">
      <section className="sessions-page-hero sessions-page-hero-plain">
        <div className="sessions-page-hero-copy sessions-booking-hero-layout">
          <div className="sessions-hero-title-main">
            <span className="sessions-hero-icon" aria-hidden="true">◔</span>
            <div className="sessions-hero-title-block">
              <h2>{t(props.language, { es: "Gestiona tus Reservas", en: "Manage your bookings", pt: "Gerencie suas reservas" })}</h2>
              <p className="sessions-booking-hero-sub">
                {t(props.language, {
                  es: "Revisá tus sesiones agendadas y reservá nuevas cuando quieras.",
                  en: "Review your scheduled sessions and book new ones anytime.",
                  pt: "Revise suas sessoes agendadas e reserve novas quando quiser."
                })}
              </p>
            </div>
          </div>
          {hasAssignedProfessional ? (
            <div className="sessions-hero-actions sessions-booking-hero-actions">
              <button
                className="sessions-hero-buy-button"
                type="button"
                onClick={() => setAcquireSessionsModalOpen(true)}
              >
                {t(props.language, { es: "Adquirir nuevas sesiones", en: "Get new sessions", pt: "Adquirir novas sessoes" })}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className={`sessions-balance sessions-balance--interactive sessions-booking-hero-balance sessions-booking-balance-with-fab ${pendingSessions <= 0 ? "sessions-balance--zero" : ""}`}
            onClick={toggleNewBookingPanel}
            aria-label={
              pendingSessions > 0
                ? replaceTemplate(
                    t(props.language, {
                      es: "Reservar sesión. Te quedan {count} en tu paquete.",
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
                      es: "Sin créditos de sesión",
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
            <span className="sessions-booking-fab-in-pill" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </span>
          </button>
        </div>
      </section>

      <section className="content-card booking-session-card booking-card-minimal sessions-confirmed-panel">
        <div className="sessions-panel-head">
          <h2>{t(props.language, { es: "Próximas Reservas", en: "Upcoming bookings", pt: "Próximas reservas" })}</h2>
          <div className="sessions-booking-reserve-panel-desktop">
            <div className="sessions-panel-actions">
              <button className="sessions-reserve-button" type="button" onClick={toggleNewBookingPanel}>
                {panelMode === "new"
                  ? t(props.language, { es: "Cerrar panel", en: "Close panel", pt: "Fechar painel" })
                  : t(props.language, { es: "Reservar nueva sesión", en: "Reserve new session", pt: "Reservar nova sessao" })}
              </button>
            </div>
          </div>
        </div>

        {showNoCreditsAlert ? (
          <div className="sessions-credit-alert" role="alert">
            <div className="sessions-credit-alert-main">
              <span className="sessions-credit-alert-icon" aria-hidden="true">!</span>
              <div>
                <strong>{t(props.language, { es: "No tienes sesiones disponibles", en: "You have no available sessions", pt: "Voce nao tem sessoes disponiveis" })}</strong>
                <p>
                  {hasAssignedProfessional
                    ? t(props.language, {
                        es: "Compra un paquete para reservar una nueva sesión.",
                        en: "Buy a package to reserve a new session.",
                        pt: "Compre um pacote para reservar uma nova sessao."
                      })
                    : t(props.language, {
                        es: "Elegí un profesional asignado para poder comprar paquetes y reservar.",
                        en: "Choose an assigned professional before you can buy packages and book.",
                        pt: "Escolha um profissional atribuido para poder comprar pacotes e reservar."
                      })}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="sessions-credit-alert-action"
              onClick={() => {
                if (!hasAssignedProfessional) {
                  props.onNavigateToAssignProfessional();
                  setShowNoCreditsAlert(false);
                  return;
                }
                setAcquireSessionsModalOpen(true);
              }}
            >
              {hasAssignedProfessional
                ? t(props.language, { es: "Ir a comprar", en: "Go to buy", pt: "Ir para compra" })
                : t(props.language, { es: "Elegir profesional", en: "Choose professional", pt: "Escolher profissional" })}
            </button>
          </div>
        ) : null}

        {upcomingConfirmedBookings.length === 0 ? (
          <div className="sessions-empty-state">
            <strong>{t(props.language, { es: "Todavía no tienes sesiones confirmadas", en: "You have no confirmed sessions yet", pt: "Voce ainda nao tem sessoes confirmadas" })}</strong>
          </div>
        ) : (
          <div className="sessions-confirmed-list-root" ref={reservationsFocusRef} tabIndex={-1}>
            <div className="sessions-booking-desktop-only">
              <div className="sessions-confirmed-list sessions-confirmed-list--desktop">
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
                      key={`desktop-${booking.id}`}
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
            </div>

            <div className="sessions-booking-mobile-only">
              <div className="sessions-confirmed-list sessions-confirmed-list--mobile">
                {upcomingConfirmedBookings.map((booking) => {
                  const bookingProfessional = findProfessionalById(booking.professionalId, props.professionals);
                  const isEditing = editingBookingId === booking.id && panelMode === "reschedule";
                  const isTrialBooking = booking.bookingMode === "trial";
                  const canReschedule = canPatientRescheduleBooking(booking.startsAt);
                  const openBookingDetail = () => props.onOpenBookingDetail(booking.id);
                  const joinUrl = typeof booking.joinUrl === "string" ? booking.joinUrl.trim() : "";
                  const statusConfirmed = t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" });
                  const statusLine = isTrialBooking
                    ? `${statusConfirmed} · ${t(props.language, { es: "Sesión de prueba", en: "Trial session", pt: "Sessao de teste" })}`
                    : statusConfirmed;
                  const proPhoto = professionalPhotoSrc(props.professionalPhotoMap[booking.professionalId]);

                  return (
                    <article
                      className={`session-management-card session-rn-card session-management-card-clickable ${isEditing ? "editing" : ""} ${isTrialBooking ? "session-rn-card--trial" : ""}`}
                      key={`mobile-${booking.id}`}
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
                              <strong className="session-rn-name">{bookingProfessional.fullName}</strong>
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
                              openBookingDetail();
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

      {hasAssignedProfessional && isCheckoutFlow ? (
        <section ref={checkoutSectionRef} className="content-card booking-session-card booking-card-minimal sessions-package-options-panel">
          <CheckoutPackagesPanel
            language={props.language}
            currency={props.currency}
            packagesLoading={packagesLoading}
            packagePlans={packagePlans}
            featuredPackageId={featuredPackageId}
            selectedCheckoutPlanId={selectedCheckoutPlanId}
            unitPriceUsd={individualUnitPriceUsd}
            onClose={() => {
              setCheckoutPaymentLoading(false);
              setCheckoutPaymentPlanId(null);
              setCheckoutPaymentError("");
              resetIndividualPurchaseUi();
              setCheckoutFlow(false);
            }}
            onSelectCard={(planId) => setCheckoutFlow(true, planId)}
            onSelectPlan={handlePurchasePlan}
            onIndividualPurchase={openIndividualPurchase}
          />
        </section>
      ) : null}

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
            <p>{t(props.language, { es: "Todavía no tienes paquetes comprados.", en: "You do not have purchased packages yet.", pt: "Voce ainda nao tem pacotes comprados." })}</p>
          ) : (
            <ul className="simple-list session-history-list">
              {props.state.subscription.purchaseHistory.slice(0, 20).map((item) => {
                const amountLabel = formatSubscriptionPurchasePrice({
                  priceCents: item.priceCents,
                  language: props.language,
                  displayCurrency: props.currency
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

      <section className="sessions-calendar-collapsible sessions-secondary-section sessions-history-section">
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
                es: "Todavía no tienes historial de sesiones.",
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

      <section className="sessions-calendar-collapsible sessions-secondary-section sessions-booking-calendar-tail">
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

      {isCheckoutFlow && individualQtyOpen && individualUnitPriceUsd !== null ? (
        <div
          className="matching-flow-backdrop"
          role="presentation"
          onClick={() => {
            setIndividualQtyOpen(false);
            setIndividualQtyDraft("1");
          }}
        >
          <section
            className="matching-flow-modal checkout-individual-qty-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-individual-qty-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="matching-flow-header payment-modal-head">
              <div className="payment-modal-head-copy">
                <p className="payment-modal-mini-title">
                  {t(props.language, { es: "Compra flexible", en: "Flexible purchase", pt: "Compra flexivel" })}
                </p>
                <h3 id="checkout-individual-qty-title" className="checkout-individual-qty-heading">
                  {t(props.language, {
                    es: "Sesiones fuera de paquete",
                    en: "Sessions outside a bundle",
                    pt: "Sessoes fora do pacote"
                  })}
                </h3>
              </div>
              <button
                type="button"
                className="matching-flow-close payment-modal-close"
                aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
                onClick={() => {
                  setIndividualQtyOpen(false);
                  setIndividualQtyDraft("1");
                }}
              >
                ×
              </button>
            </header>
            <p className="checkout-individual-qty-intro">
              {t(props.language, {
                es: "Elegí cuántas sesiones querés sumar. El precio por sesión es el mismo que para una compra suelta.",
                en: "Choose how many sessions to add. The per-session price matches a single-session purchase.",
                pt: "Escolha quantas sessoes adicionar. O preco por sessao e o de uma compra avulsa."
              })}
            </p>
            <div className="checkout-individual-qty-presets">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`checkout-individual-qty-pill ${individualQtyDraft === String(n) ? "selected" : ""}`}
                  onClick={() => setIndividualQtyDraft(String(n))}
                >
                  {replaceTemplate(t(props.language, { es: "{n} sesiones", en: "{n} sessions", pt: "{n} sessoes" }), {
                    n: String(n)
                  })}
                </button>
              ))}
            </div>
            <label className="checkout-individual-qty-field">
              <span>{t(props.language, { es: "Otra cantidad (1–99)", en: "Other quantity (1–99)", pt: "Outra quantidade (1–99)" })}</span>
              <input
                inputMode="numeric"
                min={1}
                max={99}
                value={individualQtyDraft}
                onChange={(event) => setIndividualQtyDraft(event.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </label>
            {(() => {
              const n = Number.parseInt(individualQtyDraft.trim(), 10);
              const ok = Number.isFinite(n) && n >= 1 && n <= 99;
              const totalUsd = ok ? individualUnitPriceUsd * n : null;
              return (
                <p className="checkout-individual-qty-total">
                  {ok && totalUsd !== null
                    ? replaceTemplate(
                        t(props.language, {
                          es: "Total estimado: {amount}",
                          en: "Estimated total: {amount}",
                          pt: "Total estimado: {amount}"
                        }),
                        {
                          amount: formatCurrencyAmount({
                            amountInUsd: totalUsd,
                            currency: props.currency,
                            language: props.language,
                            maximumFractionDigits: 0
                          })
                        }
                      )
                    : t(props.language, {
                        es: "Ingresá una cantidad válida.",
                        en: "Enter a valid quantity.",
                        pt: "Insira uma quantidade valida."
                      })}
                </p>
              );
            })()}
            <div className="checkout-individual-qty-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setIndividualQtyOpen(false);
                  setIndividualQtyDraft("1");
                }}
              >
                {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => proceedIndividualToPayment()}
                disabled={(() => {
                  const n = Number.parseInt(individualQtyDraft.trim(), 10);
                  return !Number.isFinite(n) || n < 1 || n > 99;
                })()}
              >
                {t(props.language, {
                  es: "Continuar al pago simulado",
                  en: "Continue to simulated payment",
                  pt: "Continuar para pagamento simulado"
                })}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isCheckoutFlow && individualPaymentCount !== null && individualUnitPriceUsd !== null ? (
        <PaymentMethodModal
          language={props.language}
          amountUsd={individualUnitPriceUsd * individualPaymentCount}
          loading={individualPaymentLoading}
          error={individualPaymentError}
          onBack={() => {
            setIndividualPaymentCount(null);
            setIndividualPaymentError("");
            setIndividualQtyOpen(true);
          }}
          onClose={() => {
            resetIndividualPurchaseUi();
            setCheckoutFlow(false);
          }}
          onPay={() => void handleConfirmIndividualPayment()}
        />
      ) : null}

      {acquireSessionsModalOpen ? (
        <AcquireSessionsChoiceModal
          language={props.language}
          onClose={() => setAcquireSessionsModalOpen(false)}
          onChoosePackages={() => {
            handleOpenPackages();
          }}
          onChooseIndividual={openIndividualSessionsCheckoutFromModal}
        />
      ) : null}
    </div>
  );
}
