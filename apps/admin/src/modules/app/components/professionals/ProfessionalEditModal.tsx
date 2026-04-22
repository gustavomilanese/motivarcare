import type { Dispatch, SetStateAction } from "react";
import type { AdminBookingOps, AdminProfessionalOps } from "../../types";

export interface ProfessionalSlotDraft {
  slotDate: string;
  slotTime: string;
}

export interface ProfessionalBookingDraft {
  status: AdminBookingOps["status"];
  startsAt: string;
  endsAt: string;
  professionalId: string;
}

export interface ProfessionalEditDraft {
  firstName: string;
  lastName: string;
  email: string;
  visible: boolean;
  cancellationHours: string;
  bio: string;
  therapeuticApproach: string;
  yearsExperience: string;
  birthCountry: string;
  sessionPriceUsd: string;
  ratingAverage: string;
  reviewsCount: string;
  sessionDurationMinutes: string;
  activePatientsCount: string;
  sessionsCount: string;
  completedSessionsCount: string;
  photoUrl: string;
  videoUrl: string;
}

const SLOT_TIME_OPTIONS = Array.from({ length: 34 }, (_, index) => {
  const totalMinutes = 6 * 60 + index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});

export function ProfessionalEditModal(props: {
  open: boolean;
  selectedProfessional: AdminProfessionalOps | null;
  showConfirmedSessions: boolean;
  loadingSelectedBookings: boolean;
  selectedBookings: AdminBookingOps[];
  expandedConfirmedBookingId: string | null;
  professionalSlotDrafts: Record<string, ProfessionalSlotDraft>;
  professionalBookingDrafts: Record<string, ProfessionalBookingDraft>;
  professionals: AdminProfessionalOps[];
  setProfessionalSlotDrafts: Dispatch<SetStateAction<Record<string, ProfessionalSlotDraft>>>;
  setProfessionalBookingDrafts: Dispatch<SetStateAction<Record<string, ProfessionalBookingDraft>>>;
  setExpandedConfirmedBookingId: Dispatch<SetStateAction<string | null>>;
  formatDate: (value: string) => string;
  isoToInputDateTime: (value: string) => string;
  onClose: () => void;
  onToggleConfirmedSessions: () => void;
  onCreateSlot: () => void;
  onDeleteSlot: (slotId: string) => void;
  onSaveBooking: (bookingId: string) => void;
  /** Textos del modal (horarios / perfil se editan en el panel principal). */
  t: (values: { es: string; en: string; pt: string }) => string;
}) {
  if (!props.open || !props.selectedProfessional) {
    return null;
  }

  const selectedProfessional = props.selectedProfessional;
  const slotDraft = props.professionalSlotDrafts[selectedProfessional.id] ?? {
    slotDate: "",
    slotTime: "09:00"
  };
  const sortedSlots = [...selectedProfessional.slots]
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .slice(0, 80);

  return (
    <div className="patient-modal-backdrop" onClick={props.onClose}>
      <div className="patient-modal prof-ops-schedule-modal" onClick={(event) => event.stopPropagation()}>
        <div className="patient-modal-head">
          <h3>{selectedProfessional.fullName}</h3>
          <button type="button" onClick={props.onClose}>
            {props.t({ es: "Cerrar", en: "Close", pt: "Fechar" })}
          </button>
        </div>

        <p className="prof-ops-modal-lead muted">
          {props.t({
            es: "Nombre, bio y medios se editan en el panel principal (tres secciones). Acá solo turnos disponibles y sesiones confirmadas.",
            en: "Name, bio, and media are edited in the main panel (three sections). Here: availability slots and confirmed sessions only.",
            pt: "Nome, bio e midia no painel principal (tres secoes). Aqui: horarios e sessoes confirmadas."
          })}
        </p>

        <section className="card stack ops-slot-card">
          <h4>{props.t({ es: "Disponibilidad", en: "Availability", pt: "Disponibilidade" })}</h4>
          <div className="ops-slot-create-grid">
            <label>
              {props.t({ es: "Día", en: "Day", pt: "Dia" })}
              <input
                type="date"
                value={slotDraft.slotDate}
                onChange={(event) =>
                  props.setProfessionalSlotDrafts((current) => ({
                    ...current,
                    [selectedProfessional.id]: {
                      ...slotDraft,
                      slotDate: event.target.value
                    }
                  }))
                }
              />
            </label>
            <label>
              {props.t({ es: "Hora", en: "Time", pt: "Hora" })}
              <select
                value={slotDraft.slotTime}
                onChange={(event) =>
                  props.setProfessionalSlotDrafts((current) => ({
                    ...current,
                    [selectedProfessional.id]: {
                      ...slotDraft,
                      slotTime: event.target.value
                    }
                  }))
                }
              >
                {SLOT_TIME_OPTIONS.map((timeOption) => (
                  <option key={timeOption} value={timeOption}>
                    {timeOption}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="button-row ops-actions">
            <button className="primary" type="button" onClick={props.onCreateSlot}>
              {props.t({ es: "Agregar slot", en: "Add slot", pt: "Adicionar horario" })}
            </button>
          </div>
          <div className="ops-slot-list">
            {sortedSlots.length === 0 ? (
              <p>{props.t({ es: "No hay slots cargados.", en: "No slots yet.", pt: "Sem horarios." })}</p>
            ) : null}
            {sortedSlots.length > 0 ? (
              <div className="ops-slot-table-wrap">
                <table className="ops-slot-table">
                  <thead>
                    <tr>
                      <th>{props.t({ es: "Inicio", en: "Start", pt: "Inicio" })}</th>
                      <th>{props.t({ es: "Fin", en: "End", pt: "Fim" })}</th>
                      <th>{props.t({ es: "Estado", en: "Status", pt: "Estado" })}</th>
                      <th aria-label={props.t({ es: "Acciones", en: "Actions", pt: "Acoes" })} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSlots.map((slot) => (
                      <tr key={slot.id}>
                        <td>{props.formatDate(slot.startsAt)}</td>
                        <td>{props.formatDate(slot.endsAt)}</td>
                        <td>
                          {slot.isBlocked
                            ? props.t({ es: "Bloqueado", en: "Blocked", pt: "Bloqueado" })
                            : props.t({ es: "Disponible", en: "Available", pt: "Disponivel" })}
                        </td>
                        <td>
                          <button type="button" onClick={() => props.onDeleteSlot(slot.id)}>
                            {props.t({ es: "Eliminar", en: "Delete", pt: "Excluir" })}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>

        <div className="button-row ops-actions">
          <button type="button" onClick={props.onToggleConfirmedSessions}>
            {props.showConfirmedSessions
              ? props.t({ es: "Ocultar sesiones confirmadas", en: "Hide confirmed sessions", pt: "Ocultar sessoes" })
              : props.t({ es: "Ver sesiones confirmadas", en: "View confirmed sessions", pt: "Ver sessoes confirmadas" })}
          </button>
        </div>

        {props.showConfirmedSessions ? (
          <>
            {props.loadingSelectedBookings ? (
              <p>{props.t({ es: "Cargando sesiones…", en: "Loading sessions…", pt: "Carregando…" })}</p>
            ) : null}
            {!props.loadingSelectedBookings && props.selectedBookings.length === 0 ? (
              <p>
                {props.t({
                  es: "No hay sesiones confirmadas para este psicólogo.",
                  en: "No confirmed sessions for this professional.",
                  pt: "Nao ha sessoes confirmadas."
                })}
              </p>
            ) : null}

            {props.selectedBookings.map((booking) => {
              const draft = props.professionalBookingDrafts[booking.id];
              if (!draft) {
                return null;
              }

              const isExpanded = props.expandedConfirmedBookingId === booking.id;
              const draftProfessional = props.professionals.find((item) => item.id === draft.professionalId) ?? null;
              const draftSlotValue = draft.startsAt + "__" + draft.endsAt;

              return (
                <section key={booking.id} className="card stack">
                  <div className="patient-inline-head">
                    <h4>
                      {booking.patientName} · {props.formatDate(booking.startsAt)}
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        props.setExpandedConfirmedBookingId((current) => (current === booking.id ? null : booking.id))
                      }
                    >
                      {isExpanded
                        ? props.t({ es: "Contraer", en: "Collapse", pt: "Fechar" })
                        : props.t({ es: "Expandir", en: "Expand", pt: "Expandir" })}
                    </button>
                  </div>

                  {isExpanded ? (
                    <>
                      <div className="grid-form">
                        <label>
                          {props.t({ es: "Estado", en: "Status", pt: "Estado" })}
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              props.setProfessionalBookingDrafts((current) => ({
                                ...current,
                                [booking.id]: {
                                  ...current[booking.id],
                                  status: event.target.value as AdminBookingOps["status"]
                                }
                              }))
                            }
                          >
                            <option value="REQUESTED">REQUESTED</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="NO_SHOW">NO_SHOW</option>
                          </select>
                        </label>

                        <label>
                          {props.t({ es: "Slot del profesional", en: "Professional slot", pt: "Horario do profissional" })}
                          <select
                            value={draftSlotValue}
                            onChange={(event) => {
                              const [slotStartsAt, slotEndsAt] = event.target.value.split("__");
                              if (!slotStartsAt || !slotEndsAt) {
                                return;
                              }
                              props.setProfessionalBookingDrafts((current) => ({
                                ...current,
                                [booking.id]: {
                                  ...current[booking.id],
                                  startsAt: slotStartsAt,
                                  endsAt: slotEndsAt
                                }
                              }));
                            }}
                          >
                            <option value={draftSlotValue}>
                              {props.t({ es: "Personalizado", en: "Custom", pt: "Personalizado" })}
                            </option>
                            {(draftProfessional?.slots ?? []).map((slot) => (
                              <option
                                key={slot.id}
                                value={props.isoToInputDateTime(slot.startsAt) + "__" + props.isoToInputDateTime(slot.endsAt)}
                              >
                                {props.formatDate(slot.startsAt)} - {props.formatDate(slot.endsAt)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          {props.t({ es: "Inicio", en: "Start", pt: "Inicio" })}
                          <input
                            type="datetime-local"
                            value={draft.startsAt}
                            onChange={(event) =>
                              props.setProfessionalBookingDrafts((current) => ({
                                ...current,
                                [booking.id]: { ...current[booking.id], startsAt: event.target.value }
                              }))
                            }
                          />
                        </label>
                        <label>
                          {props.t({ es: "Fin", en: "End", pt: "Fim" })}
                          <input
                            type="datetime-local"
                            value={draft.endsAt}
                            onChange={(event) =>
                              props.setProfessionalBookingDrafts((current) => ({
                                ...current,
                                [booking.id]: { ...current[booking.id], endsAt: event.target.value }
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="button-row ops-actions">
                        <button className="primary" type="button" onClick={() => props.onSaveBooking(booking.id)}>
                          {props.t({ es: "Guardar sesión", en: "Save session", pt: "Salvar sessao" })}
                        </button>
                      </div>
                    </>
                  ) : null}
                </section>
              );
            })}
          </>
        ) : null}
      </div>
    </div>
  );
}
