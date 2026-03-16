import { type SyntheticEvent, useEffect, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyAmount,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import { DEFAULT_PATIENT_HERO_IMAGE } from "../constants";
import { professionalImageMap, professionalsCatalog } from "../data/professionalsCatalog";
import { API_BASE } from "../services/api";
import type {
  Booking,
  PackageId,
  PackagePlan,
  PatientAppState,
  Professional,
  PublicPackageCatalog,
  PublicSessionPackagesResponse,
  TimeSlot
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function localizedPackageName(planId: PackageId | null, fallback: string, language: AppLanguage): string {
  if (!planId) {
    return t(language, {
      es: "Sin paquete activo",
      en: "No active package",
      pt: "Sem pacote ativo"
    });
  }
  return fallback;
}

function localizedPackageDescription(_planId: PackageId, fallback: string): string {
  return fallback;
}

function describePackagePlan(credits: number, language: AppLanguage): string {
  if (credits >= 12) {
    return t(language, {
      es: "Mayor frecuencia para procesos de alta demanda.",
      en: "Higher frequency for high-demand processes.",
      pt: "Maior frequencia para processos de alta demanda."
    });
  }
  if (credits >= 8) {
    return t(language, {
      es: "Plan recomendado para trabajo mensual sostenido.",
      en: "Recommended plan for sustained monthly work.",
      pt: "Plano recomendado para trabalho mensal sustentado."
    });
  }
  return t(language, {
    es: "Ideal para una primera etapa de trabajo terapeutico.",
    en: "Ideal for an initial therapy stage.",
    pt: "Ideal para uma primeira etapa de trabalho terapeutico."
  });
}

async function loadPublicPackagePlans(language: AppLanguage): Promise<PublicPackageCatalog> {
  try {
    const response = await fetch(API_BASE + "/api/public/session-packages?channel=patient");
    if (!response.ok) {
      return { plans: [], featuredPackageId: null };
    }
    const data = (await response.json()) as PublicSessionPackagesResponse;
    if (!Array.isArray(data.sessionPackages) || data.sessionPackages.length === 0) {
      return { plans: [], featuredPackageId: null };
    }
    return {
      featuredPackageId: data.featuredPackageId,
      plans: data.sessionPackages.slice(0, 3).map((item) => ({
        id: item.id,
        name: item.name,
        credits: item.credits,
        priceCents: item.priceCents,
        currency: item.currency,
        discountPercent: item.discountPercent,
        description: describePackagePlan(item.credits, language),
        professionalId: item.professionalId,
        professionalName: item.professionalName,
        stripePriceId: item.stripePriceId
      }))
    };
  } catch {
    return { plans: [], featuredPackageId: null };
  }
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

function formatDateOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  });
}

function formatMoney(amountInUsd: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyAmount({
    amountInUsd,
    currency,
    language,
    maximumFractionDigits: 0
  });
}

function getNextBooking(bookings: Booking[]): Booking | null {
  const now = Date.now();

  return (
    bookings
      .filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt).getTime() > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null
  );
}

function findProfessionalById(professionalId: string): Professional {
  return professionalsCatalog.find((item) => item.id === professionalId) ?? professionalsCatalog[0];
}

