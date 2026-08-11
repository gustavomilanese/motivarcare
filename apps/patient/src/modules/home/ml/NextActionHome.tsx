import { useEffect, useState, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import { UpcomingBookingsList } from "../../booking/components/UpcomingBookingsList";
import { DashboardHomePromoCarousel } from "./PromoCarousel";
import {
  DashboardHomeExercisesSection,
  DashboardHomeMusicSection
} from "./FeatureSections";
import { SessionsCollapsibleToggle } from "../../app/components/SessionsCollapsibleToggle";
import { professionalAccessibleName, professionalFirstName } from "../../app/lib/professionalDisplayName";
import { resolvePublicAssetUrl } from "../../app/services/api";
import type { Booking, Professional } from "../../app/types";
import type { DashboardNextActionKind } from "../lib/resolveDashboardNextActionKind";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
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

type BenefitIconKind = "professional" | "buy" | "upcoming" | "packages" | "history" | "activity" | "diary" | "music" | "exercises";

const BENEFIT_ICON_SRC: Partial<Record<BenefitIconKind, string>> = {
  packages: "/home/cards/packages-cut.png",
  history: "/home/cards/history-cut.png",
  activity: "/home/cards/activity-cut.png",
  professional: "/home/cards/professional-cut.png"
};

/** Fallback premium SVG si el cutout aún no está disponible. */
function BenefitIconFallback(props: { kind: BenefitIconKind }) {
  const gid = `ml-ic-${props.kind}`;
  const common = {
    viewBox: "0 0 64 64",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
    className: "dashboard-ml-benefit-icon-svg"
  };

  switch (props.kind) {
    case "professional":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="12" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="22" y1="14" x2="42" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c6aef" />
              <stop offset="1" stopColor="#4c31d8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <circle cx="32" cy="24" r="9" fill={`url(#${gid}-b)`} />
          <path d="M16 48c3.8-9.2 11.4-13.2 16-13.2S44.2 38.8 48 48" fill={`url(#${gid}-b)`} />
          <circle cx="46" cy="18" r="5.5" fill="#a78bfa" />
          <path d="M44 18h4M46 16v4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "buy":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <path d="M32 18v28M18 32h28" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
        </svg>
      );
    case "upcoming":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#dbeafe" />
              <stop offset="1" stopColor="#bfdbfe" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="14" x2="46" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" />
              <stop offset="1" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <rect x="17" y="19" width="30" height="28" rx="7" fill={`url(#${gid}-b)`} />
          <path d="M17 28h30" stroke="#fff" strokeWidth="2.4" opacity="0.9" />
          <path d="M24 15.5v7M40 15.5v7" stroke={`url(#${gid}-b)`} strokeWidth="3.2" strokeLinecap="round" />
          <rect x="23" y="33" width="7" height="7" rx="2" fill="#fff" />
          <rect x="34" y="33" width="7" height="7" rx="2" fill="#93c5fd" />
        </svg>
      );
    case "packages":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="18" x2="46" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c6aef" />
              <stop offset="1" stopColor="#4c31d8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <path d="M18 28l14-8 14 8v16l-14 8-14-8V28z" fill={`url(#${gid}-b)`} />
          <path d="M32 20v32M18 28l14 8 14-8" stroke="#ede9fe" strokeWidth="2" opacity="0.85" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <circle cx="32" cy="32" r="14" fill="#fff" />
          <circle cx="32" cy="32" r="14" stroke="#5f44eb" strokeWidth="2.4" />
          <path d="M32 22v11l8 5" stroke="#5f44eb" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <rect x="20" y="16" width="24" height="32" rx="6" fill="#fff" />
          <path d="M26 26h12M26 33h12M26 40h8" stroke="#5f44eb" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="44" cy="44" r="7" fill="#5f44eb" />
          <path d="M41.5 44h5M44 41.5v5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "diary":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="14" x2="46" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c6aef" />
              <stop offset="1" stopColor="#4c31d8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <rect x="18" y="14" width="28" height="36" rx="6" fill={`url(#${gid}-b)`} />
          <rect x="22" y="18" width="20" height="28" rx="3" fill="#fff" />
          <path d="M26 26h12M26 32h12M26 38h8" stroke="#5f44eb" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="44" cy="18" r="5.5" fill="#a78bfa" />
        </svg>
      );
    case "music":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#dcfce7" />
              <stop offset="1" stopColor="#86efac" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="16" x2="48" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22c55e" />
              <stop offset="1" stopColor="#15803d" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <path
            d="M26 42V22l20-4v20"
            stroke={`url(#${gid}-b)`}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="22" cy="42" r="6" fill={`url(#${gid}-b)`} />
          <circle cx="42" cy="38" r="6" fill={`url(#${gid}-b)`} />
        </svg>
      );
    case "exercises":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f3e8ff" />
              <stop offset="1" stopColor="#e9d5ff" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="16" y1="18" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a855f7" />
              <stop offset="1" stopColor="#7e22ce" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <path
            d="M20 40c4-10 8-16 12-16s8 6 12 16"
            stroke={`url(#${gid}-b)`}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="32" cy="20" r="5" fill={`url(#${gid}-b)`} />
          <path d="M18 28h8M38 28h8" stroke={`url(#${gid}-b)`} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function BenefitIcon(props: { kind: BenefitIconKind }) {
  const [failed, setFailed] = useState(false);
  const src = BENEFIT_ICON_SRC[props.kind];

  if (!src || failed) {
    return <BenefitIconFallback kind={props.kind} />;
  }

  return (
    <img
      className="dashboard-ml-benefit-icon-img"
      src={src}
      alt=""
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function BenefitCard(props: {
  title: string;
  body: string;
  cta: string;
  icon: BenefitIconKind;
  onClick: () => void;
  tourAttr?: string;
  ctaTourAttr?: string;
  variant?: "default" | "buy";
  tone?: "sessions" | "diary" | "exercises" | "music";
  /** Foto real del profesional; si falta o falla, se usa el ícono. */
  photoSrc?: string | null;
}) {
  const variantClass = props.variant === "buy" ? " dashboard-ml-benefit-card--buy" : "";
  const toneClass = props.tone ? ` dashboard-ml-benefit-card--tone-${props.tone}` : "";
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoSrc = props.photoSrc?.trim() ? props.photoSrc.trim() : null;
  const showPhoto = Boolean(photoSrc) && !photoFailed;

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoSrc]);

  return (
    <button
      type="button"
      className={`dashboard-ml-benefit-card${variantClass}${toneClass}`}
      data-tour={props.tourAttr}
      onClick={props.onClick}
    >
      <h3 className="dashboard-ml-benefit-title">{props.title}</h3>
      <div className="dashboard-ml-benefit-icon" aria-hidden="true">
        {showPhoto ? (
          <img
            className="dashboard-ml-benefit-icon-img dashboard-ml-benefit-icon-img--photo"
            src={photoSrc!}
            alt=""
            decoding="async"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <BenefitIcon kind={props.icon} />
        )}
      </div>
      <p className="dashboard-ml-benefit-body">{props.body}</p>
      <span className="dashboard-ml-benefit-cta" data-tour={props.ctaTourAttr}>
        {props.cta}
      </span>
    </button>
  );
}

