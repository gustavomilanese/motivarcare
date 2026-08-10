import { useMemo, useState, type ReactNode, type SyntheticEvent } from "react";
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
import { DashboardHomeVariantToggle } from "./DashboardHomeVariantToggle";
import { DashboardHomePromoCarousel } from "./DashboardHomePromoCarousel";
import {
  DashboardHomeExercisesSection,
  DashboardHomeMusicSection
} from "./DashboardHomeFeatureSections";
import { SessionsCollapsibleToggle } from "./SessionsCollapsibleToggle";
import { formatSubscriptionPurchasePrice } from "../lib/formatSubscriptionPurchasePrice";
import { professionalAccessibleName } from "../lib/professionalDisplayName";
import { findProfessionalById } from "../lib/professionals";
import type { Booking, PatientAppState, Professional } from "../types";
import type { DashboardNextActionKind } from "../lib/resolveDashboardNextActionKind";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      month: "short",
      day: "numeric"
    }
  });
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

const BENEFIT_ICON_SRC: Partial<Record<BenefitIconKind, string>> = {};

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
            <linearGradient id={`${gid}-a`} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#eff6ff" />
              <stop offset="1" stopColor="#bfdbfe" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="16" x2="46" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff" />
              <stop offset="1" stopColor="#dbeafe" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <path
            d="M20 24h24l-2.2 18.5a4 4 0 0 1-4 3.5H26.2a4 4 0 0 1-4-3.5L20 24z"
            fill={`url(#${gid}-b)`}
          />
          <path d="M24 24l2-6h12l2 6" stroke="#1d4ed8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M32 34v8M28 38h8" stroke="#2563eb" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );
    case "upcoming":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${gid}-a`} x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="14" x2="46" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c6aef" />
              <stop offset="1" stopColor="#4c31d8" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill={`url(#${gid}-a)`} />
          <rect x="16" y="18" width="32" height="30" rx="8" fill={`url(#${gid}-b)`} />
          <rect x="19" y="26" width="26" height="19" rx="4" fill="#fff" />
          <path d="M23 14v8M41 14v8" stroke="#4c31d8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="27" cy="35" r="2.4" fill="#c4b5fd" />
          <circle cx="37" cy="35" r="2.4" fill="#c4b5fd" />
          <circle cx="32" cy="41" r="3.4" fill="#5f44eb" />
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
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="18" y1="16" x2="48" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c6aef" />
              <stop offset="1" stopColor="#4c31d8" />
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
              <stop stopColor="#ede9fe" />
              <stop offset="1" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="16" y1="18" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c6aef" />
              <stop offset="1" stopColor="#4c31d8" />
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
}) {
  const variantClass = props.variant === "buy" ? " dashboard-ml-benefit-card--buy" : "";
  return (
    <button
      type="button"
      className={`dashboard-ml-benefit-card${variantClass}`}
      data-tour={props.tourAttr}
      onClick={props.onClick}
    >
      <h3 className="dashboard-ml-benefit-title">{props.title}</h3>
      <div className="dashboard-ml-benefit-icon" aria-hidden="true">
        <BenefitIcon kind={props.icon} />
      </div>
      <p className="dashboard-ml-benefit-body">{props.body}</p>
      <span className="dashboard-ml-benefit-cta" data-tour={props.ctaTourAttr}>
        {props.cta}
      </span>
    </button>
  );
}

