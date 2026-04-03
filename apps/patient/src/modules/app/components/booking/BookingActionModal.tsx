import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { SyntheticEvent } from "react";
import type { TimeSlot } from "../../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function BookingActionModal(props: {
  panelMode: "new" | "reschedule" | null;
  modalProfessional: {
    fullName: string;
    title: string;
  };
  modalProfessionalPhoto: string;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  selectedSlotId: string;
  availableSlots: TimeSlot[];
  slotsLoading: boolean;
  pendingSessions: number;
  bookingActionError: string;
  canConfirmBooking: boolean;
  language: AppLanguage;
  sessionTimezone: string;
  onSelectSlot: (slotId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  formatDateOnly: (params: { isoDate: string; timezone: string; language: AppLanguage }) => string;
  formatDateTime: (params: { isoDate: string; timezone: string; language: AppLanguage }) => string;
}) {
  if (!props.panelMode) {
    return null;
  }

  return (
    <div className="session-modal-backdrop" role="presentation" onClick={props.onClose}>
      <section className="session-modal session-booking-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="session-modal-header">
          <div>
            <h2 className="session-booking-title">
              {props.panelMode === "reschedule"
                ? t(props.language, { es: "Reprogramar sesion", en: "Reschedule session", pt: "Reagendar sessao" })
                : t(props.language, { es: "Reserva de sesion", en: "Session booking", pt: "Reserva de sessao" })}
            </h2>
          </div>
          <button type="button" onClick={props.onClose}>
            {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          </button>
        </header>

        <section className="session-booking-professional">
          <img src={props.modalProfessionalPhoto} alt={props.modalProfessional.fullName} onError={props.onImageFallback} />
          <div>
            <span>{t(props.language, { es: "Profesional confirmado", en: "Confirmed professional", pt: "Profissional confirmado" })}</span>
            <strong>{props.modalProfessional.fullName}</strong>
            <p>{props.modalProfessional.title}</p>
          </div>
        </section>

        <div className="session-booking-flow">
          <label className="session-booking-field availability">
            <span>{t(props.language, { es: "Disponibilidad", en: "Availability", pt: "Disponibilidade" })}</span>
            <select value={props.selectedSlotId} onChange={(event) => props.onSelectSlot(event.target.value)}>
              <option value="">
                {props.slotsLoading
                  ? t(props.language, { es: "Cargando disponibilidad...", en: "Loading availability...", pt: "Carregando disponibilidade..." })
                  : props.availableSlots.length === 0
                    ? t(props.language, { es: "Sin horarios publicados por ahora", en: "No published times right now", pt: "Sem horarios publicados por enquanto" })
                    : t(props.language, { es: "Selecciona dia y horario", en: "Select day and time", pt: "Selecione dia e horario" })}
              </option>
              {props.availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {props.formatDateOnly({ isoDate: slot.startsAt, timezone: props.sessionTimezone, language: props.language })} · {props.formatDateTime({ isoDate: slot.startsAt, timezone: props.sessionTimezone, language: props.language })}
                </option>
              ))}
            </select>
          </label>

          <div className="session-booking-credits">
            <span>{t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}</span>
            <strong>{props.pendingSessions}</strong>
          </div>
        </div>

        <section className="session-modal-footer">
          {props.bookingActionError ? <p className="error-text">{props.bookingActionError}</p> : null}
          <div className="button-row session-booking-actions">
            <button type="button" onClick={props.onClose}>
              {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
            </button>
            <button className="primary" disabled={!props.canConfirmBooking} type="button" onClick={props.onConfirm}>
              {props.panelMode === "reschedule"
                ? t(props.language, { es: "Guardar cambio", en: "Save change", pt: "Salvar alteracao" })
                : t(props.language, { es: "Guardar reserva", en: "Save booking", pt: "Salvar reserva" })}
            </button>
          </div>
        </section>
      </section>
    </div>
  );
}
