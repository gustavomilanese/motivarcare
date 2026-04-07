import type { AppLanguage } from "@therapy/i18n-config";
import { type Dispatch, type SetStateAction, useState } from "react";
import { ProfessionalPhotoUrlField } from "../shared/ProfessionalPhotoUrlField";
import { PatientOpsAvatar } from "./PatientsOpsSections";
import { ADMIN_TRIAL_BOOKING_CANCEL_PHRASE, SESSION_REASON_OPTIONS, TIMEZONE_OPTIONS } from "../../constants";
import type {
  AdminBookingOps,
  AdminPatientOps,
  AdminProfessionalOps,
  PatientStatus
} from "../../types";

function formatIntakeQuestionLabel(rawKey: string): string {
  const normalized = rawKey
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  if (!normalized) {
    return "Pregunta";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export interface CreatePatientFormState {
  fullName: string;
  email: string;
  password: string;
  timezone: string;
  patientStatus: PatientStatus;
}

export interface PatientDetailDraft {
  fullName: string;
  email: string;
  password: string;
  timezone: string;
  status: PatientStatus;
  remainingCredits: string;
  activeProfessionalId: string;
  avatarUrl: string;
}

export interface BookingDraft {
  status: AdminBookingOps["status"];
  startsAt: string;
  endsAt: string;
  professionalId: string;
}

export function CreatePatientModal(props: {
  open: boolean;
  createPatientForm: CreatePatientFormState;
  createPatientError: string;
  createPatientLoading: boolean;
  setCreatePatientForm: Dispatch<SetStateAction<CreatePatientFormState>>;
  patientStatusLabel: (status: PatientStatus | string) => string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="patient-modal-backdrop" onClick={props.onClose}>
      <div className="patient-modal patient-create-modal" onClick={(event) => event.stopPropagation()}>
        <div className="patient-modal-head">
          <h3>Nuevo paciente</h3>
          <button type="button" onClick={props.onClose}>Cerrar</button>
        </div>

        <div className="grid-form">
          <label>
            Nombre completo
            <input
              value={props.createPatientForm.fullName}
              onChange={(event) => props.setCreatePatientForm((current) => ({ ...current, fullName: event.target.value }))}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              autoComplete="off"
              value={props.createPatientForm.email}
              onChange={(event) => props.setCreatePatientForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label>
            Contrasena
            <input
              type="password"
              autoComplete="new-password"
              value={props.createPatientForm.password}
              onChange={(event) => props.setCreatePatientForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>

          <label>
            Zona horaria
            <select
              value={props.createPatientForm.timezone}
              onChange={(event) => props.setCreatePatientForm((current) => ({ ...current, timezone: event.target.value }))}
            >
              <option value="">Pendiente</option>
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            Estado paciente
            <select
              value={props.createPatientForm.patientStatus}
              onChange={(event) => props.setCreatePatientForm((current) => ({ ...current, patientStatus: event.target.value as PatientStatus }))}
            >
              <option value="active">{props.patientStatusLabel("active")}</option>
              <option value="pause">{props.patientStatusLabel("pause")}</option>
              <option value="cancelled">{props.patientStatusLabel("cancelled")}</option>
              <option value="trial">{props.patientStatusLabel("trial")}</option>
            </select>
          </label>
        </div>

        {props.createPatientError ? <p className="error-text">{props.createPatientError}</p> : null}

        <div className="button-row">
          <button className="primary" type="button" onClick={props.onSubmit} disabled={props.createPatientLoading}>
            {props.createPatientLoading ? "Creando..." : "Crear paciente"}
          </button>
          <button type="button" onClick={props.onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export function PatientEditModal(props: {
  open: boolean;
  language: AppLanguage;
  editingPatient: AdminPatientOps | null;
  editingPatientDraft?: PatientDetailDraft;
  editingBookings: AdminBookingOps[];
  bookingDrafts: Record<string, BookingDraft>;
  professionals: AdminProfessionalOps[];
  loadingEditingBookings: boolean;
  confirmedSessionsCount: number;
  sessionReasonDrafts: Record<string, string>;
  sessionOpsLoading: boolean;
  patientSaveLoading: boolean;
  triagePending: boolean;
  triageActionLoading: boolean;
  setPatientDetailDrafts: Dispatch<SetStateAction<Record<string, PatientDetailDraft>>>;
  setBookingDrafts: Dispatch<SetStateAction<Record<string, BookingDraft>>>;
  setSessionReasonDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  patientStatusLabel: (status: PatientStatus | string) => string;
  formatDate: (value: string) => string;
  isoToInputDateTime: (value: string) => string;
  onClose: () => void;
  onSavePatient: () => void;
  onSaveBooking: (bookingId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onForceCancelTrialBooking: (bookingId: string, confirmationPhrase: string) => void;
  onReactivateBooking: (bookingId: string) => void;
  onApproveTriage: () => void;
  onRejectTriage: () => void;
}) {
  const [trialCancelPhraseByBookingId, setTrialCancelPhraseByBookingId] = useState<Record<string, string>>({});

  if (!props.open || !props.editingPatient || !props.editingPatientDraft) {
    return null;
  }

  const editingPatient = props.editingPatient;
  const editingPatientDraft = props.editingPatientDraft;
  const intakeEntries = Object.entries(editingPatient.intakeAnswers ?? {});

  return (
    <div className="patient-modal-backdrop" onClick={props.onClose}>
      <div className="patient-modal" onClick={(event) => event.stopPropagation()}>
        <div className="patient-modal-head">
          <div className="patient-modal-head-main">
            <PatientOpsAvatar
              url={(editingPatientDraft.avatarUrl ?? "").trim() || editingPatient.avatarUrl}
              label={editingPatient.fullName}
              size="lg"
            />
            <h3>{editingPatient.fullName}</h3>
          </div>
          <button type="button" onClick={props.onClose}>Cerrar</button>
        </div>

        <div className="grid-form">
          <label>
            Nombre completo
            <input
              value={editingPatientDraft.fullName}
              onChange={(event) =>
                props.setPatientDetailDrafts((current) => ({
                  ...current,
                  [editingPatient.id]: { ...editingPatientDraft, fullName: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Email
            <input
              type="email"
              autoComplete="off"
              value={editingPatientDraft.email}
              onChange={(event) =>
                props.setPatientDetailDrafts((current) => ({
                  ...current,
                  [editingPatient.id]: { ...editingPatientDraft, email: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Contrasena (visible)
            <input
              type="text"
              autoComplete="off"
              placeholder="Dejar vacio para mantener"
              value={editingPatientDraft.password}
              onChange={(event) =>
                props.setPatientDetailDrafts((current) => ({
                  ...current,
                  [editingPatient.id]: { ...editingPatientDraft, password: event.target.value }
                }))
              }
            />
          </label>

          <label>
            Zona horaria
            <select
              value={editingPatientDraft.timezone}
              onChange={(event) =>
                props.setPatientDetailDrafts((current) => ({
                  ...current,
                  [editingPatient.id]: { ...editingPatientDraft, timezone: event.target.value }
                }))
              }
            >
              <option value="">Pendiente</option>
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            Estado paciente
            <select
              value={editingPatientDraft.status}
              onChange={(event) =>
                props.setPatientDetailDrafts((current) => ({
                  ...current,
                  [editingPatient.id]: { ...editingPatientDraft, status: event.target.value as PatientStatus }
                }))
              }
            >
              <option value="active">{props.patientStatusLabel("active")}</option>
              <option value="pause">{props.patientStatusLabel("pause")}</option>
              <option value="cancelled">{props.patientStatusLabel("cancelled")}</option>
              <option value="trial">{props.patientStatusLabel("trial")}</option>
            </select>
          </label>

          <label>
            Profesional asignado
            <select
              value={editingPatientDraft.activeProfessionalId}
              onChange={(event) =>
                props.setPatientDetailDrafts((current) => ({
                  ...current,
                  [editingPatient.id]: { ...editingPatientDraft, activeProfessionalId: event.target.value }
                }))
              }
            >
              <option value="">Pendiente de asignacion</option>
              {props.professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>{professional.fullName}</option>
              ))}
            </select>
          </label>

          <ProfessionalPhotoUrlField
            variant="patient"
            language={props.language}
            disabled={props.patientSaveLoading}
            value={editingPatientDraft.avatarUrl}
            onChange={(next) =>
              props.setPatientDetailDrafts((current) => ({
                ...current,
                [editingPatient.id]: { ...editingPatientDraft, avatarUrl: next }
              }))
            }
          />

        </div>

        <section className="risk-intake-section">
          <div className="risk-intake-head">
            <h4>Detalle del cuestionario de riesgo</h4>
            <span className={`risk-level-pill ${editingPatient.intakeRiskLevel ?? "medium"}`}>
              Riesgo {editingPatient.intakeRiskLevel ?? "medium"}
            </span>
          </div>
          {intakeEntries.length === 0 ? (
            <p className="risk-intake-empty">No hay respuestas de screening cargadas para este paciente.</p>
          ) : (
            <div className="risk-intake-grid">
              {intakeEntries.map(([key, answer]) => (
                <label key={key}>
                  {formatIntakeQuestionLabel(key)}
                  <textarea value={answer} readOnly rows={3} />
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="sessions-subsection">
          <div className="sessions-subsection-head">
            <h4>Subseccion de sesiones</h4>
            <span className="record-badge">Gestion operativa</span>
          </div>
          <div className="sessions-subsection-grid">
            <article className="sessions-metric-card">
              <span>Sesiones confirmadas</span>
              <strong>{props.confirmedSessionsCount}</strong>
            </article>
            <article className="sessions-metric-card">
              <span>Sesiones disponibles</span>
              <div className="sessions-available-editor">
                <button
                  type="button"
                  onClick={() =>
                    props.setPatientDetailDrafts((current) => ({
                      ...current,
                      [editingPatient.id]: {
                        ...current[editingPatient.id],
                        remainingCredits: String(Math.max(0, Number(current[editingPatient.id]?.remainingCredits ?? "0") - 1))
                      }
                    }))
                  }
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  value={editingPatientDraft.remainingCredits}
                  onChange={(event) =>
                    props.setPatientDetailDrafts((current) => ({
                      ...current,
                      [editingPatient.id]: { ...editingPatientDraft, remainingCredits: event.target.value }
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    props.setPatientDetailDrafts((current) => ({
                      ...current,
                      [editingPatient.id]: {
                        ...current[editingPatient.id],
                        remainingCredits: String(Math.max(0, Number(current[editingPatient.id]?.remainingCredits ?? "0") + 1))
                      }
                    }))
                  }
                >
                  +
                </button>
              </div>
            </article>
          </div>

          <label>
            Motivo del ajuste de sesiones
            <select
              value={props.sessionReasonDrafts[editingPatient.id] ?? SESSION_REASON_OPTIONS[0].value}
              onChange={(event) =>
                props.setSessionReasonDrafts((current) => ({
                  ...current,
                  [editingPatient.id]: event.target.value
                }))
              }
            >
              {SESSION_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <details className="card stack sessions-confirmed-accordion">
            <summary className="patient-inline-head">
              <h4>Ver sesiones ({props.confirmedSessionsCount} confirmadas)</h4>
              <span>Expandir</span>
            </summary>
            {props.loadingEditingBookings ? <p>Cargando sesiones...</p> : null}
            {!props.loadingEditingBookings && props.editingBookings.length === 0 ? <p>No hay sesiones para este paciente.</p> : null}

            {props.editingBookings.map((booking) => {
              const draft = props.bookingDrafts[booking.id];
              if (!draft) {
                return null;
              }
              const bookingEndsAt = new Date(draft.endsAt).getTime();
              const isFutureBooking = Number.isFinite(bookingEndsAt) ? bookingEndsAt >= Date.now() : false;
              const isTrialBooking = booking.consumedPurchaseId == null || booking.consumedCredits === 0;
              const isCancelled = draft.status === "CANCELLED";
              const blockedCancellationForFutureTrial = isTrialBooking && isFutureBooking;
              const canCancelBooking = !isCancelled && !blockedCancellationForFutureTrial;
              const canReactivateBooking = isCancelled && blockedCancellationForFutureTrial;
              const draftProfessional = props.professionals.find((professional) => professional.id === draft.professionalId) ?? null;
              const draftSlotValue = draft.startsAt + "__" + draft.endsAt;

              return (
                <details key={booking.id} className="card stack">
                  <summary className="patient-inline-head">
                    <h4>{booking.professionalName} · {props.formatDate(booking.startsAt)}</h4>
                    <span>Expandir</span>
                  </summary>
                  <div className="grid-form">
                    <label>
                      Estado
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          props.setBookingDrafts((current) => ({
                            ...current,
                            [booking.id]: { ...current[booking.id], status: event.target.value as AdminBookingOps["status"] }
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
                      Profesional
                      <select
                        value={draft.professionalId}
                        onChange={(event) =>
                          props.setBookingDrafts((current) => ({
                            ...current,
                            [booking.id]: { ...current[booking.id], professionalId: event.target.value }
                          }))
                        }
                      >
                        {props.professionals.map((professional) => (
                          <option key={professional.id} value={professional.id}>{professional.fullName}</option>
                        ))}
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
                          props.setBookingDrafts((current) => ({
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
                          props.setBookingDrafts((current) => ({
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
                          props.setBookingDrafts((current) => ({
                            ...current,
                            [booking.id]: { ...current[booking.id], endsAt: event.target.value }
                          }))
                        }
                      />
                    </label>
                  </div>
                  {blockedCancellationForFutureTrial ? (
                    <div className="stack admin-trial-cancel-block">
                      <p className="admin-trial-cancel-hint">
                        Sesion de prueba futura: el paciente no puede cancelarla desde la app. Como admin, podes anularla
                        escribiendo la frase exacta y usando el boton de abajo.
                      </p>
                      <label>
                        Escribi exactamente: <strong>{ADMIN_TRIAL_BOOKING_CANCEL_PHRASE}</strong>
                        <input
                          type="text"
                          autoComplete="off"
                          spellCheck={false}
                          value={trialCancelPhraseByBookingId[booking.id] ?? ""}
                          onChange={(event) =>
                            setTrialCancelPhraseByBookingId((current) => ({
                              ...current,
                              [booking.id]: event.target.value
                            }))
                          }
                          placeholder={ADMIN_TRIAL_BOOKING_CANCEL_PHRASE}
                        />
                      </label>
                      <button
                        className="danger"
                        type="button"
                        disabled={
                          props.sessionOpsLoading
                          || (trialCancelPhraseByBookingId[booking.id] ?? "").trim() !== ADMIN_TRIAL_BOOKING_CANCEL_PHRASE
                        }
                        onClick={() => {
                          const phrase = (trialCancelPhraseByBookingId[booking.id] ?? "").trim();
                          props.onForceCancelTrialBooking(booking.id, phrase);
                        }}
                      >
                        Eliminar / cancelar sesion de prueba
                      </button>
                    </div>
                  ) : null}
                  <div className="button-row ops-actions">
                    <button className="primary" type="button" onClick={() => props.onSaveBooking(booking.id)}>
                      Guardar sesion
                    </button>
                    {canCancelBooking ? (
                      <button className="danger" type="button" onClick={() => props.onCancelBooking(booking.id)} disabled={props.sessionOpsLoading}>
                        Cancelar sesion
                      </button>
                    ) : null}
                    {canReactivateBooking ? (
                      <button className="primary" type="button" onClick={() => props.onReactivateBooking(booking.id)} disabled={props.sessionOpsLoading}>
                        Reactivar sesion
                      </button>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </details>
        </section>

        <div className="button-row ops-actions patient-modal-footer-actions">
          <button className="primary" type="button" disabled={props.patientSaveLoading} onClick={props.onSavePatient}>
            {props.patientSaveLoading ? "Guardando..." : "Guardar cambios"}
          </button>
          {props.triagePending ? (
            <div className="risk-triage-form-actions">
              <button
                type="button"
                className="primary"
                onClick={props.onApproveTriage}
                disabled={props.triageActionLoading}
              >
                {props.triageActionLoading ? "Procesando..." : "Aprobar"}
              </button>
              <button
                type="button"
                className="danger"
                onClick={props.onRejectTriage}
                disabled={props.triageActionLoading}
              >
                Rechazar
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