export function DashboardPage(props: {
  state: PatientAppState;
  language: AppLanguage;
  currency: SupportedCurrency;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onGoToReservations: () => void;
  onGoToBooking: (professionalId: string) => void;
  onGoToProfessional: (professionalId: string) => void;
  onGoToChat: (professionalId: string) => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onPlanTrialFromDashboard: (professionalId: string, slot: TimeSlot) => void;
  onCancelTrialFromDashboard: () => void;
  onStartPackagePurchase: (plan: PackagePlan) => void;
}) {
  const now = Date.now();
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialProfessionalId, setTrialProfessionalId] = useState(props.state.assignedProfessionalId ?? props.state.selectedProfessionalId);
  const [trialSlotId, setTrialSlotId] = useState("");
  const [landingPatientHeroImage, setLandingPatientHeroImage] = useState(DEFAULT_PATIENT_HERO_IMAGE);
  const [packagePlans, setPackagePlans] = useState<PackagePlan[]>([]);
  const [featuredPackageId, setFeaturedPackageId] = useState<string | null>(null);
  const nextBooking = getNextBooking(props.state.bookings);
  const confirmedBookings = props.state.bookings.filter((booking) => booking.status === "confirmed");
  const trialBookings = confirmedBookings.filter((booking) => booking.bookingMode === "trial");
  const activeTrialBooking = trialBookings
    .filter((booking) => new Date(booking.endsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;
  const hasTrialPlanned = trialBookings.some((booking) => new Date(booking.endsAt).getTime() >= now);
  const hasCompletedTrial = trialBookings.some((booking) => new Date(booking.endsAt).getTime() < now);
  const trialStatus: "pending" | "reserved" | "completed" = hasCompletedTrial
    ? "completed"
    : hasTrialPlanned
      ? "reserved"
      : "pending";
  const nextConfirmedBooking = nextBooking ?? confirmedBookings[0] ?? null;
  const fallbackBooking = confirmedBookings[0] ?? null;
  const activeProfessionalBooking = nextBooking ?? fallbackBooking;
  const activeProfessional = activeProfessionalBooking
    ? findProfessionalById(activeProfessionalBooking.professionalId)
    : props.state.assignedProfessionalId
      ? professionalsCatalog.find((item) => item.id === props.state.assignedProfessionalId) ?? null
      : null;
  const activeTrialProfessional = activeTrialBooking ? findProfessionalById(activeTrialBooking.professionalId) : null;
  const activeTrialSlotId = activeTrialProfessional
    ? activeTrialProfessional.slots.find(
        (slot) => slot.startsAt === activeTrialBooking?.startsAt && slot.endsAt === activeTrialBooking?.endsAt
      )?.id ?? ""
    : "";
  const trialProfessional = findProfessionalById(trialProfessionalId);
  const availableTrialSlots = trialProfessional.slots.filter(
    (slot) => !props.state.bookedSlotIds.includes(slot.id) || slot.id === activeTrialSlotId
  );
  const selectedTrialSlot = availableTrialSlots.find((slot) => slot.id === trialSlotId) ?? null;

  const openTrialModal = () => {
    const initialProfessionalId = activeTrialBooking?.professionalId ?? props.state.assignedProfessionalId ?? props.state.selectedProfessionalId;
    setTrialProfessionalId(initialProfessionalId);
    setTrialSlotId(activeTrialSlotId);
    setTrialModalOpen(true);
  };

  useEffect(() => {
    setTrialProfessionalId(props.state.assignedProfessionalId ?? props.state.selectedProfessionalId);
  }, [props.state.assignedProfessionalId, props.state.selectedProfessionalId]);

  useEffect(() => {
    setTrialSlotId("");
  }, [trialProfessionalId]);

  useEffect(() => {
    if (!trialModalOpen) {
      return;
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setTrialModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [trialModalOpen]);

  useEffect(() => {
    let active = true;

    async function loadLandingImage() {
      try {
        const response = await fetch(`${API_BASE}/api/public/web-content`);
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          settings?: {
            patientDesktopImageUrl?: string | null;
            patientHeroImageUrl?: string | null;
          };
        };

        if (!active) {
          return;
        }

        const imageFromLanding = data.settings?.patientDesktopImageUrl ?? data.settings?.patientHeroImageUrl;
        if (imageFromLanding) {
          setLandingPatientHeroImage(imageFromLanding);
        }
      } catch {
        // keep default image if API is unavailable
      }
    }

    void loadLandingImage();
    void loadPublicPackagePlans(props.language).then((catalog) => {
      if (active) {
        setPackagePlans(catalog.plans);
        setFeaturedPackageId(catalog.featuredPackageId);
      }
    });

    return () => {
      active = false;
    };
  }, [props.language]);

  return (
    <div className="page-stack sessions-page-layout">
      <section className="hero-composite">
        <div className="hero-media">
          <figure className="hero-photo-tile">
            <img
              src={landingPatientHeroImage}
              alt={t(props.language, {
                es: "Paciente en sesion virtual",
                en: "Patient in a virtual session",
                pt: "Paciente em sessao virtual"
              })}
              loading="lazy"
              onError={props.onHeroFallback}
            />
            <figcaption className="hero-note-card">
              <p>
                {t(props.language, {
                  es: "La paz viene de adentro. No la busques afuera.",
                  en: "Peace comes from within. Do not seek it without.",
                  pt: "A paz vem de dentro. Nao a procure fora."
                })}
              </p>
            </figcaption>
          </figure>
        </div>
        <div className="hero-title-wrap">
          <h3>
            {t(props.language, {
              es: "Gestiona tus sesiones de psicologia en un solo lugar",
              en: "Manage your psychology sessions in one place",
              pt: "Gerencie suas sessoes de psicologia em um so lugar"
            })}
          </h3>
          <p>
            {t(props.language, {
              es: "Desde aqui puedes ver tu agenda, reservar nuevas sesiones y mantener continuidad terapeutica.",
              en: "From here you can view your schedule, book new sessions, and keep therapeutic continuity.",
              pt: "Daqui voce pode ver sua agenda, reservar novas sessoes e manter continuidade terapeutica."
            })}
          </p>
        </div>
      </section>

      <section className="content-card trial-priority-banner trial-priority-inline">
        <h2>
          <span className="trial-inline-icon" aria-hidden="true" />
          {trialStatus === "pending"
            ? t(props.language, { es: "Sesion de prueba pendiente", en: "Pending trial session", pt: "Sessao de teste pendente" })
            : trialStatus === "reserved"
              ? t(props.language, { es: "Sesion de prueba planificada", en: "Trial session scheduled", pt: "Sessao de teste agendada" })
              : t(props.language, { es: "Sesion de prueba completada", en: "Trial session completed", pt: "Sessao de teste concluida" })}
        </h2>
        <p>
          {trialStatus === "reserved" && activeTrialBooking
            ? formatDateTime({
                isoDate: activeTrialBooking.startsAt,
                timezone: props.state.profile.timezone,
                language: props.language
              })
            : trialStatus === "completed" && activeTrialBooking
              ? formatDateTime({
                  isoDate: activeTrialBooking.startsAt,
                  timezone: props.state.profile.timezone,
                  language: props.language
                })
              : t(props.language, {
                  es: "Elige un horario para dejar tu primera sesion ya agendada.",
                  en: "Choose a time to leave your first session already scheduled.",
                  pt: "Escolha um horario para deixar sua primeira sessao ja agendada."
                })}
        </p>
        <button className="trial-inline-action" type="button" onClick={openTrialModal}>
          {hasTrialPlanned
            ? t(props.language, { es: "Modificar", en: "Modify", pt: "Modificar" })
            : t(props.language, { es: "Planificar", en: "Plan", pt: "Planejar" })}
        </button>
      </section>

      <section className="hero-grid">
        <article className="hero-card sessions-combined-card">
          <button
            className="sessions-combined-section sessions-combined-action"
            type="button"
            onClick={props.onGoToReservations}
          >
            <span className="label">{t(props.language, { es: "Sesiones confirmadas", en: "Confirmed sessions", pt: "Sessoes confirmadas" })}</span>
            <strong>{props.state.bookings.filter((booking) => booking.status === "confirmed").length}</strong>
            <p>
              {nextBooking
                ? `${t(props.language, { es: "Proxima", en: "Next", pt: "Proxima" })}: ${formatDateTime({
                    isoDate: nextBooking.startsAt,
                    timezone: props.state.profile.timezone,
                    language: props.language
                  })}`
                : t(props.language, {
                    es: "Todavia no tenes sesiones reservadas",
                    en: "You do not have any booked sessions yet",
                    pt: "Voce ainda nao tem sessoes reservadas"
                  })}
            </p>
            <span className="hero-inline-link">
              {nextConfirmedBooking
                ? t(props.language, { es: "Ver detalle", en: "View details", pt: "Ver detalhes" })
                : t(props.language, { es: "Sin sesiones confirmadas", en: "No confirmed sessions", pt: "Sem sessoes confirmadas" })}
            </span>
          </button>

          <button
            className="sessions-combined-section sessions-combined-action"
            type="button"
            onClick={() => props.onGoToBooking(props.state.selectedProfessionalId)}
          >
            <span className="label sessions-available-label">
              <span className="sessions-available-icon" aria-hidden="true">◌</span>
              {t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}
            </span>
            <strong>{props.state.subscription.creditsRemaining}</strong>
            <p>
              {localizedPackageName(
                props.state.subscription.packageId,
                props.state.subscription.packageName,
                props.language
              )}
            </p>
            <span className="hero-inline-link hero-inline-link-primary">
              {t(props.language, { es: "Ir a sesiones", en: "Go to sessions", pt: "Ir para sessoes" })}
            </span>
          </button>
        </article>

        <button
          className="hero-card hero-card-button active-professional-card"
          disabled={!activeProfessional}
          type="button"
          onClick={() => {
            if (activeProfessional) {
              props.onGoToProfessional(activeProfessional.id);
            }
          }}
        >
          <span className="label">{t(props.language, { es: "Profesional activo", en: "Active professional", pt: "Profissional ativo" })}</span>
          {activeProfessional ? (
            <>
              <div className="active-professional-row">
                <img
                  className="active-professional-avatar"
                  src={professionalImageMap[activeProfessional.id]}
                  alt={activeProfessional.fullName}
                  onError={props.onImageFallback}
                />
                <div>
                  <h3>{activeProfessional.fullName}</h3>
                  <p>{activeProfessional.title}</p>
                </div>
              </div>
              <p>
                {replaceTemplate(
                  t(props.language, {
                    es: "{compat}% compatibilidad · {years} anos de experiencia",
                    en: "{compat}% match · {years} years of experience",
                    pt: "{compat}% compatibilidade · {years} anos de experiencia"
                  }),
                  { compat: activeProfessional.compatibility, years: activeProfessional.yearsExperience }
                )}
              </p>
              <button
                className="chat-gradient-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onGoToChat(activeProfessional.id);
                }}
              >
                {t(props.language, { es: "Abrir chat con profesional", en: "Open chat with professional", pt: "Abrir chat com profissional" })}
              </button>
            </>
          ) : (
            <p>
              {props.state.assignedProfessionalName
                ? replaceTemplate(
                    t(props.language, {
                      es: "Profesional asignado desde admin: {name}.",
                      en: "Professional assigned from admin: {name}.",
                      pt: "Profissional atribuido pelo admin: {name}."
                    }),
                    { name: props.state.assignedProfessionalName }
                  )
                : t(props.language, {
                    es: "Reserva tu primera sesion para ver aqui los datos de tu profesional.",
                    en: "Book your first session to see your professional details here.",
                    pt: "Reserve sua primeira sessao para ver aqui os dados do profissional."
                  })}
            </p>
          )}
        </button>
      </section>

      <SessionsCalendar
        bookings={confirmedBookings.filter((booking) => new Date(booking.startsAt).getTime() > now)}
        timezone={props.state.profile.timezone}
        language={props.language}
        onOpenBookingDetail={props.onOpenBookingDetail}
        variant="dashboard"
      />

      {packagePlans.length > 0 ? (
        <section className="content-card purchase-section">
          <header className="purchase-head">
            <h3>{t(props.language, { es: "Paquetes de sesiones", en: "Session packages", pt: "Pacotes de sessoes" })}</h3>
            <p>{t(props.language, { es: "Elegi el formato que mejor acompana tu proceso terapeutico.", en: "Choose the format that best supports your therapy process.", pt: "Escolha o formato que melhor acompanha seu processo terapeutico." })}</p>
          </header>
          <figure className="purchase-art package-sale-art" aria-hidden="true">
            <span className="package-sale-art-percent">Ψ</span>
          </figure>
          <div className="deal-grid">
            {packagePlans.slice(0, 3).map((plan) => (
              <div className={`deal-card-shell ${featuredPackageId === plan.id ? "featured" : ""}`} key={plan.id}>
                <div className="deal-card-roof" aria-hidden={featuredPackageId !== plan.id}>
                  {featuredPackageId === plan.id ? (
                    <span className="deal-card-featured-kicker">{t(props.language, { es: "Mas elegido", en: "Best seller", pt: "Mais escolhido" })}</span>
                  ) : null}
                </div>
                <article className={`deal-card dashboard-deal-card ${featuredPackageId === plan.id ? "featured" : ""}`}>
                  <h3>{localizedPackageName(plan.id, plan.name, props.language)}</h3>
                  <p>{localizedPackageDescription(plan.id, plan.description)}</p>
                  <div className="deal-pricing-top">
                    <span className="deal-list-price">
                      {formatMoney(Math.round(plan.priceCents / 100 / Math.max(0.01, 1 - plan.discountPercent / 100)), props.language, props.currency)}
                    </span>
                    <span className="deal-discount-badge">{plan.discountPercent}% OFF</span>
                  </div>
                  <p className="deal-main-price">{formatMoney(plan.priceCents / 100, props.language, props.currency)}</p>
                  <p className="deal-caption-strong">{replaceTemplate(
                    t(props.language, {
                      es: "Incluye {count} sesiones.",
                      en: "Includes {count} sessions.",
                      pt: "Inclui {count} sessoes."
                    }),
                    { count: String(plan.credits) }
                  )}</p>
                  <button
                    className="deal-select-button"
                    type="button"
                    onClick={() => props.onStartPackagePurchase(plan)}
                  >
                    {t(props.language, { es: "Elegir plan", en: "Choose plan", pt: "Escolher plano" })}
                  </button>
                  <p className="deal-caption">
                    {replaceTemplate(
                      t(props.language, {
                        es: "Incluye {count} sesiones para este ciclo.",
                        en: "Includes {count} sessions for this cycle.",
                        pt: "Inclui {count} sessoes para este ciclo."
                      }),
                      { count: String(plan.credits) }
                    )}
                  </p>
                </article>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {trialModalOpen ? (
        <div className="session-modal-backdrop" role="presentation" onClick={() => setTrialModalOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            className="session-modal trial-plan-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="session-modal-header">
              <h2>{t(props.language, { es: "Planificar sesion de prueba", en: "Plan trial session", pt: "Planejar sessao de teste" })}</h2>
            </header>

            <div className="booking-inline-fields">
              <label>
                {t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}
                <select
                  value={trialProfessionalId}
                  onChange={(event) => setTrialProfessionalId(event.target.value)}
                >
                  {professionalsCatalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName} - {item.compatibility}%
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t(props.language, { es: "Slot disponible", en: "Available slot", pt: "Horario disponivel" })}
                <select value={trialSlotId} onChange={(event) => setTrialSlotId(event.target.value)}>
                  <option value="">
                    {availableTrialSlots.length === 0
                      ? t(props.language, {
                          es: "Sin slots esta semana",
                          en: "No slots this week",
                          pt: "Sem horarios esta semana"
                        })
                      : t(props.language, {
                          es: "Selecciona un horario",
                          en: "Select a time",
                          pt: "Selecione um horario"
                        })}
                  </option>
                  {availableTrialSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatDateOnly({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })} ·{" "}
                      {formatDateTime({ isoDate: slot.startsAt, timezone: props.state.profile.timezone, language: props.language })}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="booking-confirm-row">
              <p>
                {t(props.language, {
                  es: "Confirmaras una sesion de prueba y quedara asignado ese profesional.",
                  en: "You will confirm a trial session and that professional will be assigned.",
                  pt: "Voce confirmara uma sessao de teste e esse profissional ficara atribuido."
                })}
              </p>
              <div className="button-row">
                {hasTrialPlanned ? (
                  <button
                    type="button"
                    onClick={() => {
                      props.onCancelTrialFromDashboard();
                      setTrialModalOpen(false);
                    }}
                  >
                    {t(props.language, { es: "Dar de baja", en: "Cancel trial", pt: "Cancelar sessao" })}
                  </button>
                ) : null}
                <button
                  className="primary"
                  type="button"
                  disabled={!selectedTrialSlot}
                  onClick={() => {
                    if (!selectedTrialSlot) {
                      return;
                    }
                    props.onPlanTrialFromDashboard(trialProfessionalId, selectedTrialSlot);
                    setTrialModalOpen(false);
                  }}
                >
                  {hasTrialPlanned
                    ? t(props.language, { es: "Guardar cambios", en: "Save changes", pt: "Salvar alteracoes" })
                    : t(props.language, { es: "Confirmar", en: "Confirm", pt: "Confirmar" })}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
