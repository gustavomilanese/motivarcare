import { type KeyboardEvent, type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  filterUpcomingPatientBookings,
  pickNextPatientBooking,
  resolveIndividualListUnitUsdFromPackages,
  resolvePackageCatalogView,
  resolveSessionListUsdMajor
} from "@therapy/patient-core";
import { resolveFxRatePerUsd } from "@therapy/i18n-config";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import { UpcomingBookingsList } from "../../booking/components/UpcomingBookingsList";
import { useAcquireSessionsDispatch } from "../../booking/hooks/useAcquireSessionsDispatch";
import {
  PackageCatalogError,
  PackageCatalogLoading,
  PackageChooseProfessionalCta
} from "../components/booking/PackageCatalogSectionExtras";
import { AcquireSessionsChoiceModal } from "../components/AcquireSessionsChoiceModal";
import { SessionsCollapsibleToggle } from "../components/SessionsCollapsibleToggle";
import { DashboardGuidedTour, type DashboardTourBookingContext } from "../components/DashboardGuidedTour";
import { ProfessionalNameStack, professionalPhotoAlt } from "../components/ProfessionalNameStack";
import { acquireNewSessionsButtonLabel } from "../lib/acquireSessionsButtonLabel";
import { professionalAccessibleName } from "../lib/professionalDisplayName";
import { DEFAULT_PATIENT_HERO_IMAGE } from "../constants";
import { API_BASE, professionalPhotoSrc, resolvePublicAssetUrl } from "../services/api";
import {
  packageBenefitLines,
  packageRhythmLabel,
  loadPublicPackagePlans
} from "../lib/packageCatalog";
import { patientUsesDlocalCheckout } from "../lib/patientDlocalCheckout";
import { usePackageCheckout } from "../hooks/usePackageCheckout";
import type { PortalPurchaseResult } from "../hooks/usePortalActions";
import { formatSubscriptionPurchasePrice } from "../lib/formatSubscriptionPurchasePrice";
import { formatPatientUsdPrice } from "../lib/formatPatientUsdPrice";
import {
  portalHasPricingProfessional,
  resolvePortalPricingProfessionalId
} from "../lib/patientPricingProfessional";
import { findProfessionalById, patientHasAssignedProfessional } from "../lib/professionals";
import { useMobilePortal } from "../hooks/useMobilePortal";
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

const ASSIGN_PRO_MODAL_DISMISS_KEY = "mc.assignProPromptDismissed";

