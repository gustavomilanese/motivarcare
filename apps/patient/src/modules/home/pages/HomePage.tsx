import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import {
  filterUpcomingPatientBookings,
  pickNextPatientBooking,
  resolveIndividualListUnitUsdFromPackages,
  resolvePackageCatalogView,
  resolveSessionListUsdMajor
} from "@therapy/patient-core";
import { resolveFxRatePerUsd } from "@therapy/i18n-config";
import { UpcomingBookingsList } from "../../booking/components/UpcomingBookingsList";
import { useAcquireSessionsDispatch } from "../../booking/hooks/useAcquireSessionsDispatch";
import { AcquireSessionsChoiceModal } from "../../app/components/AcquireSessionsChoiceModal";
import { NoSessionsAvailableModal } from "../../app/components/NoSessionsAvailableModal";
import { DashboardGuidedTour, type DashboardTourBookingContext } from "../components/GuidedTour";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { DEFAULT_PATIENT_HERO_IMAGE } from "../../app/constants";
import { API_BASE, resolvePublicAssetUrl } from "../../app/services/api";
import {
  loadPublicPackagePlans
} from "../../app/lib/packageCatalog";
import { patientUsesDlocalCheckout } from "../../app/lib/patientDlocalCheckout";
import { usePackageCheckout } from "../../app/hooks/usePackageCheckout";
import type { PortalPurchaseResult } from "../../app/hooks/usePortalActions";
import {
  portalHasPricingProfessional,
  resolvePortalPricingProfessionalId
} from "../../app/lib/patientPricingProfessional";
import { findProfessionalById, patientHasAssignedProfessional } from "../../app/lib/professionals";
import { canPatientSelfChangeProfessional } from "../../app/lib/canPatientSelfChangeProfessional";
import { countAvailablePatientSessions } from "../../app/lib/countAvailablePatientSessions";
import {
  readPatientHomeVariant,
  PATIENT_HOME_VARIANT_EVENT,
  resolveHomeView,
  shouldMountDashboardRnHome,
  type PatientHomeVariant
} from "../lib/patientHomeVariant";
import { resolveDashboardNextActionKind } from "../lib/resolveDashboardNextActionKind";
import { fetchProfessionalAvailability } from "../../matching/services/availability";
import { useMobilePortal } from "../../app/hooks/useMobilePortal";
import { DashboardHomePurchaseModal } from "../ml/PurchaseModal";
import { DashboardHomeChatModal } from "../ml/ChatModal";
import { DashboardHomeProfessionalProfileModal } from "../ml/ProfessionalProfileModal";
import { DashboardNextActionHome } from "../ml/NextActionHome";
import { ClassicHome } from "../classic/ClassicHome";
import type {
  Booking,
  PackagePlan,
  PatientAppState,
  Professional,
  TimeSlot
} from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const ASSIGN_PRO_MODAL_DISMISS_KEY = "mc.assignProPromptDismissed";

