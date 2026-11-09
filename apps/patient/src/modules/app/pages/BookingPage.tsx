import { type SyntheticEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { professionalPhotoSrc } from "../services/api";
import { fetchSharedPatientAvailabilitySlots } from "../lib/fetchPatientAvailabilitySlotsShared";
import { recordPaymentFailureNotice } from "../notifications/portalNotificationStorage";
import { loadPublicPackagePlans, isClientFallbackPackagePlanId } from "../lib/packageCatalog";
import { apiRequest } from "../services/api";
import { patientUsesDlocalCheckout } from "../lib/patientDlocalCheckout";
import { DLOCAL_CHECKOUT_UNAVAILABLE_ERROR } from "@therapy/types";
import {
  portalHasPricingProfessional,
  resolvePortalPricingProfessionalId
} from "../lib/patientPricingProfessional";
import { SessionsCalmPage } from "../../booking/calm/SessionsCalmPage";
import { scrollPortalToTop } from "../lib/navigateSectionTop";
import { useAcquireSessionsDispatch } from "../../booking/hooks/useAcquireSessionsDispatch";
import {
  isDisplayOnlyBundlePlanId,
  filterUpcomingPatientBookings,
  resolvePackageCatalogView,
  resolveIndividualListUnitUsdFromPackages,
  resolveSessionListUsdMajor
} from "@therapy/patient-core";
import { canPatientRescheduleBooking, resolveFxRatePerUsd } from "@therapy/i18n-config";
import { PaymentSuccessModal, type PaymentSuccessSummary } from "../../matching/components/PaymentSuccessModal";
import { friendlyBookingFailureMessage, friendlyCheckoutPackageMessage } from "../lib/friendlyPatientMessages";
import { usePackageCheckout } from "../hooks/usePackageCheckout";
import { savePendingCheckoutDlocalReturn } from "../lib/checkoutDlocalReturn";
import { acquireBookingSlotHold, releaseBookingSlotHold } from "../../matching/services/slotHold";
import { AcquireSessionsChoiceModal } from "../components/AcquireSessionsChoiceModal";
import { IndividualSessionsQtyModal } from "../components/IndividualSessionsQtyModal";
import { NoSessionsAvailableModal } from "../components/NoSessionsAvailableModal";
import { useMobilePortal } from "../hooks/useMobilePortal";
import type { PortalPurchaseResult } from "../hooks/usePortalActions";
import { BookingActionModal } from "../components/booking/BookingActionModal";
import { CheckoutPackagesPanel } from "../components/booking/CheckoutPackagesPanel";
import { AssignProfessionalPromptModal } from "../components/AssignProfessionalPromptModal";
import { SessionsContextRail } from "../../booking/calm/SessionsContextRail";
import { CalmPortalToolbarRow } from "../components/CalmPortalToolbarRow";
import { ProfessionalReviewsModal } from "../../reviews/components/ProfessionalReviewsModal";
import {
  clearPersistedBookingReturnTo,
  persistBookingReturnTo,
  readPersistedBookingReturnTo,
  safeInternalReturnPath
} from "../lib/bookingReturnTo";
import { findProfessionalById, findSlotIdForBooking } from "../lib/professionals";
import { countAvailablePatientSessions } from "../lib/countAvailablePatientSessions";
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
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  });
}

function formatTimeOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  });
}

