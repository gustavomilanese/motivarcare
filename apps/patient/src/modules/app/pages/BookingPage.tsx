import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { formatSubscriptionPurchasePrice } from "../lib/formatSubscriptionPurchasePrice";
import { formatPatientUsdPrice } from "../lib/formatPatientUsdPrice";
import { patientUsesDlocalCheckout } from "../lib/patientDlocalCheckout";
import { DLOCAL_CHECKOUT_UNAVAILABLE_ERROR } from "@therapy/types";
import {
  portalHasPricingProfessional,
  resolvePortalPricingProfessionalId
} from "../lib/patientPricingProfessional";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import { UpcomingBookingsList } from "../../booking/components/UpcomingBookingsList";
import { useAcquireSessionsDispatch } from "../../booking/hooks/useAcquireSessionsDispatch";
import {
  isDisplayOnlyBundlePlanId,
  filterUpcomingPatientBookings,
  resolvePackageCatalogView,
  resolvePackagePurchaseGate
} from "@therapy/patient-core";
import { canPatientRescheduleBooking } from "@therapy/i18n-config";
import { PaymentSuccessModal, type PaymentSuccessSummary } from "../../matching/components/PaymentSuccessModal";
import { friendlyBookingFailureMessage, friendlyCheckoutPackageMessage } from "../lib/friendlyPatientMessages";
import {
  clearPendingCheckoutDlocalReturn,
  readPendingCheckoutDlocalReturn,
  savePendingCheckoutDlocalReturn
} from "../lib/checkoutDlocalReturn";
import { acquireBookingSlotHold, releaseBookingSlotHold } from "../../matching/services/slotHold";
import { AcquireSessionsChoiceModal } from "../components/AcquireSessionsChoiceModal";
import { useMobilePortal } from "../hooks/useMobilePortal";
import type { PortalPurchaseResult } from "../hooks/usePortalActions";
import { BookingActionModal } from "../components/booking/BookingActionModal";
import { CheckoutPackagesPanel } from "../components/booking/CheckoutPackagesPanel";
import { AssignProfessionalPromptModal } from "../components/AssignProfessionalPromptModal";
import { PaymentActivityPanel } from "../components/PaymentActivityPanel";
import { ProfessionalReviewsModal } from "../../reviews/components/ProfessionalReviewsModal";
import { professionalAccessibleName } from "../lib/professionalDisplayName";
import { findProfessionalById, findSlotIdForBooking } from "../lib/professionals";
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
  onOpenBookingDetail: (bookingId: string) => void;
  onPurchasePackage: (plan: PackagePlan) => Promise<PortalPurchaseResult>;
  onPurchaseIndividualSessions: (sessionCount: number) => Promise<PortalPurchaseResult>;
  onSyncDlocalPayment?: (params: {
    paymentId?: string | null;
    orderId?: string | null;
  }) => Promise<{ ok: boolean; fulfilled?: boolean; error?: string }>;
  onRefreshPortalFromApi?: () => void;
  onNavigateToAssignProfessional: () => void;
}) {
  const isMobilePortal = useMobilePortal();
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
  const [packageCatalogFromApi, setPackageCatalogFromApi] = useState(false);
  const [featuredPackageId, setFeaturedPackageId] = useState<string | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [checkoutPaymentPlanId, setCheckoutPaymentPlanId] = useState<string | null>(null);
  const [checkoutPaymentLoading, setCheckoutPaymentLoading] = useState(false);
  const [checkoutPaymentError, setCheckoutPaymentError] = useState("");
  const [individualQtyOpen, setIndividualQtyOpen] = useState(false);
  const [individualQtyDraft, setIndividualQtyDraft] = useState("1");
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
  const slotHoldIdRef = useRef("");
  const holdAcquireGenerationRef = useRef(0);
  const [showNoCreditsAlert, setShowNoCreditsAlert] = useState(false);
  const [assignProfessionalModalOpen, setAssignProfessionalModalOpen] = useState(false);
  const [reviewsModalProfessionalId, setReviewsModalProfessionalId] = useState<string | null>(null);
  const [packagePaymentSuccess, setPackagePaymentSuccess] = useState<PaymentSuccessSummary | null>(null);
  const [individualPaymentSuccess, setIndividualPaymentSuccess] = useState<PaymentSuccessSummary | null>(null);
  const reservationsFocusRef = useRef<HTMLDivElement | null>(null);
  const checkoutSectionRef = useRef<HTMLElement | null>(null);
  const calendarSectionRef = useRef<HTMLElement | null>(null);
  const isCheckoutFlow = searchParams.get("flow") === "checkout";
  const selectedCheckoutPlanId = searchParams.get("plan");
  const checkoutSource = searchParams.get("source");

  const assignedProfessionalId = props.state.assignedProfessionalId?.trim() ?? "";
  const selectedProfessionalId = props.state.selectedProfessionalId?.trim() ?? "";
  const canChangeProfessionalForNewPackage = !assignedProfessionalId || props.state.subscription.creditsRemaining <= 0;
  const effectiveProfessionalId = canChangeProfessionalForNewPackage
    ? selectedProfessionalId || assignedProfessionalId
    : assignedProfessionalId || selectedProfessionalId;
  const now = Date.now();

  const upcomingConfirmedBookings = filterUpcomingPatientBookings(props.state.bookings, now);
  const upcomingBookingProfessionalIds = upcomingConfirmedBookings.map((booking) => booking.professionalId);
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
  const professional = pricingProfessionalId
    ? findProfessionalById(pricingProfessionalId, props.professionals)
    : findProfessionalById(effectiveProfessionalId, props.professionals);

  const reviewsModalProfessional = useMemo(() => {
    if (!reviewsModalProfessionalId) {
      return null;
    }
    return findProfessionalById(reviewsModalProfessionalId, props.professionals);
  }, [reviewsModalProfessionalId, props.professionals]);

  const openProfessionalReviews = useCallback((professionalId: string) => {
    setReviewsModalProfessionalId(professionalId);
  }, []);

  const upcomingRegularBookings = upcomingConfirmedBookings
    .filter((booking) => booking.bookingMode !== "trial");

  const historyRegularBookings = props.state.bookings
    .filter(
      (booking) =>
        booking.bookingMode !== "trial"
        && !upcomingRegularBookings.some((upcoming) => upcoming.id === booking.id)
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
        const hold = await acquireBookingSlotHold(professional.id, slot, props.state.authToken);
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
    [panelMode, professional.id, props.language, props.state.authToken, releaseCurrentSlotHold]
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
    : Boolean(selectedSlot) && pendingSessions > 0 && Boolean(slotHoldId) && !slotHoldLoading;
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

  /**
   * Precio por sesión individual y su moneda nativa. Para pacientes AR el catálogo
   * devuelve pesos; para US/BR/ES el código de moneda viene del package.
   */
  const individualUnitPrice = useMemo<{ amount: number; currency: string } | null>(() => {
    const oneCredit = packagePlans.find((plan) => plan.credits === 1);
    if (oneCredit) {
      return { amount: oneCredit.priceCents / 100, currency: oneCredit.currency || props.currency };
    }
    const bundle = packagePlans.find((plan) => plan.credits > 1);
    if (!bundle) {
      return null;
    }
    return {
      amount: bundle.priceCents / 100 / bundle.credits,
      currency: bundle.currency || props.currency
    };
  }, [packagePlans, props.currency]);
  const individualUnitPriceMajor = individualUnitPrice?.amount ?? null;

  const resetIndividualPurchaseUi = () => {
    setIndividualQtyOpen(false);
    setIndividualQtyDraft("1");
    setIndividualPaymentLoading(false);
    setIndividualPaymentError("");
  };

  const openIndividualPurchase = useCallback(() => {
    setCheckoutPaymentError("");
    setCheckoutPaymentPlanId(null);
    setIndividualPaymentError("");
    setIndividualQtyDraft("1");
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
    if (!isCalendarExpanded || !isMobilePortal) {
      return;
    }
    window.requestAnimationFrame(() => {
      calendarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [isCalendarExpanded, isMobilePortal]);

  useEffect(() => {
    if (
      !isCheckoutFlow
      || checkoutSource !== "dashboard"
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
  const checkoutReturnHandledRef = useRef(false);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment !== "success" && payment !== "cancel") {
      checkoutReturnHandledRef.current = false;
      return;
    }
    if (checkoutReturnHandledRef.current) {
      return;
    }
    checkoutReturnHandledRef.current = true;

    const pending = readPendingCheckoutDlocalReturn();
    clearPendingCheckoutDlocalReturn({ clearIdempotency: payment === "success" });

    const paymentId =
      pending?.paymentId?.trim()
      || searchParams.get("payment_id")?.trim()
      || searchParams.get("paymentId")?.trim()
      || null;
    const orderId = pending?.orderId?.trim() || searchParams.get("dlocalOrder")?.trim() || null;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("payment");
    nextParams.delete("purchase");
    nextParams.delete("dlocalOrder");
    nextParams.delete("payment_id");
    nextParams.delete("paymentId");
    setSearchParams(nextParams, { replace: true });

    resetIndividualPurchaseUi();
    setCheckoutPaymentPlanId(null);
    setCheckoutPaymentLoading(false);
    setIndividualPaymentLoading(false);

    if (payment === "cancel") {
      const cancelMessage = t(props.language, {
        es: "Cancelaste el pago. Podés elegir otra opción o intentar de nuevo cuando quieras.",
        en: "You cancelled payment. You can choose another option or try again whenever you like.",
        pt: "Voce cancelou o pagamento. Pode escolher outra opcao ou tentar de novo quando quiser."
      });
      if (pending?.kind === "individual") {
        setIndividualPaymentError(cancelMessage);
      } else {
        setCheckoutPaymentError(cancelMessage);
      }
      return;
    }

    void (async () => {
      if (!paymentId && !orderId) {
        const missingRefError = t(props.language, {
          es: "No pudimos confirmar la compra automáticamente. Actualizá la página; si el pago ya se realizó y no ves sesiones, contactanos.",
          en: "We couldn't confirm the purchase automatically. Refresh the page; if you already paid and sessions are missing, contact us.",
          pt: "Nao foi possivel confirmar a compra automaticamente. Atualize a pagina; se o pagamento ja foi feito e as sessoes nao aparecem, fale conosco."
        });
        if (pending?.kind === "individual") {
          setIndividualPaymentError(missingRefError);
        } else {
          setCheckoutPaymentError(missingRefError);
        }
        return;
      }

      if (props.onSyncDlocalPayment) {
        const synced = await props.onSyncDlocalPayment({ paymentId, orderId });
        if (!synced.ok) {
          const syncError = friendlyCheckoutPackageMessage(
            synced.error ?? "Could not confirm payment",
            props.language
          );
          if (pending?.kind === "individual") {
            setIndividualPaymentError(syncError);
          } else {
            setCheckoutPaymentError(syncError);
          }
          return;
        }
        if (!synced.fulfilled) {
          const pendingError = t(props.language, {
            es: "Recibimos tu pago, pero todavía lo estamos confirmando. Actualizá la página en unos segundos o escribinos si no ves las sesiones.",
            en: "We received your payment, but we're still confirming it. Refresh in a few seconds or contact us if sessions don't appear.",
            pt: "Recebemos seu pagamento, mas ainda estamos confirmando. Atualize em alguns segundos ou fale conosco se as sessoes nao aparecerem."
          });
          if (pending?.kind === "individual") {
            setIndividualPaymentError(pendingError);
          } else {
            setCheckoutPaymentError(pendingError);
          }
          return;
        }
      }

      props.onRefreshPortalFromApi?.();

      if (pending?.kind === "individual" && pending.sessionCount) {
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
            { count: String(pending.sessionCount) }
          )
        });
        return;
      }

      if (pending?.kind === "package") {
        const packageLabel =
          pending.packageName?.trim()
          || packagePlans.find((plan) => plan.id === pending.packageId)?.name
          || t(props.language, {
            es: "tu paquete",
            en: "your package",
            pt: "seu pacote"
          });
        setPackagePaymentSuccess({
          title: t(props.language, {
            es: "¡Compra confirmada!",
            en: "Purchase confirmed!",
            pt: "Compra confirmada!"
          }),
          detail: replaceTemplate(
            t(props.language, {
              es: "Acreditamos {package} en tu cuenta. Ya podés reservar turno.",
              en: "We credited {package} to your account. You can book now.",
              pt: "Creditamos {package} na sua conta. Ja pode reservar."
            }),
            { package: packageLabel }
          )
        });
        return;
      }

      setIndividualPaymentSuccess({
        title: t(props.language, {
          es: "¡Pago confirmado!",
          en: "Payment confirmed!",
          pt: "Pagamento confirmado!"
        }),
        detail: t(props.language, {
          es: "Tu compra fue procesada. Si no ves las sesiones al instante, actualizá la página en unos segundos.",
          en: "Your purchase was processed. If sessions do not appear right away, refresh in a few seconds.",
          pt: "Sua compra foi processada. Se as sessoes nao aparecerem de imediato, atualize em alguns segundos."
        })
      });
    })();
  }, [
    packagePlans,
    props.language,
    props.onRefreshPortalFromApi,
    props.onSyncDlocalPayment,
    searchParams,
    setSearchParams
  ]);

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

    if (!slotHoldId) {
      setBookingActionError(
        friendlyBookingFailureMessage("Slot hold expired or not found", props.language)
      );
      return;
    }

    const result = await props.onConfirmBooking(
      professional.id,
      selectedSlot,
      false,
      panelMode === "new" ? slotHoldId : undefined
    );
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
    holdAcquireGenerationRef.current += 1;
    void releaseCurrentSlotHold();
    setPanelMode(null);
    setEditingBookingId(null);
    setSelectedSlotId("");
    setBookingActionError("");
    setSlotHoldLoading(false);
  };

  const openCheckoutCatalog = useCallback(
    (planId?: string | null) => {
      setShowNoCreditsAlert(false);
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
  }, [resetIndividualPurchaseUi, setSearchParams]);

  const acquireSessionsHandlers = useMemo(
    () => ({
      onAssignProfessional: () => openAssignProfessionalPrompt(),
      onShowChoiceModal: () => setAcquireSessionsModalOpen(true),
      onOpenCheckout: openCheckoutCatalog,
      onOpenIndividualCheckout: openIndividualSessionsCheckoutFromModal,
      onShowNoCreditsAlert: () => setShowNoCreditsAlert(true),
      onOpenNewBookingPanel: () => {
        setShowNoCreditsAlert(false);
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
        setShowNoCreditsAlert(false);
        setSlotHoldLoading(false);
        return null;
      }
      if (pendingSessions <= 0) {
        dispatchAcquireSessions("book_without_credits");
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
    if (checkoutPaymentLoading) {
      return;
    }
    const gate = resolvePackagePurchaseGate({ pricingReady, planId: plan.id });
    if (!gate.allowed) {
      openAssignProfessionalPrompt();
      return;
    }
    void startPackageCheckout(plan);
  };

  const startPackageCheckout = async (plan: PackagePlan) => {
    if (checkoutPaymentLoading) {
      return;
    }
    setCheckoutPaymentError("");
    resetIndividualPurchaseUi();

    if (!usesDlocalCheckout) {
      if (import.meta.env.DEV) {
        void confirmPackagePurchase(plan);
        return;
      }
      setCheckoutPaymentError(
        friendlyCheckoutPackageMessage(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR, props.language)
      );
      return;
    }

    if (!packageCatalogFromApi || isClientFallbackPackagePlanId(plan.id)) {
      setCheckoutPaymentError(friendlyCheckoutPackageMessage("Catalog unavailable", props.language));
      return;
    }

    setCheckoutPaymentLoading(true);
    try {
      const purchased = await props.onPurchasePackage(plan);
      if (purchased.checkoutUrl) {
        savePendingCheckoutDlocalReturn({
          kind: "package",
          packageId: plan.id,
          packageName: plan.name,
          paymentId: purchased.paymentId,
          orderId: purchased.orderId
        });
        window.location.assign(purchased.checkoutUrl);
        return;
      }
      if (!purchased.ok) {
        setCheckoutPaymentError(
          friendlyCheckoutPackageMessage(purchased.error ?? "", props.language)
        );
      }
    } catch (error) {
      setCheckoutPaymentError(
        friendlyCheckoutPackageMessage(error instanceof Error ? error.message : "", props.language)
      );
    } finally {
      setCheckoutPaymentLoading(false);
    }
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
    void startPackageCheckout(checkoutPaymentPlan);
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

    if (!usesDlocalCheckout) {
      setIndividualQtyOpen(false);
      setIndividualPaymentError("");
      if (import.meta.env.DEV) {
        void confirmIndividualPurchase(n);
        return;
      }
      setIndividualQtyOpen(true);
      setIndividualPaymentError(
        friendlyCheckoutPackageMessage(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR, props.language)
      );
      return;
    }

    setIndividualQtyOpen(false);
    setIndividualPaymentError("");
    setIndividualPaymentLoading(true);
    void (async () => {
      try {
        const purchased = await props.onPurchaseIndividualSessions(n);
        if (purchased.checkoutUrl) {
          savePendingCheckoutDlocalReturn({
            kind: "individual",
            sessionCount: n,
            paymentId: purchased.paymentId,
            orderId: purchased.orderId
          });
          window.location.assign(purchased.checkoutUrl);
          return;
        }
        if (!purchased.ok) {
          setIndividualPaymentError(
            friendlyCheckoutPackageMessage(purchased.error ?? "", props.language)
          );
          setIndividualQtyOpen(true);
        }
      } catch (error) {
        setIndividualPaymentError(
          friendlyCheckoutPackageMessage(error instanceof Error ? error.message : "", props.language)
        );
        setIndividualQtyOpen(true);
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
        setIndividualQtyOpen(true);
        return;
      }
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
      setIndividualQtyOpen(true);
    } finally {
      setIndividualPaymentLoading(false);
    }
  };

  const confirmPackagePurchase = async (plan: PackagePlan) => {
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
    <div className="page-stack sessions-booking-page session-rn-root">
      <section
        className="sessions-hero-immersive"
        aria-label={t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
      >
        <div className="sessions-hero-banner-wrap">
          <div className="sessions-hero-banner">
            <img
              className="sessions-hero-banner-photo"
              src="/images/hero-sesiones.png"
              alt=""
              width={1200}
              height={520}
              loading="eager"
              decoding="async"
            />
            <div className="sessions-hero-banner-scrim" aria-hidden="true" />
            <div className="sessions-hero-banner-copy">
              <h1 className="sessions-hero-title-on-photo">
                {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
              </h1>
              <p className="sessions-hero-subtitle-on-photo">
                {t(props.language, {
                  es: "Gestiona tus reservas",
                  en: "Manage your bookings",
                  pt: "Gerencie suas reservas"
                })}
              </p>
            </div>
          </div>
          <div id="sessions-hero-toolbar-mount" className="sessions-hero-toolbar-mount" />
        </div>
      </section>

      <section className="sessions-hero-actions-band">
        <div className="sessions-booking-hero-layout">
          {hasProfessionalsOnPortal ? (
            <div className="sessions-hero-actions sessions-booking-hero-actions">
              <button
                className="sessions-hero-buy-button"
                type="button"
                onClick={() => dispatchAcquireSessions("buy_cta")}
              >
                {t(props.language, { es: "Adquirir nuevas sesiones", en: "Get new sessions", pt: "Adquirir novas sessoes" })}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className={`sessions-balance sessions-balance--interactive sessions-booking-hero-balance sessions-booking-balance-with-fab ${pendingSessions <= 0 ? "sessions-balance--zero" : ""}`}
            onClick={() => {
              if (pendingSessions <= 0) {
                dispatchAcquireSessions("book_without_credits");
                return;
              }
              toggleNewBookingPanel();
            }}
            aria-label={
              isMobilePortal && pendingSessions <= 0
                ? t(props.language, {
                    es: "Comprar sesiones para reservar.",
                    en: "Buy sessions to book.",
                    pt: "Comprar sessoes para reservar."
                  })
                : pendingSessions > 0
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
              {isMobilePortal && pendingSessions <= 0 ? (
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M18 6h-2V4a4 4 0 0 0-8 0v2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-8 0V4a2 2 0 1 1 4 0v2h-4Z"
                  />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V9h14v11ZM7 11h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z"
                  />
                </svg>
              )}
            </span>
          </button>
        </div>
      </section>

      <div className="sessions-booking-body">
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
                  {hasPricingProfessional
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
                if (!hasPricingProfessional) {
                  openAssignProfessionalPrompt();
                  setShowNoCreditsAlert(false);
                  return;
                }
                setAcquireSessionsModalOpen(true);
              }}
            >
              {hasPricingProfessional
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
            <div className={isMobilePortal ? "sessions-booking-mobile-only" : "sessions-booking-desktop-only"}>
              <UpcomingBookingsList
                bookings={upcomingConfirmedBookings}
                professionals={props.professionals}
                professionalPhotoMap={props.professionalPhotoMap}
                timezone={props.state.profile.timezone}
                language={props.language}
                layout={isMobilePortal ? "card" : "table"}
                surface="booking"
                onImageFallback={props.onImageFallback}
                onOpenBookingDetail={props.onOpenBookingDetail}
                editingBookingId={panelMode === "reschedule" ? editingBookingId : null}
                onReschedule={(booking) => {
                  if (!canPatientRescheduleBooking(booking.startsAt)) {
                    return;
                  }
                  holdAcquireGenerationRef.current += 1;
                  void releaseCurrentSlotHold();
                  setEditingBookingId(booking.id);
                  setSelectedSlotId(
                    findSlotIdForBooking(
                      booking.professionalId,
                      booking.startsAt,
                      booking.endsAt,
                      props.professionals
                    ) ?? ""
                  );
                  setPanelMode("reschedule");
                }}
                onOpenProfessionalReviews={openProfessionalReviews}
              />
            </div>
          </div>
        )}
      </section>

      {showPackageSection && isCheckoutFlow ? (
        <section
          ref={checkoutSectionRef}
          tabIndex={-1}
          className="content-card booking-session-card booking-card-minimal sessions-package-options-panel"
          aria-label={t(props.language, {
            es: "Adquirir nuevas sesiones",
            en: "Get new sessions",
            pt: "Adquirir novas sessoes"
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
            selectedCheckoutPlanId={selectedCheckoutPlanId}
            pricingReady={pricingReady}
            unitPriceMajor={pricingReady ? individualUnitPriceMajor : null}
            onClose={() => {
              setCheckoutPaymentLoading(false);
              setCheckoutPaymentPlanId(null);
              setCheckoutPaymentError("");
              resetIndividualPurchaseUi();
              setCheckoutFlow(false);
            }}
            onSelectCard={(planId) => setCheckoutFlow(true, planId)}
            onSelectPlan={handlePurchasePlan}
            onIndividualPurchase={() => {
              if (!pricingReady) {
                openAssignProfessionalPrompt();
                return;
              }
              openIndividualPurchase();
            }}
            onRequireProfessional={openAssignProfessionalPrompt}
            paymentLoading={checkoutPaymentLoading}
            paymentError={checkoutPaymentError}
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
                      <button
                        type="button"
                        className="professional-name-link session-history-professional-link"
                        onClick={() => openProfessionalReviews(booking.professionalId)}
                      >
                        {professionalAccessibleName(bookingProfessional)}
                      </button>
                    </div>
                    <span className={`session-status-pill ${booking.status}`}>{statusLabel}</span>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </section>

      <section ref={calendarSectionRef} className="sessions-calendar-collapsible sessions-secondary-section sessions-booking-calendar-tail">
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
            professionals={props.professionals}
            hideTitle
          />
        ) : null}
      </section>

      <PaymentActivityPanel language={props.language} authToken={props.state.authToken} />
      </div>

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
        modalProfessional={modalProfessional}
        modalProfessionalPhoto={modalProfessionalPhoto}
        onImageFallback={props.onImageFallback}
        selectedSlotId={selectedSlotId}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading}
        pendingSessions={pendingSessions}
        bookingActionError={bookingActionError}
        canConfirmBooking={canConfirmBooking}
        slotHoldLoading={slotHoldLoading}
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
        formatDateOnly={formatDateOnly}
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

      {isCheckoutFlow && individualQtyOpen && individualUnitPrice !== null ? (
        <div
          className="matching-flow-backdrop trial-checkout-backdrop"
          role="presentation"
          onClick={() => {
            if (individualPaymentLoading) {
              return;
            }
            setIndividualQtyOpen(false);
            setIndividualQtyDraft("1");
          }}
        >
          <section
            className="matching-flow-modal trial-checkout-modal checkout-individual-qty-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-individual-qty-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="trial-checkout-header">
              <div className="trial-checkout-copy">
                <p className="trial-checkout-kicker">
                  {t(props.language, { es: "Compra flexible", en: "Flexible purchase", pt: "Compra flexivel" })}
                </p>
                <h3 id="checkout-individual-qty-title">
                  {t(props.language, {
                    es: "Sesiones fuera de paquete",
                    en: "Sessions outside a bundle",
                    pt: "Sessoes fora do pacote"
                  })}
                </h3>
                <p className="trial-checkout-lead">
                  {t(props.language, {
                    es: "Elegí cuántas sesiones querés sumar. El precio por sesión es el mismo que para una compra suelta.",
                    en: "Choose how many sessions to add. The per-session price matches a single-session purchase.",
                    pt: "Escolha quantas sessoes adicionar. O preco por sessao e o de uma compra avulsa."
                  })}
                </p>
              </div>
              <button
                type="button"
                className="trial-checkout-close"
                aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
                disabled={individualPaymentLoading}
                onClick={() => {
                  setIndividualQtyOpen(false);
                  setIndividualQtyDraft("1");
                }}
              >
                ×
              </button>
            </header>

            <div className="checkout-individual-qty-presets" role="group" aria-label={t(props.language, { es: "Cantidad rápida", en: "Quick quantity", pt: "Quantidade rapida" })}>
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`checkout-individual-qty-pill ${individualQtyDraft === String(n) ? "selected" : ""}`}
                  disabled={individualPaymentLoading}
                  onClick={() => setIndividualQtyDraft(String(n))}
                >
                  {n === 1
                    ? t(props.language, { es: "1 sesión", en: "1 session", pt: "1 sessao" })
                    : replaceTemplate(t(props.language, { es: "{n} sesiones", en: "{n} sessions", pt: "{n} sessoes" }), {
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
                disabled={individualPaymentLoading}
                onChange={(event) => setIndividualQtyDraft(event.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </label>

            {(() => {
              const n = Number.parseInt(individualQtyDraft.trim(), 10);
              const ok = Number.isFinite(n) && n >= 1 && n <= 99 && individualUnitPrice !== null;
              const totalMajor = ok && individualUnitPrice ? individualUnitPrice.amount * n : null;
              const unitLabel =
                individualUnitPrice &&
                formatPatientUsdPrice({
                  usdMajor: individualUnitPrice.amount,
                  displayCurrency: props.currency,
                  language: props.language,
                  fxRates: props.fxRates,
                  maximumFractionDigits: 0
                });

              return (
                <div className="checkout-individual-qty-summary">
                  {ok && totalMajor !== null && individualUnitPrice && unitLabel ? (
                    <>
                      <div className="checkout-individual-qty-summary-row">
                        <span>{t(props.language, { es: "Precio por sesión", en: "Price per session", pt: "Preco por sessao" })}</span>
                        <strong>{unitLabel}</strong>
                      </div>
                      <div className="checkout-individual-qty-summary-row checkout-individual-qty-summary-row--total">
                        <span>{t(props.language, { es: "Total estimado", en: "Estimated total", pt: "Total estimado" })}</span>
                        <strong>
                          {formatPatientUsdPrice({
                            usdMajor: totalMajor,
                            displayCurrency: props.currency,
                            language: props.language,
                            fxRates: props.fxRates,
                            maximumFractionDigits: 0
                          })}
                        </strong>
                      </div>
                      {usesDlocalCheckout ? (
                        <p className="checkout-individual-qty-provider-note">
                          {props.state.patientMarket === "AR"
                            ? t(props.language, {
                                es: "El pago se realiza en pesos argentinos de forma segura.",
                                en: "Payment is processed securely in Argentine pesos.",
                                pt: "O pagamento e feito com seguranca em pesos argentinos."
                              })
                            : t(props.language, {
                                es: "El pago se realiza en tu moneda local de forma segura.",
                                en: "Payment is processed securely in your local currency.",
                                pt: "O pagamento e feito na sua moeda local com seguranca."
                              })}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="checkout-individual-qty-total checkout-individual-qty-total--hint">
                      {t(props.language, {
                        es: "Ingresá una cantidad válida.",
                        en: "Enter a valid quantity.",
                        pt: "Insira uma quantidade valida."
                      })}
                    </p>
                  )}
                </div>
              );
            })()}

            {individualPaymentError ? (
              <p className="trial-checkout-error" role="alert">
                {individualPaymentError}
              </p>
            ) : null}

            <footer className="trial-checkout-footer checkout-individual-qty-actions">
              <button
                type="button"
                className="trial-checkout-secondary"
                disabled={individualPaymentLoading}
                onClick={() => {
                  setIndividualQtyOpen(false);
                  setIndividualQtyDraft("1");
                }}
              >
                {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
              </button>
              <button
                type="button"
                className="matching-flow-primary trial-checkout-primary"
                onClick={() => proceedIndividualToPayment()}
                disabled={
                  individualPaymentLoading ||
                  (() => {
                    const n = Number.parseInt(individualQtyDraft.trim(), 10);
                    return !Number.isFinite(n) || n < 1 || n > 99;
                  })()
                }
              >
                {individualPaymentLoading
                  ? t(props.language, { es: "Un momento…", en: "One moment…", pt: "Um momento…" })
                  : usesDlocalCheckout
                    ? t(props.language, { es: "Continuar al pago", en: "Continue to payment", pt: "Continuar para pagamento" })
                    : t(props.language, {
                        es: "Continuar",
                        en: "Continue",
                        pt: "Continuar"
                      })}
              </button>
            </footer>
          </section>
        </div>
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
    </div>
  );
}
