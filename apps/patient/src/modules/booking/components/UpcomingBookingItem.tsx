import { type KeyboardEvent, type MouseEvent, type SyntheticEvent } from "react";
import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import {
  bookingJoinUrl,
  canPatientRescheduleBooking
} from "@therapy/i18n-config";
import { findProfessionalById } from "../../app/lib/professionals";
import { ProfessionalNameStack } from "../../app/components/ProfessionalNameStack";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import { ProfessionalReviewStarsRow } from "../../reviews/components/ProfessionalReviewStarsRow";
import { resolveProfessionalDisplayRating } from "../../reviews/lib/professionalReviewsDisplay";
import type { Booking, Professional } from "../../app/types";
import {
  formatSessionCardDateTimeLine,
  formatSessionDateOnly,
  formatSessionTimeOnly
} from "../lib/sessionDateFormat";
import {
  joinPendingLabel,
  joinSessionLabel,
  rescheduleAriaLabel,
  rescheduleTooltipLabel,
  rescheduleUnavailableTitle,
  upcomingBookingCardStatusLine,
  upcomingBookingStatusPillLabel,
  upcomingBookingsTableHeadLabels,
  viewDetailLabel
} from "../lib/upcomingBookingLabels";

export type UpcomingBookingLayout = "table" | "card";

type UpcomingBookingItemProps = {
  booking: Booking;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  timezone: string;
  language: AppLanguage;
  layout: UpcomingBookingLayout;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenDetail: () => void;
  onReschedule: () => void;
  onOpenProfessionalReviews?: (professionalId: string) => void;
  isEditing?: boolean;
  isNextInList?: boolean;
  joinTourTarget?: boolean;
  joinTourPulse?: boolean;
};