export function BookingPage(props: {
  state: PatientAppState;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  sessionTimezone: string;
  language: AppLanguage;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onSelectProfessional: (professionalId: string) => void;
  onConfirmBooking: (
    professionalId: string,
    slot: TimeSlot,
    useTrialSession: boolean,
    holdId?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onRescheduleBooking: (bookingId: string, professionalId: string, slot: TimeSlot) => void;
  onCancelBooking?: (bookingId: string, reason: string) => Promise<{ ok: boolean; error?: string }>;
  onOpenBookingDetail: (bookingId: string) => void;
  onPurchasePackage: (plan: PackagePlan) => Promise<PortalPurchaseResult>;
  onConfirmResidency?: (iso: string) => Promise<{ ok: boolean; error?: string }>;
  onPurchaseIndividualSessions: (sessionCount: number) => Promise<PortalPurchaseResult>;
  onSyncDlocalPayment?: (params: {
    paymentId?: string | null;
    orderId?: string | null;
  }) => Promise<{ ok: boolean; fulfilled?: boolean; error?: string }>;
  onRefreshPortalFromApi?: () => void;
  onNavigateToAssignProfessional: () => void;
}) {
  const isMobilePortal = useMobilePortal();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Título / nav limpio a /sessions → tope. Si hay ?focus=…, los effects de focus manejan el scroll.
  useLayoutEffect(() => {
    if (searchParams.get("focus") || searchParams.get("flow") || searchParams.get("reschedule")) {
      return;
    }
    scrollPortalToTop("auto");
  }, []);

  const bookingReturnToRef = useRef<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [panelMode, setPanelMode] = useState<"new" | "reschedule" | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  /** Abierto desde Dashboard “Elegir nuevo horario” de prueba pagada. */
  const [trialRebookMode, setTrialRebookMode] = useState(false);
  const [isPackagesExpanded, setIsPackagesExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [remoteSlots, setRemoteSlots] = useState<TimeSlot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [packagePlans, setPackagePlans] = useState<PackagePlan[]>([]);
  const [packageCatalogFromApi, setPackageCatalogFromApi] = useState(false);
  const [featuredPackageId, setFeaturedPackageId] = useState<string | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [checkoutPaymentPlanId, setCheckoutPaymentPlanId] = useState<string | null>(null);
  const [checkoutPaymentLoading, setCheckoutPaymentLoading] = useState(false);
  const [checkoutPaymentError, setCheckoutPaymentError] = useState("");
  const [residencySaving, setResidencySaving] = useState(false);
  const [individualQtyOpen, setIndividualQtyOpen] = useState(false);
  const [individualQtyDraft, setIndividualQtyDraft] = useState("1");
  const [individualQuoteLoading, setIndividualQuoteLoading] = useState(false);
  const [individualQuote, setIndividualQuote] = useState<{
    sessionCount: number;
    unitPriceUsdCents: number;
    totalPriceUsdCents: number;
    chargeAmountMajor: number;
    chargeCurrency: string;
  } | null>(null);
  const [individualPaymentLoading, setIndividualPaymentLoading] = useState(false);
  const [individualPaymentError, setIndividualPaymentError] = useState("");
  useEffect(() => {
    const message = checkoutPaymentError.trim();
    if (message) {
      recordPaymentFailureNotice(message);
    }
  }, [checkoutPaymentError]);
  useEffect(() => {
    const message = individualPaymentError.trim();
    if (message) {
      recordPaymentFailureNotice(message);
    }
  }, [individualPaymentError]);
  const [bookingActionError, setBookingActionError] = useState("");
  const [slotHoldId, setSlotHoldId] = useState("");
  const [slotHoldExpiresAt, setSlotHoldExpiresAt] = useState("");
  const [slotHoldLoading, setSlotHoldLoading] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [calendarCancelBookingId, setCalendarCancelBookingId] = useState<string | null>(null);
  const slotHoldIdRef = useRef("");
  const holdAcquireGenerationRef = useRef(0);
  const [noSessionsModalOpen, setNoSessionsModalOpen] = useState(false);
  const [assignProfessionalModalOpen, setAssignProfessionalModalOpen] = useState(false);
  const [reviewsModalProfessionalId, setReviewsModalProfessionalId] = useState<string | null>(null);
  const [packagePaymentSuccess, setPackagePaymentSuccess] = useState<PaymentSuccessSummary | null>(null);
  const [individualPaymentSuccess, setIndividualPaymentSuccess] = useState<PaymentSuccessSummary | null>(null);
  const reservationsFocusRef = useRef<HTMLDivElement | null>(null);
  const packagesSectionRef = useRef<HTMLElement | null>(null);
  const historySectionRef = useRef<HTMLElement | null>(null);
  const checkoutSectionRef = useRef<HTMLElement | null>(null);
  const isCheckoutFlow = searchParams.get("flow") === "checkout";
  const selectedCheckoutPlanId = searchParams.get("plan");
  const checkoutSource = searchParams.get("source");

  const assignedProfessionalId = props.state.assignedProfessionalId?.trim() ?? "";
  const selectedProfessionalId = props.state.selectedProfessionalId?.trim() ?? "";
  const canChangeProfessionalForNewPackage =
    !assignedProfessionalId
    || countAvailablePatientSessions({
      creditsRemaining: props.state.subscription.creditsRemaining,
      trialRebookAvailable: props.state.trialRebookAvailable
    }) <= 0;
  const effectiveProfessionalId = canChangeProfessionalForNewPackage
    ? selectedProfessionalId || assignedProfessionalId
    : assignedProfessionalId || selectedProfessionalId;
  const now = Date.now();

  const upcomingConfirmedBookings = filterUpcomingPatientBookings(props.state.bookings, now);
  const upcomingBookingProfessionalIds = upcomingConfirmedBookings.map((booking) => booking.professionalId);
  const UPCOMING_PAGE_SIZE = 10;
  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingConfirmedBookings.length / UPCOMING_PAGE_SIZE));
  const upcomingPageSafe = Math.min(upcomingPage, upcomingTotalPages - 1);
  const pagedUpcomingBookings = upcomingConfirmedBookings.slice(
    upcomingPageSafe * UPCOMING_PAGE_SIZE,
    upcomingPageSafe * UPCOMING_PAGE_SIZE + UPCOMING_PAGE_SIZE
  );
  const hasPricingProfessional = portalHasPricingProfessional({
    assignedProfessionalId: props.state.assignedProfessionalId,
    selectedProfessionalId: props.state.selectedProfessionalId,
    bookings: props.state.bookings,
    upcomingBookingProfessionalIds
  });
  const pricingProfessionalId =
    resolvePortalPricingProfessionalId({
      assignedProfessionalId: props.state.assignedProfessionalId,
      selectedProfessionalId: props.state.selectedProfessionalId,
      bookings: props.state.bookings,
      upcomingBookingProfessionalIds
    }) ?? "";
  const resolvedProfessionalId = pricingProfessionalId || effectiveProfessionalId;
  const professional = resolvedProfessionalId
    ? findProfessionalById(resolvedProfessionalId, props.professionals)
    : null;

  const reviewsModalProfessional = useMemo(() => {
    if (!reviewsModalProfessionalId) {
      return null;
    }
    return findProfessionalById(reviewsModalProfessionalId, props.professionals);
  }, [reviewsModalProfessionalId, props.professionals]);

  const openProfessionalReviews = useCallback((professionalId: string) => {
    setReviewsModalProfessionalId(professionalId);
  }, []);

  useEffect(() => {
    setUpcomingPage((current) => Math.min(current, Math.max(0, upcomingTotalPages - 1)));
  }, [upcomingTotalPages]);

  const historyRegularBookings = props.state.bookings
    .filter(
      (booking) =>
        booking.bookingMode !== "trial"
        && !upcomingConfirmedBookings.some((upcoming) => upcoming.id === booking.id)
    )
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const editingBooking = editingBookingId
    ? upcomingConfirmedBookings.find((booking) => booking.id === editingBookingId) ?? null
    : null;
  const editableProfessional = editingBooking
    ? findProfessionalById(editingBooking.professionalId, props.professionals)
    : professional;
  const modalProfessional = panelMode === "reschedule" && editingBooking
    ? findProfessionalById(editingBooking.professionalId, props.professionals)
    : props.state.assignedProfessionalId
      ? findProfessionalById(props.state.assignedProfessionalId, props.professionals)
      : editableProfessional;
  const modalProfessionalPhoto = professionalPhotoSrc(
    props.professionalPhotoMap[modalProfessional?.id ?? ""]
  );
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
    professionalId: professional?.id ?? resolvedProfessionalId,
    authToken: props.state.authToken,
    bookings: props.state.bookings
  };

  const packageCatalogDepsRef = useRef({
    hasPricingProfessional,
    professionalId: pricingProfessionalId,
    language: props.language,
    patientMarket: props.state.patientMarket
  });
  packageCatalogDepsRef.current = {
    hasPricingProfessional,
    professionalId: pricingProfessionalId,
    language: props.language,
    patientMarket: props.state.patientMarket
  };

  const packagesFetchGenerationRef = useRef(0);

  const awaitingRemoteSlots = Boolean(panelMode && props.state.authToken && remoteSlots === null);
  const slotSource = props.state.authToken ? (remoteSlots ?? []) : (editableProfessional?.slots ?? []);
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
  const availableSessions = countAvailablePatientSessions({
    creditsRemaining: pendingSessions,
    trialRebookAvailable: props.state.trialRebookAvailable
  });
  const canBookPaidTrialRebook = props.state.trialRebookAvailable && trialRebookMode;
  const canOpenNewBooking = pendingSessions > 0 || canBookPaidTrialRebook || props.state.trialRebookAvailable;
  slotHoldIdRef.current = slotHoldId;

  const releaseCurrentSlotHold = useCallback(async () => {
    const holdId = slotHoldIdRef.current;
    if (!holdId || !props.state.authToken) {
      setSlotHoldId("");
      setSlotHoldExpiresAt("");
      return;
    }
    try {
      await releaseBookingSlotHold(holdId, props.state.authToken);
    } catch {
      // Best-effort release; TTL will expire the hold.
    }
    setSlotHoldId("");
    setSlotHoldExpiresAt("");
    slotHoldIdRef.current = "";
  }, [props.state.authToken]);

  const openReschedulePanelForBooking = useCallback(
    (booking: Booking) => {
      const professionalHours = findProfessionalById(booking.professionalId, props.professionals)?.cancellationHours;
      if (!canPatientRescheduleBooking(booking.startsAt, professionalHours)) {
        return;
      }
      holdAcquireGenerationRef.current += 1;
      void releaseCurrentSlotHold();
      setEditingBookingId(booking.id);
      setSelectedSlotId(
        findSlotIdForBooking(booking.professionalId, booking.startsAt, booking.endsAt, props.professionals) ?? ""
      );
      setPanelMode("reschedule");
      window.requestAnimationFrame(() => {
        reservationsFocusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [props.professionals, releaseCurrentSlotHold]
  );

  const handleCancelBookingFromCalendar = useCallback(
    async (booking: Booking, reason: string) => {
      if (!props.onCancelBooking || calendarCancelBookingId) {
        return;
      }
      setCalendarCancelBookingId(booking.id);
      try {
        await props.onCancelBooking(booking.id, reason);
      } finally {
        setCalendarCancelBookingId(null);
      }
    },
    [props.onCancelBooking, calendarCancelBookingId]
  );

  const acquireHoldForSelectedSlot = useCallback(
    async (slot: TimeSlot) => {
      if (!props.state.authToken || panelMode !== "new") {
        return;
      }

      const gen = ++holdAcquireGenerationRef.current;
      setSlotHoldLoading(true);
      setBookingActionError("");
      try {
        await releaseCurrentSlotHold();
        const hold = await acquireBookingSlotHold(
          professional?.id ?? resolvedProfessionalId,
          slot,
          props.state.authToken
        );
        if (gen !== holdAcquireGenerationRef.current) {
          return;
        }
        setSlotHoldId(hold.holdId);
        setSlotHoldExpiresAt(hold.expiresAt);
        slotHoldIdRef.current = hold.holdId;
      } catch (requestError) {
        if (gen !== holdAcquireGenerationRef.current) {
          return;
        }
        setSelectedSlotId("");
        setBookingActionError(
          friendlyBookingFailureMessage(
            requestError instanceof Error ? requestError.message : "",
            props.language
          )
        );
      } finally {
        if (gen === holdAcquireGenerationRef.current) {
          setSlotHoldLoading(false);
        }
      }
    },
    [panelMode, professional?.id, resolvedProfessionalId, props.language, props.state.authToken, releaseCurrentSlotHold]
  );

  useEffect(() => {
    return () => {
      const holdId = slotHoldIdRef.current;
      if (!holdId || !props.state.authToken) {
        return;
      }
      void releaseBookingSlotHold(holdId, props.state.authToken).catch(() => undefined);
    };
  }, [props.state.authToken]);

  const canConfirmBooking = panelMode === "reschedule"
    ? Boolean(selectedSlot && editingBooking)
    : Boolean(selectedSlot) && canOpenNewBooking && Boolean(slotHoldId) && !slotHoldLoading;
  const [acquireSessionsModalOpen, setAcquireSessionsModalOpen] = useState(false);
  const hasProfessionalsOnPortal = props.professionals.length > 0;
  const packageCatalogView = useMemo(
    () =>
      resolvePackageCatalogView({
        hasProfessionalsOnPortal,
        hasAssignedProfessional: hasPricingProfessional,
        catalogFromApi: packageCatalogFromApi,
        packagesLoading,
        pricedPlans: packagePlans,
        featuredPackageIdFromApi: featuredPackageId,
        language: props.language
      }),
    [
      featuredPackageId,
      hasPricingProfessional,
      hasProfessionalsOnPortal,
      packageCatalogFromApi,
      packagePlans,
      packagesLoading,
      props.language
    ]
  );
  const {
    showPackageSection,
    pricingReady,
    displayPlans: displayPackagePlans,
    featuredPackageId: displayFeaturedPackageId
  } = packageCatalogView;
  const openAssignProfessionalPrompt = useCallback(() => {
    setAssignProfessionalModalOpen(true);
  }, []);
  const goChooseProfessional = useCallback(() => {
    setAssignProfessionalModalOpen(false);
    props.onNavigateToAssignProfessional();
  }, [props.onNavigateToAssignProfessional]);
  const checkoutPaymentPlan =
    checkoutPaymentPlanId && pricingReady
      ? packagePlans.find((plan) => plan.id === checkoutPaymentPlanId) ?? null
      : null;
  const usesDlocalCheckout = useMemo(
    () =>
      patientUsesDlocalCheckout({
        patientMarket: props.state.patientMarket,
        residencyCountry: props.state.profileResidencyCountry
      }),
    [props.state.patientMarket, props.state.profileResidencyCountry]
  );

  const confirmPackagePurchase = useCallback(
    async (plan: PackagePlan) => {
      setCheckoutPaymentLoading(true);
      setCheckoutPaymentError("");
      try {
        if (!packageCatalogFromApi || isClientFallbackPackagePlanId(plan.id)) {
          setCheckoutPaymentError(
            friendlyCheckoutPackageMessage("Catalog unavailable", props.language)
          );
          return;
        }

        const purchased = await props.onPurchasePackage(plan);
        if (purchased.checkoutUrl) {
          const professionalId =
            props.state.selectedProfessionalId?.trim()
            || props.state.assignedProfessionalId?.trim()
            || "";
          savePendingCheckoutDlocalReturn({
            kind: "package",
            packageId: plan.id,
            packageName: plan.name,
            sessionCount: plan.credits,
            paymentId: purchased.paymentId,
            orderId: purchased.orderId,
            ...(professionalId ? { professionalId } : {})
          });
          window.location.assign(purchased.checkoutUrl);
          return;
        }
        if (!purchased.ok) {
          setCheckoutPaymentError(
            friendlyCheckoutPackageMessage(purchased.error ?? "", props.language)
          );
          return;
        }
        setPackagePaymentSuccess({
          title: t(props.language, {
            es: "¡Compra exitosa!",
            en: "Purchase successful!",
            pt: "Compra concluida!"
          }),
          detail: replaceTemplate(
            t(props.language, {
              es: "Acreditamos {count} sesiones de «{name}». Ya podés elegir horario.",
              en: "We credited {count} sessions from “{name}”. You can pick a time now.",
              pt: "Creditamos {count} sessoes de «{name}». Ja pode escolher horario."
            }),
            { count: String(plan.credits), name: plan.name }
          ),
          primaryLabel: t(props.language, { es: "Reservar sesión", en: "Book a session", pt: "Reservar sessao" })
        });
      } catch (error) {
        setCheckoutPaymentError(
          friendlyCheckoutPackageMessage(error instanceof Error ? error.message : "", props.language)
        );
      } finally {
        setCheckoutPaymentLoading(false);
      }
    },
    [packageCatalogFromApi, props.language, props.onPurchasePackage]
  );

  const {
    packageCheckoutLoading,
    packageCheckoutError,
    setPackageCheckoutError,
    startPackageCheckout
  } = usePackageCheckout({
    language: props.language,
    pricingReady,
    packageCatalogFromApi,
    usesDlocalCheckout,
    selectedProfessionalId: props.state.selectedProfessionalId || props.state.assignedProfessionalId,
    onPurchasePackage: props.onPurchasePackage,
    onGateBlocked: openAssignProfessionalPrompt
  });

  useEffect(() => {
    const message = packageCheckoutError.trim();
    if (message) {
      recordPaymentFailureNotice(message);
    }
  }, [packageCheckoutError]);

  /**
   * Precio de lista por sesión suelta (misma fuente que el checkout).
   * Prioriza el catálogo API de paquetes; el total exacto en ARS viene del endpoint de cotización.
   */
  const individualUnitPriceMajor = useMemo(() => {
    const sessionListUsdMajor = resolveSessionListUsdMajor({
      sessionPriceUsd: professional?.sessionPriceUsd ?? null,
      arsPerUsd: resolveFxRatePerUsd("ARS", props.fxRates)
    });
    return resolveIndividualListUnitUsdFromPackages(packagePlans, sessionListUsdMajor);
  }, [packagePlans, professional?.sessionPriceUsd, props.fxRates]);

  const resetIndividualPurchaseUi = () => {
    setIndividualQtyOpen(false);
    setIndividualQtyDraft("1");
    setIndividualQuote(null);
    setIndividualQuoteLoading(false);
    setIndividualPaymentLoading(false);
    setIndividualPaymentError("");
  };

  const openIndividualPurchase = useCallback(() => {
    setCheckoutPaymentError("");
    setCheckoutPaymentPlanId(null);
    setIndividualPaymentError("");
    setIndividualQtyDraft("1");
    setIndividualQuote(null);
    setIndividualQtyOpen(true);
  }, []);

  useEffect(() => {
    if (!individualQtyOpen || !pricingReady || !props.state.authToken) {
      return;
    }

    const n = Number.parseInt(individualQtyDraft.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 99) {
      setIndividualQuote(null);
      setIndividualQuoteLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIndividualQuoteLoading(true);
      void apiRequest<{
        sessionCount: number;
        unitPriceUsdCents: number;
        totalPriceUsdCents: number;
        chargeAmountMajor: number;
        chargeCurrency: string;
      }>(
        `/api/payments/individual-sessions-quote?sessionCount=${n}${
          pricingProfessionalId ? `&professionalId=${encodeURIComponent(pricingProfessionalId)}` : ""
        }`,
        {},
        props.state.authToken ?? undefined
      )
        .then((quote) => {
          if (!cancelled) {
            setIndividualQuote(quote);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIndividualQuote(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIndividualQuoteLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [individualQtyDraft, individualQtyOpen, pricingProfessionalId, pricingReady, props.state.authToken]);

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
    const focus = searchParams.get("focus");
    if (focus !== "packages" && focus !== "history" && focus !== "activity") {
      return;
    }

    if (focus === "packages" || focus === "activity") {
      setIsPackagesExpanded(true);
    } else if (focus === "history") {
      setIsHistoryExpanded(true);
    }

    window.setTimeout(() => {
      if (focus === "packages" || focus === "activity") {
        packagesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        packagesSectionRef.current?.focus({ preventScroll: true });
      } else if (focus === "history") {
        historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        historySectionRef.current?.focus({ preventScroll: true });
      }
    }, 80);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("focus");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get("focus") !== "new-booking") {
      return;
    }

    bookingReturnToRef.current =
      safeInternalReturnPath(searchParams.get("returnTo")) ?? readPersistedBookingReturnTo();
    if (bookingReturnToRef.current) {
      persistBookingReturnTo(bookingReturnToRef.current);
    }

    const openAsTrialRebook =
      props.state.trialRebookAvailable
      && (searchParams.get("trial") === "1" || pendingSessions <= 0);

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
    nextParams.delete("returnTo");
    nextParams.delete("trial");
    setSearchParams(nextParams, { replace: true });

    setEditingBookingId(null);
    setSelectedSlotId("");
    setBookingActionError("");
    setTrialRebookMode(openAsTrialRebook);

    // Créditos o prueba pagada → abrir reserva. Sin nada → popup (no banner rojo).
    if (pendingSessions > 0 || props.state.trialRebookAvailable) {
      setNoSessionsModalOpen(false);
      setPanelMode("new");
    } else {
      setPanelMode(null);
      setNoSessionsModalOpen(true);
    }
  }, [isCheckoutFlow, pendingSessions, props.state.trialRebookAvailable, searchParams, setSearchParams]);

  // Abrir el popup de reprogramación cuando llega ?reschedule=<bookingId>
  // (desde el botón Reprogramar del Inicio o del detalle de sesión).
  useEffect(() => {
    const rescheduleBookingId = searchParams.get("reschedule");
    if (!rescheduleBookingId) {
      return;
    }

    bookingReturnToRef.current =
      safeInternalReturnPath(searchParams.get("returnTo")) ?? readPersistedBookingReturnTo();
    if (bookingReturnToRef.current) {
      persistBookingReturnTo(bookingReturnToRef.current);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("reschedule");
    nextParams.delete("returnTo");
    setSearchParams(nextParams, { replace: true });

    const target = upcomingConfirmedBookings.find((booking) => booking.id === rescheduleBookingId);
    if (
      !target
      || !canPatientRescheduleBooking(
        target.startsAt,
        findProfessionalById(target.professionalId, props.professionals)?.cancellationHours
      )
    ) {
      return;
    }

    holdAcquireGenerationRef.current += 1;
    void releaseCurrentSlotHold();
    setEditingBookingId(target.id);
    setSelectedSlotId(
      findSlotIdForBooking(target.professionalId, target.startsAt, target.endsAt, props.professionals) ?? ""
    );
    setPanelMode("reschedule");

    window.requestAnimationFrame(() => {
      reservationsFocusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [checkoutFocusTick, setCheckoutFocusTick] = useState(0);

  const focusCheckoutPackagesSection = useCallback(() => {
    const run = (attempt: number) => {
      const node = checkoutSectionRef.current;
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
        node.focus({ preventScroll: true });
        return;
      }
      if (attempt < 12) {
        window.setTimeout(() => run(attempt + 1), 60);
      }
    };
    window.requestAnimationFrame(() => run(0));
  }, []);

  useEffect(() => {
    if (!isCheckoutFlow) {
      return;
    }
    focusCheckoutPackagesSection();
  }, [checkoutFocusTick, focusCheckoutPackagesSection, isCheckoutFlow, packagesLoading, selectedCheckoutPlanId]);

  useEffect(() => {
    if (
      !isCheckoutFlow
      || !selectedCheckoutPlanId
      || checkoutPaymentPlanId
      || searchParams.get("purchase") === "individual"
      || !pricingReady
      || packagesLoading
    ) {
      return;
    }
    if (isDisplayOnlyBundlePlanId(selectedCheckoutPlanId)) {
      return;
    }
    const planExists = packagePlans.some((plan) => plan.id === selectedCheckoutPlanId);
    if (!planExists) {
      return;
    }
    setCheckoutPaymentPlanId(selectedCheckoutPlanId);

    if (checkoutSource === "dashboard") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("source");
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    checkoutPaymentPlanId,
    checkoutSource,
    isCheckoutFlow,
    packagePlans,
    packagesLoading,
    pricingReady,
    searchParams,
    selectedCheckoutPlanId,
    setSearchParams
  ]);

  const individualPurchaseDeepLinkConsumed = useRef(false);

  useEffect(() => {
    if (!isCheckoutFlow || searchParams.get("purchase") !== "individual") {
      individualPurchaseDeepLinkConsumed.current = false;
      return;
    }
    if (searchParams.get("payment") === "success" || searchParams.get("payment") === "cancel") {
      return;
    }
    if (packagesLoading || individualUnitPriceMajor === null) {
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
  }, [isCheckoutFlow, individualUnitPriceMajor, openIndividualPurchase, packagesLoading, searchParams, setSearchParams]);

  useEffect(() => {
    if (!panelMode || !props.state.authToken) {
      setSlotsLoading(false);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    const timer = window.setTimeout(() => {
      const snap = slotsRequestDepsRef.current;
      const rescheduleTarget =
        snap.panelMode === "reschedule" && snap.editingBookingId
          ? snap.bookings.find((b) => b.id === snap.editingBookingId) ?? null
          : null;
      const targetProfessionalId = rescheduleTarget?.professionalId ?? snap.professionalId;
      if (!snap.authToken || !targetProfessionalId) {
        if (!cancelled) {
          setRemoteSlots([]);
          setSlotsLoading(false);
        }
        return;
      }

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
          if (cancelled) return;
          setRemoteSlots(
            (response.slots ?? []).map((slot) => ({
              id: slot.id,
              startsAt: slot.startsAt,
              endsAt: slot.endsAt
            }))
          );
        })
        .catch(() => {
          if (cancelled) return;
          setRemoteSlots([]);
        })
        .finally(() => {
          if (!cancelled) setSlotsLoading(false);
        });
    }, BOOKING_REMOTE_FETCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [editingBookingId, panelMode, professional?.id, resolvedProfessionalId, props.state.authToken]);

  useEffect(() => {
    setPackagesLoading(true);

    if (!hasPricingProfessional) {
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
      if (!snap.hasPricingProfessional) {
        setPackagesLoading(false);
        return;
      }

      void loadPublicPackagePlans({
        language: snap.language,
        professionalId: snap.professionalId,
        market: snap.patientMarket,
        t: (values) => t(snap.language, values)
      })
        .then((catalog) => {
          if (gen !== packagesFetchGenerationRef.current) {
            return;
          }
          setPackagePlans(catalog.plans);
          setFeaturedPackageId(catalog.featuredPackageId);
          setPackageCatalogFromApi(catalog.fromApi);
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
  }, [hasPricingProfessional, pricingProfessionalId, props.language, props.state.patientMarket]);

  useEffect(() => {
    if (pricingReady || !isCheckoutFlow) {
      return;
    }
    setCheckoutPaymentLoading(false);
    setCheckoutPaymentPlanId(null);
    setCheckoutPaymentError("");
    resetIndividualPurchaseUi();
  }, [isCheckoutFlow, pricingReady]);

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
    if (!selectedSlot || !canConfirmBooking || bookingSubmitting) {
      return;
    }

    if (panelMode === "reschedule" && editingBooking) {
      if (!canPatientRescheduleBooking(editingBooking.startsAt, editableProfessional?.cancellationHours)) {
        setBookingActionError(
          t(props.language, {
            es: "Solo puedes reprogramar hasta 24 horas antes del inicio de la sesión.",
            en: "You can reschedule only up to 24 hours before the session starts.",
            pt: "Voce pode reagendar somente ate 24 horas antes do inicio da sessao."
          })
        );
        return;
      }
      setBookingSubmitting(true);
      try {
        await props.onRescheduleBooking(editingBooking.id, editingBooking.professionalId, selectedSlot);
      } finally {
        setBookingSubmitting(false);
      }
      finishBookingFlowAndMaybeReturn();
      return;
    }

    if (!slotHoldId) {
      setBookingActionError(
        friendlyBookingFailureMessage("Slot hold expired or not found", props.language)
      );
      return;
    }

    setBookingSubmitting(true);
    let result: { ok: boolean; error?: string };
    const bookingProfessionalId = professional?.id ?? resolvedProfessionalId;
    if (!bookingProfessionalId) {
      setBookingActionError(
        t(props.language, {
          es: "Todavía no cargamos tu profesional. Esperá un segundo y volvé a intentar.",
          en: "We haven’t loaded your professional yet. Wait a second and try again.",
          pt: "Ainda nao carregamos seu profissional. Espere um segundo e tente de novo."
        })
      );
      return;
    }
    try {
      result = await props.onConfirmBooking(
        bookingProfessionalId,
        selectedSlot,
        canBookPaidTrialRebook,
        panelMode === "new" ? slotHoldId : undefined
      );
    } finally {
      setBookingSubmitting(false);
    }
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
    finishBookingFlowAndMaybeReturn();
  };

  const closeBookingPanel = () => {
    const returnTo = bookingReturnToRef.current ?? readPersistedBookingReturnTo();
    holdAcquireGenerationRef.current += 1;
    void releaseCurrentSlotHold();
    setPanelMode(null);
    setEditingBookingId(null);
    setSelectedSlotId("");
    setBookingActionError("");
    setSlotHoldLoading(false);
    setTrialRebookMode(false);
    bookingReturnToRef.current = null;
    clearPersistedBookingReturnTo();
    if (returnTo) {
      navigate(returnTo);
    }
  };

  const finishBookingFlowAndMaybeReturn = () => {
    const returnTo = bookingReturnToRef.current ?? readPersistedBookingReturnTo();
    bookingReturnToRef.current = null;
    clearPersistedBookingReturnTo();
    holdAcquireGenerationRef.current += 1;
    void releaseCurrentSlotHold();
    setPanelMode(null);
    setEditingBookingId(null);
    setSelectedSlotId("");
    setBookingActionError("");
    setSlotHoldLoading(false);
    setTrialRebookMode(false);
    if (returnTo) {
      navigate(returnTo);
    }
  };

  const openCheckoutCatalog = useCallback(
    (planId?: string | null) => {
      setNoSessionsModalOpen(false);
      setPanelMode(null);
      setEditingBookingId(null);
      setSelectedSlotId("");
      setBookingActionError("");
      setCheckoutPaymentLoading(false);
      setCheckoutPaymentPlanId(null);
      setCheckoutPaymentError("");
      resetIndividualPurchaseUi();
      setCheckoutFlow(true, typeof planId === "string" ? planId : null);
      setCheckoutFocusTick((current) => current + 1);
      focusCheckoutPackagesSection();
    },
    [
      focusCheckoutPackagesSection,
      resetIndividualPurchaseUi,
      setCheckoutFlow
    ]
  );

  const openIndividualSessionsCheckoutFromModal = useCallback(() => {
    setNoSessionsModalOpen(false);
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
    if (pricingReady && individualUnitPriceMajor !== null) {
      openIndividualPurchase();
    }
  }, [
    individualUnitPriceMajor,
    openIndividualPurchase,
    pricingReady,
    resetIndividualPurchaseUi,
    setSearchParams
  ]);

  const acquireSessionsHandlers = useMemo(
    () => ({
      onAssignProfessional: () => openAssignProfessionalPrompt(),
      onShowChoiceModal: () => setAcquireSessionsModalOpen(true),
      onOpenCheckout: openCheckoutCatalog,
      onOpenIndividualCheckout: openIndividualSessionsCheckoutFromModal,
      onShowNoCreditsAlert: () => setNoSessionsModalOpen(true),
      onOpenNewBookingPanel: () => {
        setNoSessionsModalOpen(false);
        clearPersistedBookingReturnTo();
        bookingReturnToRef.current = null;
        setPanelMode("new");
      }
    }),
    [openAssignProfessionalPrompt, openCheckoutCatalog, openIndividualSessionsCheckoutFromModal]
  );

  const { dispatchAcquireSessions } = useAcquireSessionsDispatch({
    isMobilePortal,
    hasAssignedProfessional: hasPricingProfessional,
    pricingReady,
    creditsRemaining: pendingSessions,
    packagePlans: displayPackagePlans,
    featuredPackageId: displayFeaturedPackageId,
    handlers: acquireSessionsHandlers
  });

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
        holdAcquireGenerationRef.current += 1;
        void releaseCurrentSlotHold();
        setNoSessionsModalOpen(false);
        setSlotHoldLoading(false);
        setTrialRebookMode(false);
        clearPersistedBookingReturnTo();
        bookingReturnToRef.current = null;
        return null;
      }
      // Abrir desde Sesiones (no desde Inicio): quedarse acá al terminar.
      clearPersistedBookingReturnTo();
      bookingReturnToRef.current = null;
      if (pendingSessions <= 0) {
        if (props.state.trialRebookAvailable) {
          setNoSessionsModalOpen(false);
          setTrialRebookMode(true);
          return "new";
        }
        dispatchAcquireSessions("book_without_credits");
        return null;
      }
      setNoSessionsModalOpen(false);
      setTrialRebookMode(false);
      return "new";
    });
  };

  useEffect(() => {
    if (availableSessions > 0 && noSessionsModalOpen) {
      setNoSessionsModalOpen(false);
    }
  }, [availableSessions, noSessionsModalOpen]);

  const handlePurchasePlan = (plan: PackagePlan) => {
    if (checkoutPaymentLoading || packageCheckoutLoading || !usesDlocalCheckout) {
      return;
    }
    void startPackageCheckout(plan);
  };

  const dlocalPackageCheckoutStartedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!usesDlocalCheckout || !checkoutPaymentPlan) {
      return;
    }
    if (dlocalPackageCheckoutStartedRef.current === checkoutPaymentPlan.id) {
      return;
    }
    dlocalPackageCheckoutStartedRef.current = checkoutPaymentPlan.id;
    void (async () => {
      const started = await startPackageCheckout(checkoutPaymentPlan);
      if (!started) {
        dlocalPackageCheckoutStartedRef.current = null;
      }
    })();
  }, [checkoutPaymentPlan, usesDlocalCheckout]);

  const proceedIndividualToPayment = () => {
    if (!pricingReady) {
      openAssignProfessionalPrompt();
      return;
    }
    const n = Number.parseInt(individualQtyDraft.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 99 || individualUnitPriceMajor === null) {
      return;
    }

    setIndividualPaymentError("");
    setIndividualPaymentLoading(true);

    void (async () => {
      try {
        if (!usesDlocalCheckout) {
          if (!import.meta.env.DEV) {
            setIndividualPaymentError(
              friendlyCheckoutPackageMessage(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR, props.language)
            );
            return;
          }
          await confirmIndividualPurchase(n);
          return;
        }

        const purchased = await props.onPurchaseIndividualSessions(n);
        const checkoutUrl = purchased.checkoutUrl?.trim() ?? "";
        if (/^https?:\/\//i.test(checkoutUrl)) {
          const professionalId =
            props.state.selectedProfessionalId?.trim()
            || props.state.assignedProfessionalId?.trim()
            || "";
          savePendingCheckoutDlocalReturn({
            kind: "individual",
            sessionCount: n,
            paymentId: purchased.paymentId,
            orderId: purchased.orderId,
            ...(professionalId ? { professionalId } : {})
          });
          window.location.assign(checkoutUrl);
          return;
        }
        if (purchased.ok && !usesDlocalCheckout) {
          setIndividualQtyOpen(false);
          setIndividualPaymentSuccess({
            title: t(props.language, {
              es: "¡Sesiones acreditadas!",
              en: "Sessions credited!",
              pt: "Sessoes creditadas!"
            }),
            detail: replaceTemplate(
              t(props.language, {
                es: "Sumaste {count} sesiones a tu cuenta. Ya podés reservar turno.",
                en: "You added {count} sessions to your account. You can book now.",
                pt: "Voce adicionou {count} sessoes a sua conta. Ja pode reservar."
              }),
              { count: String(n) }
            ),
            primaryLabel: t(props.language, { es: "Reservar sesión", en: "Book a session", pt: "Reservar sessao" })
          });
          return;
        }
        if (!purchased.ok) {
          setIndividualPaymentError(
            friendlyCheckoutPackageMessage(purchased.error ?? "", props.language)
          );
          return;
        }
        setIndividualPaymentError(
          friendlyCheckoutPackageMessage("Purchase failed", props.language)
        );
      } catch (error) {
        setIndividualPaymentError(
          friendlyCheckoutPackageMessage(error instanceof Error ? error.message : "", props.language)
        );
      } finally {
        setIndividualPaymentLoading(false);
      }
    })();
  };

  const confirmIndividualPurchase = async (sessionCount: number) => {
    setIndividualPaymentLoading(true);
    setIndividualPaymentError("");
    try {
      const purchased = await props.onPurchaseIndividualSessions(sessionCount);
      if (!purchased.ok) {
        setIndividualPaymentError(
          friendlyCheckoutPackageMessage(purchased.error ?? "", props.language)
        );
        return;
      }
      setIndividualQtyOpen(false);
      setIndividualPaymentSuccess({
        title: t(props.language, {
          es: "¡Sesiones acreditadas!",
          en: "Sessions credited!",
          pt: "Sessoes creditadas!"
        }),
        detail: replaceTemplate(
          t(props.language, {
            es: "Sumaste {count} sesiones a tu cuenta. Ya podés reservar turno.",
            en: "You added {count} sessions to your account. You can book now.",
            pt: "Voce adicionou {count} sessoes a sua conta. Ja pode reservar."
          }),
          { count: String(sessionCount) }
        ),
        primaryLabel: t(props.language, { es: "Reservar sesión", en: "Book a session", pt: "Reservar sessao" })
      });
    } catch (error) {
      setIndividualPaymentError(
        friendlyCheckoutPackageMessage(error instanceof Error ? error.message : "", props.language)
      );
    } finally {
      setIndividualPaymentLoading(false);
    }
  };

  const dismissPackagePaymentSuccess = () => {
    setPackagePaymentSuccess(null);
    setCheckoutPaymentPlanId(null);
    setCheckoutPaymentError("");
    setCheckoutFlow(false);
    if (isMobilePortal) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  };

  const dismissIndividualPaymentSuccess = () => {
    setIndividualPaymentSuccess(null);
    resetIndividualPurchaseUi();
    setCheckoutFlow(false);
    if (isMobilePortal) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
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
    <div className="page-stack sessions-booking-page sessions-booking-page--ml session-rn-root">
      <CalmPortalToolbarRow mountId="sessions-hero-toolbar-mount" />
      <section
        className="sessions-page-ml"
        aria-label={t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
      >
        <div className="sessions-calm-columns">
        <div className="sessions-calm-main">
        <SessionsCalmPage
          language={props.language}
          timeZone={props.state.profile.timezone}
          now={new Date(now)}
          weekBookings={props.state.bookings}
          upcoming={upcomingConfirmedBookings}
          professionals={props.professionals}
          photoMap={props.professionalPhotoMap}
          onImageFallback={props.onImageFallback}
          onOpenDetail={props.onOpenBookingDetail}
          onReschedule={(booking) => openReschedulePanelForBooking(booking)}
        />

      {showPackageSection && isCheckoutFlow ? (
        <section
          ref={checkoutSectionRef}
          tabIndex={-1}
          className="content-card booking-session-card booking-card-minimal sessions-package-options-panel"
          aria-label={t(props.language, {
            es: "Comprar sesiones",
            en: "Buy sessions",
            pt: "Comprar sessoes"
          })}
        >
          <CheckoutPackagesPanel
            language={props.language}
            currency={props.currency}
            residencyCountry={props.state.profileResidencyCountry}
            fxRates={props.fxRates}
            packagesLoading={packagesLoading && hasPricingProfessional}
            packagePlans={displayPackagePlans}
            featuredPackageId={displayFeaturedPackageId}
            pricingReady={pricingReady}
            unitPriceMajor={pricingReady ? individualUnitPriceMajor : null}
            onClose={() => {
              setCheckoutPaymentLoading(false);
              setCheckoutPaymentPlanId(null);
              setCheckoutPaymentError("");
              resetIndividualPurchaseUi();
              setCheckoutFlow(false);
            }}
            onSelectPlan={handlePurchasePlan}
            onIndividualPurchase={() => {
              if (!pricingReady) {
                openAssignProfessionalPrompt();
                return;
              }
              openIndividualPurchase();
            }}
            onRequireProfessional={openAssignProfessionalPrompt}
            paymentLoading={checkoutPaymentLoading || packageCheckoutLoading}
            paymentError={checkoutPaymentError || packageCheckoutError}
            needsResidencyConfirm={!usesDlocalCheckout}
            residencySaving={residencySaving}
            variant="calm"
            professionalName={props.professionals.find((item) => item.id === pricingProfessionalId)?.fullName ?? null}
            professionalFirstName={props.professionals.find((item) => item.id === pricingProfessionalId)?.firstName ?? null}
            professionalLastName={props.professionals.find((item) => item.id === pricingProfessionalId)?.lastName ?? null}
            slotLabel={
              selectedSlot
                ? new Intl.DateTimeFormat(
                    props.language === "en" ? "en-US" : props.language === "pt" ? "pt-BR" : "es-AR",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: props.state.profile.timezone
                    }
                  ).format(new Date(selectedSlot.startsAt))
                : null
            }
            onConfirmResidency={async (iso) => {
              if (!props.onConfirmResidency) {
                return;
              }
              setResidencySaving(true);
              try {
                const result = await props.onConfirmResidency(iso);
                if (!result.ok) {
                  setCheckoutPaymentError(result.error ?? "");
                } else {
                  setCheckoutPaymentError("");
                  setPackageCheckoutError("");
                }
              } finally {
                setResidencySaving(false);
              }
            }}
          />
        </section>
      ) : null}
        </div>
        <aside className="sessions-calm-side">
          <SessionsContextRail
            language={props.language}
            timeZone={props.state.profile.timezone}
            now={now}
            state={props.state}
            currency={props.currency}
            fxRates={props.fxRates}
            professionals={props.professionals}
            upcoming={upcomingConfirmedBookings}
            history={historyRegularBookings}
            packageName={props.state.subscription.packageName}
            packageSize={props.state.subscription.creditsTotal}
            bookingOpen={panelMode === "new"}
            canBuy={hasProfessionalsOnPortal}
            packagesExpanded={isPackagesExpanded}
            historyExpanded={isHistoryExpanded}
            packagesRef={packagesSectionRef}
            historyRef={historySectionRef}
            onBook={toggleNewBookingPanel}
            onBuy={() => dispatchAcquireSessions("buy_cta")}
            onTogglePackages={() => setIsPackagesExpanded((current) => !current)}
            onToggleHistory={() => setIsHistoryExpanded((current) => !current)}
            onOpenHistory={props.onOpenBookingDetail}
          />
        </aside>
        </div>
      </section>

      <ProfessionalReviewsModal
        open={reviewsModalProfessional != null}
        language={props.language}
        professional={
          reviewsModalProfessional
            ? {
                id: reviewsModalProfessional.id,
                fullName: reviewsModalProfessional.fullName,
                firstName: reviewsModalProfessional.firstName,
                lastName: reviewsModalProfessional.lastName,
                rating: reviewsModalProfessional.rating ?? null,
                reviewsCount: reviewsModalProfessional.reviewsCount ?? 0
              }
            : null
        }
        onClose={() => setReviewsModalProfessionalId(null)}
      />

      <BookingActionModal
        panelMode={panelMode}
        modalProfessional={
          modalProfessional ?? {
            fullName: props.state.assignedProfessionalName ?? t(props.language, {
              es: "Profesional",
              en: "Professional",
              pt: "Profissional"
            }),
            title: ""
          }
        }
        modalProfessionalPhoto={modalProfessionalPhoto}
        onImageFallback={props.onImageFallback}
        selectedSlotId={selectedSlotId}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading || awaitingRemoteSlots}
        pendingSessions={pendingSessions}
        trialRebookMode={trialRebookMode && canBookPaidTrialRebook}
        bookingActionError={bookingActionError}
        canConfirmBooking={canConfirmBooking}
        slotHoldLoading={slotHoldLoading}
        bookingSubmitting={bookingSubmitting}
        holdExpiresAt={panelMode === "new" ? slotHoldExpiresAt : undefined}
        language={props.language}
        sessionTimezone={props.sessionTimezone}
        onSelectSlot={(slotId) => {
          setSelectedSlotId(slotId);
          setBookingActionError("");
          if (!slotId) {
            holdAcquireGenerationRef.current += 1;
            void releaseCurrentSlotHold();
            return;
          }
          const slot = availableSlots.find((item) => item.id === slotId) ?? null;
          if (slot && panelMode === "new") {
            void acquireHoldForSelectedSlot(slot);
          } else {
            holdAcquireGenerationRef.current += 1;
            void releaseCurrentSlotHold();
          }
        }}
        onClose={closeBookingPanel}
        onConfirm={handleBooking}
        formatDateTime={formatDateTime}
      />

      {packagePaymentSuccess ? (
        <PaymentSuccessModal
          language={props.language}
          summary={packagePaymentSuccess}
          onDismiss={dismissPackagePaymentSuccess}
        />
      ) : null}

      {individualPaymentSuccess ? (
        <PaymentSuccessModal
          language={props.language}
          summary={individualPaymentSuccess}
          onDismiss={dismissIndividualPaymentSuccess}
        />
      ) : null}

      {isCheckoutFlow && individualQtyOpen && individualUnitPriceMajor !== null ? (
        <IndividualSessionsQtyModal
          language={props.language}
          currency={props.currency}
          fxRates={props.fxRates}
          qty={individualQtyDraft}
          unitPriceMajor={individualUnitPriceMajor}
          quote={individualQuote}
          quoteLoading={individualQuoteLoading}
          usesLocalCurrency={usesDlocalCheckout}
          market={props.state.patientMarket}
          loading={individualPaymentLoading}
          error={individualPaymentError || null}
          onQty={setIndividualQtyDraft}
          onClose={() => {
            setIndividualQtyOpen(false);
            setIndividualQtyDraft("1");
          }}
          onContinue={() => proceedIndividualToPayment()}
        />
      ) : null}

      {assignProfessionalModalOpen ? (
        <AssignProfessionalPromptModal
          language={props.language}
          onClose={() => setAssignProfessionalModalOpen(false)}
          onChooseProfessional={goChooseProfessional}
        />
      ) : null}

      {acquireSessionsModalOpen ? (
        <AcquireSessionsChoiceModal
          language={props.language}
          onClose={() => setAcquireSessionsModalOpen(false)}
          onChoosePackages={() => {
            openCheckoutCatalog();
          }}
          onChooseIndividual={openIndividualSessionsCheckoutFromModal}
        />
      ) : null}

      {noSessionsModalOpen ? (
        <NoSessionsAvailableModal
          language={props.language}
          onClose={() => setNoSessionsModalOpen(false)}
          onContinueToPackages={() => {
            setNoSessionsModalOpen(false);
            if (!hasPricingProfessional) {
              openAssignProfessionalPrompt();
              return;
            }
            dispatchAcquireSessions("buy_cta");
          }}
        />
      ) : null}
    </div>
  );
}
