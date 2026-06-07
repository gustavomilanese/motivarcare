import { type KeyboardEvent, type MouseEvent, type SyntheticEvent } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import {
  bookingJoinUrl,
  canPatientRescheduleBooking
} from "@therapy/i18n-config";
import { findProfessionalById } from "../../app/lib/professionals";
import { ProfessionalNameStack } from "../../app/components/ProfessionalNameStack";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Booking, Professional } from "../../app/types";
import {
  formatSessionCardDateLine,
  formatSessionDateOnly,
  formatSessionTimeOnly
} from "../lib/sessionDateFormat";
import {
  joinPendingLabel,
  joinSessionLabel,
  rescheduleAriaLabel,
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
  isEditing?: boolean;
  isNextInList?: boolean;
  joinTourTarget?: boolean;
  joinTourPulse?: boolean;
};

function stopActivation(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
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
  const title = props.canReschedule ? undefined : rescheduleUnavailableTitle(props.language);
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
  const canReschedule = canPatientRescheduleBooking(props.booking.startsAt);
  const cardClassName = [
    "session-management-card",
    "session-management-card-clickable",
    props.layout === "card" ? "session-rn-card" : "",
    props.isEditing ? "editing" : "",
    isTrialBooking ? "session-rn-card--trial" : "",
    props.isNextInList ? "session-rn-card--next" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      props.onOpenDetail();
    }
  };

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
            <strong>
              <ProfessionalNameStack professional={bookingProfessional} as="span" />
            </strong>
          </div>
          <div className="session-management-cell session-management-cell-status">
            <span className="session-management-cell-label">{headLabels.status}</span>
            <span className="session-status-pill confirmed">
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
      onClick={props.onOpenDetail}
      onKeyDown={handleKeyDown}
    >
      <div className="session-rn-top">
        <span className="session-rn-time" aria-hidden="true">
          {formatSessionTimeOnly({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}
        </span>
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
                {formatSessionCardDateLine({
                  isoDate: props.booking.startsAt,
                  timezone: props.timezone,
                  language: props.language
                })}
              </span>
              <strong className="session-rn-name">
                <ProfessionalNameStack professional={bookingProfessional} as="span" />
              </strong>
              <span className="session-rn-status">{upcomingBookingCardStatusLine(props.language, isTrialBooking)}</span>
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
      <div className="session-rn-footer">
        {!isTrialBooking ? (
          <SessionJoinLink joinUrl={joinUrl} language={props.language} layout="card" />
        ) : (
          <>
            <SessionJoinLink joinUrl={joinUrl} language={props.language} layout="card" />
            <SessionViewDetailButton
              language={props.language}
              layout="card"
              onOpenDetail={props.onOpenDetail}
            />
          </>
        )}
      </div>
    </article>
  );
}