function stopActivation(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

function ProfessionalRatingCompact(props: {
  professional: Professional;
  className?: string;
}) {
  const reviewCount = props.professional.reviewsCount ?? 0;
  const averageRating = props.professional.rating ?? null;
  const displayRating = resolveProfessionalDisplayRating(averageRating, reviewCount);

  return (
    <span
      className={`session-pro-rating-compact${props.className ? ` ${props.className}` : ""}`}
      aria-label={`${displayRating.toFixed(1)} / 5`}
    >
      <ProfessionalReviewStarsRow averageRating={averageRating} reviewCount={reviewCount} size="md" />
      <span className="session-pro-rating-compact-value">{displayRating.toFixed(1)}</span>
    </span>
  );
}

function ProfessionalNameLink(props: {
  professional: Parameters<typeof ProfessionalNameStack>[0]["professional"];
  language: AppLanguage;
  className?: string;
  onOpenProfessionalReviews?: (professionalId: string) => void;
  professionalId: string;
  singleLine?: boolean;
}) {
  const displayName = props.singleLine
    ? professionalAccessibleName(props.professional)
    : null;

  if (!props.onOpenProfessionalReviews) {
    return (
      <span className={props.className}>
        {displayName ? (
          <span className="session-rn-name-line">{displayName}</span>
        ) : (
          <ProfessionalNameStack professional={props.professional} as="span" />
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`professional-name-link${props.className ? ` ${props.className}` : ""}`}
      aria-label={textByLanguage(props.language, {
        es: "Ver opiniones del profesional",
        en: "View therapist reviews",
        pt: "Ver avaliações do profissional"
      })}
      onClick={(event) => {
        stopActivation(event);
        props.onOpenProfessionalReviews?.(props.professionalId);
      }}
    >
      {displayName ? (
        <span className="session-rn-name-line">{displayName}</span>
      ) : (
        <ProfessionalNameStack professional={props.professional} as="span" />
      )}
    </button>
  );
}

function SessionJoinLink(props: {
  joinUrl: string;
  language: AppLanguage;
  layout: UpcomingBookingLayout;
  joinTourTarget?: boolean;
  joinTourPulse?: boolean;
}) {
  if (!props.joinUrl) {
    if (props.layout === "card") {
      return <p className="session-rn-join-pending">{joinPendingLabel(props.language)}</p>;
    }
    return null;
  }

  if (props.layout === "card") {
    return (
      <a
        className={`session-rn-join-btn${props.joinTourPulse ? " patient-join-meet--pulse" : ""}`}
        data-tour={props.joinTourTarget ? "patient-join-first-meet" : undefined}
        href={props.joinUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stopActivation}
      >
        <svg className="session-rn-join-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 2.5v-9l-4 2.5z"
          />
        </svg>
        {joinSessionLabel(props.language)}
      </a>
    );
  }

  return (
    <a
      className={`session-detail-button session-management-join-link${
        props.joinTourPulse ? " patient-join-meet--pulse" : ""
      }`}
      data-tour={props.joinTourTarget ? "patient-join-first-meet" : undefined}
      href={props.joinUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={stopActivation}
    >
      {joinSessionLabel(props.language)}
    </a>
  );
}

function SessionRescheduleButton(props: {
  language: AppLanguage;
  layout: UpcomingBookingLayout;
  canReschedule: boolean;
  onReschedule: () => void;
}) {
  const title = props.canReschedule
    ? rescheduleTooltipLabel(props.language)
    : rescheduleUnavailableTitle(props.language);
  const ariaLabel = rescheduleAriaLabel(props.language);
  const onClick = (event: MouseEvent) => {
    stopActivation(event);
    if (!props.canReschedule) {
      return;
    }
    props.onReschedule();
  };

  if (props.layout === "card") {
    return (
      <button
        type="button"
        className="session-rn-reschedule"
        disabled={!props.canReschedule}
        title={title}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        <span className="session-action-icon reschedule" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="icon-only"
      disabled={!props.canReschedule}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span className="session-action-icon reschedule" aria-hidden="true" />
    </button>
  );
}

function SessionViewDetailButton(props: {
  language: AppLanguage;
  layout: UpcomingBookingLayout;
  onOpenDetail: () => void;
}) {
  const onClick = (event: MouseEvent) => {
    stopActivation(event);
    props.onOpenDetail();
  };

  if (props.layout === "card") {
    return (
      <button type="button" className="session-rn-detail-ghost" onClick={onClick}>
        {viewDetailLabel(props.language)}
      </button>
    );
  }

  return (
    <button type="button" className="session-detail-button" onClick={onClick}>
      {viewDetailLabel(props.language)}
    </button>
  );
}

export function UpcomingBookingItem(props: UpcomingBookingItemProps) {
  const bookingProfessional = findProfessionalById(props.booking.professionalId, props.professionals);
  const isTrialBooking = props.booking.bookingMode === "trial";
  const joinUrl = bookingJoinUrl(props.booking);
  const canReschedule = canPatientRescheduleBooking(
    props.booking.startsAt,
    bookingProfessional.cancellationHours
  );
  const cardClassName = [
    "session-management-card",
    "session-management-card-clickable",
    props.layout === "card" ? "session-rn-card" : "",
    props.layout === "card" && joinUrl ? "session-rn-card--joinable" : "",
    props.isEditing ? "editing" : "",
    isTrialBooking ? "session-rn-card--trial" : "",
    props.isNextInList ? "session-rn-card--next" : "",
    props.joinTourPulse ? "patient-join-meet--pulse" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const activateCard = () => {
    if (props.layout === "card" && joinUrl) {
      window.open(joinUrl, "_blank", "noopener,noreferrer");
      return;
    }
    props.onOpenDetail();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateCard();
    }
  };

  const cardAriaLabel =
    props.layout === "card" && joinUrl
      ? textByLanguage(props.language, {
          es: `Entrar a la sesión con ${professionalAccessibleName(bookingProfessional)}, ${formatSessionCardDateTimeLine({
            isoDate: props.booking.startsAt,
            timezone: props.timezone,
            language: props.language
          })}`,
          en: `Join session with ${professionalAccessibleName(bookingProfessional)}, ${formatSessionCardDateTimeLine({
            isoDate: props.booking.startsAt,
            timezone: props.timezone,
            language: props.language
          })}`,
          pt: `Entrar na sessão com ${professionalAccessibleName(bookingProfessional)}, ${formatSessionCardDateTimeLine({
            isoDate: props.booking.startsAt,
            timezone: props.timezone,
            language: props.language
          })}`
        })
      : undefined;

  if (props.layout === "table") {
    const headLabels = upcomingBookingsTableHeadLabels(props.language);

    return (
      <article
        className={cardClassName}
        role="button"
        tabIndex={0}
        onClick={props.onOpenDetail}
        onKeyDown={handleKeyDown}
      >
        <div className="session-management-main">
          <div className="session-management-cell session-management-cell-date">
            <span className="session-management-cell-label">{headLabels.date}</span>
            <strong>{formatSessionDateOnly({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}</strong>
          </div>
          <div className="session-management-cell session-management-cell-time">
            <span className="session-management-cell-label">{headLabels.time}</span>
            <span>{formatSessionTimeOnly({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}</span>
          </div>
          <div className="session-management-cell session-management-meta">
            <span className="session-management-cell-label">{headLabels.professional}</span>
            <div className="session-management-meta-body">
              <ProfessionalNameLink
                className="session-management-professional-link"
                professional={bookingProfessional}
                professionalId={props.booking.professionalId}
                language={props.language}
                onOpenProfessionalReviews={props.onOpenProfessionalReviews}
              />
              <ProfessionalRatingCompact professional={bookingProfessional} className="session-pro-rating-compact--table" />
            </div>
          </div>
          <div className="session-management-cell session-management-cell-status">
            <span className="session-management-cell-label">{headLabels.status}</span>
            <span className={`session-status-pill confirmed${isTrialBooking ? " session-status-pill--trial" : ""}`}>
              {upcomingBookingStatusPillLabel(props.language, isTrialBooking)}
            </span>
          </div>
        </div>
        <div className="session-management-actions-wrap">
          <span className="session-management-cell-label">{headLabels.actions}</span>
          {isTrialBooking ? (
            <div className="session-management-actions">
              <SessionViewDetailButton
                language={props.language}
                layout="table"
                onOpenDetail={props.onOpenDetail}
              />
            </div>
          ) : (
            <div className="session-management-actions">
              <SessionJoinLink
                joinUrl={joinUrl}
                language={props.language}
                layout="table"
                joinTourTarget={props.joinTourTarget}
                joinTourPulse={props.joinTourPulse}
              />
              <SessionRescheduleButton
                language={props.language}
                layout="table"
                canReschedule={canReschedule}
                onReschedule={props.onReschedule}
              />
            </div>
          )}
        </div>
      </article>
    );
  }

  const proPhoto = professionalPhotoSrc(props.professionalPhotoMap[props.booking.professionalId]);

  return (
    <article
      className={cardClassName}
      role="button"
      tabIndex={0}
      aria-label={cardAriaLabel}
      data-tour={props.joinTourTarget && joinUrl ? "patient-join-first-meet" : undefined}
      onClick={activateCard}
      onKeyDown={handleKeyDown}
    >
      <div className="session-rn-top">
        <img
          className="session-rn-avatar"
          src={proPhoto}
          alt=""
          onError={props.onImageFallback}
        />
        <div className="session-rn-body">
          <div className="session-rn-body-header">
            <div className="session-rn-body-main">
              <span className="session-rn-date-line">
                {formatSessionCardDateTimeLine({
                  isoDate: props.booking.startsAt,
                  timezone: props.timezone,
                  language: props.language
                })}
              </span>
              <ProfessionalNameLink
                className="session-rn-name"
                professional={bookingProfessional}
                professionalId={props.booking.professionalId}
                language={props.language}
                onOpenProfessionalReviews={props.onOpenProfessionalReviews}
                singleLine
              />
              <ProfessionalRatingCompact professional={bookingProfessional} />
              <span className={`session-rn-status${isTrialBooking ? " session-rn-status--trial" : ""}`}>
                {upcomingBookingCardStatusLine(props.language, isTrialBooking)}
              </span>
            </div>
            {!isTrialBooking ? (
              <SessionRescheduleButton
                language={props.language}
                layout="card"
                canReschedule={canReschedule}
                onReschedule={props.onReschedule}
              />
            ) : null}
          </div>
        </div>
      </div>
      {!joinUrl && props.layout === "card" ? (
        <p className="session-rn-join-pending">{joinPendingLabel(props.language)}</p>
      ) : null}
    </article>
  );
}
