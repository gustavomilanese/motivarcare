import { useEffect, useRef, useState, type SyntheticEvent, type UIEvent, type WheelEvent } from "react";
import { formatDateWithLocale, type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { RankedProfessional } from "../matchingEngine";
import type { MatchTimeSlot } from "../types";
import { countryToFlag } from "../utils/countryFlag";
import { professionalPhotoAlt } from "../../app/components/ProfessionalNameStack";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatSlotDate(slotIso: string, language: AppLanguage): string {
  const slotDate = new Date(slotIso);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  const isSameDate =
    slotDate.getFullYear() === now.getFullYear()
    && slotDate.getMonth() === now.getMonth()
    && slotDate.getDate() === now.getDate();
  const isTomorrow =
    slotDate.getFullYear() === tomorrow.getFullYear()
    && slotDate.getMonth() === tomorrow.getMonth()
    && slotDate.getDate() === tomorrow.getDate();

  const hour = formatDateWithLocale({
    value: slotIso,
    language,
    options: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  });

  if (isSameDate) {
    return `${t(language, { es: "Hoy", en: "Today", pt: "Hoje" })}, ${hour}`;
  }
  if (isTomorrow) {
    return `${t(language, { es: "Mañana", en: "Tomorrow", pt: "Amanha" })}, ${hour}`;
  }
  const shortDate = formatDateWithLocale({
    value: slotIso,
    language,
    options: {
      weekday: "short",
      day: "2-digit",
      month: "short"
    }
  });
  return `${shortDate}, ${hour}`;
}

export function ProfessionalMatchCard(props: {
  item: RankedProfessional;
  language: AppLanguage;
  isFavorite: boolean;
  selected: boolean;
  onSelect: (professionalId: string) => void;
  onToggleFavorite: (professionalId: string) => void;
  onSelectSuggestedSlot: (professionalId: string, slot: MatchTimeSlot) => void;
  onShowAllSlots: (professionalId: string) => void;
  onChat: (professionalId: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  showChatAction: boolean;
  /** Tocar la tarjeta (fuera de botones) abre el flujo de horarios completos. */
  cardOpensAvailability?: boolean;
}) {
  const slotsScrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasSlotsOverflow, setHasSlotsOverflow] = useState(false);
  const professional = props.item.professional;
  const displayedSpecialties = [professional.specialization, professional.focusPrimary].filter(Boolean) as string[];
  const photoUrl = professionalPhotoSrc(professional.photoUrl);
  const flag = countryToFlag(professional.birthCountry);
  const matchLabel = t(props.language, {
    es: `${props.item.score}% match`,
    en: `${props.item.score}% match`,
    pt: `${props.item.score}% match`
  });
  const reviewsLabel = professional.reviewsCount > 0
    ? `${professional.reviewsCount} ${t(props.language, { es: "opiniones", en: "reviews", pt: "avaliacoes" })}`
    : t(props.language, { es: "Sin opiniones", en: "No reviews yet", pt: "Sem avaliacoes" });
  const ratingValue = professional.ratingAverage ?? 5;
  const priceLabel = professional.sessionPriceUsd !== null
    ? `$${professional.sessionPriceUsd} USD`
    : t(props.language, { es: "Precio a confirmar", en: "Price on request", pt: "Preco sob consulta" });

  const suggested = props.item.suggestedSlots.slice(0, 6);

  const refreshSlotsScrollState = () => {
    const container = slotsScrollerRef.current;
    if (!container) {
      setHasSlotsOverflow(false);
      return;
    }

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    const overflow = maxScrollLeft > 2;
    setHasSlotsOverflow(overflow);
  };

  useEffect(() => {
    refreshSlotsScrollState();
    const container = slotsScrollerRef.current;
    if (!container) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => refreshSlotsScrollState());
    resizeObserver.observe(container);
    window.addEventListener("resize", refreshSlotsScrollState);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", refreshSlotsScrollState);
    };
  }, [suggested.length]);

  const handleSlotsScroll = (_event: UIEvent<HTMLDivElement>) => {
    refreshSlotsScrollState();
  };

  const handleSlotsWheel = (event: WheelEvent<HTMLDivElement>) => {
    const container = slotsScrollerRef.current;
    if (!container || !hasSlotsOverflow) {
      return;
    }

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    container.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  return (
    <article
      className={`patient-therapist-card ${props.selected ? "selected" : ""}`}
      onClick={(event) => {
        if (!props.cardOpensAvailability) {
          return;
        }
        const target = event.target as HTMLElement;
        if (target.closest("button")) {
          return;
        }
        props.onSelect(professional.id);
        props.onShowAllSlots(professional.id);
      }}
      style={props.cardOpensAvailability ? { cursor: "pointer" } : undefined}
    >
      <div className="patient-therapist-corner">
        <button
          type="button"
          className={`favorite-toggle ${props.isFavorite ? "active" : ""}`}
          onClick={() => props.onToggleFavorite(professional.id)}
          aria-label={
            props.isFavorite
              ? t(props.language, { es: "Quitar de favoritos", en: "Remove from favorites", pt: "Remover dos favoritos" })
              : t(props.language, { es: "Guardar en favoritos", en: "Save to favorites", pt: "Salvar nos favoritos" })
          }
        >
          <svg className="favorite-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 21.2 10.6 19.9C5.6 15.4 2.4 12.5 2.4 8.9c0-3 2.3-5.3 5.3-5.3 1.8 0 3.5.8 4.6 2.2a6 6 0 0 1 4.6-2.2c3 0 5.3 2.3 5.3 5.3 0 3.6-3.2 6.5-8.2 11L12 21.2z"
              fill={props.isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="match-badge">{matchLabel}</span>
      </div>

      <img
        className="patient-therapist-avatar"
        src={photoUrl}
        alt={professionalPhotoAlt(professional)}
        onError={props.onImageFallback}
      />

      <div className="patient-therapist-main">
        <header className="patient-therapist-head">
          <div className="patient-therapist-identity">
            <h3 className="patient-therapist-name-single">
              <span>{professionalAccessibleName(professional)}</span>
              {flag ? <span className="patient-therapist-flag"> {flag}</span> : null}
            </h3>
            <div className="patient-therapist-identity-meta">
              {professional.stripeVerified ? (
                <span className="patient-therapist-verified">
                  {t(props.language, { es: "Verificado", en: "Verified", pt: "Verificado" })}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="patient-therapist-price-row">
          <div className="patient-therapist-price-block">
            <strong>{priceLabel}</strong>
            <small>
              {t(props.language, {
                es: `${professional.sessionDurationMinutes} minutos`,
                en: `${professional.sessionDurationMinutes} minutes`,
                pt: `${professional.sessionDurationMinutes} minutos`
              })}
            </small>
          </div>
          <div className="patient-therapist-rating-block">
            <span>
              <span className="rating-star">★</span>
              <span className="rating-value">{ratingValue.toFixed(1)}</span>
            </span>
            <small>{reviewsLabel}</small>
          </div>
        </div>

        <p className="patient-therapist-bio">
          {professional.bio ?? t(props.language, { es: "Sin descripción publicada todavía.", en: "No description yet.", pt: "Sem descricao ainda." })}
        </p>

        <div className="patient-therapist-stats">
          <span className="stat-item primary">
            <svg className="stat-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 6V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {t(props.language, {
              es: `${professional.yearsExperience} años experiencia`,
              en: `${professional.yearsExperience} years experience`,
              pt: `${professional.yearsExperience} anos experiencia`
            })}
          </span>
          <span className="stat-item">
            <svg className="stat-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 19c0-3.2 3.1-5.3 7-5.3s7 2.1 7 5.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {t(props.language, {
              es: `${professional.activePatientsCount} pacientes • ${professional.sessionsCount} sesiones`,
              en: `${professional.activePatientsCount} patients • ${professional.sessionsCount} sessions`,
              pt: `${professional.activePatientsCount} pacientes • ${professional.sessionsCount} sessoes`
            })}
          </span>
        </div>

        {displayedSpecialties.length > 0 ? (
          <ul className="patient-therapist-tags">
            {displayedSpecialties.map((specialty) => (
              <li key={specialty}>{specialty}</li>
            ))}
          </ul>
        ) : null}

        {/*
          Keep schedules as the last scannable line in the card body, like the
          reference experience, with horizontal drag and wheel scroll.
        */}
        <div className="patient-therapist-slots-wrap">
          <div
            className="patient-therapist-slots"
            ref={slotsScrollerRef}
            onWheel={handleSlotsWheel}
            onScroll={handleSlotsScroll}
          >
            {suggested.map((slot) => (
              <button
                key={slot.id}
                className="slot-chip"
                type="button"
                onClick={() => {
                  props.onSelect(professional.id);
                  props.onSelectSuggestedSlot(professional.id, slot);
                }}
              >
                {formatSlotDate(slot.startsAt, props.language)}
              </button>
            ))}
            <button
              type="button"
              className="slot-chip show-all"
              onClick={() => {
                props.onSelect(professional.id);
                props.onShowAllSlots(professional.id);
              }}
            >
              {t(props.language, { es: "Mostrar todo", en: "Show all", pt: "Mostrar todos" })}
            </button>
          </div>
        </div>

        {props.showChatAction ? (
          <div className="patient-therapist-actions">
            <button type="button" className="ghost-button" onClick={() => props.onChat(professional.id)}>
              {t(props.language, { es: "Abrir chat", en: "Open chat", pt: "Abrir chat" })}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