function firstUpcomingSpotlightStorageKey(userId: string): string {
  return `motivarcare.patient.firstUpcomingSpotlight.v2.${userId}`;
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

function packageUnitPriceMajor(plan: PackagePlan): number {
  return plan.priceCents / 100 / Math.max(1, plan.credits);
}

export function HomePage(props: {
  state: PatientAppState;
  authToken: string | null;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  language: AppLanguage;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onGoToReservations: () => void;
  onRescheduleBooking: (bookingId: string) => void;
  onGoToBooking: (professionalId: string) => void;
  onGoToProfessional: (professionalId: string) => void;
  onGoToChat: (professionalId: string) => void;
  onSetActiveChatProfessional: (professionalId: string) => void;
  onSendChatMessage: (professionalId: string, text: string) => void;
  onMarkChatRead: (professionalId: string) => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onPlanTrialFromDashboard: (
    professionalId: string,
    slot: TimeSlot
  ) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
  onStartPackagePurchase: (plan: PackagePlan) => void;
  onPurchasePackage: (plan: PackagePlan) => Promise<PortalPurchaseResult>;
  /** Sesiones → checkout de paquetes (sin plan concreto; el catálogo carga en destino). */
  onNavigateToSessionsCheckout: () => void;
  /** Abre Sesiones en checkout enfocado en compra suelta (misma UX que el panel de paquetes). */
  onNavigateToIndividualSessions: () => void;
  /** Flujo de matching + reserva de prueba (p. ej. tras posponer onboarding). */
  onNavigateToBookTrial: () => void;
  /** Reagendar prueba ya pagada: va a Sesiones (profesional asignado), no al matching. */
  onNavigateToRebookTrial: () => void;
  /** Sin profesional asignado: volver al matching del onboarding para elegir uno. */
  onNavigateToAssignProfessional: () => void;
  /** Cambio self-serve (solo visible con 0 créditos y sin reservas). */
  onNavigateToChangeProfessional: () => void;
  /** El usuario eligió «Lo hago después» en el modal de Calendar: CTA para reabrir OAuth. */
  showPatientGoogleCalendarReconnectCta?: boolean;
  onOpenPatientGoogleCalendarConnect?: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobilePortal = useMobilePortal();
  const [homeVariant, setHomeVariant] = useState<PatientHomeVariant>(() => readPatientHomeVariant());
  useEffect(() => {
    const sync = () => setHomeVariant(readPatientHomeVariant());
    window.addEventListener(PATIENT_HOME_VARIANT_EVENT, sync);
    return () => window.removeEventListener(PATIENT_HOME_VARIANT_EVENT, sync);
  }, []);
  const meetHintHandledRef = useRef(false);
  const [meetJoinHighlight, setMeetJoinHighlight] = useState(false);
  const [sessionRnLayout, setSessionRnLayout] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 680px)").matches : false
  );
  const [firstUpcomingSpotlight, setFirstUpcomingSpotlight] = useState(false);
  const [googleCalendarCtaPulse, setGoogleCalendarCtaPulse] = useState(false);
  const now = Date.now();
  const assignedProfessionalId = props.state.assignedProfessionalId?.trim() ?? "";
  const selectedProfessionalId = props.state.selectedProfessionalId?.trim() ?? "";
  const upcomingConfirmedBookings = filterUpcomingPatientBookings(props.state.bookings, now);
  const upcomingBookingProfessionalIds = upcomingConfirmedBookings.map((booking) => booking.professionalId);
  const hasPricingProfessional = portalHasPricingProfessional({
    assignedProfessionalId: props.state.assignedProfessionalId,
    selectedProfessionalId: props.state.selectedProfessionalId,
    bookings: props.state.bookings,
    upcomingBookingProfessionalIds
  });
  const hasAssignedProfessional = patientHasAssignedProfessional(props.state.assignedProfessionalId);
  const canSelfChangeProfessional = canPatientSelfChangeProfessional({
    creditsRemaining: props.state.subscription.creditsRemaining,
    trialRebookAvailable: props.state.trialRebookAvailable,
    bookings: props.state.bookings,
    assignedProfessionalId: props.state.assignedProfessionalId,
    nowMs: now
  });
  const canChangeProfessionalForNewPackage =
    !assignedProfessionalId
    || countAvailablePatientSessions({
      creditsRemaining: props.state.subscription.creditsRemaining,
      trialRebookAvailable: props.state.trialRebookAvailable
    }) <= 0;
  const pricingProfessionalId =
    resolvePortalPricingProfessionalId({
      assignedProfessionalId: props.state.assignedProfessionalId,
      selectedProfessionalId: props.state.selectedProfessionalId,
      bookings: props.state.bookings,
      upcomingBookingProfessionalIds
    }) ?? "";
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialProfessionalId, setTrialProfessionalId] = useState(props.state.assignedProfessionalId ?? props.state.selectedProfessionalId);
  const [trialSlotId, setTrialSlotId] = useState("");
  const [trialSaveBusy, setTrialSaveBusy] = useState(false);
  const [trialSaveError, setTrialSaveError] = useState<string | null>(null);
  const [liveTrialSlots, setLiveTrialSlots] = useState<TimeSlot[]>([]);
  const [liveTrialSlotsLoading, setLiveTrialSlotsLoading] = useState(false);
  const [acquireSessionsModalOpen, setAcquireSessionsModalOpen] = useState(false);
  const [homePurchaseModalOpen, setHomePurchaseModalOpen] = useState(false);
  const [noSessionsRedirectModalOpen, setNoSessionsRedirectModalOpen] = useState(false);
  const [homeChatModalOpen, setHomeChatModalOpen] = useState(false);
  const [homeProfileModalOpen, setHomeProfileModalOpen] = useState(false);
  const [assignProModalOpen, setAssignProModalOpen] = useState(false);
  const openHomeChat = useCallback(
    (professionalId: string) => {
      const id = professionalId.trim();
      if (!id) return;
      if (isMobilePortal) {
        props.onGoToChat(id);
        return;
      }
      props.onSetActiveChatProfessional(id);
      setHomeChatModalOpen(true);
    },
    [isMobilePortal, props.onGoToChat, props.onSetActiveChatProfessional]
  );
  const dashboardSpotlightBlockersRef = useRef(false);
  dashboardSpotlightBlockersRef.current =
    assignProModalOpen ||
    acquireSessionsModalOpen ||
    homePurchaseModalOpen ||
    noSessionsRedirectModalOpen ||
    homeChatModalOpen ||
    homeProfileModalOpen ||
    trialModalOpen;
  /** `null` = aún cargando hero desde API (evita mostrar un default distinto y luego reemplazar). */
  const [landingPatientHeroImage, setLandingPatientHeroImage] = useState<string | null>(null);
  const hasProfessionalsOnPortal = props.professionals.length > 0;
  const [packageCatalogFromApi, setPackageCatalogFromApi] = useState(false);
  const [packagePlans, setPackagePlans] = useState<PackagePlan[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [featuredPackageId, setFeaturedPackageId] = useState<string | null>(null);
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
    featuredPackageId: displayFeaturedPackageId,
    packagesLoadingHint
  } = packageCatalogView;
  const showChooseProfessionalCta = !hasPricingProfessional || packagesLoadingHint === "unpriced_formats";
  const openChooseProfessional = useCallback(() => {
    setAssignProModalOpen(true);
  }, []);
  const defaultPackagePlan =
    displayPackagePlans.find((plan) => plan.id === displayFeaturedPackageId) ?? displayPackagePlans[0] ?? null;
  const nextBooking = pickNextPatientBooking(props.state.bookings, now);
  const confirmedBookings = props.state.bookings.filter((booking) => booking.status === "confirmed");
  const trialBookings = confirmedBookings.filter((booking) => booking.bookingMode === "trial");
  const activeTrialBooking = trialBookings
    .filter((booking) => new Date(booking.endsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;
  const completedTrialBooking = trialBookings
    .filter((booking) => new Date(booking.endsAt).getTime() < now)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0] ?? null;
  const hasTrialPlanned = trialBookings.some((booking) => new Date(booking.endsAt).getTime() >= now);
  const hasCompletedTrial = Boolean(completedTrialBooking);
  const canRebookPaidTrial = props.state.trialRebookAvailable && !hasTrialPlanned;
  const trialStatus: "pending" | "reserved" | "completed" | "rebook" = hasCompletedTrial
    ? "completed"
    : hasTrialPlanned
      ? "reserved"
      : canRebookPaidTrial
        ? "rebook"
        : "pending";
  const nextConfirmedBooking = nextBooking ?? confirmedBookings[0] ?? null;
  const fallbackBooking = confirmedBookings[0] ?? null;
  const activeProfessionalBooking = nextBooking ?? fallbackBooking;
  const activeProfessional = activeProfessionalBooking
    ? findProfessionalById(activeProfessionalBooking.professionalId, props.professionals)
    : props.state.assignedProfessionalId
      ? props.professionals.find((item) => item.id === props.state.assignedProfessionalId) ?? null
      : null;
  const activeTrialProfessional = activeTrialBooking
    ? findProfessionalById(activeTrialBooking.professionalId, props.professionals)
    : null;
  const activeTrialSlotId = activeTrialProfessional
    ? activeTrialProfessional.slots.find(
        (slot) => slot.startsAt === activeTrialBooking?.startsAt && slot.endsAt === activeTrialBooking?.endsAt
      )?.id ?? ""
    : "";
  const trialProfessional = findProfessionalById(
    activeTrialBooking?.professionalId ?? trialProfessionalId,
    props.professionals
  );
  /** Preferir slots vivos del API; si aún cargan, no usar el catálogo estático (puede no existir en agenda real). */
  const availableTrialSlots = useMemo(() => {
    const currentId = activeTrialBooking
      ? `${activeTrialBooking.startsAt}__${activeTrialBooking.endsAt}`
      : "";
    const fromLive = liveTrialSlots.filter(
      (slot) =>
        !props.state.bookedSlotIds.includes(slot.id)
        || (activeTrialBooking
          && slot.startsAt === activeTrialBooking.startsAt
          && slot.endsAt === activeTrialBooking.endsAt)
    );
    if (liveTrialSlotsLoading || liveTrialSlots.length > 0 || trialModalOpen) {
      if (
        activeTrialBooking
        && !fromLive.some(
          (slot) =>
            slot.startsAt === activeTrialBooking.startsAt && slot.endsAt === activeTrialBooking.endsAt
        )
      ) {
        return [
          {
            id: currentId || `current-trial-${activeTrialBooking.id}`,
            startsAt: activeTrialBooking.startsAt,
            endsAt: activeTrialBooking.endsAt
          },
          ...fromLive
        ];
      }
      return fromLive;
    }
    return (trialProfessional?.slots ?? []).filter(
      (slot) => !props.state.bookedSlotIds.includes(slot.id) || slot.id === activeTrialSlotId
    );
  }, [
    activeTrialBooking,
    activeTrialSlotId,
    liveTrialSlots,
    liveTrialSlotsLoading,
    props.state.bookedSlotIds,
    trialModalOpen,
    trialProfessional?.slots
  ]);
  const selectedTrialSlot = availableTrialSlots.find((slot) => slot.id === trialSlotId) ?? null;

  const openTrialModal = () => {
    if (!hasTrialPlanned || !activeTrialBooking) {
      return;
    }
    const initialProfessionalId = activeTrialBooking.professionalId;
    setTrialProfessionalId(initialProfessionalId);
    setTrialSlotId(
      activeTrialSlotId
      || `${activeTrialBooking.startsAt}__${activeTrialBooking.endsAt}`
    );
    setTrialSaveError(null);
    setTrialSaveBusy(false);
    setLiveTrialSlots([]);
    setTrialModalOpen(true);
  };

  useEffect(() => {
    if (!trialModalOpen || !activeTrialBooking?.professionalId) {
      return;
    }
    let cancelled = false;
    setLiveTrialSlotsLoading(true);
    void fetchProfessionalAvailability(activeTrialBooking.professionalId, props.authToken)
      .then((slots) => {
        if (cancelled) {
          return;
        }
        setLiveTrialSlots(
          slots.map((slot) => ({
            id: slot.id,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt
          }))
        );
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Could not load trial reschedule slots", error);
        setTrialSaveError(
          t(props.language, {
            es: "No pudimos cargar horarios disponibles. Cerrá y volvé a intentar.",
            en: "We couldn’t load available times. Close and try again.",
            pt: "Nao foi possivel carregar horarios. Feche e tente de novo."
          })
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLiveTrialSlotsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeTrialBooking?.professionalId, props.authToken, props.language, trialModalOpen]);

  const trialDetailBooking = activeTrialBooking ?? completedTrialBooking;
  const trialCardClickable = Boolean(trialDetailBooking);

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

    if (!hasPricingProfessional) {
      setPackagePlans([]);
      setFeaturedPackageId(null);
      setPackageCatalogFromApi(false);
      setPackagesLoading(false);
      return () => {
        active = false;
      };
    }

    setPackagesLoading(true);
    void loadPublicPackagePlans({
      language: props.language,
      professionalId: pricingProfessionalId,
      market: props.state.patientMarket,
      t: (values) => t(props.language, values)
    })
      .then((catalog) => {
        if (active) {
          setPackagePlans(catalog.plans);
          setFeaturedPackageId(catalog.featuredPackageId);
          setPackageCatalogFromApi(catalog.fromApi);
        }
      })
      .finally(() => {
        if (active) {
          setPackagesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [hasPricingProfessional, pricingProfessionalId, props.language, props.state.patientMarket]);

  useEffect(() => {
    if (hasPricingProfessional) {
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
  }, [hasPricingProfessional]);

  const usesDlocalCheckout = useMemo(
    () =>
      patientUsesDlocalCheckout({
        patientMarket: props.state.patientMarket,
        residencyCountry: props.state.profileResidencyCountry
      }),
    [props.state.patientMarket, props.state.profileResidencyCountry]
  );

  const { packageCheckoutLoading, packageCheckoutError, startPackageCheckout } = usePackageCheckout({
    language: props.language,
    pricingReady,
    packageCatalogFromApi,
    usesDlocalCheckout,
    onPurchasePackage: props.onPurchasePackage,
    onNonDlocalCheckout: (plan) => props.onStartPackagePurchase(plan),
    onGateBlocked: () => setAssignProModalOpen(true)
  });

  const handleStartPackagePurchase = useCallback(
    (plan: PackagePlan) => {
      void startPackageCheckout(plan);
    },
    [startPackageCheckout]
  );

  const pricingProfessional = pricingProfessionalId
    ? findProfessionalById(pricingProfessionalId, props.professionals)
    : null;

  const individualUnitHome = useMemo(() => {
    const sessionListUsdMajor = resolveSessionListUsdMajor({
      sessionPriceUsd: pricingProfessional?.sessionPriceUsd ?? null,
      arsPerUsd: resolveFxRatePerUsd("ARS", props.fxRates)
    });
    return resolveIndividualListUnitUsdFromPackages(packagePlans, sessionListUsdMajor);
  }, [packagePlans, pricingProfessional?.sessionPriceUsd, props.fxRates]);
  const canIndividualCtaHome = pricingReady && individualUnitHome !== null && packagePlans.length > 0;
  const availableSessions = countAvailablePatientSessions({
    creditsRemaining: props.state.subscription.creditsRemaining,
    trialRebookAvailable: props.state.trialRebookAvailable
  });

  const acquireSessionsHandlers = useMemo(
    () => ({
      onAssignProfessional: () => setAssignProModalOpen(true),
      onShowChoiceModal: () => {
        if (homeVariant === "next") {
          setHomePurchaseModalOpen(true);
          return;
        }
        setAcquireSessionsModalOpen(true);
      },
      onOpenCheckout: (planId?: string | null) => {
        if (planId) {
          const plan = displayPackagePlans.find((item) => item.id === planId);
          if (plan) {
            handleStartPackagePurchase(plan);
            return;
          }
        }
        if (!pricingReady) {
          setAssignProModalOpen(true);
          return;
        }
        if (homeVariant === "next") {
          setHomePurchaseModalOpen(true);
          return;
        }
        props.onNavigateToSessionsCheckout();
      },
      onOpenIndividualCheckout: () => {
        if (!pricingReady) {
          setAssignProModalOpen(true);
          return;
        }
        props.onNavigateToIndividualSessions();
      },
      onShowNoCreditsAlert: () => {
        setNoSessionsRedirectModalOpen(true);
      },
      onOpenNewBookingPanel: () => {
        if (pricingProfessionalId) {
          props.onGoToBooking(pricingProfessionalId);
        }
      }
    }),
    [
      displayPackagePlans,
      handleStartPackagePurchase,
      homeVariant,
      pricingReady,
      pricingProfessionalId,
      props.onGoToBooking,
      props.onNavigateToIndividualSessions,
      props.onNavigateToSessionsCheckout
    ]
  );

  const { dispatchAcquireSessions } = useAcquireSessionsDispatch({
    isMobilePortal,
    hasAssignedProfessional: hasPricingProfessional,
    pricingReady,
    creditsRemaining: availableSessions,
    packagePlans: displayPackagePlans,
    featuredPackageId: displayFeaturedPackageId,
    handlers: acquireSessionsHandlers
  });

  const rnUpcomingSlice = upcomingConfirmedBookings.slice(0, 3);
  const showGoogleCalendarCta = Boolean(
    props.showPatientGoogleCalendarReconnectCta && props.onOpenPatientGoogleCalendarConnect
  );

  const firstMeetBookingId = useMemo(() => {
    for (const b of upcomingConfirmedBookings) {
      const j = typeof b.joinUrl === "string" ? b.joinUrl.trim() : "";
      if (j) {
        return b.id;
      }
    }
    return null;
  }, [upcomingConfirmedBookings]);

  const upcomingTourDependency = upcomingConfirmedBookings
    .map((b) => `${b.id}:${typeof b.joinUrl === "string" ? b.joinUrl.trim().length : 0}`)
    .join("|");

  const dashboardTourBookingContext: DashboardTourBookingContext | null = useMemo(() => {
    if (upcomingConfirmedBookings.length === 0) {
      return null;
    }
    return {
      hasUpcomingConfirmed: true,
      hasUpcomingMeetLink: upcomingConfirmedBookings.some(
        (b) => typeof b.joinUrl === "string" && b.joinUrl.trim().length > 0
      )
    };
  }, [upcomingTourDependency]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const mq = window.matchMedia("(max-width: 680px)");
    const sync = () => setSessionRnLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    meetHintHandledRef.current = false;
  }, [props.state.session?.id]);

  useEffect(() => {
    if (meetHintHandledRef.current) {
      return undefined;
    }
    if (searchParams.get("meet_hint") !== "1") {
      return undefined;
    }
    meetHintHandledRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("meet_hint");
    setSearchParams(next, { replace: true });
    setMeetJoinHighlight(true);
    const tid = window.setTimeout(() => setMeetJoinHighlight(false), 9000);
    return () => window.clearTimeout(tid);
  }, [searchParams, setSearchParams]);

  /** Spotlight una sola vez por usuario en el panel de próximas reservas (complementa el tour guiado). */
  useEffect(() => {
    const uid = props.state.session?.id != null ? String(props.state.session.id).trim() : "";
    if (!uid || upcomingConfirmedBookings.length === 0) {
      return undefined;
    }
    let cancelled = false;
    let endSpotlightTimer: number | undefined;
    try {
      if (window.localStorage.getItem(firstUpcomingSpotlightStorageKey(uid)) === "1") {
        return undefined;
      }
    } catch {
      return undefined;
    }

    const startTimer = window.setTimeout(() => {
      if (cancelled || dashboardSpotlightBlockersRef.current) {
        return;
      }
      try {
        window.localStorage.setItem(firstUpcomingSpotlightStorageKey(uid), "1");
      } catch {
        // ignore
      }
      setFirstUpcomingSpotlight(true);
      endSpotlightTimer = window.setTimeout(() => {
        setFirstUpcomingSpotlight(false);
      }, 6800);
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (endSpotlightTimer) {
        window.clearTimeout(endSpotlightTimer);
      }
    };
  }, [props.state.session?.id, upcomingTourDependency, assignProModalOpen, acquireSessionsModalOpen, homePurchaseModalOpen, noSessionsRedirectModalOpen, homeChatModalOpen, homeProfileModalOpen, trialModalOpen]);

  useEffect(() => {
    if (!showGoogleCalendarCta) {
      setGoogleCalendarCtaPulse(false);
      return undefined;
    }
    setGoogleCalendarCtaPulse(true);
    const tid = window.setTimeout(() => setGoogleCalendarCtaPulse(false), 7000);
    return () => {
      window.clearTimeout(tid);
      setGoogleCalendarCtaPulse(false);
    };
  }, [showGoogleCalendarCta]);

  const upcomingSpotlightRing = firstUpcomingSpotlight || meetJoinHighlight;

  const nextActionKind = resolveDashboardNextActionKind({
    hasAssignedProfessional,
    trialRebookAvailable: Boolean(props.state.trialRebookAvailable && !hasTrialPlanned),
    hasNextBooking: Boolean(nextBooking),
    trialPending: trialStatus === "pending",
    availableSessions
  });

  const dashboardIntroTitle = t(props.language, {
    es: "Gestioná tu bienestar desde acá",
    en: "Manage your wellbeing here",
    pt: "Gerencie seu bem-estar aqui"
  });
  const dashboardIntroBody = t(props.language, {
    es: "Reservá sesiones, explorá bienestar y hablá con Maca.",
    en: "Book sessions, explore wellness, and chat with Maca.",
    pt: "Reserve sessões, explore bem-estar e fale com a Maca."
  });

  return (
    <div className="page-stack sessions-page-layout patient-dashboard-home session-rn-root">
      {resolveHomeView(homeVariant) === "ml" ? (
        <DashboardNextActionHome
          language={props.language}
          timezone={props.state.profile.timezone}
          currency={props.currency}
          fxRates={props.fxRates}
          heroImage={landingPatientHeroImage}
          onHeroFallback={props.onHeroFallback}
          onImageFallback={props.onImageFallback}
          availableSessions={availableSessions}
          actionKind={nextActionKind}
          nextBooking={nextBooking}
          activeProfessional={activeProfessional}
          professionalPhotoMap={props.professionalPhotoMap}
          canSelfChangeProfessional={canSelfChangeProfessional}
          assignedProfessionalName={props.state.assignedProfessionalName?.trim() || null}
          showGoogleCalendarCta={showGoogleCalendarCta}
          googleCalendarCtaPulse={googleCalendarCtaPulse}
          onOpenPatientGoogleCalendarConnect={props.onOpenPatientGoogleCalendarConnect}
          onNavigateToAssignProfessional={props.onNavigateToAssignProfessional}
          onNavigateToRebookTrial={props.onNavigateToRebookTrial}
          onNavigateToBookTrial={props.onNavigateToBookTrial}
          trialStatus={trialStatus}
          onGoToBooking={props.onGoToBooking}
          onBuySessions={() => setHomePurchaseModalOpen(true)}
          onBookWithoutCredits={() => setNoSessionsRedirectModalOpen(true)}
          onOpenBookingDetail={props.onOpenBookingDetail}
          onRescheduleBooking={props.onRescheduleBooking}
          onGoToChat={openHomeChat}
          onOpenProfessionalProfile={() => setHomeProfileModalOpen(true)}
          onNavigateToChangeProfessional={props.onNavigateToChangeProfessional}
          onGoToReservations={props.onGoToReservations}
          upcomingBookings={upcomingConfirmedBookings}
          professionals={props.professionals}
          pricingProfessionalId={pricingProfessionalId}
          isMobilePortal={isMobilePortal}
          firstMeetBookingId={firstMeetBookingId}
          joinTourPulse={meetJoinHighlight}
          upcomingSpotlightRing={upcomingSpotlightRing}
        />
      ) : (
        <ClassicHome
          language={props.language}
          currency={props.currency}
          fxRates={props.fxRates}
          timezone={props.state.profile.timezone}
          state={props.state}
          professionals={props.professionals}
          professionalPhotoMap={props.professionalPhotoMap}
          landingPatientHeroImage={landingPatientHeroImage}
          dashboardIntroTitle={dashboardIntroTitle}
          dashboardIntroBody={dashboardIntroBody}
          trialStatus={trialStatus}
          activeTrialBooking={activeTrialBooking}
          completedTrialBooking={completedTrialBooking}
          hasTrialPlanned={hasTrialPlanned}
          trialCardClickable={trialCardClickable}
          upcomingConfirmedBookings={upcomingConfirmedBookings}
          upcomingSpotlightRing={upcomingSpotlightRing}
          nextConfirmedBooking={nextConfirmedBooking}
          nextBooking={nextBooking}
          availableSessions={availableSessions}
          activeProfessional={activeProfessional}
          canSelfChangeProfessional={canSelfChangeProfessional}
          showGoogleCalendarCta={showGoogleCalendarCta}
          googleCalendarCtaPulse={googleCalendarCtaPulse}
          firstMeetBookingId={firstMeetBookingId}
          meetJoinHighlight={meetJoinHighlight}
          sessionRnLayout={sessionRnLayout}
          isMobilePortal={isMobilePortal}
          showPackageSection={showPackageSection}
          defaultPackagePlan={defaultPackagePlan}
          showChooseProfessionalCta={showChooseProfessionalCta}
          pricingReady={pricingReady}
          packagesLoadingHint={packagesLoadingHint}
          canIndividualCtaHome={canIndividualCtaHome}
          displayPackagePlans={displayPackagePlans}
          displayFeaturedPackageId={displayFeaturedPackageId}
          packageCheckoutLoading={packageCheckoutLoading}
          packageCheckoutError={packageCheckoutError}
          onHeroFallback={props.onHeroFallback}
          onImageFallback={props.onImageFallback}
          onGoToReservations={props.onGoToReservations}
          onGoToBooking={props.onGoToBooking}
          onOpenBookingDetail={props.onOpenBookingDetail}
          onRescheduleBooking={props.onRescheduleBooking}
          onNavigateToBookTrial={props.onNavigateToBookTrial}
          onNavigateToRebookTrial={props.onNavigateToRebookTrial}
          onNavigateToChangeProfessional={props.onNavigateToChangeProfessional}
          onNavigateToIndividualSessions={props.onNavigateToIndividualSessions}
          onOpenPatientGoogleCalendarConnect={props.onOpenPatientGoogleCalendarConnect}
          onOpenTrialModal={openTrialModal}
          onOpenProfileModal={() => setHomeProfileModalOpen(true)}
          onOpenChat={openHomeChat}
          onChooseProfessional={openChooseProfessional}
          onAcquireSessions={dispatchAcquireSessions}
          onStartPackagePurchase={handleStartPackagePurchase}
          onNavigateToAssignProfessional={props.onNavigateToAssignProfessional}
        />
      )}

      {shouldMountDashboardRnHome(resolveHomeView(homeVariant)) ? (
      <div className="dashboard-rn-home" aria-label={t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}>
        <div className="dashboard-rn-scroll" data-tour="patient-tour-hero-rn">
          <h2 className="dashboard-home-intro-heading">{dashboardIntroTitle}</h2>
          <p className="dashboard-home-intro-lead">{dashboardIntroBody}</p>
          <div
            className="dashboard-rn-toolbar"
            data-tour="patient-tour-rn-toolbar"
            aria-label={t(props.language, { es: "Saldo y agendar", en: "Balance and book", pt: "Saldo e agendar" })}
          >
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
                className={`dashboard-rn-fab${
                  isMobilePortal && availableSessions <= 0 ? " dashboard-rn-fab--buy" : " dashboard-rn-fab--book"
                }`}
                onClick={() => {
                  if (!hasAssignedProfessional) {
                    props.onNavigateToAssignProfessional();
                    return;
                  }
                  if (isMobilePortal && availableSessions <= 0) {
                    dispatchAcquireSessions("book_without_credits");
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
                disabled={
                  hasAssignedProfessional
                  && !(isMobilePortal && availableSessions <= 0)
                  && !pricingProfessionalId
                  && trialStatus !== "pending"
                }
                aria-label={t(props.language, {
                  es: !hasAssignedProfessional
                    ? "Elegir profesional"
                    : isMobilePortal && availableSessions <= 0
                      ? "Comprar sesiones"
                      : "Agendar una sesión",
                  en: !hasAssignedProfessional
                    ? "Choose a professional"
                    : isMobilePortal && availableSessions <= 0
                      ? "Buy sessions"
                      : "Book a session",
                  pt: !hasAssignedProfessional
                    ? "Escolher profissional"
                    : isMobilePortal && availableSessions <= 0
                      ? "Comprar sessoes"
                      : "Agendar uma sessao"
                })}
              >
                {isMobilePortal && availableSessions <= 0 ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M18 6h-2V4a4 4 0 0 0-8 0v2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-8 0V4a2 2 0 1 1 4 0v2h-4Z"
                    />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V9h14v11ZM7 11h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {showGoogleCalendarCta ? (
            <div className="dashboard-rn-google-cta-wrap">
              <button
                type="button"
                className={`dashboard-rn-google-calendar-button${googleCalendarCtaPulse ? " patient-google-calendar-cta--pulse" : ""}`}
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
            className={`dashboard-rn-section${upcomingSpotlightRing ? " patient-dashboard-upcoming-spotlight" : ""}`}
            data-tour="patient-tour-bookings-rn"
          >
            <div className="dashboard-rn-section-head">
              <h2 className="dashboard-rn-section-title">
                {t(props.language, { es: "Próximas Sesiones", en: "Upcoming Sessions", pt: "Próximas Sessões" })}
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
                    ? availableSessions > 0
                      ? t(props.language, {
                          es: "Tocá el calendario para elegir horario.",
                          en: "Tap the calendar to pick a time.",
                          pt: "Toque no calendario para escolher horario."
                        })
                      : t(props.language, {
                          es: "Tocá la bolsa para comprar sesiones.",
                          en: "Tap the bag to buy sessions.",
                          pt: "Toque na bolsa para comprar sessoes."
                        })
                    : t(props.language, {
                        es: "Elegí un profesional con + para empezar a agendar.",
                        en: "Pick a professional with + to start booking.",
                        pt: "Escolha um profissional com + para comecar a agendar."
                      })}
                </p>
              </div>
            ) : (
              <div className="dashboard-rn-session-list">
                <UpcomingBookingsList
                  bookings={rnUpcomingSlice}
                  professionals={props.professionals}
                  professionalPhotoMap={props.professionalPhotoMap}
                  timezone={props.state.profile.timezone}
                  language={props.language}
                  layout="card"
                  surface="dashboard"
                  onImageFallback={props.onImageFallback}
                  onOpenBookingDetail={props.onOpenBookingDetail}
                  onReschedule={(booking) => props.onRescheduleBooking(booking.id)}
                  firstMeetBookingId={firstMeetBookingId}
                  joinTourPulse={meetJoinHighlight && sessionRnLayout}
                />
              </div>
            )}
          </section>
        </div>
      </div>
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
                  value={activeTrialBooking?.professionalId ?? trialProfessionalId}
                  disabled
                  aria-readonly="true"
                >
                  {(activeTrialProfessional
                    ? [activeTrialProfessional]
                    : props.professionals.filter((item) => item.id === trialProfessionalId)
                  ).map((item) => (
                    <option key={item.id} value={item.id}>
                      {professionalAccessibleName(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t(props.language, { es: "Slot disponible", en: "Available slot", pt: "Horario disponivel" })}
                <select
                  value={trialSlotId}
                  onChange={(event) => {
                    setTrialSaveError(null);
                    setTrialSlotId(event.target.value);
                  }}
                  disabled={trialSaveBusy || liveTrialSlotsLoading}
                >
                  <option value="">
                    {liveTrialSlotsLoading
                      ? t(props.language, {
                          es: "Cargando horarios…",
                          en: "Loading times…",
                          pt: "Carregando horarios…"
                        })
                      : availableTrialSlots.length === 0
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
                  es: "Actualizarás la sesión de prueba ya reservada. El cambio se guarda en el servidor y también lo ve tu profesional.",
                  en: "You will update your reserved trial session. The change is saved on the server and your professional will see it too.",
                  pt: "Voce atualizara a sessao de teste ja reservada. A mudanca e salva no servidor e seu profissional tambem vera."
                })}
              </p>
              {trialSaveError ? (
                <p className="form-error" role="alert">
                  {trialSaveError}
                </p>
              ) : null}
              <div className="button-row">
                <button
                  className="primary"
                  type="button"
                  disabled={!selectedTrialSlot || !hasTrialPlanned || trialSaveBusy || liveTrialSlotsLoading || !activeTrialBooking}
                  onClick={() => {
                    if (!selectedTrialSlot || !activeTrialBooking) {
                      return;
                    }
                    setTrialSaveBusy(true);
                    setTrialSaveError(null);
                    void Promise.resolve(
                      props.onPlanTrialFromDashboard(activeTrialBooking.professionalId, selectedTrialSlot)
                    ).then((result) => {
                      setTrialSaveBusy(false);
                      if (!result.ok) {
                        setTrialSaveError(
                          result.error
                          ?? t(props.language, {
                            es: "No pudimos guardar el cambio. Probá de nuevo.",
                            en: "We couldn’t save the change. Please try again.",
                            pt: "Nao foi possivel salvar a alteracao. Tente novamente."
                          })
                        );
                        return;
                      }
                      setTrialModalOpen(false);
                    });
                  }}
                >
                  {trialSaveBusy
                    ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                    : t(props.language, { es: "Guardar cambios", en: "Save changes", pt: "Salvar alteracoes" })}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

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

      {noSessionsRedirectModalOpen ? (
        <NoSessionsAvailableModal
          language={props.language}
          onClose={() => setNoSessionsRedirectModalOpen(false)}
          onContinueToPackages={() => {
            setNoSessionsRedirectModalOpen(false);
            setHomePurchaseModalOpen(true);
          }}
        />
      ) : null}

      {homePurchaseModalOpen ? (
        <DashboardHomePurchaseModal
          language={props.language}
          currency={props.currency}
          residencyCountry={props.state.profileResidencyCountry}
          fxRates={props.fxRates}
          packagesLoading={packagesLoadingHint === "loading"}
          packagePlans={displayPackagePlans}
          featuredPackageId={displayFeaturedPackageId}
          pricingReady={pricingReady}
          unitPriceMajor={individualUnitHome}
          paymentLoading={packageCheckoutLoading}
          paymentError={packageCheckoutError || undefined}
          onClose={() => setHomePurchaseModalOpen(false)}
          onSelectPlan={(plan) => {
            handleStartPackagePurchase(plan);
          }}
          onIndividualPurchase={() => {
            setHomePurchaseModalOpen(false);
            if (!pricingReady) {
              setAssignProModalOpen(true);
              return;
            }
            props.onNavigateToIndividualSessions();
          }}
          onRequireProfessional={() => {
            setHomePurchaseModalOpen(false);
            setAssignProModalOpen(true);
          }}
        />
      ) : null}

      {homeChatModalOpen ? (
        <DashboardHomeChatModal
          language={props.language}
          state={props.state}
          professionals={props.professionals}
          professionalPhotoMap={props.professionalPhotoMap}
          authToken={props.authToken}
          sessionUserId={props.state.session?.id ?? ""}
          onClose={() => setHomeChatModalOpen(false)}
          onOpenFullChat={() => {
            setHomeChatModalOpen(false);
            const professionalId =
              props.state.activeChatProfessionalId.trim() ||
              props.state.assignedProfessionalId?.trim() ||
              "";
            if (professionalId) {
              props.onGoToChat(professionalId);
            }
          }}
          onSetActiveProfessional={props.onSetActiveChatProfessional}
          onSendMessage={props.onSendChatMessage}
          onMarkRead={props.onMarkChatRead}
          onImageFallback={props.onImageFallback}
        />
      ) : null}

      {homeProfileModalOpen && activeProfessional ? (
        <DashboardHomeProfessionalProfileModal
          language={props.language}
          professional={activeProfessional}
          photoSrc={props.professionalPhotoMap[activeProfessional.id]}
          canSelfChangeProfessional={canSelfChangeProfessional}
          onClose={() => setHomeProfileModalOpen(false)}
          onChat={() => {
            setHomeProfileModalOpen(false);
            openHomeChat(activeProfessional.id);
          }}
          onChangeProfessional={() => {
            setHomeProfileModalOpen(false);
            props.onNavigateToChangeProfessional();
          }}
          onImageFallback={props.onImageFallback}
        />
      ) : null}

      {acquireSessionsModalOpen ? (
        <AcquireSessionsChoiceModal
          language={props.language}
          onClose={() => setAcquireSessionsModalOpen(false)}
          onChoosePackages={() => {
            setAcquireSessionsModalOpen(false);
            if (homeVariant === "next") {
              setHomePurchaseModalOpen(true);
              return;
            }
            props.onNavigateToSessionsCheckout();
          }}
          onChooseIndividual={props.onNavigateToIndividualSessions}
        />
      ) : null}

      <DashboardGuidedTour
        language={props.language}
        sessionUserId={props.state.session?.id ?? null}
        suppressTour={
          assignProModalOpen ||
          acquireSessionsModalOpen ||
          homePurchaseModalOpen ||
          noSessionsRedirectModalOpen ||
          homeChatModalOpen ||
          homeProfileModalOpen ||
          trialModalOpen
        }
        bookingContext={dashboardTourBookingContext}
      />
    </div>
  );
}

export { HomePage as DashboardPage };
