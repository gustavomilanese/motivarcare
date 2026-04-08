import type { Dispatch, SetStateAction } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { ProfessionalPhotoUrlField } from "../shared/ProfessionalPhotoUrlField";
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
  fullName: string;
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
  const totalMinutes = (6 * 60) + (index * 30);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});

export function ProfessionalEditModal(props: {
  open: boolean;
  language: AppLanguage;
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
  const slotDraft = props.professionalSlotDrafts[selectedProfessional.id] ?? {
    slotDate: "",
    slotTime: "09:00"
  };
  const sortedSlots = [...selectedProfessional.slots]
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .slice(0, 80);

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
            Horas de cancelación
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
            Años de experiencia
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
            Pais origen
            <input
              value={selectedProfessionalDraft.birthCountry}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, birthCountry: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Valor sesión (USD)
            <input
              type="number"
              min={0}
              max={100000}
              value={selectedProfessionalDraft.sessionPriceUsd}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, sessionPriceUsd: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Ranking (0 a 5)
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={selectedProfessionalDraft.ratingAverage}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, ratingAverage: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Opiniones
            <input
              type="number"
              min={0}
              max={100000}
              value={selectedProfessionalDraft.reviewsCount}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, reviewsCount: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Duración sesión (min)
            <input
              type="number"
              min={15}
              max={120}
              value={selectedProfessionalDraft.sessionDurationMinutes}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, sessionDurationMinutes: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Pacientes activos (card)
            <input
              type="number"
              min={0}
              max={100000}
              value={selectedProfessionalDraft.activePatientsCount}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, activePatientsCount: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Sesiones (card)
            <input
              type="number"
              min={0}
              max={1000000}
              value={selectedProfessionalDraft.sessionsCount}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, sessionsCount: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Sesiones completadas (card)
            <input
              type="number"
              min={0}
              max={1000000}
              value={selectedProfessionalDraft.completedSessionsCount}
              onChange={(event) =>
                props.setProfessionalEditDrafts((current) => ({
                  ...current,
                  [selectedProfessional.id]: { ...selectedProfessionalDraft, completedSessionsCount: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Enfoque terapéutico
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

          <ProfessionalPhotoUrlField
            language={props.language}
            disabled={props.professionalSaveLoading}
            value={selectedProfessionalDraft.photoUrl}
            onChange={(next) =>
              props.setProfessionalEditDrafts((current) => ({
                ...current,
                [selectedProfessional.id]: { ...selectedProfessionalDraft, photoUrl: next }
              }))
            }
          />

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

        <section className="card stack ops-slot-card">
          <h4>Disponibilidad</h4>
          <div className="ops-slot-create-grid">
            <label>
              Dia
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
              Hora
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
            <button className="primary" type="button" onClick={props.onCreateSlot}>Agregar slot</button>
          </div>
          <div className="ops-slot-list">
            {sortedSlots.length === 0 ? <p>No hay slots cargados.</p> : null}
            {sortedSlots.length > 0 ? (
              <div className="ops-slot-table-wrap">
                <table className="ops-slot-table">
                  <thead>
                    <tr>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Estado</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSlots.map((slot) => (
                      <tr key={slot.id}>
                        <td>{props.formatDate(slot.startsAt)}</td>
                        <td>{props.formatDate(slot.endsAt)}</td>
                        <td>{slot.isBlocked ? "No disponible / bloqueado" : "Disponible"}</td>
                        <td>
                          <button type="button" onClick={() => props.onDeleteSlot(slot.id)}>Eliminar</button>
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
          <button
            className="primary"
            type="button"
            disabled={props.professionalSaveLoading}
            onClick={props.onSaveProfessional}
          >
            {props.professionalSaveLoading ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" onClick={props.onToggleConfirmedSessions}>
            {props.showConfirmedSessions ? "Ocultar sesiones confirmadas" : "Ver sesiones confirmadas"}
          </button>
        </div>

        {props.showConfirmedSessions ? (
          <>
            {props.loadingSelectedBookings ? <p>Cargando sesiones confirmadas...</p> : null}
            {!props.loadingSelectedBookings && props.selectedBookings.length === 0 ? <p>No hay sesiones confirmadas para este psicólogo.</p> : null}

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
                          Guardar sesión
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