function HistoryPreviewCard(props: {
  language: AppLanguage;
  icon: BenefitIconKind;
  title: string;
  empty: string;
  cta: string;
  onCta: () => void;
  children?: ReactNode;
  hasItems: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className={`dashboard-ml-history-card${expanded ? " is-expanded" : " is-collapsed"}`}>
      <button
        type="button"
        className="dashboard-ml-history-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="dashboard-ml-history-head">
          <span className="dashboard-ml-history-icon" aria-hidden="true">
            <BenefitIcon kind={props.icon} />
          </span>
          <span className="dashboard-ml-panel-title">{props.title}</span>
        </span>
        <SessionsCollapsibleToggle expanded={expanded} language={props.language} />
      </button>
      {expanded ? (
        <>
          <div className="dashboard-ml-history-preview">
            {props.hasItems ? props.children : <p className="dashboard-ml-history-empty">{props.empty}</p>}
          </div>
          <button type="button" className="dashboard-ml-history-link" onClick={props.onCta}>
            {props.cta}
          </button>
        </>
      ) : null}
    </article>
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
          <span className="dashboard-ml-history-icon" aria-hidden="true">
            <BenefitIcon kind="upcoming" />
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
  showGoogleCalendarCta: boolean;
  googleCalendarCtaPulse: boolean;
  onOpenPatientGoogleCalendarConnect?: () => void;
  onNavigateToAssignProfessional: () => void;
  onNavigateToRebookTrial: () => void;
  onNavigateToBookTrial: () => void;
  onGoToBooking: (professionalId: string) => void;
  onBuySessions: () => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
  onGoToChat: (professionalId: string) => void;
  onGoToProfessional: (professionalId: string) => void;
  onNavigateToChangeProfessional: () => void;
  onGoToReservations: () => void;
  upcomingBookings: Booking[];
  allBookings: Booking[];
  professionals: Professional[];
  pricingProfessionalId: string;
  purchaseHistory: PatientAppState["subscription"]["purchaseHistory"];
  isMobilePortal: boolean;
  firstMeetBookingId?: string | null;
  joinTourPulse?: boolean;
  onSelectHomeVariant: (variant: "next" | "classic") => void;
}) {
  const navigate = useNavigate();
  const pastBookings = useMemo(() => {
    const now = Date.now();
    return [...props.allBookings]
      .filter((booking) => {
        const status = (booking.status ?? "").toLowerCase();
        if (status === "cancelled") {
          return false;
        }
        return new Date(booking.startsAt).getTime() < now;
      })
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
      .slice(0, 5);
  }, [props.allBookings]);

  const purchasesSorted = useMemo(
    () =>
      [...props.purchaseHistory]
        .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
        .slice(0, 5),
    [props.purchaseHistory]
  );

  const professionalCta = props.activeProfessional
    ? t(props.language, { es: "Abrir chat", en: "Open chat", pt: "Abrir chat" })
    : t(props.language, { es: "Elegir profesional", en: "Choose professional", pt: "Escolher profissional" });

  const upcomingCta =
    props.actionKind === "next_session"
      ? t(props.language, { es: "Ver próxima sesión", en: "View next session", pt: "Ver proxima sessao" })
      : t(props.language, { es: "Ir a Sesiones", en: "Go to Sessions", pt: "Ir para Sessoes" });

  const runProfessionalCard = () => {
    if (props.activeProfessional) {
      props.onGoToChat(props.activeProfessional.id);
      return;
    }
    props.onNavigateToAssignProfessional();
  };

  const runUpcomingCard = () => {
    if (props.actionKind === "next_session" && props.nextBooking) {
      props.onOpenBookingDetail(props.nextBooking.id);
      return;
    }
    props.onGoToReservations();
  };

  const runBookSession = () => {
    if (props.availableSessions <= 0) {
      props.onBuySessions();
      return;
    }
    if (props.pricingProfessionalId) {
      props.onGoToBooking(props.pricingProfessionalId);
      return;
    }
    props.onNavigateToAssignProfessional();
  };

  const bookSessionLabel = t(props.language, {
    es: "Reservar sesión",
    en: "Book a session",
    pt: "Reservar sessao"
  });

  const pastPreview = pastBookings.slice(0, 3);
  const purchasePreview = purchasesSorted.slice(0, 3);

  const packagesSummary: ReactNode =
    purchasePreview.length === 0 ? null : (
      <ul className="dashboard-ml-history-list">
        {purchasePreview.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <span>
              {replaceTemplate(
                t(props.language, {
                  es: "{count} sesiones",
                  en: "{count} sessions",
                  pt: "{count} sessoes"
                }),
                { count: String(item.credits) }
              )}
            </span>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="dashboard-ml-home" aria-label={t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}>
      <div id="dashboard-hero-toolbar-mount" className="dashboard-hero-toolbar-mount dashboard-ml-toolbar-mount" />

      {/* Violeta solo hasta las cards de acceso; Sesiones ya va sobre el gris de página */}
      <div className="dashboard-ml-brand-band">
        <DashboardHomePromoCarousel language={props.language} />

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

          <div className="dashboard-ml-credits-bar">
            <p className="dashboard-ml-credits" aria-live="polite">
              {props.availableSessions > 0 ? (
                <>
                  <span className="dashboard-ml-credits-num">{props.availableSessions}</span>
                  <span className="dashboard-ml-credits-label">
                    {props.availableSessions === 1
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
          <BenefitCard
            icon="professional"
            tourAttr="patient-tour-hero"
            title={t(props.language, {
              es: "Tu profesional",
              en: "Your professional",
              pt: "Seu profissional"
            })}
            body={t(props.language, {
              es: "Chatá o elegí al profesional de tu proceso.",
              en: "Chat or choose the professional for your care.",
              pt: "Converse ou escolha o profissional do seu processo."
            })}
            cta={professionalCta}
            onClick={runProfessionalCard}
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
          <div className="dashboard-ml-sessions-head">
            <h2 id="dashboard-ml-sessions-title">
              {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
            </h2>
            <div className="dashboard-ml-sessions-subrow">
              <p className="dashboard-ml-section-lead">
                {t(props.language, {
                  es: "Tus próximas reservas, listas para abrir.",
                  en: "Your upcoming bookings, ready to open.",
                  pt: "Suas proximas reservas, prontas para abrir."
                })}
              </p>
              <div className="dashboard-ml-sessions-actions">
                <button type="button" className="dashboard-ml-book-cta" onClick={runBookSession}>
                  {bookSessionLabel}
                </button>
                <button type="button" className="dashboard-ml-section-link" onClick={() => props.onGoToReservations()}>
                  {t(props.language, { es: "Ver todas", en: "View all", pt: "Ver todas" })}
                </button>
              </div>
            </div>
          </div>

          <div className="dashboard-ml-sessions-grid">
            <article className="dashboard-ml-panel dashboard-ml-panel--bookings">
              {props.upcomingBookings.length === 0 ? (
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
                    bookings={props.upcomingBookings.slice(0, 4)}
                    professionals={props.professionals}
                    professionalPhotoMap={props.professionalPhotoMap}
                    timezone={props.timezone}
                    language={props.language}
                    layout="card"
                    surface="dashboard"
                    onImageFallback={props.onImageFallback}
                    onOpenBookingDetail={props.onOpenBookingDetail}
                    onReschedule={(booking) => props.onRescheduleBooking(booking.id)}
                    firstMeetBookingId={props.firstMeetBookingId}
                    joinTourPulse={props.joinTourPulse}
                  />
                </div>
              )}
            </article>
          </div>
        </section>

        <section
          className="dashboard-ml-history-grid"
          aria-label={t(props.language, { es: "Detalle de actividad", en: "Activity detail", pt: "Detalhe da atividade" })}
        >
          <CalendarPreviewCard
            language={props.language}
            bookings={props.upcomingBookings}
            timezone={props.timezone}
            onOpenBookingDetail={props.onOpenBookingDetail}
            onCta={() => props.onGoToReservations()}
          />

          <HistoryPreviewCard
            language={props.language}
            icon="packages"
            title={t(props.language, {
              es: "Paquetes comprados",
              en: "Purchased packages",
              pt: "Pacotes comprados"
            })}
            empty={t(props.language, {
              es: "Todavía no tenés paquetes comprados.",
              en: "You don’t have purchased packages yet.",
              pt: "Voce ainda nao tem pacotes comprados."
            })}
            cta={t(props.language, {
              es: "Ver paquetes y comprar",
              en: "View packages and buy",
              pt: "Ver pacotes e comprar"
            })}
            onCta={() => props.onBuySessions()}
            hasItems={purchasePreview.length > 0}
          >
            {packagesSummary}
          </HistoryPreviewCard>

          <HistoryPreviewCard
            language={props.language}
            icon="history"
            title={t(props.language, {
              es: "Historial de sesiones",
              en: "Session history",
              pt: "Historico de sessoes"
            })}
            empty={t(props.language, {
              es: "Todavía no hay sesiones finalizadas.",
              en: "No completed sessions yet.",
              pt: "Ainda nao ha sessoes finalizadas."
            })}
            cta={t(props.language, { es: "Ver historial", en: "View history", pt: "Ver historico" })}
            onCta={() => props.onGoToReservations()}
            hasItems={pastPreview.length > 0}
          >
            <ul className="dashboard-ml-history-list">
              {pastPreview.map((booking) => {
                const pro = findProfessionalById(booking.professionalId, props.professionals);
                return (
                  <li key={booking.id}>
                    <button
                      type="button"
                      className="dashboard-ml-history-item"
                      onClick={() => props.onOpenBookingDetail(booking.id)}
                    >
                      <strong>
                        {formatDateTime({
                          isoDate: booking.startsAt,
                          timezone: props.timezone,
                          language: props.language
                        })}
                      </strong>
                      <span>
                        {pro
                          ? professionalAccessibleName(pro)
                          : t(props.language, {
                              es: "Tu profesional",
                              en: "Your professional",
                              pt: "Seu profissional"
                            })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </HistoryPreviewCard>

          <HistoryPreviewCard
            language={props.language}
            icon="activity"
            title={t(props.language, {
              es: "Actividad de compras",
              en: "Purchase activity",
              pt: "Atividade de compras"
            })}
            empty={t(props.language, {
              es: "Todavía no hay actividad de compras.",
              en: "No purchase activity yet.",
              pt: "Ainda nao ha atividade de compras."
            })}
            cta={t(props.language, { es: "Ver compras", en: "View purchases", pt: "Ver compras" })}
            onCta={() => props.onBuySessions()}
            hasItems={purchasePreview.length > 0}
          >
            <ul className="dashboard-ml-history-list">
              {purchasePreview.map((item) => {
                const amountLabel = formatSubscriptionPurchasePrice({
                  priceCents: item.priceCents,
                  language: props.language,
                  displayCurrency: props.currency,
                  purchaseCurrency: item.currency ?? null,
                  fxRates: props.fxRates
                });
                return (
                  <li key={`activity-${item.id}`}>
                    <strong>{item.name}</strong>
                    <span>
                      {formatDateOnly({
                        isoDate: item.purchasedAt,
                        timezone: props.timezone,
                        language: props.language
                      })}
                      {amountLabel ? ` · ${amountLabel}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </HistoryPreviewCard>
        </section>

        <section className="dashboard-ml-diary" aria-labelledby="dashboard-ml-diary-title">
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
              </div>
              <div className="dashboard-ml-diary-banner-media" aria-hidden="true">
                  <img
                  className="dashboard-ml-diary-banner-photo"
                  src="/home/banner-home-diary.png?v=1"
                  alt=""
                  decoding="async"
                />
              </div>
            </div>
          </article>

          <div
            className="dashboard-ml-diary-actions-row"
            aria-label={t(props.language, {
              es: "Acciones del diario",
              en: "Diary actions",
              pt: "Acoes do diario"
            })}
          >
            <button type="button" className="dashboard-ml-diary-action-card" onClick={() => navigate("/diario/nueva")}>
              <span className="dashboard-ml-diary-action-icon" aria-hidden="true">
                <BenefitIcon kind="diary" />
              </span>
              <strong className="dashboard-ml-diary-action-title">
                {t(props.language, {
                  es: "Nueva entrada",
                  en: "New entry",
                  pt: "Nova entrada"
                })}
              </strong>
              <span className="dashboard-ml-diary-action-cta">
                {t(props.language, {
                  es: "Escribir hoy",
                  en: "Write today",
                  pt: "Escrever hoje"
                })}
              </span>
            </button>

            <button type="button" className="dashboard-ml-diary-action-card" onClick={() => navigate("/diario/registros")}>
              <span className="dashboard-ml-diary-action-icon" aria-hidden="true">
                <BenefitIcon kind="history" />
              </span>
              <strong className="dashboard-ml-diary-action-title">
                {t(props.language, {
                  es: "Ver registros",
                  en: "View records",
                  pt: "Ver registros"
                })}
              </strong>
              <span className="dashboard-ml-diary-action-cta">
                {t(props.language, {
                  es: "Abrir historial",
                  en: "Open history",
                  pt: "Abrir historico"
                })}
              </span>
            </button>

            <button type="button" className="dashboard-ml-diary-action-card" onClick={() => navigate("/diario")}>
              <span className="dashboard-ml-diary-action-icon" aria-hidden="true">
                <BenefitIcon kind="activity" />
              </span>
              <strong className="dashboard-ml-diary-action-title">
                {t(props.language, {
                  es: "Abrir diario",
                  en: "Open diary",
                  pt: "Abrir diario"
                })}
              </strong>
              <span className="dashboard-ml-diary-action-cta">
                {t(props.language, {
                  es: "Ir al inicio",
                  en: "Go to home",
                  pt: "Ir ao inicio"
                })}
              </span>
            </button>
          </div>
        </section>

        <DashboardHomeExercisesSection language={props.language} />
        <DashboardHomeMusicSection language={props.language} />

        <div className="dashboard-ml-foot">
          <DashboardHomeVariantToggle
            language={props.language}
            variant="next"
            onSelect={props.onSelectHomeVariant}
          />
        </div>
      </div>
    </div>
  );
}
