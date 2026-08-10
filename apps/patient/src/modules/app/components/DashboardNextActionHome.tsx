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
          es: "Sesión de prueba pagada",
          en: "Paid trial session",
          pt: "Sessao de teste paga"
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
          es: "Adquirí nuevas sesiones",
          en: "Get new sessions",
          pt: "Adquira novas sessoes"
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
          es: "Comprá un paquete o una sesión suelta con tu profesional.",
          en: "Buy a package or a single session with your professional.",
          pt: "Compre um pacote ou uma sessao avulsa com seu profissional."
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
          ? t(props.language, { es: "Unirse", en: "Join", pt: "Entrar" })
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

  const showBuySecondary =
    props.actionKind !== "buy_sessions" && props.actionKind !== "assign_professional";

  return (
    <div className="dashboard-next-home" aria-label={t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}>
      <section className="dashboard-next-atmosphere" data-tour="patient-tour-hero">
        <div className={`dashboard-next-atmosphere-media${props.heroImage === null ? " dashboard-next-atmosphere-media--loading" : ""}`}>
          {props.heroImage === null ? (
            <span className="dashboard-next-atmosphere-skeleton" aria-hidden="true" />
          ) : (
            <img
              className="dashboard-next-atmosphere-photo"
              src={props.heroImage}
              alt=""
              loading="eager"
              decoding="async"
              onError={props.onHeroFallback}
            />
          )}
          <div className="dashboard-next-atmosphere-scrim" aria-hidden="true" />
        </div>
        <div id="dashboard-hero-toolbar-mount" className="dashboard-hero-toolbar-mount" />
      </section>

      <div className="dashboard-next-body">
        <header className="dashboard-next-header">
          <p className="dashboard-next-kicker">MotivarCare</p>
          <h2 className="dashboard-next-title">
            {t(props.language, {
              es: "Qué sigue",
              en: "What’s next",
              pt: "O que vem a seguir"
            })}
          </h2>
          <p className="dashboard-next-balance" aria-live="polite">
            {props.availableSessions > 0
              ? balanceLabel
              : t(props.language, {
                  es: "Sin sesiones disponibles",
                  en: "No sessions available",
                  pt: "Sem sessoes disponiveis"
                })}
          </p>
        </header>

        <div className="dashboard-next-grid">
          <section
            className="dashboard-next-action"
            data-tour="patient-tour-trial"
            aria-labelledby="dashboard-next-action-title"
          >
            <h3 id="dashboard-next-action-title" className="dashboard-next-action-title">
              {actionTitle}
            </h3>
            {actionBody ? <p className="dashboard-next-action-body">{actionBody}</p> : null}
            <div className="dashboard-next-action-row">
              <button
                type="button"
                className="dashboard-next-primary"
                data-tour="patient-tour-next-primary"
                onClick={runPrimaryAction}
              >
                {primaryCtaLabel}
              </button>
              {props.actionKind === "next_session" && props.nextBooking ? (
                <button
                  type="button"
                  className="dashboard-next-secondary"
                  onClick={() => props.onRescheduleBooking(props.nextBooking!.id)}
                >
                  {t(props.language, { es: "Modificar", en: "Reschedule", pt: "Modificar" })}
                </button>
              ) : null}
            </div>
          </section>

          <aside className="dashboard-next-side">
            {props.showGoogleCalendarCta ? (
              <div className="dashboard-next-calendar-cta">
                <button
                  type="button"
                  className={`dashboard-next-secondary${props.googleCalendarCtaPulse ? " patient-google-calendar-cta--pulse" : ""}`}
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

            {props.activeProfessional ? (
              <section className="dashboard-next-pro" data-tour="patient-tour-kpis">
                <button
                  type="button"
                  className="dashboard-next-pro-hit"
                  onClick={() => props.onGoToProfessional(props.activeProfessional!.id)}
                  aria-label={t(props.language, {
                    es: `Profesional activo: ${professionalAccessibleName(props.activeProfessional)}. Abrir ficha.`,
                    en: `Active professional: ${professionalAccessibleName(props.activeProfessional)}. Open profile.`,
                    pt: `Profissional ativo: ${professionalAccessibleName(props.activeProfessional)}. Abrir ficha.`
                  })}
                >
                  <img
                    className="dashboard-next-pro-avatar"
                    src={professionalPhotoSrc(props.professionalPhotoMap[props.activeProfessional.id])}
                    alt={professionalPhotoAlt(props.activeProfessional)}
                    onError={props.onImageFallback}
                  />
                  <div className="dashboard-next-pro-copy">
                    <span className="dashboard-next-pro-label">
                      {t(props.language, {
                        es: "Tu profesional",
                        en: "Your professional",
                        pt: "Seu profissional"
                      })}
                    </span>
                    <ProfessionalNameStack professional={props.activeProfessional} as="span" />
                    <span className="dashboard-next-pro-title">{props.activeProfessional.title}</span>
                  </div>
                </button>
                <div
                  className={
                    props.canSelfChangeProfessional
                      ? "dashboard-next-pro-actions"
                      : "dashboard-next-pro-actions dashboard-next-pro-actions--solo"
                  }
                >
                  <button
                    type="button"
                    className="dashboard-next-pro-chat"
                    onClick={() => props.onGoToChat(props.activeProfessional!.id)}
                  >
                    {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
                  </button>
                  {props.canSelfChangeProfessional ? (
                    <button
                      type="button"
                      className="dashboard-next-pro-change"
                      onClick={() => props.onNavigateToChangeProfessional()}
                    >
                      {t(props.language, {
                        es: "Cambiar profesional",
                        en: "Change professional",
                        pt: "Trocar profissional"
                      })}
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            {showBuySecondary ? (
              <section className="dashboard-next-buy" aria-label={acquireNewSessionsButtonLabel(props.language)}>
                <h3 className="dashboard-next-buy-title">
                  {t(props.language, {
                    es: "Comprar sesiones",
                    en: "Buy sessions",
                    pt: "Comprar sessoes"
                  })}
                </h3>
                <p className="dashboard-next-buy-body">
                  {t(props.language, {
                    es: "Abrí el catálogo: paquetes o sesión individual, sin salir de Inicio.",
                    en: "Open the catalog: packages or a single session, without leaving Home.",
                    pt: "Abra o catalogo: pacotes ou sessao individual, sem sair do Inicio."
                  })}
                </p>
                <button type="button" className="dashboard-next-secondary dashboard-next-buy-cta" onClick={() => props.onBuySessions()}>
                  {acquireNewSessionsButtonLabel(props.language)}
                </button>
              </section>
            ) : null}
          </aside>
        </div>

        <section className="dashboard-next-upcoming" data-tour="patient-tour-bookings" aria-labelledby="dashboard-next-upcoming-title">
          <div className="dashboard-next-upcoming-head">
            <h3 id="dashboard-next-upcoming-title" className="dashboard-next-upcoming-title">
              {t(props.language, {
                es: "Próximas reservas",
                en: "Upcoming bookings",
                pt: "Proximas reservas"
              })}
            </h3>
            <button type="button" className="dashboard-next-upcoming-all" onClick={() => props.onGoToReservations()}>
              {t(props.language, {
                es: "Ir a Sesiones",
                en: "Go to Sessions",
                pt: "Ir para Sessoes"
              })}
            </button>
          </div>
          {props.upcomingBookings.length === 0 ? (
            <p className="dashboard-next-upcoming-empty">
              {t(props.language, {
                es: "Todavía no tenés turnos agendados.",
                en: "You don’t have any appointments scheduled yet.",
                pt: "Voce ainda nao tem horarios agendados."
              })}
            </p>
          ) : (
            <ul className="dashboard-next-upcoming-list">
              {props.upcomingBookings.slice(0, 3).map((booking) => {
                const pro = findProfessionalById(booking.professionalId, props.professionals);
                return (
                  <li key={booking.id}>
                    <button
                      type="button"
                      className="dashboard-next-upcoming-item"
                      onClick={() => props.onOpenBookingDetail(booking.id)}
                    >
                      <span className="dashboard-next-upcoming-when">
                        {formatDateTime({
                          isoDate: booking.startsAt,
                          timezone: props.timezone,
                          language: props.language
                        })}
                      </span>
                      <span className="dashboard-next-upcoming-who">
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
        </section>

        <DashboardHomeVariantToggle
          language={props.language}
          variant="next"
          onSelect={props.onSelectHomeVariant}
        />
      </div>
    </div>
  );
}
