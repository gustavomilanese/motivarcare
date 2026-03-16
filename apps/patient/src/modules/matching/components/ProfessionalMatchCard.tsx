import type { SyntheticEvent } from "react";
import { formatDateWithLocale, type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { RankedProfessional } from "../matchingEngine";
import type { MatchTimeSlot } from "../types";

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

function countryFlag(country: string | null): string {
  if (!country) {
    return "";
  }

  const normalized = country.toLowerCase();
  if (normalized.includes("arg")) {
    return "🇦🇷";
  }
  if (normalized.includes("uru")) {
    return "🇺🇾";
  }
  if (normalized.includes("bra")) {
    return "🇧🇷";
  }
  if (normalized.includes("chi")) {
    return "🇨🇱";
  }
  if (normalized.includes("mex")) {
    return "🇲🇽";
  }
  if (normalized.includes("esp")) {
    return "🇪🇸";
  }
  if (normalized.includes("usa") || normalized.includes("estados unidos")) {
    return "🇺🇸";
  }
  return "";
}

export function ProfessionalMatchCard(props: {
  item: RankedProfessional;
  language: AppLanguage;
  selected: boolean;
  onSelect: (professionalId: string) => void;
  onSelectSuggestedSlot: (professionalId: string, slot: MatchTimeSlot) => void;
  onShowAllSlots: (professionalId: string) => void;
  onChat: (professionalId: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  showChatAction: boolean;
}) {
  const professional = props.item.professional;
  const displayedSpecialties = [professional.specialization, professional.focusPrimary].filter(Boolean) as string[];
  const photoUrl = professional.photoUrl ?? "/images/prof-emma.svg";
  const flag = countryFlag(professional.birthCountry);
  const matchLabel = t(props.language, {
    es: `${props.item.score}% match`,
    en: `${props.item.score}% match`,
    pt: `${props.item.score}% match`
  });
  const reviewsLabel = professional.reviewsCount > 0
    ? `${professional.reviewsCount} ${t(props.language, { es: "opiniones", en: "reviews", pt: "avaliacoes" })}`
    : t(props.language, { es: "Sin opiniones", en: "No reviews yet", pt: "Sem avaliacoes" });
  const priceLabel = professional.sessionPriceUsd !== null
    ? `$${professional.sessionPriceUsd} USD`
    : t(props.language, { es: "Precio a confirmar", en: "Price on request", pt: "Preco sob consulta" });

  const suggested = props.item.suggestedSlots.slice(0, 2);

  return (
    <article className={`patient-therapist-card ${props.selected ? "selected" : ""}`}>
      <img
        className="patient-therapist-avatar"
        src={photoUrl}
        alt={professional.fullName}
        onError={props.onImageFallback}
      />

      <div className="patient-therapist-main">
        <header className="patient-therapist-head">
          <div>
            <h3>
              {professional.fullName}
              {flag ? <span className="patient-therapist-flag"> {flag}</span> : null}
              {professional.stripeVerified ? <span className="patient-therapist-verified"> ●</span> : null}
            </h3>
            <p>{professional.title}</p>
          </div>
          <div className="patient-therapist-metrics">
            <span className="match-badge">{matchLabel}</span>
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
            <span>★ {professional.ratingAverage ? professional.ratingAverage.toFixed(1) : "—"}</span>
            <small>{reviewsLabel}</small>
          </div>
        </div>

        <p className="patient-therapist-bio">
          {professional.bio ?? t(props.language, { es: "Sin descripción publicada todavía.", en: "No description yet.", pt: "Sem descricao ainda." })}
        </p>

        <div className="patient-therapist-reasons">
          {props.item.reasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>

        {displayedSpecialties.length > 0 ? (
          <ul className="patient-therapist-tags">
            {displayedSpecialties.map((specialty) => (
              <li key={specialty}>{specialty}</li>
            ))}
          </ul>
        ) : null}

        <div className="patient-therapist-stats">
          <span>
            {t(props.language, {
              es: `${professional.yearsExperience} años experiencia`,
              en: `${professional.yearsExperience} years experience`,
              pt: `${professional.yearsExperience} anos experiencia`
            })}
          </span>
          <span>
            {t(props.language, {
              es: `${professional.activePatientsCount} clientes`,
              en: `${professional.activePatientsCount} clients`,
              pt: `${professional.activePatientsCount} clientes`
            })}
          </span>
          <span>
            {t(props.language, {
              es: `${professional.sessionsCount} sesiones`,
              en: `${professional.sessionsCount} sessions`,
              pt: `${professional.sessionsCount} sessoes`
            })}
          </span>
          <span>
            {t(props.language, {
              es: `${professional.completedSessionsCount} completadas`,
              en: `${professional.completedSessionsCount} completed`,
              pt: `${professional.completedSessionsCount} concluidas`
            })}
          </span>
        </div>

        <div className="patient-therapist-slots">
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

        <div className="patient-therapist-actions">
          <button
            type="button"
            className={`choose-button ${props.selected ? "selected" : ""}`}
            onClick={() => props.onSelect(professional.id)}
          >
            {props.selected
              ? t(props.language, { es: "Terapeuta seleccionado", en: "Therapist selected", pt: "Terapeuta selecionado" })
              : t(props.language, { es: "Elegir terapeuta", en: "Choose therapist", pt: "Escolher terapeuta" })}
          </button>
          <button type="button" className="outline-button" onClick={() => props.onShowAllSlots(professional.id)}>
            {t(props.language, { es: "Ver horarios", en: "View slots", pt: "Ver horarios" })}
          </button>
          {props.showChatAction ? (
            <button type="button" className="ghost-button" onClick={() => props.onChat(professional.id)}>
              {t(props.language, { es: "Abrir chat", en: "Open chat", pt: "Abrir chat" })}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