function ProfessionalBenefitCard(props: {
  language: AppLanguage;
  professional: Professional | null;
  photoSrc: string | null;
  assignedProfessionalName: string | null;
  canSelfChangeProfessional: boolean;
  trialPending: boolean;
  onOpenProfile: () => void;
  onChat: () => void;
  onChangeProfessional: () => void;
  onAssignProfessional: () => void;
  onBookTrial: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoSrc = props.photoSrc?.trim() ? props.photoSrc.trim() : null;
  const showPhoto = Boolean(photoSrc) && !photoFailed;

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoSrc]);

  if (!props.professional) {
    const emptyBody = props.assignedProfessionalName
      ? replaceTemplate(
          t(props.language, {
            es: "Profesional asignado desde admin: {name}.",
            en: "Professional assigned from admin: {name}.",
            pt: "Profissional atribuido pelo admin: {name}."
          }),
          { name: props.assignedProfessionalName }
        )
      : t(props.language, {
          es: "Se define al reservar tu sesión de prueba o una sesión con créditos.",
          en: "Set when you book your trial or a credit session.",
          pt: "Definido ao reservar sua sessao de teste ou com creditos."
        });

    return (
      <article
        className="dashboard-ml-benefit-card dashboard-ml-benefit-card--professional dashboard-ml-benefit-card--professional-empty"
        data-tour="patient-tour-hero"
        aria-live="polite"
      >
        <h3 className="dashboard-ml-benefit-title">
          {t(props.language, {
            es: "Tu profesional",
            en: "Your professional",
            pt: "Seu profissional"
          })}
        </h3>
        <div className="dashboard-ml-benefit-icon" aria-hidden="true">
          <BenefitIcon kind="professional" />
        </div>
        <p className="dashboard-ml-benefit-body">{emptyBody}</p>
        <div className="dashboard-ml-pro-actions">
          {props.trialPending && !props.assignedProfessionalName ? (
            <button type="button" className="dashboard-ml-pro-action dashboard-ml-pro-action--primary" onClick={props.onBookTrial}>
              {t(props.language, {
                es: "Reservar sesión de prueba",
                en: "Book trial session",
                pt: "Reservar sessao de teste"
              })}
            </button>
          ) : (
            <button
              type="button"
              className="dashboard-ml-pro-action dashboard-ml-pro-action--primary"
              onClick={props.onAssignProfessional}
            >
              {t(props.language, {
                es: "Elegir profesional",
                en: "Choose professional",
                pt: "Escolher profissional"
              })}
            </button>
          )}
        </div>
      </article>
    );
  }

  const pro = props.professional;

  return (
    <article
      className="dashboard-ml-benefit-card dashboard-ml-benefit-card--professional"
      data-tour="patient-tour-hero"
      role="button"
      tabIndex={0}
      aria-label={t(props.language, {
        es: `Abrir ficha de ${professionalAccessibleName(pro)}`,
        en: `Open profile for ${professionalAccessibleName(pro)}`,
        pt: `Abrir ficha de ${professionalAccessibleName(pro)}`
      })}
      onClick={props.onOpenProfile}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        props.onOpenProfile();
      }}
    >
      <h3 className="dashboard-ml-benefit-title">
        {t(props.language, {
          es: "Tu profesional",
          en: "Your professional",
          pt: "Seu profissional"
        })}
      </h3>

      <div className="dashboard-ml-pro-main">
        <span className="dashboard-ml-benefit-icon" aria-hidden="true">
          {showPhoto ? (
            <img
              className="dashboard-ml-benefit-icon-img dashboard-ml-benefit-icon-img--photo"
              src={photoSrc!}
              alt=""
              decoding="async"
              onError={(event) => {
                setPhotoFailed(true);
                props.onImageFallback(event);
              }}
            />
          ) : (
            <BenefitIcon kind="professional" />
          )}
        </span>
        <span className="dashboard-ml-pro-name">{professionalFirstName(pro)}</span>
      </div>

      <div
        className={`dashboard-ml-pro-actions${
          props.canSelfChangeProfessional ? "" : " dashboard-ml-pro-actions--solo"
        }`}
      >
        <button
          type="button"
          className="dashboard-ml-pro-action dashboard-ml-pro-action--primary"
          onClick={(event) => {
            event.stopPropagation();
            props.onChat();
          }}
        >
          {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
        </button>
        {props.canSelfChangeProfessional ? (
          <button
            type="button"
            className="dashboard-ml-pro-action dashboard-ml-pro-action--secondary"
            onClick={(event) => {
              event.stopPropagation();
              props.onChangeProfessional();
            }}
          >
            {t(props.language, {
              es: "Cambiar",
              en: "Change",
              pt: "Trocar"
            })}
          </button>
        ) : null}
      </div>
    </article>
  );
}


