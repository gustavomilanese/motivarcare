import type { SyntheticEvent } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  bookingJoinUrl,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { ProfessionalNameStack, professionalPhotoAlt } from "./ProfessionalNameStack";
import { DashboardHomeVariantToggle } from "./DashboardHomeVariantToggle";
import { DashboardHomePromoCarousel } from "./DashboardHomePromoCarousel";
import { acquireNewSessionsButtonLabel } from "../lib/acquireSessionsButtonLabel";
import { findProfessionalById } from "../lib/professionals";
import { professionalAccessibleName } from "../lib/professionalDisplayName";
import { professionalPhotoSrc } from "../services/api";
import type { Booking, Professional } from "../types";
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

export type { DashboardNextActionKind };

export function DashboardNextActionHome(props: {
  language: AppLanguage;
  timezone: string;
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
  professionals: Professional[];
  pricingProfessionalId: string;
  onSelectHomeVariant: (variant: "next" | "classic") => void;
}) {
  const joinUrl = props.nextBooking ? bookingJoinUrl(props.nextBooking) : "";

  const actionTitle = (() => {
    switch (props.actionKind) {
      case "assign_professional":
        return t(props.language, {
          es: "Elegí tu profesional",
          en: "Choose your professional",
          pt: "Escolha seu profissional"
        });
      case "trial_rebook":
        return t(props.language, {
          es: "Tu prueba está lista para reagendar",
          en: "Your trial is ready to rebook",
          pt: "Sua sessao de teste esta pronta para reagendar"
        });
      case "next_session":
        return t(props.language, {
          es: "Tu próxima sesión",
          en: "Your next session",
          pt: "Sua proxima sessao"
        });
      case "trial_pending":
        return t(props.language, {
          es: "Reservá tu sesión de prueba",
          en: "Book your trial session",
          pt: "Reserve sua sessao de teste"
        });
      case "book_with_credits":
        return t(props.language, {
          es: "Reservá tu próxima sesión",
          en: "Book your next session",
          pt: "Reserve sua proxima sessao"
        });
      case "buy_sessions":
        return t(props.language, {
          es: "Continuá tu proceso",
          en: "Continue your care",
          pt: "Continue seu processo"
        });
    }
  })();

  const actionBody = (() => {
    switch (props.actionKind) {
      case "assign_professional":
        return t(props.language, {
          es: "Para reservar y ver precios necesitás un profesional asignado.",
          en: "To book and see prices you need an assigned professional.",
          pt: "Para reservar e ver precos voce precisa de um profissional atribuido."
        });
      case "trial_rebook":
        return t(props.language, {
          es: "Cancelaste la reserva anterior. Elegí un nuevo horario sin volver a pagar.",
          en: "You cancelled the previous booking. Pick a new time without paying again.",
          pt: "Voce cancelou a reserva anterior. Escolha um novo horario sem pagar de novo."
        });
      case "next_session":
        return props.nextBooking
          ? formatDateTime({
              isoDate: props.nextBooking.startsAt,
              timezone: props.timezone,
              language: props.language
            })
          : "";
      case "trial_pending":
        return t(props.language, {
          es: "Dejá tu primera sesión agendada cuando te quede bien.",
          en: "Schedule your first session whenever it works for you.",
          pt: "Agende sua primeira sessao quando for melhor."
        });
      case "book_with_credits":
        return replaceTemplate(
          t(props.language, {
            es: "Tenés {count} {sessions} listas para agendar.",
            en: "You have {count} {sessions} ready to book.",
            pt: "Voce tem {count} {sessions} prontas para agendar."
          }),
          {
            count: String(props.availableSessions),
            sessions:
              props.availableSessions === 1
                ? t(props.language, { es: "sesión", en: "session", pt: "sessao" })
                : t(props.language, { es: "sesiones", en: "sessions", pt: "sessoes" })
          }
        );
      case "buy_sessions":
        return t(props.language, {
          es: "Comprá un paquete o una sesión suelta al precio de tu profesional.",
          en: "Buy a package or a single session at your professional’s rate.",
          pt: "Compre um pacote ou uma sessao avulsa pelo preco do seu profissional."
        });
    }
  })();

  const primaryCtaLabel = (() => {
    switch (props.actionKind) {
      case "assign_professional":
        return t(props.language, {
          es: "Elegir profesional",
          en: "Choose professional",
          pt: "Escolher profissional"
        });
      case "trial_rebook":
        return t(props.language, {
          es: "Elegir nuevo horario",
          en: "Pick a new time",
          pt: "Escolher novo horario"
        });
      case "next_session":
        return joinUrl
          ? t(props.language, { es: "Unirse a la sesión", en: "Join session", pt: "Entrar na sessao" })
          : t(props.language, { es: "Ver detalle", en: "View details", pt: "Ver detalhes" });
      case "trial_pending":
        return t(props.language, {
          es: "Reservar sesión de prueba",
          en: "Book trial session",
          pt: "Reservar sessao de teste"
        });
      case "book_with_credits":
        return t(props.language, {
          es: "Reservar sesión",
          en: "Book session",
          pt: "Reservar sessao"
        });
      case "buy_sessions":
        return acquireNewSessionsButtonLabel(props.language);
    }
  })();

  const runPrimaryAction = () => {
    switch (props.actionKind) {
      case "assign_professional":
        props.onNavigateToAssignProfessional();
        return;
      case "trial_rebook":
        props.onNavigateToRebookTrial();
        return;
      case "next_session":
        if (joinUrl) {
          window.open(joinUrl, "_blank", "noopener,noreferrer");
          return;
        }
        if (props.nextBooking) {
          props.onOpenBookingDetail(props.nextBooking.id);
        }
        return;
      case "trial_pending":
        props.onNavigateToBookTrial();
        return;
      case "book_with_credits":
        if (props.pricingProfessionalId) {
          props.onGoToBooking(props.pricingProfessionalId);
        }
        return;
      case "buy_sessions":
        props.onBuySessions();
    }
  };

  const balanceLabel =
    props.availableSessions === 1
      ? t(props.language, {
          es: "1 sesión disponible",
          en: "1 session available",
          pt: "1 sessao disponivel"
        })
      : replaceTemplate(
          t(props.language, {
            es: "{count} sesiones disponibles",
            en: "{count} sessions available",
            pt: "{count} sessoes disponiveis"
          }),
          { count: String(props.availableSessions) }
        );

  const nextBookingId = props.nextBooking?.id ?? null;
  const upcomingForTiles = props.upcomingBookings.filter((booking) => booking.id !== nextBookingId).slice(0, 2);

  return (
    <div className="dashboard-ml-home" aria-label={t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}>
      {/* Mount mobile toolbar (desktop ML chrome vive en PortalNavigation). */}
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

        <article className="dashboard-ml-card dashboard-ml-card--action" data-tour="patient-tour-hero">
          <div className="dashboard-ml-card-action-copy">
            <p className="dashboard-ml-card-kicker" aria-live="polite">
              {props.availableSessions > 0
                ? balanceLabel
                : t(props.language, {
                    es: "Sin sesiones disponibles",
                    en: "No sessions available",
                    pt: "Sem sessoes disponiveis"
                  })}
            </p>
            <h2 id="dashboard-next-action-title" className="dashboard-ml-card-title" data-tour="patient-tour-trial">
              {actionTitle}
            </h2>
            {actionBody ? <p className="dashboard-ml-card-body">{actionBody}</p> : null}
          </div>
          <div className="dashboard-ml-card-action-row">
            <button
              type="button"
              className="dashboard-ml-card-cta"
              data-tour="patient-tour-next-primary"
              onClick={runPrimaryAction}
            >
              {primaryCtaLabel}
            </button>
            {props.actionKind === "next_session" && props.nextBooking ? (
              <button
                type="button"
                className="dashboard-ml-card-secondary"
                onClick={() => props.onRescheduleBooking(props.nextBooking!.id)}
              >
                {t(props.language, { es: "Modificar", en: "Reschedule", pt: "Modificar" })}
              </button>
            ) : null}
            {props.actionKind !== "buy_sessions" && props.actionKind !== "assign_professional" ? (
              <button type="button" className="dashboard-ml-card-secondary" onClick={() => props.onBuySessions()}>
                {t(props.language, {
                  es: "Comprar sesiones",
                  en: "Buy sessions",
                  pt: "Comprar sessoes"
                })}
              </button>
            ) : null}
          </div>
        </article>

        <section
          className="dashboard-ml-cards"
          aria-label={t(props.language, { es: "Accesos", en: "Shortcuts", pt: "Atalhos" })}
          data-tour="patient-tour-kpis"
        >
          <article className="dashboard-ml-card">
            {props.activeProfessional ? (
              <>
                <button
                  type="button"
                  className="dashboard-ml-tile-pro"
                  onClick={() => props.onGoToProfessional(props.activeProfessional!.id)}
                  aria-label={t(props.language, {
                    es: `Profesional activo: ${professionalAccessibleName(props.activeProfessional)}. Abrir ficha.`,
                    en: `Active professional: ${professionalAccessibleName(props.activeProfessional)}. Open profile.`,
                    pt: `Profissional ativo: ${professionalAccessibleName(props.activeProfessional)}. Abrir ficha.`
                  })}
                >
                  <img
                    className="dashboard-ml-tile-avatar"
                    src={professionalPhotoSrc(props.professionalPhotoMap[props.activeProfessional.id])}
                    alt={professionalPhotoAlt(props.activeProfessional)}
                    onError={props.onImageFallback}
                  />
                  <div className="dashboard-ml-tile-pro-copy">
                    <span className="dashboard-ml-tile-kicker">
                      {t(props.language, {
                        es: "Tu profesional",
                        en: "Your professional",
                        pt: "Seu profissional"
                      })}
                    </span>
                    <ProfessionalNameStack professional={props.activeProfessional} as="span" />
                    <span className="dashboard-ml-tile-meta">{props.activeProfessional.title}</span>
                  </div>
                </button>
                <div className="dashboard-ml-tile-actions">
                  <button
                    type="button"
                    className="dashboard-ml-card-cta"
                    onClick={() => props.onGoToChat(props.activeProfessional!.id)}
                  >
                    {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
                  </button>
                  {props.canSelfChangeProfessional ? (
                    <button
                      type="button"
                      className="dashboard-ml-card-secondary"
                      onClick={() => props.onNavigateToChangeProfessional()}
                    >
                      {t(props.language, { es: "Cambiar", en: "Change", pt: "Trocar" })}
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <h3 className="dashboard-ml-card-title dashboard-ml-card-title--sm">
                  {t(props.language, {
                    es: "Tu profesional",
                    en: "Your professional",
                    pt: "Seu profissional"
                  })}
                </h3>
                <p className="dashboard-ml-card-body">
                  {t(props.language, {
                    es: "Todavía no tenés uno asignado.",
                    en: "You don’t have one assigned yet.",
                    pt: "Voce ainda nao tem um atribuido."
                  })}
                </p>
                <button type="button" className="dashboard-ml-card-cta" onClick={() => props.onNavigateToAssignProfessional()}>
                  {t(props.language, {
                    es: "Elegir profesional",
                    en: "Choose professional",
                    pt: "Escolher profissional"
                  })}
                </button>
              </>
            )}
          </article>

          <article className="dashboard-ml-card">
            <h3 className="dashboard-ml-card-title dashboard-ml-card-title--sm">
              {t(props.language, {
                es: "Comprar sesiones",
                en: "Buy sessions",
                pt: "Comprar sessoes"
              })}
            </h3>
            <p className="dashboard-ml-card-body">
              {t(props.language, {
                es: "Paquetes o sesión individual, sin salir de Inicio.",
                en: "Packages or a single session, without leaving Home.",
                pt: "Pacotes ou sessao individual, sem sair do Inicio."
              })}
            </p>
            <button type="button" className="dashboard-ml-card-cta" onClick={() => props.onBuySessions()}>
              {acquireNewSessionsButtonLabel(props.language)}
            </button>
          </article>

          <article className="dashboard-ml-card" data-tour="patient-tour-bookings">
            <div className="dashboard-ml-tile-head">
              <h3 className="dashboard-ml-card-title dashboard-ml-card-title--sm">
                {t(props.language, {
                  es: "Próximas",
                  en: "Upcoming",
                  pt: "Proximas"
                })}
              </h3>
              <button type="button" className="dashboard-ml-tile-link" onClick={() => props.onGoToReservations()}>
                {t(props.language, {
                  es: "Ver Sesiones",
                  en: "View Sessions",
                  pt: "Ver Sessoes"
                })}
              </button>
            </div>
            {upcomingForTiles.length === 0 ? (
              <p className="dashboard-ml-card-body">
                {props.upcomingBookings.length > 0
                  ? t(props.language, {
                      es: "Tu próxima sesión está en la tarjeta de arriba.",
                      en: "Your next session is in the card above.",
                      pt: "Sua proxima sessao esta no card acima."
                    })
                  : t(props.language, {
                      es: "Sin turnos agendados por ahora.",
                      en: "No appointments scheduled yet.",
                      pt: "Sem horarios agendados por enquanto."
                    })}
              </p>
            ) : (
              <ul className="dashboard-ml-upcoming-list">
                {upcomingForTiles.map((booking) => {
                  const pro = findProfessionalById(booking.professionalId, props.professionals);
                  return (
                    <li key={booking.id}>
                      <button
                        type="button"
                        className="dashboard-ml-upcoming-item"
                        onClick={() => props.onOpenBookingDetail(booking.id)}
                      >
                        <span className="dashboard-ml-upcoming-when">
                          {formatDateTime({
                            isoDate: booking.startsAt,
                            timezone: props.timezone,
                            language: props.language
                          })}
                        </span>
                        <span className="dashboard-ml-upcoming-who">
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
