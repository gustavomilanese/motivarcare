import { type SyntheticEvent } from "react";
import { bookingJoinUrl, type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalAccessibleName, professionalFirstName } from "../../app/lib/professionalDisplayName";
import type { Booking, Professional } from "../../app/types";
import { CalmPersonHit } from "./CalmPersonHit";
import { CalmSessionCreditsBadge } from "./CalmSessionCreditsBadge";
import { CalmSessionRescheduleButton } from "./CalmSessionRescheduleButton";
import {
  formatClock,
  formatWeekdayDate,
  isSameZonedDay,
  sessionChipLabel,
  sessionLengthMinutes,
  sessionTiming,
  timezoneCaption
} from "./calmHomeFormat";
import { useMobilePortal } from "../../app/hooks/useMobilePortal";
import { DeviceTestLink } from "../../booking/components/DeviceTestLink";
import { IconVideo } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmSessionCard(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  booking: Booking | null;
  professional: Professional | null;
  photoUrl: string | null;
  availableSessions: number;
  showJoinTour: boolean;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onRescheduleBooking: (bookingId: string) => void;
  onGoToBooking: (professionalId: string) => void;
  onBuySessions?: () => void;
  onChooseProfessional: () => void;
  onBookTrial: () => void;
  onOpenProfile: () => void;
}) {
  const { language, timeZone, now, booking, professional } = props;
  const isMobilePortal = useMobilePortal();

  if (!booking || !professional) {
    return (
      <article className="calm-card calm-session calm-session--empty">
        <div className="calm-session-top">
          <span className="calm-session-top-spacer" aria-hidden="true" />
          <CalmSessionCreditsBadge language={language} available={props.availableSessions} />
        </div>
        <h2>
          {professional
            ? t(language, {
                es: "Todavía no hay una sesión agendada.",
                en: "There isn't a session scheduled yet.",
                pt: "Ainda não há uma sessão agendada."
              })
            : t(language, {
                es: "Cuando elijas profesional, la próxima sesión aparece acá.",
                en: "Once you choose a professional, your next session shows up here.",
                pt: "Quando você escolher um profissional, a próxima sessão aparece aqui."
              })}
        </h2>
        <div className="calm-session-actions">
          {professional ? (
            <button
              className="calm-btn calm-btn--yellow"
              type="button"
              onClick={() => {
                if (props.availableSessions <= 0) {
                  props.onBuySessions?.();
                  return;
                }
                props.onGoToBooking(professional.id);
              }}
            >
              {props.availableSessions <= 0
                ? t(language, { es: "Comprar", en: "Buy", pt: "Comprar" })
                : t(language, { es: "Reservar sesión", en: "Book a session", pt: "Reservar sessão" })}
            </button>
          ) : (
            <button className="calm-btn calm-btn--yellow" type="button" onClick={props.onChooseProfessional}>
              {t(language, { es: "Elegir profesional", en: "Choose a professional", pt: "Escolher profissional" })}
            </button>
          )}
          {!professional ? (
            <button className="calm-btn calm-btn--outline" type="button" onClick={props.onBookTrial}>
              {t(language, { es: "Sesión de prueba", en: "Trial session", pt: "Sessão de teste" })}
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  const timing = sessionTiming(booking.startsAt, booking.endsAt, now, timeZone);
  const sameDay = isSameZonedDay(new Date(booking.startsAt), now, timeZone);
  const clock = formatClock(booking.startsAt, timeZone, language);
  const minutes = sessionLengthMinutes(booking.startsAt, booking.endsAt);
  const joinUrl = bookingJoinUrl(booking);
  const name = professionalAccessibleName(professional);
  const given = professionalFirstName(professional);
  const specialtyLabel = professional.specialties.filter(Boolean).join(", ");
  const meta = [professional.title, specialtyLabel].filter(Boolean).join(" · ");
  return (
    <article className="calm-card calm-session" data-tour="patient-tour-bookings">
      <svg className="calm-session-blob" viewBox="0 0 500 520" aria-hidden="true">
        <path d="M438.7 372.7 C410.4 424.2 340.8 463.3 284.5 475.3 C228.1 487.3 140.1 482.6 100.4 444.8 C60.7 407.0 42.8 312.5 46.0 248.6 C49.2 184.7 76.7 94.1 119.7 61.4 C162.7 28.6 248.1 34.5 303.8 52.0 C359.6 69.4 431.7 112.8 454.2 166.3 C476.7 219.7 467.0 321.2 438.7 372.7Z" fill="#E7F1EA" />
        <circle cx="380" cy="150" r="14" fill="#F5C33B" />
      </svg>
      <div className="calm-session-top">
        <p className={`calm-chip${timing.kind === "live" || timing.kind === "soon" ? " calm-chip--live" : ""}`}>
          <span className="calm-chip-dot" aria-hidden="true" />
          {sessionChipLabel(timing, language)}
        </p>
        <CalmSessionCreditsBadge language={language} available={props.availableSessions} />
      </div>
      <div>
        <h2 className="calm-session-when">
          {sameDay
            ? t(language, { es: `Hoy, ${clock}`, en: `Today, ${clock}`, pt: `Hoje, ${clock}` })
            : `${formatWeekdayDate(booking.startsAt, timeZone, language)}, ${clock}`}
        </h2>
        <p className="calm-session-meta">
          {minutes
            ? t(language, {
                es: `Videollamada de ${minutes} min · ${timezoneCaption(timeZone, language, now)}`,
                en: `${minutes}-min video call · ${timezoneCaption(timeZone, language, now)}`,
                pt: `Videochamada de ${minutes} min · ${timezoneCaption(timeZone, language, now)}`
              })
            : t(language, {
                es: `Videollamada · ${timezoneCaption(timeZone, language, now)}`,
                en: `Video call · ${timezoneCaption(timeZone, language, now)}`,
                pt: `Videochamada · ${timezoneCaption(timeZone, language, now)}`
              })}
        </p>
      </div>
      <CalmPersonHit
        language={language}
        name={name}
        meta={meta}
        photoUrl={props.photoUrl}
        onImageFallback={props.onImageFallback}
        onOpenProfile={props.onOpenProfile}
        metaLines={2}
      />
      <div className="calm-session-actions">
        {joinUrl ? (
          <a
            className="calm-btn calm-btn--yellow calm-btn--large"
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-tour={props.showJoinTour ? "patient-join-first-meet" : undefined}
          >
            <IconVideo size={18} />
            {t(language, { es: "Entrar a la sesión", en: "Join session", pt: "Entrar na sessão" })}
          </a>
        ) : (
          <button className="calm-btn calm-btn--yellow" type="button" disabled>
            {t(language, {
              es: "El enlace llega por mail",
              en: "The link arrives by email",
              pt: "O link chega por e-mail"
            })}
          </button>
        )}
        <div className={`calm-session-secondary${isMobilePortal ? " calm-session-secondary--solo" : ""}`}>
          <CalmSessionRescheduleButton
            language={language}
            startsAt={booking.startsAt}
            cancellationHours={professional.cancellationHours}
            onReschedule={() => props.onRescheduleBooking(booking.id)}
          />
          {isMobilePortal ? null : (
            <DeviceTestLink language={language} className="calm-text-link calm-session-av-test" />
          )}
        </div>
      </div>
      <p className="sr-only">
        {t(language, {
          es: `Sesión con ${given}`,
          en: `Session with ${given}`,
          pt: `Sessão com ${given}`
        })}
      </p>
    </article>
  );
}
