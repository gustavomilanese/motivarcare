import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { formatSubscriptionPurchasePrice } from "../lib/formatSubscriptionPurchasePrice";
import { formatPatientUsdPrice } from "../lib/formatPatientUsdPrice";
import { apiRequest } from "../services/api";
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
import { useMobilePortal } from "../hooks/useMobilePortal";
import type { PortalPurchaseResult } from "../hooks/usePortalActions";
import { BookingActionModal } from "../components/booking/BookingActionModal";
import { CheckoutPackagesPanel } from "../components/booking/CheckoutPackagesPanel";
import { AssignProfessionalPromptModal } from "../components/AssignProfessionalPromptModal";
import { PaymentActivityPanel } from "../components/PaymentActivityPanel";
import { SessionsCollapsibleToggle } from "../components/SessionsCollapsibleToggle";
import { ProfessionalReviewsModal } from "../../reviews/components/ProfessionalReviewsModal";
import { acquireNewSessionsButtonLabel } from "../lib/acquireSessionsButtonLabel";
import {
  clearPersistedBookingReturnTo,
  persistBookingReturnTo,
  readPersistedBookingReturnTo,
  safeInternalReturnPath
} from "../lib/bookingReturnTo";
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
  onCancelBooking?: (bookingId: string, reason: string) => Promise<{ ok: boolean; error?: string }>;
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingReturnToRef = useRef<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [panelMode, setPanelMode] = useState<"new" | "reschedule" | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  /** Abierto desde Dashboard “Elegir nuevo horario” de prueba pagada. */
  const [trialRebookMode, setTrialRebookMode] = useState(false);
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

  const slotsFetchGenerationRef = useRef(0);
  const packagesFetchGenerationRef = useRef(0);

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
  const canBookPaidTrialRebook = props.state.trialRebookAvailable && trialRebookMode;
  const canOpenNewBooking = pendingSessions > 0 || canBookPaidTrialRebook;
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
    onPurchasePackage: props.onPurchasePackage,
    onNonDlocalCheckout: (plan) => {
      if (import.meta.env.DEV) {
        void confirmPackagePurchase(plan);
        return;
      }
      setPackageCheckoutError(
        friendlyCheckoutPackageMessage(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR, props.language)
      );
    },
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

  const formatCheckoutCharge = (amountMajor: number, currency: string): string => {
    if (currency.toUpperCase() === "ARS") {
      return `$ ${amountMajor.toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS`;
    }
    return formatPatientUsdPrice({
      usdMajor: amountMajor,
      displayCurrency: props.currency,
      language: props.language,
      fxRates: props.fxRates,
      maximumFractionDigits: 2
    });
  };

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
    if (searchParams.get("focus") !== "new-booking") {
      return;
    }

    bookingReturnToRef.current =
      safeInternalReturnPath(searchParams.get("returnTo")) ?? readPersistedBookingReturnTo();
    if (bookingReturnToRef.current) {
      persistBookingReturnTo(bookingReturnToRef.current);
    }

    const openAsTrialRebook = searchParams.get("trial") === "1" && props.state.trialRebookAvailable;

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

    if (pendingSessions <= 0 && !openAsTrialRebook) {
      setShowNoCreditsAlert(true);
      setPanelMode(null);
    } else {
      setShowNoCreditsAlert(false);
      setPanelMode("new");
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
    if (panelMode === "new") {
      setPanelMode(null);
      setSelectedSlotId("");
    }
  }, [professional?.id ?? resolvedProfessionalId]);

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
      onShowNoCreditsAlert: () => setShowNoCreditsAlert(true),
      onOpenNewBookingPanel: () => {
        setShowNoCreditsAlert(false);
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
        setShowNoCreditsAlert(false);
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
          setShowNoCreditsAlert(false);
          setTrialRebookMode(true);
          return "new";
        }
        dispatchAcquireSessions("book_without_credits");
        return null;
      }
      setShowNoCreditsAlert(false);
      setTrialRebookMode(false);
      return "new";
    });
  };

  useEffect(() => {
    if (pendingSessions > 0 && showNoCreditsAlert) {
      setShowNoCreditsAlert(false);
    }
  }, [pendingSessions, showNoCreditsAlert]);

  const handlePurchasePlan = (plan: PackagePlan) => {
    if (checkoutPaymentLoading || packageCheckoutLoading) {
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
          savePendingCheckoutDlocalReturn({
            kind: "individual",
            sessionCount: n,
            paymentId: purchased.paymentId,
            orderId: purchased.orderId
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

      {hasProfessionalsOnPortal && pendingSessions > 0 ? (
        <section className="sessions-hero-actions-band sessions-hero-actions-band--buy-only">
          <div className="sessions-hero-actions sessions-booking-hero-actions">
            <button
              className="sessions-hero-buy-button"
              type="button"
              onClick={() => dispatchAcquireSessions("buy_cta")}
            >
              {acquireNewSessionsButtonLabel(props.language)}
            </button>
          </div>
        </section>
      ) : null}

      <div className="sessions-booking-body">
      {pendingSessions <= 0 ? (
        <div
          className="sessions-balance sessions-balance--zero sessions-booking-credits-strip sessions-balance-card-with-buy"
          role="region"
          aria-label={t(props.language, {
            es: "Estado de créditos",
            en: "Credits status",
            pt: "Estado dos creditos"
          })}
        >
          <div className="sessions-balance-figure" aria-hidden="true">
            {pendingSessions}
          </div>
          <div className="sessions-balance-copy">
            <span className="sessions-balance-title">
              {t(props.language, {
                es: "Sin créditos",
                en: "No credits",
                pt: "Sem creditos"
              })}
            </span>
            <span className="sessions-balance-sub">
              {t(props.language, {
                es: "Compra un paquete para volver a reservar con tu profesional.",
                en: "Buy a package to book again with your professional.",
                pt: "Compre um pacote para reservar novamente com seu profissional."
              })}
            </span>
          </div>
          {hasProfessionalsOnPortal ? (
            <button
              className="sessions-hero-buy-button sessions-balance-inline-buy"
              type="button"
              onClick={() => dispatchAcquireSessions("buy_cta")}
            >
              {acquireNewSessionsButtonLabel(props.language)}
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          className="sessions-balance sessions-balance--interactive sessions-booking-credits-strip sessions-booking-balance-with-fab"
          onClick={() => toggleNewBookingPanel()}
          aria-label={replaceTemplate(
            t(props.language, {
              es: "Reservar sesión. Te quedan {count} en tu paquete.",
              en: "Book a session. You have {count} left in your package.",
              pt: "Reservar sessao. Restam {count} no seu pacote."
            }),
            { count: String(pendingSessions) }
          )}
        >
          <div className="sessions-balance-figure" aria-hidden="true">
            {pendingSessions}
          </div>
          <div className="sessions-balance-copy">
            <span className="sessions-balance-title">
              {t(props.language, {
                es: "Sesiones listas para agendar",
                en: "Sessions ready to book",
                pt: "Sessoes prontas para agendar"
              })}
            </span>
            <span className="sessions-balance-sub">
              {replaceTemplate(
                t(props.language, {
                  es: "Te quedan {count} en tu paquete actual.",
                  en: "You have {count} left in your current package.",
                  pt: "Restam {count} no seu pacote atual."
                }),
                { count: String(pendingSessions) }
              )}
            </span>
            <span className="sessions-balance-cta-hint">
              {t(props.language, {
                es: "Pulsa para elegir horario",
                en: "Tap to pick a time",
                pt: "Toque para escolher horario"
              })}
            </span>
          </div>
          <span className="sessions-booking-fab-in-pill" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V9h14v11ZM7 11h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z"
              />
            </svg>
          </span>
        </button>
      )}
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
            <strong>{t(props.language, { es: "Todavía no tienes sesiones reservadas", en: "You have no booked sessions yet", pt: "Voce ainda nao tem sessoes reservadas" })}</strong>
          </div>
        ) : (
          <div className="sessions-confirmed-list-root" ref={reservationsFocusRef} tabIndex={-1}>
            {isMobilePortal ? (
              <div className="sessions-booking-mobile-only">
                <UpcomingBookingsList
                  bookings={upcomingConfirmedBookings}
                  professionals={props.professionals}
                  professionalPhotoMap={props.professionalPhotoMap}
                  timezone={props.state.profile.timezone}
                  language={props.language}
                  layout="card"
                  surface="booking"
                  onImageFallback={props.onImageFallback}
                  onOpenBookingDetail={props.onOpenBookingDetail}
                  editingBookingId={panelMode === "reschedule" ? editingBookingId : null}
                  onReschedule={(booking) => openReschedulePanelForBooking(booking)}
                  onOpenProfessionalReviews={openProfessionalReviews}
                />
              </div>
            ) : (
              <div className="sessions-booking-desktop-only sessions-confirmed-calendar">
                <SessionsCalendar
                  bookings={upcomingConfirmedBookings}
                  timezone={props.state.profile.timezone}
                  language={props.language}
                  onOpenBookingDetail={props.onOpenBookingDetail}
                  onRescheduleBooking={(booking) => openReschedulePanelForBooking(booking)}
                  onCancelBooking={props.onCancelBooking ? handleCancelBookingFromCalendar : undefined}
                  cancelBusyBookingId={calendarCancelBookingId}
                  professionals={props.professionals}
                  hideTitle
                />
              </div>
            )}
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

      <section className="sessions-calendar-collapsible sessions-secondary-section sessions-history-section">
        <button
          type="button"
          className="sessions-calendar-toggle"
          aria-expanded={isHistoryExpanded}
          onClick={() => setIsHistoryExpanded((current) => !current)}
        >
          <h2 className="sessions-secondary-title">{t(props.language, { es: "Historial de sesiones", en: "Session history", pt: "Historico de sessoes" })}</h2>
          <SessionsCollapsibleToggle expanded={isHistoryExpanded} language={props.language} />
        </button>
        {isHistoryExpanded ? (
          <div className="sessions-collapsible-panel">
          {historyRegularBookings.length === 0 ? (
            <p className="sessions-collapsible-empty">
              {t(props.language, {
                es: "Todavía no tienes historial de sesiones.",
                en: "You do not have session history yet.",
                pt: "Voce ainda nao tem historico de sessoes."
              })}
            </p>
          ) : (
            <ul className="simple-list session-history-list sessions-collapsible-list">
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
                        {professionalAccessibleName(
                          bookingProfessional ?? {
                            fullName: props.state.assignedProfessionalName ?? t(props.language, {
                              es: "Profesional",
                              en: "Professional",
                              pt: "Profissional"
                            })
                          }
                        )}
                      </button>
                    </div>
                    <span className={`session-status-pill ${booking.status}`}>{statusLabel}</span>
                  </li>
                );
              })}
            </ul>
          )}
          </div>
        ) : null}
      </section>

      {isMobilePortal ? (
        <section ref={calendarSectionRef} className="sessions-calendar-collapsible sessions-secondary-section sessions-booking-calendar-tail">
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
              professionals={props.professionals}
              hideTitle
            />
            </div>
          ) : null}
        </section>
      ) : null}

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
        slotsLoading={slotsLoading}
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
              const ok = Number.isFinite(n) && n >= 1 && n <= 99 && individualUnitPriceMajor !== null;
              const quoteMatchesQty = individualQuote?.sessionCount === n;
              const unitLabel =
                quoteMatchesQty && individualQuote
                  ? formatCheckoutCharge(
                      individualQuote.chargeAmountMajor / Math.max(1, individualQuote.sessionCount),
                      individualQuote.chargeCurrency
                    )
                  : individualUnitPriceMajor !== null
                    ? formatPatientUsdPrice({
                        usdMajor: individualUnitPriceMajor,
                        displayCurrency: props.currency,
                        language: props.language,
                        fxRates: props.fxRates,
                        maximumFractionDigits: 0
                      })
                    : null;
              const totalLabel =
                quoteMatchesQty && individualQuote
                  ? formatCheckoutCharge(individualQuote.chargeAmountMajor, individualQuote.chargeCurrency)
                  : ok && individualUnitPriceMajor !== null
                    ? formatPatientUsdPrice({
                        usdMajor: individualUnitPriceMajor * n,
                        displayCurrency: props.currency,
                        language: props.language,
                        fxRates: props.fxRates,
                        maximumFractionDigits: 0
                      })
                    : null;

              return (
                <div className="checkout-individual-qty-summary">
                  {ok && totalLabel && unitLabel ? (
                    <>
                      <div className="checkout-individual-qty-summary-row">
                        <span>{t(props.language, { es: "Precio por sesión", en: "Price per session", pt: "Preco por sessao" })}</span>
                        <strong>{unitLabel}</strong>
                      </div>
                      <div className="checkout-individual-qty-summary-row checkout-individual-qty-summary-row--total">
                        <span>
                          {individualQuoteLoading
                            ? t(props.language, { es: "Calculando total…", en: "Calculating total…", pt: "Calculando total…" })
                            : t(props.language, { es: "Total a pagar", en: "Total to pay", pt: "Total a pagar" })}
                        </span>
                        <strong>{totalLabel}</strong>
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
