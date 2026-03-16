import { type SyntheticEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { professionalImageMap, professionalsCatalog } from "../data/professionalsCatalog";
import { apiRequest } from "../services/api";
import { SessionsCalendar } from "../../booking/components/SessionsCalendar";
import type {
  AvailabilitySlotsApiResponse,
  Booking,
  PackageId,
  PatientAppState,
  Professional,
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

function findProfessionalById(professionalId: string): Professional {
  return professionalsCatalog.find((item) => item.id === professionalId) ?? professionalsCatalog[0];
}

function findSlotIdForBooking(professionalId: string, startsAt: string, endsAt: string): string | null {
  return (
    findProfessionalById(professionalId).slots.find((slot) => slot.startsAt === startsAt && slot.endsAt === endsAt)?.id
    ?? null
  );
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(endA).getTime() > new Date(startB).getTime();
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

function formatTimeOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

export function BookingPage(props: {
  state: PatientAppState;
  sessionTimezone: string;
  language: AppLanguage;
  currency: SupportedCurrency;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onGoToChat: (professionalId: string) => void;
  onSelectProfessional: (professionalId: string) => void;
  onConfirmBooking: (professionalId: string, slot: TimeSlot, useTrialSession: boolean) => void;
  onCancelBooking: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string, professionalId: string, slot: TimeSlot) => void;
  onOpenBookingDetail: (bookingId: string) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [panelMode, setPanelMode] = useState<"new" | "reschedule" | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [remoteSlots, setRemoteSlots] = useState<TimeSlot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const reservationsFocusRef = useRef<HTMLDivElement | null>(null);

  const assignedProfessionalId = props.state.assignedProfessionalId;
  const canChangeProfessionalForNewPackage = !assignedProfessionalId || props.state.subscription.creditsRemaining <= 0;
  const effectiveProfessionalId = canChangeProfessionalForNewPackage
    ? props.state.selectedProfessionalId
    : assignedProfessionalId ?? props.state.selectedProfessionalId;
  const professional = findProfessionalById(effectiveProfessionalId);
  const now = Date.now();

  const upcomingRegularBookings = props.state.bookings
    .filter(
      (booking) =>
        booking.status === "confirmed" &&
        booking.bookingMode !== "trial" &&
        new Date(booking.startsAt).getTime() > now
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const historyRegularBookings = props.state.bookings
    .filter(
      (booking) =>
        booking.bookingMode !== "trial" &&
        (booking.status !== "confirmed" || new Date(booking.startsAt).getTime() <= now)
    )
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const editingBooking = editingBookingId
    ? upcomingRegularBookings.find((booking) => booking.id === editingBookingId) ?? null
    : null;
  const editableProfessional = editingBooking ? findProfessionalById(editingBooking.professionalId) : professional;
  const editingSlotId = editingBooking
    ? findSlotIdForBooking(editingBooking.professionalId, editingBooking.startsAt, editingBooking.endsAt)
    : null;
  const slotSource = remoteSlots ?? editableProfessional.slots;
  const availableSlots = slotSource.filter((slot) => {
    const localSlotIsFree = !props.state.bookedSlotIds.includes(slot.id) || slot.id === editingSlotId;
    const overlapsAnotherBooking = upcomingRegularBookings.some((booking) => {
      if (editingBooking && booking.id === editingBooking.id) {
        return false;
      }
      return rangesOverlap(slot.startsAt, slot.endsAt, booking.startsAt, booking.endsAt);
    });
    return localSlotIsFree && !overlapsAnotherBooking;
  });
  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId) ?? null;
  const pendingSessions = props.state.subscription.creditsRemaining;
  const canConfirmBooking = panelMode === "reschedule"
    ? Boolean(selectedSlot && editingBooking)
    : Boolean(selectedSlot) && pendingSessions > 0;
  const activePackageLabel = localizedPackageName(
    props.state.subscription.packageId,
    props.state.subscription.packageName,
    props.language
  );
  const dashboardConfirmedCount = props.state.bookings.filter((booking) => booking.status === "confirmed").length;
  const nextBooking = upcomingRegularBookings[0] ?? null;

  useEffect(() => {
    if (searchParams.get("focus") !== "reservations") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      reservationsFocusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      reservationsFocusRef.current?.focus();
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("focus");
    setSearchParams(nextParams, { replace: true });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (panelMode === "new") {
      setPanelMode(null);
      setSelectedSlotId("");
    }
  }, [professional.id]);

  useEffect(() => {
    if (!props.state.authToken) {
      setRemoteSlots(null);
      return;
    }

    const targetProfessionalId = panelMode === "reschedule" && editingBooking
      ? editingBooking.professionalId
      : professional.id;

    let active = true;
    setSlotsLoading(true);

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 45);

    void apiRequest<AvailabilitySlotsApiResponse>(
      `/api/availability/${targetProfessionalId}/slots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      {},
      props.state.authToken
    )
      .then((response) => {
        if (!active) {
          return;
        }
        setRemoteSlots(
          (response.slots ?? []).map((slot) => ({
            id: slot.id,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt
          }))
        );
      })
      .catch(() => {
        if (active) {
          setRemoteSlots(null);
        }
      })
      .finally(() => {
        if (active) {
          setSlotsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [editingBooking, panelMode, professional.id, props.state.authToken]);

  const handleBooking = async () => {
    if (!selectedSlot || !canConfirmBooking) {
      return;
    }

    if (panelMode === "reschedule" && editingBooking) {
      await props.onRescheduleBooking(editingBooking.id, editingBooking.professionalId, selectedSlot);
      setEditingBookingId(null);
      setPanelMode(null);
      setSelectedSlotId("");
      return;
    }

    await props.onConfirmBooking(professional.id, selectedSlot, false);
    setSelectedSlotId("");
    setPanelMode(null);
  };

  if (props.state.intake?.riskBlocked) {
    return (
      <section className="content-card danger">
        <h2>
          {t(props.language, {
            es: "Reserva deshabilitada por screening de seguridad",
            en: "Booking disabled by safety screening",
            pt: "Reserva desabilitada por triagem de seguranca"
          })}
        </h2>
        <p>
          {t(props.language, {
            es: "El cuestionario clínico detectó un posible riesgo urgente. Por seguridad, la agenda queda bloqueada hasta triaje manual.",
            en: "The clinical questionnaire detected possible urgent risk. For safety, booking stays blocked until manual triage.",
            pt: "O questionario clínico detectou possivel risco urgente. Por seguranca, a agenda fica bloqueada ate triagem manual."
          })}
        </p>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="content-card booking-session-card booking-card-minimal sessions-page-hero">
        <div className="sessions-page-hero-copy">
          <div className="sessions-hero-title-row">
            <span className="sessions-hero-icon" aria-hidden="true">◔</span>
            <div className="sessions-hero-title-stack">
              <span className="sessions-section-kicker">{t(props.language, { es: "Reservas", en: "Bookings", pt: "Reservas" })}</span>
              <h2>{t(props.language, { es: "Gestiona tus Reservas", en: "Manage your bookings", pt: "Gerencie suas reservas" })}</h2>
            </div>
          </div>
          <div className="sessions-hero-misc" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="sessions-page-hero-stats">
          <article className="sessions-stat-card">
            <span>{t(props.language, { es: "Confirmadas", en: "Confirmed", pt: "Confirmadas" })}</span>
            <strong>{dashboardConfirmedCount}</strong>
            <p className="sessions-stat-primary">
              {nextBooking
                ? replaceTemplate(
                    t(props.language, {
                      es: "Proxima: {date}",
                      en: "Next: {date}",
                      pt: "Proxima: {date}"
                    }),
                    {
                      date: formatDateTime({ isoDate: nextBooking.startsAt, timezone: props.state.profile.timezone, language: props.language })
                    }
                  )
                : t(props.language, { es: "Sin agenda activa", en: "No active schedule", pt: "Sem agenda ativa" })}
            </p>
          </article>
          <article className="sessions-stat-card">
            <span>{t(props.language, { es: "Disponibles", en: "Available", pt: "Disponiveis" })}</span>
            <strong>{pendingSessions}</strong>
            <p className="sessions-stat-primary">{activePackageLabel}</p>
          </article>
          <article className="sessions-stat-card sessions-stat-card-professional">
            <img
              className="sessions-stat-avatar"
              src={professionalImageMap[editableProfessional.id]}
              alt={editableProfessional.fullName}
              onError={props.onImageFallback}
            />
            <strong>{editableProfessional.fullName}</strong>
            <p>{editableProfessional.title}</p>
            <span className="sessions-stat-meta">
              {replaceTemplate(
                t(props.language, {
                  es: "{compat}% compatibilidad · {years} anos de experiencia",
                  en: "{compat}% match · {years} years of experience",
                  pt: "{compat}% compatibilidade · {years} anos de experiencia"
                }),
                {
                  compat: String(editableProfessional.compatibility),
                  years: String(editableProfessional.yearsExperience)
                }
              )}
            </span>
            <button
              className="chat-gradient-button sessions-stat-chat-button"
              type="button"
              onClick={() => props.onGoToChat(editableProfessional.id)}
            >
              {t(props.language, { es: "Abrir chat", en: "Open chat", pt: "Abrir chat" })}
            </button>
          </article>
        </div>
      </section>

      <section className="content-card booking-session-card booking-card-minimal sessions-confirmed-panel">
          <div className="sessions-panel-head">
            <div>
              <h2>{t(props.language, { es: "Reservas", en: "Bookings", pt: "Reservas" })}</h2>
            </div>
            <button
              className="primary"
              type="button"
              onClick={() => {
                setEditingBookingId(null);
                setSelectedSlotId("");
                setPanelMode((current) => current === "new" ? null : "new");
              }}
            >
              {panelMode === "new"
                ? t(props.language, { es: "Cerrar panel", en: "Close panel", pt: "Fechar painel" })
                : t(props.language, { es: "Reservar nueva sesion", en: "Reserve new session", pt: "Reservar nova sessao" })}
            </button>
          </div>

          {upcomingRegularBookings.length === 0 ? (
            <div className="sessions-empty-state">
              <strong>{t(props.language, { es: "Todavia no tienes sesiones confirmadas", en: "You have no confirmed sessions yet", pt: "Voce ainda nao tem sessoes confirmadas" })}</strong>
              <p>
                {t(props.language, {
                  es: "Te recomiendo usar una de tus sesiones disponibles para reservar la proxima cita y mantener continuidad.",
                  en: "I recommend using one available session to book your next appointment and keep continuity.",
                  pt: "Eu recomendo usar uma sessao disponivel para reservar o proximo atendimento e manter continuidade."
                })}
              </p>
            </div>
          ) : (
            <div
              className="sessions-confirmed-list"
              ref={reservationsFocusRef}
              tabIndex={-1}
            >
              <div className="sessions-reservations-table-head" aria-hidden="true">
                <span>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
                <span>{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
                <span>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
                <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
                <span>{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
              </div>
              {upcomingRegularBookings.map((booking) => {
                const bookingProfessional = findProfessionalById(booking.professionalId);
                const isEditing = editingBookingId === booking.id && panelMode === "reschedule";

                return (
                  <article className={`session-management-card ${isEditing ? "editing" : ""}`} key={booking.id}>
                    <div className="session-management-main">
                      <div className="session-management-cell session-management-cell-date">
                        <span className="session-management-cell-label">{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
                        <strong>{formatDateOnly({ isoDate: booking.startsAt, timezone: props.state.profile.timezone, language: props.language })}</strong>
                      </div>
                      <div className="session-management-cell session-management-cell-time">
                        <span className="session-management-cell-label">{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
                        <span>{formatTimeOnly({ isoDate: booking.startsAt, timezone: props.state.profile.timezone, language: props.language })}</span>
                      </div>
                      <div className="session-management-cell session-management-meta">
                        <span className="session-management-cell-label">{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
                        <strong>{bookingProfessional.fullName}</strong>
                      </div>
                      <div className="session-management-cell session-management-cell-status">
                        <span className="session-management-cell-label">{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
                        <span className="session-status-pill confirmed">
                          {t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" })}
                        </span>
                      </div>
                    </div>
                    <div className="session-management-actions-wrap">
                      <span className="session-management-cell-label">{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
                      <div className="session-management-actions">
                        <button
                          type="button"
                          className="icon-only"
                          aria-label={t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
                          onClick={() => {
                            setEditingBookingId(booking.id);
                            setSelectedSlotId(findSlotIdForBooking(booking.professionalId, booking.startsAt, booking.endsAt) ?? "");
                            setPanelMode("reschedule");
                          }}
                        >
                          <span className="session-action-icon reschedule" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="danger icon-only"
                          aria-label={t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                          onClick={() => props.onCancelBooking(booking.id)}
                        >
                          <span className="session-action-icon cancel" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </section>

      <SessionsCalendar
        bookings={upcomingRegularBookings}
        timezone={props.state.profile.timezone}
        language={props.language}
        onOpenBookingDetail={props.onOpenBookingDetail}
      />

      {panelMode ? (
        <div
          className="session-modal-backdrop"
          role="presentation"
          onClick={() => {
            setPanelMode(null);
            setEditingBookingId(null);
            setSelectedSlotId("");
          }}
        >
          <section
            className="session-modal session-booking-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="session-modal-header">
              <div>
                <h2>
                  {panelMode === "reschedule"
                    ? t(props.language, { es: "Reprogramar sesion", en: "Reschedule session", pt: "Reagendar sessao" })
                    : t(props.language, { es: "Reservar nueva sesion", en: "Reserve new session", pt: "Reservar nova sessao" })}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPanelMode(null);
                  setEditingBookingId(null);
                  setSelectedSlotId("");
                }}
              >
                {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
              </button>
            </header>

            <div className="session-booking-flow">
              {panelMode === "reschedule" || !canChangeProfessionalForNewPackage ? (
                <div className="session-booking-professional">
                  <span>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
                  <strong>{editableProfessional.fullName}</strong>
                  <small>{editableProfessional.title}</small>
                </div>
              ) : (
                <label className="session-booking-field">
                  <span>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
                  <select
                    value={professional.id}
                    onChange={(event) => {
                      props.onSelectProfessional(event.target.value);
                      setSelectedSlotId("");
                    }}
                  >
                    {professionalsCatalog.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.fullName} - {item.compatibility}%
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="session-booking-field availability">
                <span>{t(props.language, { es: "Disponibilidad del profesional", en: "Professional availability", pt: "Disponibilidade do profissional" })}</span>
                <select value={selectedSlotId} onChange={(event) => setSelectedSlotId(event.target.value)}>
                  <option value="">
                    {slotsLoading
                      ? t(props.language, { es: "Cargando disponibilidad...", en: "Loading availability...", pt: "Carregando disponibilidade..." })
                      : availableSlots.length === 0
                      ? t(props.language, { es: "Sin horarios publicados por ahora", en: "No published times right now", pt: "Sem horarios publicados por enquanto" })
                      : t(props.language, { es: "Selecciona dia y horario", en: "Select day and time", pt: "Selecione dia e horario" })}
                  </option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatDateOnly({ isoDate: slot.startsAt, timezone: props.sessionTimezone, language: props.language })} · {formatDateTime({ isoDate: slot.startsAt, timezone: props.sessionTimezone, language: props.language })}
                    </option>
                  ))}
                </select>
              </label>

              <div className="session-booking-package">
                <span>{t(props.language, { es: "Paquete activo", en: "Active package", pt: "Pacote ativo" })}</span>
                <strong>{activePackageLabel}</strong>
                <small>
                  {replaceTemplate(
                    t(props.language, {
                      es: "{count} sesiones disponibles",
                      en: "{count} available sessions",
                      pt: "{count} sessoes disponiveis"
                    }),
                    { count: String(pendingSessions) }
                  )}
                </small>
              </div>
            </div>

            <section className="session-modal-footer">
              <p>
                {panelMode === "reschedule"
                  ? t(props.language, { es: "La reserva actual se actualizara con el nuevo horario y seguira apareciendo en Reservas.", en: "Your current booking will be updated with the new time and will remain under Bookings.", pt: "Sua reserva atual sera atualizada com o novo horario e seguira em Reservas." })
                  : t(props.language, { es: "Cuando guardes, la nueva reserva aparecera arriba en Reservas con fecha, hora y profesional.", en: "Once saved, the new booking will appear above in Bookings with date, time, and professional.", pt: "Quando salvar, a nova reserva aparecera acima em Reservas com data, horario e profissional." })}
              </p>
              <div className="button-row">
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode(null);
                    setEditingBookingId(null);
                    setSelectedSlotId("");
                  }}
                >
                  {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                </button>
                <button className="primary" disabled={!canConfirmBooking} type="button" onClick={handleBooking}>
                  {panelMode === "reschedule"
                    ? t(props.language, { es: "Guardar cambio", en: "Save change", pt: "Salvar alteracao" })
                    : t(props.language, { es: "Guardar reserva", en: "Save booking", pt: "Salvar reserva" })}
                </button>
              </div>
            </section>
          </section>
        </div>
      ) : null}

      <section className="content-card booking-session-card booking-card-minimal">
        <h2>{t(props.language, { es: "Historial de sesiones", en: "Session history", pt: "Historico de sessoes" })}</h2>
        {historyRegularBookings.length === 0 ? (
          <p>
            {t(props.language, {
              es: "Todavia no tienes historial de sesiones.",
              en: "You do not have session history yet.",
              pt: "Voce ainda nao tem historico de sessoes."
            })}
          </p>
        ) : (
          <ul className="simple-list session-history-list">
            {historyRegularBookings.slice(0, 10).map((booking) => {
              const bookingProfessional = findProfessionalById(booking.professionalId);
              const statusLabel =
                booking.status === "cancelled"
                  ? t(props.language, { es: "Cancelada", en: "Cancelled", pt: "Cancelada" })
                  : t(props.language, { es: "Completada", en: "Completed", pt: "Concluida" });
              return (
                <li key={booking.id}>
                  <div>
                    <strong>{formatDateTime({ isoDate: booking.startsAt, timezone: props.state.profile.timezone, language: props.language })}</strong>
                    <span>{bookingProfessional.fullName}</span>
                  </div>
                  <span className={`session-status-pill ${booking.status}`}>{statusLabel}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
