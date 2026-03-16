import { useEffect, useMemo, useState } from "react";
import { type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { MatchingHeader } from "../components/MatchingHeader";
import { ProfessionalMatchCard } from "../components/ProfessionalMatchCard";
import { MatchingStickyAction } from "../components/MatchingStickyAction";
import { AvailabilityPickerModal } from "../components/AvailabilityPickerModal";
import { BookingSummaryModal } from "../components/BookingSummaryModal";
import { PaymentMethodModal } from "../components/PaymentMethodModal";
import { useProfessionalMatching } from "../hooks/useProfessionalMatching";
import { fetchProfessionalAvailability } from "../services/availability";
import { fetchProfessionalDirectory } from "../services/professionals";
import type {
  FilterOption,
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
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("match");
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

    fetchProfessionalDirectory(props.authToken)
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
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudo cargar el listado de profesionales.",
                en: "Could not load professionals list.",
                pt: "Nao foi possivel carregar a lista de profissionais."
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

  const { ordered, specialties, languages } = useProfessionalMatching({
    professionals,
    intakeAnswers: props.intakeAnswers,
    language: props.language,
    search,
    specialtyFilter,
    languageFilter,
    sortMode,
    isFirstSelectionRequired: props.isFirstSelectionRequired
  });

  useEffect(() => {
    if (ordered.length === 0) {
      return;
    }
    const selectedVisible = ordered.some((item) => item.professional.id === props.selectedProfessionalId);
    if (!selectedVisible) {
      props.onSelectProfessional(ordered[0].professional.id);
    }
  }, [ordered, props.onSelectProfessional, props.selectedProfessionalId]);

  const selected = ordered.find((item) => item.professional.id === props.selectedProfessionalId) ?? ordered[0] ?? null;

  const specialtyOptions = useMemo<FilterOption[]>(() => [
    {
      value: "all",
      label: t(props.language, { es: "Todas las especialidades", en: "All specialties", pt: "Todas as especialidades" })
    },
    ...specialties.map((value) => ({ value, label: value }))
  ], [props.language, specialties]);

  const languageOptions = useMemo<FilterOption[]>(() => [
    {
      value: "all",
      label: t(props.language, { es: "Todos los idiomas", en: "All languages", pt: "Todos os idiomas" })
    },
    ...languages.map((value) => ({ value, label: value }))
  ], [languages, props.language]);

  const sortOptions = useMemo<SortOption[]>(() => [
    { value: "match", label: t(props.language, { es: "Mejor match", en: "Best match", pt: "Melhor match" }) },
    { value: "next-slot", label: t(props.language, { es: "Próximo horario", en: "Next slot", pt: "Proximo horario" }) },
    { value: "price-asc", label: t(props.language, { es: "Menor precio", en: "Lowest price", pt: "Menor preco" }) },
    { value: "experience", label: t(props.language, { es: "Más experiencia", en: "Most experience", pt: "Mais experiencia" }) }
  ], [props.language]);

  const heading = t(props.language, {
    es: "Hemos encontrado especialistas para tu solicitud",
    en: "We found specialists for your request",
    pt: "Encontramos especialistas para sua necessidade"
  });
  const description = props.isFirstSelectionRequired
    ? t(props.language, {
        es: "Este es tu primer paso: elige tu terapeuta para comenzar.",
        en: "This is your first step: choose your therapist to start.",
        pt: "Este e seu primeiro passo: escolha seu terapeuta para comecar."
      })
    : t(props.language, {
        es: "Ordenamos los perfiles según tu perfil clínico y los datos reales que cada terapeuta cargó en su onboarding.",
        en: "Profiles are ranked by your clinical profile and real therapist data from onboarding.",
        pt: "Os perfis sao ordenados pelo seu perfil clinico e pelos dados reais do onboarding dos terapeutas."
      });

  const countLabel = t(props.language, {
    es: `${ordered.length} especialistas están disponibles actualmente`,
    en: `${ordered.length} specialists are currently available`,
    pt: `${ordered.length} especialistas estao disponiveis agora`
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
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudieron cargar los horarios.",
                en: "Could not load slots.",
                pt: "Nao foi possivel carregar os horarios."
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
      await props.onCreateBooking(bookingProfessionalId, bookingSlot);
      closeBookingFlow();
    } catch (requestError) {
      setPaymentError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo confirmar el pago y la reserva.",
              en: "Could not confirm payment and booking.",
              pt: "Nao foi possivel confirmar pagamento e reserva."
            })
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="page-stack patient-matching-page">
      <MatchingHeader
        firstFlow={props.isFirstSelectionRequired}
        heading={heading}
        description={description}
        countLabel={countLabel}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t(props.language, {
          es: "Buscar por nombre, especialidad o síntoma",
          en: "Search by name, specialty, or symptom",
          pt: "Buscar por nome, especialidade ou sintoma"
        })}
        specialtyFilter={specialtyFilter}
        onSpecialtyFilterChange={setSpecialtyFilter}
        specialtyOptions={specialtyOptions}
        languageFilter={languageFilter}
        onLanguageFilterChange={setLanguageFilter}
        languageOptions={languageOptions}
        sortMode={sortMode}
        onSortModeChange={(value) => setSortMode(value as SortMode)}
        sortOptions={sortOptions}
        t={(values) => t(props.language, values)}
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

      {!loading && !error ? (
        <div className="patient-therapist-list">
          {ordered.map((item) => (
            <ProfessionalMatchCard
              key={item.professional.id}
              item={item}
              language={props.language}
              selected={item.professional.id === props.selectedProfessionalId}
              onSelect={props.onSelectProfessional}
              onSelectSuggestedSlot={openSummaryFromSuggestedSlot}
              onShowAllSlots={openAvailabilityFlow}
              onChat={props.onChat}
              onImageFallback={props.onImageFallback}
              showChatAction={!props.isFirstSelectionRequired}
            />
          ))}
        </div>
      ) : null}

      {!loading && !error && ordered.length === 0 ? (
        <section className="content-card">
          <p>
            {t(props.language, {
              es: "No encontramos resultados con esos filtros. Prueba quitando algún filtro para ver más opciones.",
              en: "No results with those filters. Remove one to see more options.",
              pt: "Nao encontramos resultados com esses filtros. Remova um para ver mais opcoes."
            })}
          </p>
        </section>
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
