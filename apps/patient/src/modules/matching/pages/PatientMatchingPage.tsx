import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { filterSlotsByBookingNotice } from "@therapy/types";
import { MatchingHeader } from "../components/MatchingHeader";
import { MatchingListSortBar } from "../components/MatchingListSortBar";
import { CalmIntakeSummary, CalmPickFilters } from "../../home/calm/CalmIntakeSummary";
import { CalmProfessionalCard } from "../components/CalmProfessionalCard";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";
import { ProfessionalMatchCard } from "../components/ProfessionalMatchCard";
import { MatchingProfessionalProfileModal } from "../components/MatchingProfessionalProfileModal";
import { MatchingStickyAction } from "../components/MatchingStickyAction";
import { AvailabilityPickerModal } from "../components/AvailabilityPickerModal";
import { BookingSummaryModal } from "../components/BookingSummaryModal";
import { DLOCAL_CHECKOUT_UNAVAILABLE_ERROR } from "@therapy/types";
import { friendlyBookingFailureMessage, friendlyCheckoutPackageMessage } from "../../app/lib/friendlyPatientMessages";
import { patientUsesDlocalCheckout } from "../../app/lib/patientDlocalCheckout";
import {
  ONBOARDING_TRIAL_BOOKING_STORAGE_KEY,
  clearPendingTrialBooking,
  writePendingTrialBooking,
  type PendingTrialBooking
} from "../../app/lib/pendingTrialBooking";
import { useProfessionalMatching } from "../hooks/useProfessionalMatching";
import { fetchProfessionalAvailability } from "../services/availability";
import { acquireBookingSlotHold, releaseBookingSlotHold } from "../services/slotHold";
import { fetchProfessionalDirectory } from "../services/professionals";
import type { PortalPurchaseResult } from "../../app/hooks/usePortalActions";
import type {
  MatchCardProfessional,
  MatchingPageProps,
  MatchTimeSlot,
  SortOption,
  SortMode
} from "../types";

function t(language: MatchingPageProps["language"], values: LocalizedText): string {
  return textByLanguage(language, values);
}

function sortBookableSlots(slots: MatchTimeSlot[]): MatchTimeSlot[] {
  return filterSlotsByBookingNotice(slots);
}

function directorySlotsForProfessional(professional: MatchCardProfessional | null | undefined): MatchTimeSlot[] {
  if (!professional) {
    return [];
  }
  const source = professional.slots.length > 0 ? professional.slots : (professional.suggestedSlots ?? []);
  return sortBookableSlots(source);
}

