import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
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
  slotHoldLoading?: boolean;
  holdExpiresAt?: string;
  language: AppLanguage;
  sessionTimezone: string;
  onSelectSlot: (slotId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  formatDateOnly: (params: { isoDate: string; timezone: string; language: AppLanguage }) => string;
  formatDateTime: (params: { isoDate: string; timezone: string; language: AppLanguage }) => string;
}) {
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!props.holdExpiresAt || props.panelMode !== "new") {
      setHoldSecondsLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((Date.parse(props.holdExpiresAt!) - Date.now()) / 1000));
      setHoldSecondsLeft(remaining);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [props.holdExpiresAt, props.panelMode]);

  const holdMinutesLeft = holdSecondsLeft !== null ? Math.max(1, Math.ceil(holdSecondsLeft / 60)) : null;

  const selectedSlot = useMemo(
    () => props.availableSlots.find((slot) => slot.id === props.selectedSlotId) ?? null,
    [props.availableSlots, props.selectedSlotId]
  );

  if (!props.panelMode) {
    return null;
  }

  const isReschedule = props.panelMode === "reschedule";

  return (
    <div className="session-modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="session-modal session-booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-booking-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="session-booking-header">
          <button
            type="button"
            className="session-booking-close"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>

        <div className="session-booking-copy">
          <p className="session-booking-kicker">
            {isReschedule
              ? t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })
              : t(props.language, { es: "Nueva reserva", en: "New booking", pt: "Nova reserva" })}
          </p>
          <h2 id="session-booking-title" className="session-booking-title">
            {isReschedule
              ? t(props.language, { es: "Reprogramar sesión", en: "Reschedule session", pt: "Reagendar sessao" })
              : t(props.language, { es: "Reservar sesión", en: "Book session", pt: "Reservar sessao" })}
          </h2>
          <p className="session-booking-lead">
            {isReschedule
              ? t(props.language, {
                  es: "Elegí un nuevo horario. Al guardar, actualizamos tu reserva actual.",
                  en: "Pick a new time. When you save, we'll update your current booking.",
                  pt: "Escolha um novo horario. Ao salvar, atualizamos sua reserva atual."
                })
              : t(props.language, {
                  es: "Elegí el día y horario que te quede bien. Al confirmar usás 1 sesión de tu paquete.",
                  en: "Pick the day and time that works for you. Confirming uses 1 session from your package.",
                  pt: "Escolha o dia e horario que funcionem para voce. Ao confirmar, usa 1 sessao do seu pacote."
                })}
          </p>
          {props.panelMode === "new" && holdMinutesLeft !== null && holdSecondsLeft !== null && holdSecondsLeft > 0 ? (
            <p className="session-booking-hold-note" role="status">
              {t(props.language, {
                es: `Horario reservado para vos · ${holdMinutesLeft} min restantes`,
                en: `Time held for you · ${holdMinutesLeft} min left`,
                pt: `Horario reservado para voce · ${holdMinutesLeft} min restantes`
              })}
            </p>
          ) : null}
        </div>

        <article className="session-booking-card">
          <div className="session-booking-prof">
            <img src={props.modalProfessionalPhoto} alt="" onError={props.onImageFallback} />
            <div>
              <span className="session-booking-prof-label">
                {t(props.language, { es: "Tu profesional", en: "Your professional", pt: "Seu profissional" })}
              </span>
              <strong>{props.modalProfessional.fullName}</strong>
              {props.modalProfessional.title ? <small>{props.modalProfessional.title}</small> : null}
            </div>
          </div>

          {selectedSlot ? (
            <div className="session-booking-slot-preview" aria-live="polite">
              <span className="session-booking-slot-label">
                {t(props.language, { es: "Horario elegido", en: "Selected time", pt: "Horario escolhido" })}
              </span>
              <strong>
                {props.formatDateOnly({
                  isoDate: selectedSlot.startsAt,
                  timezone: props.sessionTimezone,
                  language: props.language
                })}
              </strong>
              <p>
                {props.formatDateTime({
                  isoDate: selectedSlot.startsAt,
                  timezone: props.sessionTimezone,
                  language: props.language
                })}
              </p>
            </div>
          ) : null}

          <label className="session-booking-slot-field">
            <span className="session-booking-slot-label">
              {t(props.language, { es: "Disponibilidad", en: "Availability", pt: "Disponibilidade" })}
            </span>
            <select
              value={props.selectedSlotId}
              onChange={(event) => props.onSelectSlot(event.target.value)}
              disabled={props.slotHoldLoading}
            >
              <option value="">
                {props.slotsLoading
                  ? t(props.language, { es: "Cargando disponibilidad...", en: "Loading availability...", pt: "Carregando disponibilidade..." })
                  : props.slotHoldLoading
                    ? t(props.language, { es: "Reservando horario...", en: "Reserving time...", pt: "Reservando horario..." })
                    : props.availableSlots.length === 0
                      ? t(props.language, { es: "Sin horarios publicados por ahora", en: "No published times right now", pt: "Sem horarios publicados por enquanto" })
                      : t(props.language, { es: "Seleccioná día y horario", en: "Select day and time", pt: "Selecione dia e horario" })}
              </option>
              {props.availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {props.formatDateOnly({ isoDate: slot.startsAt, timezone: props.sessionTimezone, language: props.language })} ·{" "}
                  {props.formatDateTime({ isoDate: slot.startsAt, timezone: props.sessionTimezone, language: props.language })}
                </option>
              ))}
            </select>
          </label>

          <div className="session-booking-credits-pill">
            <span>{t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}</span>
            <strong>{props.pendingSessions}</strong>
          </div>
        </article>

        <footer className="session-booking-footer">
          {props.bookingActionError ? <p className="session-booking-error">{props.bookingActionError}</p> : null}
          <button
            className="session-booking-primary"
            disabled={!props.canConfirmBooking || (props.panelMode === "new" && holdSecondsLeft === 0)}
            type="button"
            onClick={props.onConfirm}
          >
            {props.slotHoldLoading
              ? t(props.language, { es: "Reservando...", en: "Reserving...", pt: "Reservando..." })
              : isReschedule
                ? t(props.language, { es: "Guardar cambio", en: "Save change", pt: "Salvar alteracao" })
                : t(props.language, { es: "Confirmar reserva", en: "Confirm booking", pt: "Confirmar reserva" })}
          </button>
          <button type="button" className="session-booking-secondary" onClick={props.onClose}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </button>
        </footer>
      </section>
    </div>
  );
}
