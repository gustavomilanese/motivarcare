import { useEffect, useMemo, useRef, useState } from "react";
import { type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { MatchingHeader } from "../components/MatchingHeader";
import { ProfessionalMatchCard } from "../components/ProfessionalMatchCard";
import { MatchingStickyAction } from "../components/MatchingStickyAction";
import { AvailabilityPickerModal } from "../components/AvailabilityPickerModal";
import { BookingSummaryModal } from "../components/BookingSummaryModal";
import { PaymentMethodModal } from "../components/PaymentMethodModal";
import { friendlyBookingFailureMessage } from "../../app/lib/friendlyPatientMessages";
import { useProfessionalMatching } from "../hooks/useProfessionalMatching";
import { fetchProfessionalAvailability, isSlotStillListedAfterFreshFetch } from "../services/availability";
import { fetchProfessionalDirectory } from "../services/professionals";
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

export function PatientMatchingPage(props: MatchingPageProps) {
  const mode = props.mode ?? "portal";
  const bookingFlowEnabled = mode === "onboarding-final";
  const [sortMode, setSortMode] = useState<SortMode>("price-asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [professionals, setProfessionals] = useState<MatchCardProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingStep, setBookingStep] = useState<"availability" | "summary" | "payment" | null>(null);
  const [bookingProfessionalId, setBookingProfessionalId] = useState("");
  const [bookingSlot, setBookingSlot] = useState<MatchTimeSlot | null>(null);
  const [allSlots, setAllSlots] = useState<MatchTimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const viewerTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchProfessionalDirectory(props.authToken, props.language)
      .then((rows) => {
        if (!active) {
          return;
        }
        setProfessionals(rows);
        setError("");
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        setProfessionals([]);
        setError(
          t(props.language, {
            es: "Tardamos un poco más de lo esperado en mostrar los profesionales. Refrescá la página o probá de nuevo en un momento.",
            en: "It’s taking a little longer than usual to show professionals. Refresh the page or try again shortly.",
            pt: "Esta demorando um pouco mais para mostrar os profissionais. Atualize a pagina ou tente novamente em instantes."
          })
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [props.authToken, props.language]);

  const { ordered } = useProfessionalMatching({
    professionals,
    intakeAnswers: props.intakeAnswers,
    language: props.language,
    search: "",
    specialtyFilter: "all",
    sortMode,
    isFirstSelectionRequired: props.isFirstSelectionRequired
  });
  const favoriteIds = useMemo(() => new Set(props.favoriteProfessionalIds), [props.favoriteProfessionalIds]);
  const visibleOrdered = useMemo(
    () =>
      props.showOnlyFavorites
        ? ordered.filter((item) => favoriteIds.has(item.professional.id))
        : ordered,
    [favoriteIds, ordered, props.showOnlyFavorites]
  );

  /**
   * El portal suele pasar `onSelectProfessional` como función inline (nueva referencia cada render).
   * No debe ir en las deps del efecto: dispara el efecto en bucle y, si el id seleccionado queda fuera
   * de la lista visible (p. ej. tras reservar/sync), cada paso vuelve a llamar setState → "Maximum update depth".
   */
  const onSelectProfessionalRef = useRef(props.onSelectProfessional);
  onSelectProfessionalRef.current = props.onSelectProfessional;

  useEffect(() => {
    if (visibleOrdered.length === 0) {
      return;
    }
    const selectedVisible = visibleOrdered.some((item) => item.professional.id === props.selectedProfessionalId);
    if (!selectedVisible) {
      onSelectProfessionalRef.current(visibleOrdered[0].professional.id);
    }
  }, [visibleOrdered, props.selectedProfessionalId]);

  const selected = visibleOrdered.find((item) => item.professional.id === props.selectedProfessionalId) ?? visibleOrdered[0] ?? null;

  const sortOptions = useMemo<SortOption[]>(() => [
    { value: "price-asc", label: t(props.language, { es: "Precio más bajo", en: "Lowest price", pt: "Menor preco" }) },
    { value: "price-desc", label: t(props.language, { es: "Precio más alto", en: "Highest price", pt: "Maior preco" }) },
    { value: "rating-desc", label: t(props.language, { es: "Calificación más alta", en: "Highest rating", pt: "Maior classificacao" }) },
    { value: "reviews-desc", label: t(props.language, { es: "Mayor cantidad de reseñas", en: "Most reviews", pt: "Maior quantidade de avaliacoes" }) }
  ], [props.language]);

  const heading = props.showOnlyFavorites
    ? t(props.language, {
        es: "Tus profesionales favoritos",
        en: "Your favorite professionals",
        pt: "Seus profissionais favoritos"
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
    : mode === "onboarding-final"
      ? t(props.language, {
          es: "Perfiles ordenados según tu cuestionario. Elegí un profesional y reservá tu sesión de prueba.",
          en: "Profiles are ordered from your questionnaire. Choose a professional and book your trial session.",
          pt: "Perfis ordenados pelo seu questionario. Escolha um profissional e reserve sua sessao de teste."
        })
      : t(props.language, {
          es: "Ordenamos los perfiles según tu perfil clínico y los datos reales que cada terapeuta cargó en su onboarding.",
          en: "Profiles are ranked by your clinical profile and real therapist data from onboarding.",
          pt: "Os perfis sao ordenados pelo seu perfil clinico e pelos dados reais do onboarding dos terapeutas."
        });

  const countLabel = mode === "onboarding-final"
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

  const closeBookingFlow = () => {
    setBookingStep(null);
    setBookingProfessionalId("");
    setBookingSlot(null);
    setAllSlots([]);
    setSlotsError("");
    setPaymentError("");
    setSlotsLoading(false);
    setPaymentLoading(false);
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
    setSlotsLoading(true);
    setSlotsError("");
    void fetchProfessionalAvailability(professionalId, props.authToken)
      .then((slots) => {
        setAllSlots(slots);
      })
      .catch((requestError) => {
        setAllSlots([]);
        setSlotsError(
          t(props.language, {
            es: "Ahora no pudimos cargar los horarios. Volvé a intentar o elegí otro profesional.",
            en: "We couldn’t load times just now. Try again or choose another professional.",
            pt: "Nao foi possivel carregar os horarios agora. Tente de novo ou escolha outro profissional."
          })
        );
      })
      .finally(() => {
        setSlotsLoading(false);
      });
  };

  const openSummaryFromSuggestedSlot = (professionalId: string, slot: MatchTimeSlot) => {
    if (!bookingFlowEnabled) {
      props.onReserve(professionalId);
      return;
    }
    setPaymentError("");
    setBookingProfessionalId(professionalId);
    setBookingSlot(slot);
    setBookingStep("summary");
  };

  const handlePay = async () => {
    if (!bookingFlowEnabled) {
      return;
    }
    if (!bookingProfessionalId || !bookingSlot) {
      return;
    }

    setPaymentLoading(true);
    setPaymentError("");
    try {
      const stillListed = await isSlotStillListedAfterFreshFetch(bookingProfessionalId, bookingSlot, props.authToken);
      if (!stillListed) {
        throw new Error(
          t(props.language, {
            es: "Ese horario se llenó recién. Te pedimos que elijas otro que te venga bien.",
            en: "That time just filled up. Please choose another that works for you.",
            pt: "Esse horario acabou de ficar cheio. Escolha outro que lhe sirva."
          })
        );
      }
      await props.onCreateBooking(bookingProfessionalId, bookingSlot);
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
  };

  return (
    <div className={`page-stack patient-matching-page ${mode === "onboarding-final" ? "onboarding-focus" : ""}`}>
      <MatchingHeader
        minimal={mode === "onboarding-final"}
        onboardingAccent={mode === "onboarding-final"}
        heading={heading}
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
        t={(values) => t(props.language, values)}
        onDeferTherapistSelection={
          mode === "onboarding-final" && props.onDeferTherapistSelection
            ? () => void props.onDeferTherapistSelection?.()
            : undefined
        }
      />

      {loading ? (
        <section className="content-card">
          <p>{t(props.language, { es: "Cargando especialistas...", en: "Loading specialists...", pt: "Carregando especialistas..." })}</p>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="content-card">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {!loading && !error && visibleOrdered.length > 0 ? (
        <>
          <div className="patient-therapist-list">
            {visibleOrdered.map((item) => (
              <ProfessionalMatchCard
                key={item.professional.id}
                item={item}
                language={props.language}
                isFavorite={favoriteIds.has(item.professional.id)}
                selected={item.professional.id === props.selectedProfessionalId}
                onSelect={props.onSelectProfessional}
                onToggleFavorite={props.onToggleFavorite}
                onSelectSuggestedSlot={openSummaryFromSuggestedSlot}
                onShowAllSlots={openAvailabilityFlow}
                onChat={props.onChat}
                onImageFallback={props.onImageFallback}
                showChatAction={!bookingFlowEnabled && !props.isFirstSelectionRequired}
                cardOpensAvailability={bookingFlowEnabled}
              />
            ))}
          </div>
        </>
      ) : null}

      {!loading && !error && visibleOrdered.length === 0 ? (
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
      ) : null}

      {props.isFirstSelectionRequired && selected && !bookingFlowEnabled ? (
        <MatchingStickyAction
          language={props.language}
          professionalName={selected.professional.fullName}
          score={selected.score}
          onContinue={() =>
            props.onCompleteFirstSelection({
              professionalId: selected.professional.id,
              professionalName: selected.professional.fullName
            })
          }
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
          onContinue={() => {
            if (!bookingSlot) {
              return;
            }
            setBookingStep("summary");
          }}
        />
      ) : null}

      {bookingFlowEnabled && bookingStep === "summary" && bookingProfessional && bookingSlot ? (
        <BookingSummaryModal
          language={props.language}
          timezone={viewerTimezone}
          professional={bookingProfessional}
          slot={bookingSlot}
          onBack={() => setBookingStep("availability")}
          onClose={closeBookingFlow}
          onContinue={() => setBookingStep("payment")}
          onImageFallback={props.onImageFallback}
        />
      ) : null}

      {bookingFlowEnabled && bookingStep === "payment" && bookingProfessional && bookingSlot ? (
        <PaymentMethodModal
          language={props.language}
          amountUsd={bookingProfessional.sessionPriceUsd}
          loading={paymentLoading}
          error={paymentError}
          onBack={() => setBookingStep("summary")}
          onClose={closeBookingFlow}
          onPay={handlePay}
        />
      ) : null}
    </div>
  );
}
