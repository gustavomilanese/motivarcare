import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { useState } from "react";
import { ADMIN_TRIAL_BOOKING_CANCEL_PHRASE } from "../../constants";
import {
  canAdminCancelPackageBooking,
  canAdminForceCancelTrialBooking,
  canAdminReactivateTrialBooking,
  isAdminTrialBooking,
  trialCancelPhraseMatches,
  type AdminBookingDraft
} from "../../lib/adminBookingSessionOps";
import type { AdminBookingOps } from "../../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type AdminBookingSessionActionsProps = {
  language: AppLanguage;
  booking: AdminBookingOps;
  draft: AdminBookingDraft;
  loading: boolean;
  onCancel: () => void | Promise<void>;
  onForceCancelTrial: (confirmationPhrase: string) => void | Promise<void>;
  onReactivate: () => void | Promise<void>;
};

export function AdminBookingSessionActions(props: AdminBookingSessionActionsProps) {
  const [trialPhrase, setTrialPhrase] = useState("");
  const isTrial = isAdminTrialBooking(props.booking);
  const canCancel = canAdminCancelPackageBooking(props.draft, props.booking);
  const canForceCancelTrial = canAdminForceCancelTrialBooking(props.draft, props.booking);
  const canReactivate = canAdminReactivateTrialBooking(props.draft, props.booking);

  return (
    <div className="stack admin-booking-session-actions">
      {isTrial ? (
        <p className="admin-trial-cancel-hint">
          {t(props.language, {
            es: "Sesión de prueba: usá el flujo con frase para cancelarla. Las de paquete se cancelan con el botón rojo.",
            en: "Trial session: use the phrase flow to cancel. Package sessions use the red button.",
            pt: "Sessao de teste: use o fluxo com frase para cancelar."
          })}
        </p>
      ) : null}

      {canForceCancelTrial ? (
        <div className="stack admin-trial-cancel-block">
          <label>
            {t(props.language, {
              es: "Frase de confirmación (sesión de prueba)",
              en: "Confirmation phrase (trial session)",
              pt: "Frase de confirmacao (sessao de teste)"
            })}
            <input
              type="text"
              value={trialPhrase}
              placeholder={ADMIN_TRIAL_BOOKING_CANCEL_PHRASE}
              onChange={(event) => setTrialPhrase(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="danger"
            disabled={props.loading || !trialCancelPhraseMatches(trialPhrase)}
            onClick={() => void props.onForceCancelTrial(trialPhrase.trim())}
          >
            {t(props.language, {
              es: "Eliminar / cancelar sesión de prueba",
              en: "Delete / cancel trial session",
              pt: "Eliminar / cancelar sessao de teste"
            })}
          </button>
        </div>
      ) : null}

      <div className="button-row ops-actions">
        {canCancel ? (
          <button type="button" className="danger" disabled={props.loading} onClick={() => void props.onCancel()}>
            {t(props.language, {
              es: "Cancelar sesión",
              en: "Cancel session",
              pt: "Cancelar sessao"
            })}
          </button>
        ) : null}
        {canReactivate ? (
          <button type="button" className="primary" disabled={props.loading} onClick={() => void props.onReactivate()}>
            {t(props.language, {
              es: "Reactivar sesión",
              en: "Reactivate session",
              pt: "Reativar sessao"
            })}
          </button>
        ) : null}
      </div>

      {props.booking.consumedCredits > 0 && props.draft.status !== "CANCELLED" ? (
        <p className="admin-booking-refund-hint">
          {t(props.language, {
            es: "Si la sesión es futura y usó crédito de paquete, al cancelar se reintegran los créditos automáticamente.",
            en: "If this is a future package-credit session, cancelling refunds credits automatically.",
            pt: "Se for sessao futura com credito de pacote, ao cancelar os creditos sao reembolsados."
          })}
        </p>
      ) : null}
    </div>
  );
}
