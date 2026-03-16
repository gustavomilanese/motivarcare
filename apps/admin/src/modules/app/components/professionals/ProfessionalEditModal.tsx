import type { Dispatch, SetStateAction } from "react";
import type { AdminBookingOps, AdminProfessionalOps } from "../../types";

export interface ProfessionalSlotDraft {
  startsAt: string;
  endsAt: string;
}

export interface ProfessionalBookingDraft {
  status: AdminBookingOps["status"];
  startsAt: string;
  endsAt: string;
  professionalId: string;
}

export interface ProfessionalEditDraft {
  fullName: string;
  email: string;
  visible: boolean;
  cancellationHours: string;
  bio: string;
  therapeuticApproach: string;
  yearsExperience: string;
  photoUrl: string;
  videoUrl: string;
}

export function ProfessionalEditModal(props: {
  open: boolean;
  selectedProfessional: AdminProfessionalOps | null;
  selectedProfessionalDraft?: ProfessionalEditDraft;
  showConfirmedSessions: boolean;
  loadingSelectedBookings: boolean;
  professionalSaveLoading: boolean;
  selectedBookings: AdminBookingOps[];
  expandedConfirmedBookingId: string | null;
  professionalSlotDrafts: Record<string, ProfessionalSlotDraft>;
  professionalBookingDrafts: Record<string, ProfessionalBookingDraft>;
  professionals: AdminProfessionalOps[];
  setProfessionalEditDrafts: Dispatch<SetStateAction<Record<string, ProfessionalEditDraft>>>;
  setProfessionalSlotDrafts: Dispatch<SetStateAction<Record<string, ProfessionalSlotDraft>>>;
  setProfessionalBookingDrafts: Dispatch<SetStateAction<Record<string, ProfessionalBookingDraft>>>;
  setExpandedConfirmedBookingId: Dispatch<SetStateAction<string | null>>;
  formatDate: (value: string) => string;
  isoToInputDateTime: (value: string) => string;
  onClose: () => void;
  onSaveProfessional: () => void;
  onToggleConfirmedSessions: () => void;
  onCreateSlot: () => void;
  onDeleteSlot: (slotId: string) => void;
  onSaveBooking: (bookingId: string) => void;
}) {
  if (!props.open || !props.selectedProfessional || !props.selectedProfessionalDraft) {
    return null;
  }

  const selectedProfessional = props.selectedProfessional;
  const selectedProfessionalDraft = props.selectedProfessionalDraft;

  return (
    <div className="patient-modal-backdrop" onClick={props.onClose}>
      <div className="patient-modal" onClick={(event) => event.stopPropagation()}>
        <div className="patient-modal-head">
          <h3>{selectedProfessional.fullName}</h3>
          <button type="button" onClick={props.onClose}>Cerrar</button>
        </div>

        <div className="grid-form">
          <label>
            Nombre completo
            <input
              value={selectedProfessionalDraft.fullName}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, fullName: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Email
            <input
              type="email"
              autoComplete="off"
              value={selectedProfessionalDraft.email}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, email: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Perfil visible
            <select
              value={selectedProfessionalDraft.visible ? "true" : "false"}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: {
                    ...selectedProfessionalDraft,
                    visible: event.target.value === "true"
                  }
                }))
              }
            >
              <option value="true">Visible</option>
              <option value="false">Oculto</option>
            </select>
          </label>

          <label>
            Horas de cancelacion
            <input
              type="number"
              min={0}
              max={168}
              value={selectedProfessionalDraft.cancellationHours}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, cancellationHours: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Anos de experiencia
            <input
              type="number"
              min={0}
              max={80}
              value={selectedProfessionalDraft.yearsExperience}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, yearsExperience: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Enfoque terapeutico
            <input
              value={selectedProfessionalDraft.therapeuticApproach}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, therapeuticApproach: event.target.value }
                }))
              }
            />
          </label>

          <label>
            URL foto
            <input
              value={selectedProfessionalDraft.photoUrl}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, photoUrl: event.target.value }
                }))
              }
            />
          </label>

          <label>
            URL video
            <input
              value={selectedProfessionalDraft.videoUrl}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, videoUrl: event.target.value }
                }))
              }
            />
          </label>
        </div>

        <label>
          Bio
          <textarea
            rows={3}
            value={selectedProfessionalDraft.bio}
            onChange={(event) =>
              props.setProfessionalEditDrafts((current) => ({
                ...current,
                [selectedProfessional.id]: { ...selectedProfessionalDraft, bio: event.target.value }
              }))
            }
          />
        </label>

        <section className="card stack">
          <h4>Disponibilidad</h4>
          <div className="grid-form">
            <label>
              Slot inicio
              <input
                type="datetime-local"
                value={props.professionalSlotDrafts[selectedProfessional.id]?.startsAt ?? ""}
                onChange={(event) =>
                  props.setProfessionalSlotDrafts((current) => ({
                    ...current,
                    [selectedProfessional.id]: {
                      startsAt: event.target.value,
                      endsAt: current[selectedProfessional.id]?.endsAt ?? ""
                    }
                  }))
                }
              />
            </label>
            <label>
              Slot fin
              <input
                type="datetime-local"
                value={props.professionalSlotDrafts[selectedProfessional.id]?.endsAt ?? ""}
                onChange={(event) =>
                  props.setProfessionalSlotDrafts((current) => ({
                    ...current,
                    [selectedProfessional.id]: {
                      startsAt: current[selectedProfessional.id]?.startsAt ?? "",
                      endsAt: event.target.value
                    }
                  }))
                }
              />
            </label>
          </div>
          <div className="button-row ops-actions">
            <button type="button" onClick={props.onCreateSlot}>Crear slot</button>
          </div>
          <div className="stack">
            {selectedProfessional.slots.slice(0, 20).map((slot) => (
              <div key={slot.id} className="toolbar ops-slot-row">
                <p>{props.formatDate(slot.startsAt)} - {props.formatDate(slot.endsAt)}</p>
                <button type="button" onClick={() => props.onDeleteSlot(slot.id)}>Eliminar</button>
              </div>
            ))}
          </div>
        </section>

        <div className="button-row ops-actions">
          <button
            className="primary"
            type="button"
            disabled={props.professionalSaveLoading}
            onClick={props.onSaveProfessional}
          >
            {props.professionalSaveLoading ? "Guardando..." : "Guardar profesional"}
          </button>
          <button type="button" onClick={props.onToggleConfirmedSessions}>
            {props.showConfirmedSessions ? "Ocultar sesiones confirmadas" : "Ver sesiones confirmadas"}
          </button>
        </div>

        {props.showConfirmedSessions ? (
          <>
            {props.loadingSelectedBookings ? <p>Cargando sesiones confirmadas...</p> : null}
            {!props.loadingSelectedBookings && props.selectedBookings.length === 0 ? <p>No hay sesiones confirmadas para este psicologo.</p> : null}

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
                    <h4>{booking.patientName} · {props.formatDate(booking.startsAt)}</h4>
                    <button
                      type="button"
                      onClick={() =>
                        props.setExpandedConfirmedBookingId((current) => (current === booking.id ? null : booking.id))
                      }
                    >
                      {isExpanded ? "Contraer" : "Expandir"}
                    </button>
                  </div>

                  {isExpanded ? (
                    <>
                      <div className="grid-form">
                        <label>
                          Estado
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
                          Slot del profesional
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
                            <option value={draftSlotValue}>Personalizado</option>
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
                          Inicio
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
                          Fin
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
                          Guardar sesion
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