function firstUpcomingSpotlightStorageKey(userId: string): string {
  return `motivarcare.patient.firstUpcomingSpotlight.v2.${userId}`;
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

/**
 * `amountMajor` está en USD (priceCents/100). Convierte a moneda local de display.
 */
function formatMoney(
  amountMajor: number,
  language: AppLanguage,
  displayCurrency: SupportedCurrency,
  fxRates?: DisplayFxRates,
  residencyCountry?: string | null
): string {
  return formatPatientUsdPrice({
    usdMajor: amountMajor,
    displayCurrency,
    language,
    fxRates,
    residencyCountry,
    maximumFractionDigits: 0
  });
}

function packageUnitPriceMajor(plan: PackagePlan): number {
  return plan.priceCents / 100 / Math.max(1, plan.credits);
}

export function DashboardPage(props: {
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
  onOpenBookingDetail: (bookingId: string) => void;
  onPlanTrialFromDashboard: (professionalId: string, slot: TimeSlot) => void;
  onStartPackagePurchase: (plan: PackagePlan) => void;
  onPurchasePackage: (plan: PackagePlan) => Promise<PortalPurchaseResult>;
  /** Sesiones → checkout de paquetes (sin plan concreto; el catálogo carga en destino). */
  onNavigateToSessionsCheckout: () => void;
  /** Abre Sesiones en checkout enfocado en compra suelta (misma UX que el panel de paquetes). */
  onNavigateToIndividualSessions: () => void;
  /** Flujo de matching + reserva de prueba (p. ej. tras posponer onboarding). */
  onNavigateToBookTrial: () => void;
  /** Sin profesional asignado: volver al matching del onboarding para elegir uno. */
  onNavigateToAssignProfessional: () => void;
  /** El usuario eligió «Lo hago después» en el modal de Calendar: CTA para reabrir OAuth. */
  showPatientGoogleCalendarReconnectCta?: boolean;
  onOpenPatientGoogleCalendarConnect?: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobilePortal = useMobilePortal();
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
  const canChangeProfessionalForNewPackage = !assignedProfessionalId || props.state.subscription.creditsRemaining <= 0;
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
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isPackagesExpanded, setIsPackagesExpanded] = useState(false);
  const [acquireSessionsModalOpen, setAcquireSessionsModalOpen] = useState(false);
  const [assignProModalOpen, setAssignProModalOpen] = useState(false);
  const dashboardSpotlightBlockersRef = useRef(false);
  dashboardSpotlightBlockersRef.current = assignProModalOpen || acquireSessionsModalOpen || trialModalOpen;
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
  const packageSectionRef = useRef<HTMLElement | null>(null);
  const defaultPackagePlan =
    displayPackagePlans.find((plan) => plan.id === displayFeaturedPackageId) ?? displayPackagePlans[0] ?? null;
  const nextBooking = pickNextPatientBooking(props.state.bookings, now);
  const confirmedBookings = props.state.bookings.filter((booking) => booking.status === "confirmed");
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
  const activeTrialProfessional = activeTrialBooking
    ? findProfessionalById(activeTrialBooking.professionalId, props.professionals)
    : null;
  const activeTrialSlotId = activeTrialProfessional
    ? activeTrialProfessional.slots.find(
        (slot) => slot.startsAt === activeTrialBooking?.startsAt && slot.endsAt === activeTrialBooking?.endsAt
      )?.id ?? ""
    : "";
  const trialProfessional = findProfessionalById(trialProfessionalId, props.professionals);
  const availableTrialSlots = (trialProfessional?.slots ?? []).filter(
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

  const trialCardClickable = Boolean(activeTrialBooking);
  const openTrialDetail = () => {
    if (activeTrialBooking) {
      props.onOpenBookingDetail(activeTrialBooking.id);
    }
  };
  const handleTrialCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!trialCardClickable) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTrialDetail();
    }
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
  const availableSessions = props.state.subscription.creditsRemaining;

  const acquireSessionsHandlers = useMemo(
    () => ({
      onAssignProfessional: () => setAssignProModalOpen(true),
      onShowChoiceModal: () => setAcquireSessionsModalOpen(true),
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
        /* dashboard no usa alerta de créditos; reservar desde home redirige a sesiones */
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
  }, [props.state.session?.id, upcomingTourDependency, assignProModalOpen, acquireSessionsModalOpen, trialModalOpen]);

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
              if (isMobilePortal && props.state.subscription.creditsRemaining <= 0 && resolvedId) {
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
            <div className="active-professional-actions active-professional-actions--solo">
              <button
                className="active-professional-action-btn active-professional-action-btn--primary"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onGoToChat(activeProfessional.id);
                }}
              >
                {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
              </button>
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
          <div className={`session-booking-panel-head${showGoogleCalendarCta ? " session-booking-panel-head--split" : ""}`}>
            <div className="sessions-package-panel-head-copy">
              <h3>{t(props.language, { es: "Adquirir nuevas sesiones", en: "Get new sessions", pt: "Adquirir novas sessoes" })}</h3>
              <p>
                {pricingReady
                  ? t(props.language, {
                      es: "Elegí un paquete o comprá sesiones sueltas con el enlace debajo de cada plan.",
                      en: "Choose a package or buy individual sessions with the link under each plan.",
                      pt: "Escolha um pacote ou compre sessoes avulsas no link abaixo de cada plano."
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
              const listPriceAmount = pricingReady
                ? Math.round(plan.priceCents / 100 / Math.max(0.01, 1 - plan.discountPercent / 100))
                : 0;
              const finalPriceAmount = pricingReady ? plan.priceCents / 100 : 0;
              const savingAmount = pricingReady ? Math.max(0, listPriceAmount - finalPriceAmount) : 0;
              const pricePerSession = pricingReady ? finalPriceAmount / Math.max(1, plan.credits) : 0;
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
                      <span className="sessions-package-card-kicker">{packageRhythmLabel(plan.credits, (values) => t(props.language, values))}</span>
                      <span className="sessions-package-card-saving">
                        {pricingReady
                          ? replaceTemplate(
                              t(props.language, {
                                es: "Ahorras {amount}",
                                en: "You save {amount}",
                                pt: "Voce economiza {amount}"
                              }),
                              { amount: formatMoney(savingAmount, props.language, props.currency, props.fxRates, props.state.profileResidencyCountry) }
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
                    {pricingReady ? (
                      <>
                        <div className="deal-pricing-top">
                          <span className="deal-list-price">{formatMoney(listPriceAmount, props.language, props.currency, props.fxRates, props.state.profileResidencyCountry)}</span>
                          <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
                        </div>
                        <p className="deal-main-price">
                          {formatMoney(pricePerSession, props.language, props.currency, props.fxRates, props.state.profileResidencyCountry)}
                          <span className="deal-main-price-unit">
                            {t(props.language, { es: "/sesión", en: "/session", pt: "/sessao" })}
                          </span>
                        </p>
                        <p className="sessions-package-card-unit">
                          {replaceTemplate(
                            t(props.language, {
                              es: "Total {amount} por {count} sesiones",
                              en: "Total {amount} for {count} sessions",
                              pt: "Total {amount} por {count} sessoes"
                            }),
                            {
                              amount: formatMoney(finalPriceAmount, props.language, props.currency, props.fxRates, props.state.profileResidencyCountry),
                              count: String(plan.credits)
                            }
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
                    <button
                      type="button"
                      className="sessions-package-individual-link"
                      disabled={!canIndividualCtaHome}
                      onClick={() => {
                        if (!pricingReady) {
                          setAssignProModalOpen(true);
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
                  </article>
                </div>
              );
            })}
          </div>
          )}
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
            props.onNavigateToSessionsCheckout();
          }}
          onChooseIndividual={props.onNavigateToIndividualSessions}
        />
      ) : null}

      <DashboardGuidedTour
        language={props.language}
        sessionUserId={props.state.session?.id ?? null}
        suppressTour={assignProModalOpen || acquireSessionsModalOpen || trialModalOpen}
        bookingContext={dashboardTourBookingContext}
      />
    </div>
  );
}