export function PatientMatchingPage(props: MatchingPageProps) {
  const mode = props.mode ?? "portal";
  const homePick = props.presentation === "home";
  const bookingFlowEnabled = mode === "onboarding-final";
  const [sortMode, setSortMode] = useState<SortMode>(homePick ? "match" : "price-asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [professionals, setProfessionals] = useState<MatchCardProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [directoryReloadKey, setDirectoryReloadKey] = useState(0);
  const [bookingStep, setBookingStep] = useState<"availability" | "summary" | null>(null);
  const [profileProfessionalId, setProfileProfessionalId] = useState("");
  const [bookingProfessionalId, setBookingProfessionalId] = useState("");
  const [bookingSlot, setBookingSlot] = useState<MatchTimeSlot | null>(null);
  const [allSlots, setAllSlots] = useState<MatchTimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [summaryContinueLoading, setSummaryContinueLoading] = useState(false);
  const [checkoutLoadingPhase, setCheckoutLoadingPhase] = useState<"idle" | "creating" | "redirecting">("idle");
  const [summaryHoldLoading, setSummaryHoldLoading] = useState(false);
  const [slotHoldId, setSlotHoldId] = useState("");
  const [slotHoldExpiresAt, setSlotHoldExpiresAt] = useState("");
  const slotHoldIdRef = useRef("");
  const bookingProfessionalIdRef = useRef("");
  const checkoutRedirectingRef = useRef(false);
  const trialReturnHandledRef = useRef(false);
  const [residencySaving, setResidencySaving] = useState(false);
  const viewerTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const usesDlocalCheckout = useMemo(
    () =>
      patientUsesDlocalCheckout({
        patientMarket: props.patientMarket,
        residencyCountry: props.residencyCountry ?? null
      }),
    [props.patientMarket, props.residencyCountry]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    const timeoutMs = 12_000;
    const timeoutId = window.setTimeout(() => {
      if (!active) {
        return;
      }
      setLoading(false);
      setError(
        t(props.language, {
          es: "Está tardando más de lo normal en cargar profesionales. Tocá reintentar.",
          en: "It’s taking longer than usual to load professionals. Tap retry.",
          pt: "Esta demorando mais que o normal para carregar profissionais. Toque em tentar de novo."
        })
      );
    }, timeoutMs);

    fetchProfessionalDirectory(props.authToken, props.language)
      .then((rows) => {
        if (!active) {
          return;
        }
        window.clearTimeout(timeoutId);
        setProfessionals(rows);
        setError("");
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        window.clearTimeout(timeoutId);
        setProfessionals([]);
        setError(
          t(props.language, {
            es: "Tardamos un poco más de lo esperado en mostrar los profesionales. Refrescá la página o probá de nuevo en un momento.",
            en: "It’s taking a little longer than usual to show professionals. Refresh the page or try again shortly.",
            pt: "Esta demorando um pouco mais para mostrar os profissionais. Atualize a pagina ou tente novamente em instantes."
          })
        );
        setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [props.authToken, props.language, directoryReloadKey]);

  const { ordered } = useProfessionalMatching({
    professionals,
    patientMarket: props.patientMarket,
    intakeAnswers: props.intakeAnswers,
    language: props.language,
    search: "",
    specialtyFilter: "all",
    sortMode,
    isFirstSelectionRequired: props.isFirstSelectionRequired
  });
  const favoriteIds = useMemo(() => new Set(props.favoriteProfessionalIds), [props.favoriteProfessionalIds]);
  const excludeProfessionalId = props.excludeProfessionalId?.trim() || "";
  const changeProfessionalMode = Boolean(props.changeProfessionalMode);
  const selectionConfirmRequired = props.isFirstSelectionRequired || changeProfessionalMode;
  const visibleOrdered = useMemo(
    () => {
      const base = props.showOnlyFavorites
        ? ordered.filter((item) => favoriteIds.has(item.professional.id))
        : ordered;
      if (!excludeProfessionalId) {
        return base;
      }
      return base.filter((item) => item.professional.id !== excludeProfessionalId);
    },
    [excludeProfessionalId, favoriteIds, ordered, props.showOnlyFavorites]
  );

  /**
   * Nunca auto-escribir el primer ranking en selected/assigned.
   * Si el id actual no está en la lista visible, la UI queda sin “selección de panel”
   * hasta que el paciente elija (evita comprar/reservar un pro que nunca eligió).
   */
  const selected = visibleOrdered.find((item) => item.professional.id === props.selectedProfessionalId) ?? null;

  const sortOptions = useMemo<SortOption[]>(() => homePick
    ? [
        { value: "match", label: t(props.language, { es: "Compatibilidad", en: "Compatibility", pt: "Compatibilidade" }) },
        { value: "price-asc", label: t(props.language, { es: "Precio", en: "Price", pt: "Preco" }) }
      ]
    : [
    { value: "price-asc", label: t(props.language, { es: "Precio más bajo", en: "Lowest price", pt: "Menor preco" }) },
    { value: "price-desc", label: t(props.language, { es: "Precio más alto", en: "Highest price", pt: "Maior preco" }) },
    { value: "rating-desc", label: t(props.language, { es: "Calificación más alta", en: "Highest rating", pt: "Maior classificacao" }) },
    { value: "reviews-desc", label: t(props.language, { es: "Mayor cantidad de reseñas", en: "Most reviews", pt: "Maior quantidade de avaliacoes" }) }
    ]
  , [homePick, props.language]);

  const heading = props.showOnlyFavorites
    ? t(props.language, {
        es: "Tus profesionales favoritos",
        en: "Your favorite professionals",
        pt: "Seus profissionais favoritos"
      })
    : changeProfessionalMode
      ? t(props.language, {
          es: "Elegí tu nuevo profesional",
          en: "Choose your new professional",
          pt: "Escolha seu novo profissional"
        })
    : homePick
      ? t(props.language, {
          es: "Elegí a tu profesional",
          en: "Choose your professional",
          pt: "Escolha seu profissional"
        })
    : mode === "onboarding-final"
      ? t(props.language, {
          es: "Psicólogos sugeridos para vos",
          en: "Suggested psychologists for you",
          pt: "Psicologos sugeridos para voce"
        })
      : t(props.language, {
          es: "Hemos encontrado especialistas para tu solicitud",
          en: "We found specialists for your request",
          pt: "Encontramos especialistas para sua necessidade"
        });
  const description = props.showOnlyFavorites
    ? t(props.language, {
        es: "Accede rápido a los terapeutas que guardaste para volver a reservar.",
        en: "Quickly access the therapists you saved to book again.",
        pt: "Acesse rapidamente os terapeutas que voce salvou para reservar novamente."
      })
    : changeProfessionalMode
      ? t(props.language, {
          es: "Al confirmar, vas a comprar nuevas sesiones al precio publicado por este profesional.",
          en: "When you confirm, you’ll buy new sessions at this professional’s published price.",
          pt: "Ao confirmar, voce comprara novas sessoes pelo preco publicado deste profissional."
        })
    : homePick
      ? t(props.language, {
          es: "Los ordenamos según lo que nos contaste. Elegí con calma: podés ver el perfil y los horarios de cada uno.",
          en: "We rank them from what you told us. Take your time: you can open each profile and their times.",
          pt: "Ordenamos pelo que voce contou. Escolha com calma: da para ver o perfil e os horarios."
        })
    : mode === "onboarding-final"
      ? t(props.language, {
          es: "Elegí un profesional y reservá tu sesión de prueba.",
          en: "Choose a professional and book your trial session.",
          pt: "Escolha um profissional e reserve sua sessao de teste."
        })
      : t(props.language, {
          es: "Ordenamos los perfiles según tu perfil clínico y los datos reales que cada terapeuta cargó en su onboarding.",
          en: "Profiles are ranked by your clinical profile and real therapist data from onboarding.",
          pt: "Os perfis sao ordenados pelo seu perfil clinico e pelos dados reais do onboarding dos terapeutas."
        });

  const countLabel = homePick
    ? t(props.language, {
        es: `${visibleOrdered.length} profesionales`,
        en: `${visibleOrdered.length} professionals`,
        pt: `${visibleOrdered.length} profissionais`
      })
    : mode === "onboarding-final"
    ? t(props.language, {
        es: `${visibleOrdered.length} sugerencias para vos`,
        en: `${visibleOrdered.length} suggestions for you`,
        pt: `${visibleOrdered.length} sugestoes para voce`
      })
    : t(props.language, {
        es: `${visibleOrdered.length} especialistas están disponibles actualmente`,
        en: `${visibleOrdered.length} specialists are currently available`,
        pt: `${visibleOrdered.length} especialistas estao disponiveis agora`
      });
  const bookingProfessional = useMemo(
    () => professionals.find((item) => item.id === bookingProfessionalId) ?? null,
    [bookingProfessionalId, professionals]
  );
  const profileProfessional = useMemo(
    () => professionals.find((item) => item.id === profileProfessionalId) ?? null,
    [profileProfessionalId, professionals]
  );
  const profileMatchScore = useMemo(() => {
    if (!profileProfessionalId) {
      return undefined;
    }
    return visibleOrdered.find((item) => item.professional.id === profileProfessionalId)?.score;
  }, [profileProfessionalId, visibleOrdered]);

  slotHoldIdRef.current = slotHoldId;
  bookingProfessionalIdRef.current = bookingProfessionalId;

  const releaseCurrentSlotHold = async () => {
    const holdId = slotHoldIdRef.current;
    if (!holdId || !props.authToken) {
      setSlotHoldId("");
      setSlotHoldExpiresAt("");
      return;
    }
    try {
      await releaseBookingSlotHold(holdId, props.authToken);
    } catch {
      // Best-effort release; TTL will expire the hold.
    }
    setSlotHoldId("");
    setSlotHoldExpiresAt("");
    slotHoldIdRef.current = "";
  };

  const resolveProfessionalById = useCallback(
    (professionalId: string) => professionals.find((item) => item.id === professionalId) ?? null,
    [professionals]
  );

  const loadProfessionalSlots = useCallback(
    (professionalId: string) => {
      const directorySlots = directorySlotsForProfessional(resolveProfessionalById(professionalId));
      if (directorySlots.length > 0) {
        setAllSlots(directorySlots);
      }
      setSlotsLoading(true);
      setSlotsError("");
      return fetchProfessionalAvailability(professionalId, props.authToken)
        .then((slots) => {
          const nextSlots = slots.length > 0 ? slots : directorySlots;
          setAllSlots(nextSlots);
          return nextSlots;
        })
        .catch(() => {
          if (directorySlots.length > 0) {
            setAllSlots(directorySlots);
            setSlotsError("");
            return directorySlots;
          }
          setAllSlots([]);
          setSlotsError(
            t(props.language, {
              es: "Ahora no pudimos cargar los horarios. Volvé a intentar o elegí otro profesional.",
              en: "We couldn’t load times just now. Try again or choose another professional.",
              pt: "Nao foi possivel carregar os horarios agora. Tente de novo ou escolha outro profissional."
            })
          );
          return [] as MatchTimeSlot[];
        })
        .finally(() => {
          setSlotsLoading(false);
        });
    },
    [props.authToken, props.language, resolveProfessionalById]
  );

  const goBackToAvailabilityPicker = useCallback(
    (professionalId: string) => {
      const targetProfessionalId = professionalId.trim() || bookingProfessionalIdRef.current;
      if (!targetProfessionalId) {
        return;
      }
      void releaseCurrentSlotHold();
      setBookingProfessionalId(targetProfessionalId);
      setPaymentError("");
      setSummaryHoldLoading(false);
      setSlotHoldId("");
      setSlotHoldExpiresAt("");
      setBookingStep("availability");
      void loadProfessionalSlots(targetProfessionalId);
    },
    [loadProfessionalSlots]
  );

  const enterSummaryWithHold = async (professionalId: string, slot: MatchTimeSlot) => {
    if (!props.authToken) {
      setPaymentError(
        t(props.language, {
          es: "Iniciá sesión para reservar tu turno.",
          en: "Sign in to book your slot.",
          pt: "Faca login para reservar seu horario."
        })
      );
      return;
    }

    setSummaryHoldLoading(true);
    setPaymentError("");
    setBookingProfessionalId(professionalId);
    try {
      await releaseCurrentSlotHold();
      const hold = await acquireBookingSlotHold(professionalId, slot, props.authToken);
      setSlotHoldId(hold.holdId);
      setSlotHoldExpiresAt(hold.expiresAt);
      slotHoldIdRef.current = hold.holdId;
      setBookingProfessionalId(professionalId);
      setBookingSlot(slot);
      setBookingStep("summary");
    } catch (requestError) {
      const message = friendlyBookingFailureMessage(
        requestError instanceof Error ? requestError.message : "",
        props.language
      );
      setPaymentError(message);
      setSlotsError(message);
    } finally {
      setSummaryHoldLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      const holdId = slotHoldIdRef.current;
      if (!holdId || !props.authToken) {
        return;
      }
      void releaseBookingSlotHold(holdId, props.authToken).catch(() => undefined);
    };
  }, [props.authToken]);

  useEffect(() => {
    if (!bookingFlowEnabled || !usesDlocalCheckout || trialReturnHandledRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const trialPayment = params.get("trialPayment");
    if (!trialPayment) {
      return;
    }

    trialReturnHandledRef.current = true;
    window.history.replaceState({}, "", window.location.pathname);

    if (trialPayment === "cancel") {
      clearPendingTrialBooking();
      setPaymentError(
        t(props.language, {
          es: "Cancelaste el pago. Podés elegir otro horario o intentar de nuevo cuando quieras.",
          en: "You cancelled payment. You can pick another time or try again whenever you like.",
          pt: "Voce cancelou o pagamento. Pode escolher outro horario ou tentar de novo quando quiser."
        })
      );
      return;
    }

    if (trialPayment !== "success") {
      return;
    }

    const raw = sessionStorage.getItem(ONBOARDING_TRIAL_BOOKING_STORAGE_KEY);
    if (!raw) {
      return;
    }

    let pending: PendingTrialBooking;
    try {
      pending = JSON.parse(raw) as PendingTrialBooking;
    } catch {
      clearPendingTrialBooking();
      return;
    }

    clearPendingTrialBooking();
    setPaymentLoading(true);
    setPaymentError("");

    void (async () => {
      try {
        if (props.onSyncTrialPayment) {
          const synced = await props.onSyncTrialPayment(pending.paymentId);
          if (!synced.ok) {
            throw new Error(synced.error ?? "Could not confirm trial payment");
          }
        }

        await props.onCreateBooking(pending.professionalId, pending.slot, {
          holdId: pending.holdId
        });
        closeBookingFlow();
      } catch (requestError) {
        setPaymentError(
          friendlyBookingFailureMessage(
            requestError instanceof Error ? requestError.message : "",
            props.language
          )
        );
      } finally {
        setPaymentLoading(false);
      }
    })();
  }, [bookingFlowEnabled, props.authToken, props.language, props.onCreateBooking, props.onSyncTrialPayment, usesDlocalCheckout]);

  const closeBookingFlow = () => {
    void releaseCurrentSlotHold();
    setBookingStep(null);
    setBookingProfessionalId("");
    setBookingSlot(null);
    setAllSlots([]);
    setSlotsError("");
    setPaymentError("");
    setSlotsLoading(false);
    setPaymentLoading(false);
    setSummaryHoldLoading(false);
    setSummaryContinueLoading(false);
    setCheckoutLoadingPhase("idle");
    checkoutRedirectingRef.current = false;
  };

  const openAvailabilityFlow = (professionalId: string) => {
    if (!bookingFlowEnabled) {
      props.onReserve(professionalId);
      return;
    }
    setPaymentError("");
    setBookingProfessionalId(professionalId);
    setBookingSlot(null);
    setBookingStep("availability");
    void loadProfessionalSlots(professionalId);
  };

  const openSummaryFromSuggestedSlot = (professionalId: string, slot: MatchTimeSlot) => {
    if (!bookingFlowEnabled) {
      props.onReserve(professionalId);
      return;
    }
    setBookingProfessionalId(professionalId);
    const directorySlots = directorySlotsForProfessional(resolveProfessionalById(professionalId));
    if (directorySlots.length > 0) {
      setAllSlots(directorySlots);
    }
    void loadProfessionalSlots(professionalId);
    void enterSummaryWithHold(professionalId, slot);
  };

  const handleSummaryContinue = async () => {
    if (!bookingFlowEnabled || !bookingProfessionalId || !bookingSlot || !slotHoldId) {
      if (!slotHoldId) {
        setPaymentError(
          t(props.language, {
            es: "Tu reserva temporal venció. Volvé al calendario y elegí el horario de nuevo.",
            en: "Your temporary hold expired. Go back to the calendar and pick the time again.",
            pt: "Sua reserva temporaria expirou. Volte ao calendario e escolha o horario de novo."
          })
        );
      }
      return;
    }

    if (props.trialRebookAvailable && props.onCreateBooking) {
      setSummaryContinueLoading(true);
      setPaymentError("");
      try {
        await props.onCreateBooking(bookingProfessionalId, bookingSlot, { holdId: slotHoldId });
        closeBookingFlow();
      } catch (requestError) {
        setPaymentError(
          friendlyBookingFailureMessage(
            requestError instanceof Error ? requestError.message : "",
            props.language
          )
        );
      } finally {
        setSummaryContinueLoading(false);
      }
      return;
    }

    if (usesDlocalCheckout && props.onStartTrialCheckout) {
      setSummaryContinueLoading(true);
      setCheckoutLoadingPhase("creating");
      setPaymentError("");
      try {
        const checkout = await props.onStartTrialCheckout(bookingProfessionalId, bookingSlot, slotHoldId);
        if (checkout.checkoutUrl && checkout.paymentId) {
          const pending: PendingTrialBooking = {
            professionalId: bookingProfessionalId,
            slot: bookingSlot,
            paymentId: checkout.paymentId,
            holdId: slotHoldId
          };
          writePendingTrialBooking(pending);
          checkoutRedirectingRef.current = true;
          setCheckoutLoadingPhase("redirecting");
          window.location.assign(checkout.checkoutUrl);
          return;
        }
        if (!checkout.ok) {
          setPaymentError(
            friendlyCheckoutPackageMessage(checkout.error ?? "", props.language)
          );
        } else {
          setPaymentError(
            t(props.language, {
              es: "No pudimos abrir el pago. Probá de nuevo en unos segundos.",
              en: "We couldn't open checkout. Please try again in a few seconds.",
              pt: "Nao foi possivel abrir o pagamento. Tente novamente em alguns segundos."
            })
          );
        }
      } catch (requestError) {
        setPaymentError(
          friendlyCheckoutPackageMessage(
            requestError instanceof Error ? requestError.message : "",
            props.language
          )
        );
      } finally {
        if (!checkoutRedirectingRef.current) {
          setSummaryContinueLoading(false);
          setCheckoutLoadingPhase("idle");
        }
      }
      return;
    }

    setPaymentError(
      friendlyBookingFailureMessage(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR, props.language)
    );
  };

  const matchingHeader = (
    <MatchingHeader
      minimal={mode === "onboarding-final" || homePick}
      onboardingAccent={mode === "onboarding-final" || homePick}
      pillSort={homePick}
      heading={heading}
      headingMark={
        homePick
          ? t(props.language, { es: "profesional", en: "professional", pt: "profissional" })
          : undefined
      }
      description={description}
      countLabel={countLabel}
      sortOpen={sortOpen}
      onToggleSort={() => setSortOpen((current) => !current)}
      sortMode={sortMode}
      onSortModeChange={(value) => {
        setSortMode(value as SortMode);
        setSortOpen(false);
      }}
      sortOptions={sortOptions}
      filters={homePick ? <CalmPickFilters language={props.language} answers={props.intakeAnswers} /> : null}
      t={(values) => t(props.language, values)}
      onDeferTherapistSelection={
        mode === "onboarding-final" && props.onDeferTherapistSelection
          ? () => void props.onDeferTherapistSelection?.()
          : undefined
      }
    />
  );

  const paymentNotice = (
    <>
      {paymentLoading && !bookingStep ? (
        <div className="checkout-return-loader-overlay" role="presentation">
          <MotivarCarePageLoader language={props.language} layout="block" />
        </div>
      ) : null}

      {paymentError && !bookingStep ? (
        <p className="availability-status-message booking-soft-notice" role="alert">
          {paymentError}
        </p>
      ) : null}
    </>
  );

  const loadingBlock = loading ? <MotivarCarePageLoader language={props.language} layout="block" /> : null;

  const errorBlock =
    !loading && error ? (
      <section className="content-card">
        <p className="error-text">{error}</p>
        <button
          type="button"
          className="matching-flow-primary"
          onClick={() => {
            setError("");
            setDirectoryReloadKey((value) => value + 1);
          }}
        >
          {t(props.language, { es: "Reintentar", en: "Retry", pt: "Tentar de novo" })}
        </button>
      </section>
    ) : null;

  const therapistList =
    !loading && !error && visibleOrdered.length > 0 ? (
      <div className="patient-therapist-list">
        {visibleOrdered.map((item, index) =>
          homePick ? (
            <CalmProfessionalCard
              key={item.professional.id}
              item={item}
              bestMatch={sortMode === "match" && index === 0}
              language={props.language}
              patientMarket={props.patientMarket}
              displayCurrency={props.displayCurrency}
              residencyCountry={props.residencyCountry}
              fxRates={props.fxRates}
              onChoose={() => {
                void Promise.resolve(
                  props.onCompleteFirstSelection({
                    professionalId: item.professional.id,
                    professionalName: item.professional.fullName
                  })
                );
              }}
              onSelect={props.onSelectProfessional}
              onOpenProfile={(professionalId) => setProfileProfessionalId(professionalId)}
              onImageFallback={props.onImageFallback}
            />
          ) : (
            <ProfessionalMatchCard
              key={item.professional.id}
              item={item}
              patientMarket={props.patientMarket}
              displayCurrency={props.displayCurrency}
              residencyCountry={props.residencyCountry}
              language={props.language}
              fxRates={props.fxRates}
              isFavorite={favoriteIds.has(item.professional.id)}
              selected={item.professional.id === props.selectedProfessionalId}
              onSelect={props.onSelectProfessional}
              onToggleFavorite={props.onToggleFavorite}
              onSelectSuggestedSlot={openSummaryFromSuggestedSlot}
              onShowAllSlots={openAvailabilityFlow}
              onChat={props.onChat}
              onImageFallback={props.onImageFallback}
              showChatAction={!bookingFlowEnabled && !selectionConfirmRequired}
              cardOpensProfile
              onOpenProfile={(professionalId) => {
                setProfileProfessionalId(professionalId);
              }}
            />
          )
        )}
      </div>
    ) : null;

  const emptyBlock =
    !loading && !error && visibleOrdered.length === 0 ? (
      <>
        {mode === "onboarding-final" && props.onDeferTherapistSelection ? (
          <div className="patient-matching-defer-empty-wrap">
            <button type="button" className="patient-matching-defer-link" onClick={() => void props.onDeferTherapistSelection?.()}>
              {t(props.language, {
                es: "Elegir profesional más tarde",
                en: "Choose a professional later",
                pt: "Escolher profissional mais tarde"
              })}
            </button>
          </div>
        ) : null}
        <section className="content-card">
          <p>
            {props.showOnlyFavorites
              ? t(props.language, {
                  es: "Todavía no guardaste profesionales en favoritos.",
                  en: "You have not saved favorite professionals yet.",
                  pt: "Voce ainda nao salvou profissionais favoritos."
                })
              : professionals.length === 0
                ? t(props.language, {
                    es: "No hay profesionales publicados en el directorio todavía. En el panel Admin, cada profesional debe tener «Perfil visible» activado y el alta aprobada para que aparezcan acá.",
                    en: "No professionals are published in the directory yet. In the Admin panel, each professional needs “Profile visible” on and registration approved to appear here.",
                    pt: "Nao ha profissionais publicados no diretorio. No Admin, cada profissional precisa de «Perfil visivel» ligado e cadastro aprovado para aparecer aqui."
                  })
                : t(props.language, {
                    es: "No encontramos resultados con esos filtros. Prueba quitando algún filtro para ver más opciones.",
                    en: "No results with those filters. Remove one to see more options.",
                    pt: "Nao encontramos resultados com esses filtros. Remova um para ver mais opcoes."
                  })}
          </p>
        </section>
      </>
    ) : null;

  return (
    <div className={`page-stack patient-matching-page ${mode === "onboarding-final" ? "onboarding-focus" : ""} ${homePick ? "calm-match" : ""}`}>
      {matchingHeader}
      {homePick ? (
        <div className="calm-pick-body">
          <div className="calm-pick-main">
            <MatchingListSortBar
              countLabel={countLabel}
              sortMode={sortMode}
              sortOptions={sortOptions}
              onSortModeChange={(value) => {
                setSortMode(value as SortMode);
                setSortOpen(false);
              }}
              t={(values) => t(props.language, values)}
              onDeferTherapistSelection={
                mode === "onboarding-final" && props.onDeferTherapistSelection
                  ? () => void props.onDeferTherapistSelection?.()
                  : undefined
              }
            />
            {paymentNotice}
            {loadingBlock}
            {errorBlock}
            {therapistList}
            {emptyBlock}
          </div>
          {!loading && !error && visibleOrdered.length > 0 ? (
            <CalmIntakeSummary language={props.language} answers={props.intakeAnswers} />
          ) : null}
        </div>
      ) : (
        <>
          {paymentNotice}
          {loadingBlock}
          {errorBlock}
          {therapistList}
          {emptyBlock}
        </>
      )}

      {selectionConfirmRequired && selected && !bookingFlowEnabled && !homePick ? (
        <MatchingStickyAction
          language={props.language}
          professionalName={selected.professional.fullName}
          score={selected.score}
          helperText={
            changeProfessionalMode
              ? t(props.language, {
                  es: `Vas a cambiar a este profesional (${selected.score}% compatibilidad). Después comprás sesiones a su precio.`,
                  en: `You’ll switch to this professional (${selected.score}% match). Then buy sessions at their price.`,
                  pt: `Voce vai mudar para este profissional (${selected.score}% compatibilidade). Depois compra sessoes pelo preco dele.`
                })
              : undefined
          }
          continueLabel={
            changeProfessionalMode
              ? t(props.language, {
                  es: "Confirmar nuevo profesional",
                  en: "Confirm new professional",
                  pt: "Confirmar novo profissional"
                })
              : undefined
          }
          onContinue={() => {
            void Promise.resolve(
              props.onCompleteFirstSelection({
                professionalId: selected.professional.id,
                professionalName: selected.professional.fullName
              })
            );
          }}
        />
      ) : null}

      {profileProfessional ? (
        <MatchingProfessionalProfileModal
          language={props.language}
          professional={profileProfessional}
          matchScore={profileMatchScore}
          showScheduleAction={bookingFlowEnabled}
          onClose={() => setProfileProfessionalId("")}
          onShowSchedule={() => {
            const id = profileProfessional.id;
            setProfileProfessionalId("");
            openAvailabilityFlow(id);
          }}
          onImageFallback={props.onImageFallback}
        />
      ) : null}

      {bookingFlowEnabled && bookingStep === "availability" && bookingProfessional ? (
        <AvailabilityPickerModal
          language={props.language}
          timezone={viewerTimezone}
          professionalName={bookingProfessional.fullName}
          sessionDurationMinutes={bookingProfessional.sessionDurationMinutes}
          slots={allSlots}
          loading={slotsLoading}
          error={slotsError}
          selectedSlotId={bookingSlot?.id ?? ""}
          onSelectSlot={setBookingSlot}
          onClose={closeBookingFlow}
          onRetry={() => {
            void loadProfessionalSlots(bookingProfessional.id);
          }}
          onContinue={() => {
            if (!bookingSlot || summaryHoldLoading) {
              return;
            }
            void enterSummaryWithHold(bookingProfessional.id, bookingSlot);
          }}
          continueLoading={summaryHoldLoading}
        />
      ) : null}

      {bookingFlowEnabled && bookingStep === "summary" && bookingProfessional && bookingSlot ? (
        <BookingSummaryModal
          language={props.language}
          patientMarket={props.patientMarket}
          residencyCountry={props.residencyCountry}
          displayCurrency={props.displayCurrency}
          fxRates={props.fxRates}
          timezone={viewerTimezone}
          professional={bookingProfessional}
          slot={bookingSlot}
          holdExpiresAt={slotHoldExpiresAt}
          continueLoading={summaryContinueLoading}
          checkoutLoadingPhase={checkoutLoadingPhase}
          error={paymentError}
          onChangeTime={() => {
            goBackToAvailabilityPicker(bookingProfessional.id);
          }}
          onClose={closeBookingFlow}
          onContinue={() => {
            void handleSummaryContinue();
          }}
          onConfirmResidency={async (iso) => {
            if (!props.onConfirmResidency) {
              return { ok: false, error: "Unavailable" };
            }
            setResidencySaving(true);
            try {
              return await props.onConfirmResidency(iso);
            } finally {
              setResidencySaving(false);
            }
          }}
          residencySaving={residencySaving}
          onImageFallback={props.onImageFallback}
        />
      ) : null}
    </div>
  );
}
