import { useMemo, type ReactNode, type SyntheticEvent } from "react";
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
import { acquireNewSessionsButtonLabel } from "../lib/acquireSessionsButtonLabel";
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

type BenefitIconKind = "professional" | "buy" | "upcoming" | "packages" | "history" | "activity";

function BenefitIcon(props: { kind: BenefitIconKind }) {
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
          <circle cx="32" cy="22" r="10" stroke="currentColor" strokeWidth="2.4" />
          <path d="M14 52c4.5-10 13-14 18-14s13.5 4 18 14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M44 18c4 1.5 7 5.5 7 10" stroke="#5f44eb" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "buy":
      return (
        <svg {...common}>
          <rect x="14" y="18" width="36" height="28" rx="6" stroke="currentColor" strokeWidth="2.4" />
          <path d="M22 18v-2a10 10 0 0 1 20 0v2" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="32" cy="32" r="5" fill="#5f44eb" />
        </svg>
      );
    case "upcoming":
      return (
        <svg {...common}>
          <rect x="14" y="16" width="36" height="34" rx="6" stroke="currentColor" strokeWidth="2.4" />
          <path d="M14 26h36" stroke="currentColor" strokeWidth="2.4" />
          <path d="M24 12v8M40 12v8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="32" cy="38" r="5" fill="#5f44eb" />
        </svg>
      );
    case "packages":
      return (
        <svg {...common}>
          <path d="M16 28l16-8 16 8v16l-16 8-16-8V28z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M32 20v32M16 28l16 8 16-8" stroke="currentColor" strokeWidth="2.4" />
          <path d="M40 24l8 4" stroke="#5f44eb" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="2.4" />
          <path d="M32 20v14l10 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 24l-4-2" stroke="#5f44eb" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <rect x="16" y="14" width="32" height="38" rx="4" stroke="currentColor" strokeWidth="2.4" />
          <path d="M24 24h16M24 32h16M24 40h10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="42" cy="42" r="5" fill="#5f44eb" />
        </svg>
      );
    default:
      return null;
  }
}