function HistoryMinimalIcon(props: { kind: "upcoming" | "packages" | "history" | "activity" | "diary" }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
    className: "dashboard-ml-history-minimal-icon"
  };

  switch (props.kind) {
    case "upcoming":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
          <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "packages":
      return (
        <svg {...common}>
          <path
            d="M4.5 8.5 12 4.5l7.5 4V16.5L12 20.5 4.5 16.5V8.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M12 4.5v16M4.5 8.5 12 12.5l7.5-4" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 8v4.5l3 1.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <path
            d="M3.5 12h3.2l2.3-5.5L13 17.5l2.4-5.5h4.6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "diary":
      return (
        <svg {...common}>
          <path
            d="M6.5 4.5h9.5a2 2 0 0 1 2 2v13l-3.2-1.8-3.3 1.8-3.3-1.8-3.2 1.8v-13a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M9 9h6M9 12.5h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function HistoryNavCard(props: {
  icon: "packages" | "history" | "activity" | "diary";
  title: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="dashboard-ml-history-card dashboard-ml-history-card--nav" onClick={props.onClick}>
      <span className="dashboard-ml-history-head">
        <span className="dashboard-ml-history-icon dashboard-ml-history-icon--minimal" aria-hidden="true">
          <HistoryMinimalIcon kind={props.icon} />
        </span>
        <span className="dashboard-ml-panel-title">{props.title}</span>
      </span>
      <span className="dashboard-ml-history-nav-cta">{props.cta}</span>
    </button>
  );
}

function CalendarPreviewCard(props: {
  language: AppLanguage;
  bookings: Booking[];
  timezone: string;
  onOpenBookingDetail: (bookingId: string) => void;
  onCta: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={`dashboard-ml-history-card dashboard-ml-history-card--calendar${expanded ? " is-expanded" : " is-collapsed"}`}
    >
      <button
        type="button"
        className="dashboard-ml-history-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="dashboard-ml-history-head">
          <span className="dashboard-ml-history-icon dashboard-ml-history-icon--minimal" aria-hidden="true">
            <HistoryMinimalIcon kind="upcoming" />
          </span>
          <span className="dashboard-ml-panel-title" id="dashboard-ml-calendar-title">
            {t(props.language, {
              es: "Calendario",
              en: "Calendar",
              pt: "Calendario"
            })}
          </span>
        </span>
        <SessionsCollapsibleToggle expanded={expanded} language={props.language} />
      </button>
      {expanded ? (
        <>
          <div className="dashboard-ml-history-preview dashboard-ml-history-preview--calendar">
            <SessionsCalendar
              bookings={props.bookings}
              timezone={props.timezone}
              language={props.language}
              onOpenBookingDetail={props.onOpenBookingDetail}
              variant="week"
              hideTitle
            />
          </div>
          <button type="button" className="dashboard-ml-history-link" onClick={props.onCta}>
            {t(props.language, {
              es: "Ver reservas",
              en: "View bookings",
              pt: "Ver reservas"
            })}
          </button>
        </>
      ) : null}
    </article>
  );
}

export type { DashboardNextActionKind };

export function DashboardNextActionHome(props: {
  language: AppLanguage;
  timezone: string;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  heroImage: string | null;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  availableSessions: number;
  actionKind: DashboardNextActionKind;
  nextBooking: Booking | null;
  activeProfessional: Professional | null;
  professionalPhotoMap: Record<string, string>;
  canSelfChangeProfessional: boolean;
  assignedProfessionalName: string | null;
  showGoogleCalendarCta: boolean;
  googleCalendarCtaPulse: boolean;
  onOpenPatientGoogleCalendarConnect?: () => void;
  onNavigateToAssignProfessional: () => void;
  onNavigateToRebookTrial: () => void;
  onNavigateToBookTrial: () => void;
  trialStatus: "pending" | "reserved" | "completed" | "rebook";
  completedTrialBooking: Booking | null;
  onGoToBooking: (professionalId: string) => void;
  onBuySessions: () => void;
  /** Reservar sin créditos: aviso y luego catálogo de paquetes. */
  onBookWithoutCredits: () => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
  onGoToChat: (professionalId: string) => void;
  onOpenProfessionalProfile: () => void;
  onNavigateToChangeProfessional: () => void;
  onGoToReservations: () => void;
  upcomingBookings: Booking[];
  allBookings: Booking[];
  professionals: Professional[];
  pricingProfessionalId: string;
  isMobilePortal: boolean;
  firstMeetBookingId?: string | null;
  joinTourPulse?: boolean;
  upcomingSpotlightRing?: boolean;
}) {
  const navigate = useNavigate();

  const professionalPhotoSrcResolved = props.activeProfessional
    ? resolvePublicAssetUrl(props.professionalPhotoMap[props.activeProfessional.id])
    : null;

  const upcomingCta =
    props.actionKind === "next_session"
      ? t(props.language, { es: "Ver próxima sesión", en: "View next session", pt: "Ver proxima sessao" })
      : props.actionKind === "trial_rebook"
        ? t(props.language, { es: "Elegir nuevo horario", en: "Pick a new time", pt: "Escolher novo horario" })
        : props.actionKind === "trial_pending"
          ? t(props.language, { es: "Reservar prueba", en: "Book trial", pt: "Reservar teste" })
          : t(props.language, { es: "Ir a Sesiones", en: "Go to Sessions", pt: "Ir para Sessoes" });

  const runUpcomingCard = () => {
    if (props.actionKind === "next_session" && props.nextBooking) {
      props.onOpenBookingDetail(props.nextBooking.id);
      return;
    }
    if (props.actionKind === "trial_rebook") {
      props.onNavigateToRebookTrial();
      return;
    }
    if (props.actionKind === "trial_pending") {
      props.onNavigateToBookTrial();
      return;
    }
    props.onGoToReservations();
  };

  const runBookSession = () => {
    if (props.availableSessions <= 0) {
      props.onBookWithoutCredits();
      return;
    }
    if (props.pricingProfessionalId) {
      props.onGoToBooking(props.pricingProfessionalId);
      return;
    }
    props.onNavigateToAssignProfessional();
  };

  const [promoTone, setPromoTone] = useState<"care" | "access" | "match">("care");

  const bookSessionLabel = t(props.language, {
    es: "Reservar sesión",
    en: "Book a session",
    pt: "Reservar sessao"
  });

  const showTrialCallout = props.trialStatus === "pending" || props.trialStatus === "rebook";

  const trialCalloutTitle =
    props.trialStatus === "rebook"
      ? t(props.language, {
          es: "Sesión de prueba pagada",
          en: "Trial session paid",
          pt: "Sessao de teste paga"
        })
      : t(props.language, {
          es: "Sesión de prueba pendiente",
          en: "Pending trial session",
          pt: "Sessao de teste pendente"
        });

  const trialCalloutLead =
    props.trialStatus === "rebook"
      ? t(props.language, {
          es: "Cancelaste la reserva anterior. Elegí un nuevo horario sin volver a pagar.",
          en: "You cancelled the previous booking. Pick a new time without paying again.",
          pt: "Voce cancelou a reserva anterior. Escolha um novo horario sem pagar de novo."
        })
      : t(props.language, {
          es: "Elegí un horario para dejar tu primera sesión ya agendada.",
          en: "Choose a time to leave your first session already scheduled.",
          pt: "Escolha um horario para deixar sua primeira sessao ja agendada."
        });

  const trialCalloutActionLabel =
    props.trialStatus === "rebook"
      ? t(props.language, {
          es: "Elegir nuevo horario",
          en: "Pick a new time",
          pt: "Escolher novo horario"
        })
      : t(props.language, {
          es: "Reservar sesión de prueba",
          en: "Book trial session",
          pt: "Reservar sessao de teste"
        });

  const runTrialCalloutAction = () => {
    if (props.trialStatus === "rebook") {
      props.onNavigateToRebookTrial();
      return;
    }
    props.onNavigateToBookTrial();
  };

  const sessionsTableBookings = (() => {
    const upcoming = props.upcomingBookings.slice(0, 4);
    const completed = props.completedTrialBooking;
    if (!completed) {
      return upcoming;
    }
    if (upcoming.some((booking) => booking.id === completed.id)) {
      return upcoming;
    }
    return [completed, ...upcoming].slice(0, 4);
  })();

  return (
    <div className="dashboard-ml-home" aria-label={t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}>
      <div id="dashboard-hero-toolbar-mount" className="dashboard-hero-toolbar-mount dashboard-ml-toolbar-mount" />

      {/* Violeta solo hasta las cards de acceso; Sesiones ya va sobre el gris de página */}
      <div className={`dashboard-ml-brand-band dashboard-ml-brand-band--${promoTone}`}>
        <DashboardHomePromoCarousel language={props.language} onActiveToneChange={setPromoTone} />

        <div className="dashboard-ml-surface dashboard-ml-surface--brand">
          {props.showGoogleCalendarCta ? (
            <div className="dashboard-ml-calendar-wrap">
              <button
                type="button"
                className={`dashboard-ml-calendar-btn${props.googleCalendarCtaPulse ? " patient-google-calendar-cta--pulse" : ""}`}
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

          <div className="dashboard-ml-credits-bar" data-tour="patient-tour-credits">
            <p className="dashboard-ml-credits" aria-live="polite">
              <span className="dashboard-ml-credits-kicker">
                {t(props.language, {
                  es: "Tu saldo",
                  en: "Your balance",
                  pt: "Seu saldo"
                })}
              </span>
              {props.availableSessions > 0 ? (
                <>
                  <span className="dashboard-ml-credits-num">{props.availableSessions}</span>
                  <span className="dashboard-ml-credits-label">
                    {props.availableSessions === 1
                      ? t(props.language, {
                          es: "sesión disponible",
                          en: "session available",
                          pt: "sessao disponivel"
                        })
                      : t(props.language, {
                          es: "sesiones disponibles",
                          en: "sessions available",
                          pt: "sessoes disponiveis"
                        })}
                  </span>
                </>
              ) : (
                <span className="dashboard-ml-credits-label dashboard-ml-credits-label--empty">
                  {t(props.language, {
                    es: "Sin sesiones disponibles",
                    en: "No sessions available",
                    pt: "Sem sessoes disponiveis"
                  })}
                </span>
              )}
            </p>
            <button type="button" className="dashboard-ml-book-cta" onClick={runBookSession}>
              {bookSessionLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-ml-surface dashboard-ml-surface--bridge">
        <section
          className="dashboard-ml-benefit-row"
          aria-label={t(props.language, { es: "Accesos", en: "Shortcuts", pt: "Atalhos" })}
          data-tour="patient-tour-kpis"
        >
          <ProfessionalBenefitCard
            language={props.language}
            professional={props.activeProfessional}
            photoSrc={professionalPhotoSrcResolved}
            assignedProfessionalName={props.assignedProfessionalName}
            canSelfChangeProfessional={props.canSelfChangeProfessional}
            trialPending={props.trialStatus === "pending"}
            onOpenProfile={props.onOpenProfessionalProfile}
            onChat={() => {
              if (props.activeProfessional) {
                props.onGoToChat(props.activeProfessional.id);
              }
            }}
            onChangeProfessional={props.onNavigateToChangeProfessional}
            onAssignProfessional={props.onNavigateToAssignProfessional}
            onBookTrial={props.onNavigateToBookTrial}
            onImageFallback={props.onImageFallback}
          />
          <BenefitCard
            icon="buy"
            variant="buy"
            title={t(props.language, {
              es: "Comprar sesiones",
              en: "Buy sessions",
              pt: "Comprar sessoes"
            })}
            body={t(props.language, {
              es: "Sumá créditos y seguí con tu acompañamiento.",
              en: "Add credits and continue your care.",
              pt: "Adicione creditos e continue seu acompanhamento."
            })}
            cta={t(props.language, {
              es: "+ Nuevas sesiones",
              en: "+ New sessions",
              pt: "+ Novas sessoes"
            })}
            onClick={() => props.onBuySessions()}
          />
          <BenefitCard
            icon="upcoming"
            tone="sessions"
            tourAttr="patient-tour-trial"
            ctaTourAttr="patient-tour-next-primary"
            title={t(props.language, {
              es: "Próximas sesiones",
              en: "Upcoming sessions",
              pt: "Proximas sessoes"
            })}
            body={t(props.language, {
              es: "Revisá tu próxima reserva o andá a Sesiones.",
              en: "Check your next booking or go to Sessions.",
              pt: "Veja sua proxima reserva ou va para Sessoes."
            })}
            cta={upcomingCta}
            onClick={runUpcomingCard}
          />
          <BenefitCard
            icon="diary"
            tone="diary"
            title={t(props.language, {
              es: "Diario",
              en: "Diary",
              pt: "Diario"
            })}
            body={t(props.language, {
              es: "Escribí cómo te sentís y revisá tus registros.",
              en: "Write how you feel and review your entries.",
              pt: "Escreva como se sente e veja seus registros."
            })}
            cta={t(props.language, { es: "Abrir diario", en: "Open diary", pt: "Abrir diario" })}
            onClick={() => navigate("/diario")}
          />
          <BenefitCard
            icon="exercises"
            tone="exercises"
            title={t(props.language, {
              es: "Ejercicios",
              en: "Exercises",
              pt: "Exercicios"
            })}
            body={t(props.language, {
              es: "Practicá ejercicios y rutinas entre sesiones.",
              en: "Practice exercises and routines between sessions.",
              pt: "Pratique exercicios e rotinas entre sessoes."
            })}
            cta={t(props.language, { es: "Ver ejercicios", en: "View exercises", pt: "Ver exercicios" })}
            onClick={() => navigate("/ejercicios")}
          />
          <BenefitCard
            icon="music"
            tone="music"
            title={t(props.language, {
              es: "Música",
              en: "Music",
              pt: "Música"
            })}
            body={t(props.language, {
              es: "Escuchá música relajante para acompañar tu proceso.",
              en: "Listen to relaxing music to support your care.",
              pt: "Ouça música relaxante para acompanhar seu processo."
            })}
            cta={t(props.language, { es: "Abrir música", en: "Open music", pt: "Abrir música" })}
            onClick={() => navigate("/bienestar/musica")}
          />
        </section>
      </div>

      <div className="dashboard-ml-surface">
        <section className="dashboard-ml-sessions" data-tour="patient-tour-bookings" aria-labelledby="dashboard-ml-sessions-title">
          <article className="dashboard-ml-sessions-banner">
            <div className="dashboard-ml-sessions-banner-frame">
              <div className="dashboard-ml-sessions-banner-copy">
                <h2 id="dashboard-ml-sessions-title" className="dashboard-ml-sessions-banner-title">
                  {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
                </h2>
                <p className="dashboard-ml-sessions-banner-body">
                  {t(props.language, {
                    es: "Tus próximas reservas, el calendario y el historial, listos para abrir cuando los necesites.",
                    en: "Your upcoming bookings, calendar, and history—ready whenever you need them.",
                    pt: "Suas proximas reservas, calendario e historico, prontos quando precisar."
                  })}
                </p>
              </div>
              <div className="dashboard-ml-sessions-banner-media" aria-hidden="true">
                <img
                  className="dashboard-ml-sessions-banner-photo"
                  src="/home/banner-home-sessions.png?v=1"
                  alt=""
                  decoding="async"
                />
              </div>
            </div>
          </article>

          <div className="dashboard-ml-sessions-pack">
            <div className="dashboard-ml-sessions-pack-actions">
              <button type="button" className="dashboard-ml-sessions-pack-btn dashboard-ml-sessions-pack-btn--primary" onClick={runBookSession}>
                {bookSessionLabel}
              </button>
              <button
                type="button"
                className="dashboard-ml-sessions-pack-btn dashboard-ml-sessions-pack-btn--secondary"
                onClick={() => props.onGoToReservations()}
              >
                {t(props.language, { es: "Ver todas", en: "View all", pt: "Ver todas" })}
              </button>
            </div>

            <div
              className={`dashboard-ml-sessions-bookings${
                props.upcomingSpotlightRing && sessionsTableBookings.length > 0
                  ? " patient-dashboard-upcoming-spotlight"
                  : ""
              }`}
            >
              {showTrialCallout ? (
                <aside className="dashboard-ml-trial-callout" data-tour="patient-tour-trial">
                  <div className="dashboard-ml-trial-callout-copy">
                    <p className="dashboard-ml-trial-callout-kicker">
                      {t(props.language, {
                        es: "Primera sesión",
                        en: "First session",
                        pt: "Primeira sessao"
                      })}
                    </p>
                    <h3 className="dashboard-ml-trial-callout-title">{trialCalloutTitle}</h3>
                    <p className="dashboard-ml-trial-callout-lead">{trialCalloutLead}</p>
                  </div>
                  <button
                    type="button"
                    className="dashboard-ml-trial-callout-action"
                    onClick={(event) => {
                      event.stopPropagation();
                      runTrialCalloutAction();
                    }}
                  >
                    {trialCalloutActionLabel}
                  </button>
                </aside>
              ) : null}
              {sessionsTableBookings.length === 0 ? (
                <div className="dashboard-ml-empty">
                  <strong>
                    {t(props.language, {
                      es: "Todavía no tenés sesiones reservadas",
                      en: "You have no booked sessions yet",
                      pt: "Voce ainda nao tem sessoes reservadas"
                    })}
                  </strong>
                  <button type="button" className="dashboard-ml-benefit-cta" onClick={runUpcomingCard}>
                    {t(props.language, { es: "Ir a Sesiones", en: "Go to Sessions", pt: "Ir para Sessoes" })}
                  </button>
                </div>
              ) : (
                <div className="dashboard-ml-bookings-list dashboard-upcoming-lists-root session-rn-root">
                  <UpcomingBookingsList
                    bookings={sessionsTableBookings}
                    professionals={props.professionals}
                    professionalPhotoMap={props.professionalPhotoMap}
                    timezone={props.timezone}
                    language={props.language}
                    layout={props.isMobilePortal ? "card" : "table"}
                    surface="dashboard"
                    onImageFallback={props.onImageFallback}
                    onOpenBookingDetail={props.onOpenBookingDetail}
                    onReschedule={(booking) => props.onRescheduleBooking(booking.id)}
                    firstMeetBookingId={props.firstMeetBookingId}
                    joinTourPulse={props.joinTourPulse}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            className="dashboard-ml-sessions-footer"
            aria-label={t(props.language, {
              es: "Detalle de actividad",
              en: "Activity detail",
              pt: "Detalhe da atividade"
            })}
          >
            <div className="dashboard-ml-history-grid">
              <CalendarPreviewCard
                language={props.language}
                bookings={props.upcomingBookings}
                timezone={props.timezone}
                onOpenBookingDetail={props.onOpenBookingDetail}
                onCta={() => props.onGoToReservations()}
              />

              <HistoryNavCard
                icon="packages"
                title={t(props.language, {
                  es: "Paquetes comprados",
                  en: "Purchased packages",
                  pt: "Pacotes comprados"
                })}
                cta={t(props.language, {
                  es: "Ver paquetes",
                  en: "View packages",
                  pt: "Ver pacotes"
                })}
                onClick={() => navigate("/sessions?focus=packages")}
              />

              <HistoryNavCard
                icon="history"
                title={t(props.language, {
                  es: "Historial de sesiones",
                  en: "Session history",
                  pt: "Historico de sessoes"
                })}
                cta={t(props.language, { es: "Ver historial", en: "View history", pt: "Ver historico" })}
                onClick={() => navigate("/sessions?focus=history")}
              />

              <HistoryNavCard
                icon="activity"
                title={t(props.language, {
                  es: "Actividad de compras",
                  en: "Purchase activity",
                  pt: "Atividade de compras"
                })}
                cta={t(props.language, { es: "Ver actividad", en: "View activity", pt: "Ver atividade" })}
                onClick={() => navigate("/sessions?focus=activity")}
              />
            </div>
          </div>
        </section>

        <section className="dashboard-ml-diary" data-tour="patient-tour-diary" aria-labelledby="dashboard-ml-diary-title">
          <article className="dashboard-ml-diary-banner">
            <div className="dashboard-ml-diary-banner-frame">
              <div className="dashboard-ml-diary-banner-copy">
                <p className="dashboard-ml-diary-banner-kicker">
                  {t(props.language, {
                    es: "Diario emocional",
                    en: "Emotional diary",
                    pt: "Diario emocional"
                  })}
                </p>
                <h2 id="dashboard-ml-diary-title" className="dashboard-ml-diary-banner-title">
                  {t(props.language, {
                    es: "Acompañá tu proceso día a día",
                    en: "Support your process day by day",
                    pt: "Acompanhe seu processo dia a dia"
                  })}
                </h2>
                <p className="dashboard-ml-diary-banner-body">
                  {t(props.language, {
                    es: "Registrá cómo te sentís, revisá entradas anteriores y volvé a ellas cuando quieras.",
                    en: "Log how you feel, review past entries, and return whenever you need.",
                    pt: "Registre como se sente, revise entradas anteriores e volte quando quiser."
                  })}
                </p>
                <div className="dashboard-ml-diary-banner-actions">
                  <button
                    type="button"
                    className="dashboard-ml-diary-banner-cta"
                    onClick={() => navigate("/diario/nueva")}
                  >
                    {t(props.language, {
                      es: "Escribir ahora",
                      en: "Write now",
                      pt: "Escrever agora"
                    })}
                  </button>
                  <button
                    type="button"
                    className="dashboard-ml-diary-banner-link"
                    onClick={() => navigate("/diario")}
                  >
                    {t(props.language, {
                      es: "Abrir diario",
                      en: "Open diary",
                      pt: "Abrir diario"
                    })}
                  </button>
                </div>
              </div>
              <div className="dashboard-ml-diary-banner-media" aria-hidden="true">
                <img
                  className="dashboard-ml-diary-banner-photo"
                  src="/home/banner-home-diary.png?v=2"
                  alt=""
                  decoding="async"
                />
              </div>
            </div>
          </article>

          <div className="dashboard-ml-diary-pack">
            <div
              className="dashboard-ml-diary-actions-row"
              aria-label={t(props.language, {
                es: "Acciones del diario",
                en: "Diary actions",
                pt: "Acoes do diario"
              })}
            >
              <HistoryNavCard
                icon="diary"
                title={t(props.language, {
                  es: "Nueva entrada",
                  en: "New entry",
                  pt: "Nova entrada"
                })}
                cta={t(props.language, {
                  es: "Escribir hoy",
                  en: "Write today",
                  pt: "Escrever hoje"
                })}
                onClick={() => navigate("/diario/nueva")}
              />

              <HistoryNavCard
                icon="history"
                title={t(props.language, {
                  es: "Ver registros",
                  en: "View records",
                  pt: "Ver registros"
                })}
                cta={t(props.language, {
                  es: "Abrir historial",
                  en: "Open history",
                  pt: "Abrir historico"
                })}
                onClick={() => navigate("/diario/registros")}
              />

              <HistoryNavCard
                icon="activity"
                title={t(props.language, {
                  es: "Abrir diario",
                  en: "Open diary",
                  pt: "Abrir diario"
                })}
                cta={t(props.language, {
                  es: "Ir al inicio",
                  en: "Go to home",
                  pt: "Ir ao inicio"
                })}
                onClick={() => navigate("/diario")}
              />
            </div>
          </div>
        </section>

        <DashboardHomeExercisesSection language={props.language} />
        <DashboardHomeMusicSection language={props.language} />
      </div>
    </div>
  );
}