function BenefitCard(props: {
  title: string;
  body: string;
  cta: string;
  icon: BenefitIconKind;
  onClick: () => void;
  tourAttr?: string;
  ctaTourAttr?: string;
}) {
  return (
    <article className="dashboard-ml-benefit-card" data-tour={props.tourAttr}>
      <div className="dashboard-ml-benefit-icon">
        <BenefitIcon kind={props.icon} />
      </div>
      <h3 className="dashboard-ml-benefit-title">{props.title}</h3>
      <p className="dashboard-ml-benefit-body">{props.body}</p>
      <button
        type="button"
        className="dashboard-ml-benefit-cta"
        data-tour={props.ctaTourAttr}
        onClick={props.onClick}
      >
        {props.cta}
      </button>
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

  const packagesSummary: ReactNode =
    purchasesSorted.length === 0 ? (
      <p className="dashboard-ml-history-empty">
        {t(props.language, {
          es: "Todavía no tenés paquetes comprados.",
          en: "You don’t have purchased packages yet.",
          pt: "Voce ainda nao tem pacotes comprados."
        })}
      </p>
    ) : (
      <ul className="dashboard-ml-history-list">
        {purchasesSorted.map((item) => (
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

      <DashboardHomePromoCarousel language={props.language} />

      <div className="dashboard-ml-surface">
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

        {/* Cards tipo ML: ícono + título + texto + CTA suave */}
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
            cta={acquireNewSessionsButtonLabel(props.language)}
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
            icon="packages"
            title={t(props.language, {
              es: "Paquetes comprados",
              en: "Purchased packages",
              pt: "Pacotes comprados"
            })}
            body={t(props.language, {
              es: "Mirá tus paquetes activos y sumá más sesiones.",
              en: "See your active packages and add more sessions.",
              pt: "Veja seus pacotes ativos e some mais sessoes."
            })}
            cta={t(props.language, { es: "Ver paquetes", en: "View packages", pt: "Ver pacotes" })}
            onClick={() => props.onBuySessions()}
          />
          <BenefitCard
            icon="history"
            title={t(props.language, {
              es: "Historial",
              en: "History",
              pt: "Historico"
            })}
            body={t(props.language, {
              es: "Consultá sesiones anteriores de tu proceso.",
              en: "Review past sessions from your care.",
              pt: "Consulte sessoes anteriores do seu processo."
            })}
            cta={t(props.language, { es: "Ver historial", en: "View history", pt: "Ver historico" })}
            onClick={() => props.onGoToReservations()}
          />
          <BenefitCard
            icon="activity"
            title={t(props.language, {
              es: "Actividad",
              en: "Activity",
              pt: "Atividade"
            })}
            body={t(props.language, {
              es: "Seguí tus compras y movimientos recientes.",
              en: "Track your recent purchases and activity.",
              pt: "Acompanhe suas compras e atividade recente."
            })}
            cta={t(props.language, { es: "Ver actividad", en: "View activity", pt: "Ver atividade" })}
            onClick={() => props.onBuySessions()}
          />
        </section>

        <section className="dashboard-ml-sessions" data-tour="patient-tour-bookings" aria-labelledby="dashboard-ml-sessions-title">
          <div className="dashboard-ml-sessions-head">
            <div>
              <h2 id="dashboard-ml-sessions-title">
                {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
              </h2>
              <p className="dashboard-ml-section-lead">
                {t(props.language, {
                  es: "Tus próximas reservas, listas para abrir.",
                  en: "Your upcoming bookings, ready to open.",
                  pt: "Suas proximas reservas, prontas para abrir."
                })}
              </p>
            </div>
            <button type="button" className="dashboard-ml-section-link" onClick={() => props.onGoToReservations()}>
              {t(props.language, { es: "Ver todas", en: "View all", pt: "Ver todas" })}
            </button>
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

            <article className="dashboard-ml-panel dashboard-ml-panel--calendar">
              <h3 className="dashboard-ml-panel-title">
                {t(props.language, {
                  es: "Calendario de la semana",
                  en: "This week’s calendar",
                  pt: "Calendario da semana"
                })}
              </h3>
              <SessionsCalendar
                bookings={props.upcomingBookings}
                timezone={props.timezone}
                language={props.language}
                onOpenBookingDetail={props.onOpenBookingDetail}
                variant="week"
                hideTitle
              />
            </article>
          </div>
        </section>

        <section
          className="dashboard-ml-history-grid"
          aria-label={t(props.language, { es: "Detalle de actividad", en: "Activity detail", pt: "Detalhe da atividade" })}
        >
          <article className="dashboard-ml-history-card">
            <h3 className="dashboard-ml-panel-title">
              {t(props.language, {
                es: "Paquetes comprados",
                en: "Purchased packages",
                pt: "Pacotes comprados"
              })}
            </h3>
            {packagesSummary}
            <button type="button" className="dashboard-ml-benefit-cta" onClick={() => props.onBuySessions()}>
              {acquireNewSessionsButtonLabel(props.language)}
            </button>
          </article>

          <article className="dashboard-ml-history-card">
            <h3 className="dashboard-ml-panel-title">
              {t(props.language, {
                es: "Historial de sesiones",
                en: "Session history",
                pt: "Historico de sessoes"
              })}
            </h3>
            {pastBookings.length === 0 ? (
              <p className="dashboard-ml-history-empty">
                {t(props.language, {
                  es: "Todavía no hay sesiones finalizadas.",
                  en: "No completed sessions yet.",
                  pt: "Ainda nao ha sessoes finalizadas."
                })}
              </p>
            ) : (
              <ul className="dashboard-ml-history-list">
                {pastBookings.map((booking) => {
                  const pro = findProfessionalById(booking.professionalId, props.professionals);
                  return (
                    <li key={booking.id}>
                      <button type="button" className="dashboard-ml-history-item" onClick={() => props.onOpenBookingDetail(booking.id)}>
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
            )}
            <button type="button" className="dashboard-ml-benefit-cta" onClick={() => props.onGoToReservations()}>
              {t(props.language, { es: "Ver historial", en: "View history", pt: "Ver historico" })}
            </button>
          </article>

          <article className="dashboard-ml-history-card">
            <h3 className="dashboard-ml-panel-title">
              {t(props.language, {
                es: "Actividad de compras",
                en: "Purchase activity",
                pt: "Atividade de compras"
              })}
            </h3>
            {purchasesSorted.length === 0 ? (
              <p className="dashboard-ml-history-empty">
                {t(props.language, {
                  es: "Todavía no hay actividad de compras.",
                  en: "No purchase activity yet.",
                  pt: "Ainda nao ha atividade de compras."
                })}
              </p>
            ) : (
              <ul className="dashboard-ml-history-list">
                {purchasesSorted.map((item) => {
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
            )}
            <button type="button" className="dashboard-ml-benefit-cta" onClick={() => props.onBuySessions()}>
              {t(props.language, { es: "Comprar de nuevo", en: "Buy again", pt: "Comprar de novo" })}
            </button>
          </article>
        </section>

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
