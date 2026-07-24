import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { friendlyBookingFailureMessage, friendlyCheckoutPackageMessage } from "../lib/friendlyPatientMessages";
import {
  clearPendingTrialBooking,
  readPendingTrialBooking
} from "../lib/pendingTrialBooking";
import type { TimeSlot } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export type TrialCheckoutReturnState = {
  /** Suprime guards (p. ej. kick off matching) mientras se confirma la prueba. */
  trialReturnActive: boolean;
  /** Loader a pantalla completa hasta tener booking + portal sincronizado. */
  loaderVisible: boolean;
  errorMessage: string | null;
  dismissError: () => void;
};

/**
 * Retorno de dLocal para sesión de prueba. Misma idea que `useDlocalCheckoutReturn`:
 * no mostrar el Dashboard viejo; loader hasta sync + reserva + resync.
 */
export function useTrialCheckoutReturn(options: {
  language: AppLanguage;
  onSyncTrialPayment?: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;
  confirmTrialBooking: (
    professionalId: string,
    slot: TimeSlot,
    holdId?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onRefreshPortalFromApi?: () => void | Promise<void>;
}): TrialCheckoutReturnState {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledParamRef = useRef(false);

  const trialPaymentParam = searchParams.get("trialPayment");
  const hasReturnParam = trialPaymentParam === "success" || trialPaymentParam === "cancel";

  const dismissError = useCallback(() => setErrorMessage(null), []);

  useEffect(() => {
    if (!hasReturnParam) {
      handledParamRef.current = false;
      return;
    }
    if (handledParamRef.current) {
      return;
    }
    handledParamRef.current = true;
    setProcessing(true);
    setErrorMessage(null);

    const wasCancel = trialPaymentParam === "cancel";
    const cleaned = new URLSearchParams(searchParams);
    cleaned.delete("trialPayment");
    setSearchParams(cleaned, { replace: true });
    navigate("/", { replace: true });

    void (async () => {
      try {
        if (wasCancel) {
          clearPendingTrialBooking();
          return;
        }

        const pending = readPendingTrialBooking();
        if (!pending?.paymentId?.trim() || !pending.professionalId || !pending.slot?.startsAt) {
          setErrorMessage(
            t(options.language, {
              es: "No pudimos recuperar los datos de tu sesión de prueba. Si el pago se debitó, escribinos a soporte.",
              en: "We couldn’t recover your trial session details. If you were charged, contact support.",
              pt: "Nao foi possivel recuperar os dados da sua sessao de teste. Se o pagamento foi cobrado, fale com o suporte."
            })
          );
          return;
        }

        if (options.onSyncTrialPayment) {
          const synced = await options.onSyncTrialPayment(pending.paymentId);
          if (!synced.ok) {
            setErrorMessage(
              friendlyCheckoutPackageMessage(synced.error ?? "Could not confirm trial payment", options.language)
            );
            return;
          }
        }

        const booked = await options.confirmTrialBooking(
          pending.professionalId,
          {
            id: pending.slot.id,
            startsAt: pending.slot.startsAt,
            endsAt: pending.slot.endsAt
          },
          pending.holdId
        );
        if (!booked.ok) {
          setErrorMessage(
            friendlyBookingFailureMessage(booked.error ?? "", options.language)
          );
          return;
        }

        clearPendingTrialBooking();
        await Promise.resolve(options.onRefreshPortalFromApi?.());
      } finally {
        setProcessing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasReturnParam]);

  return {
    trialReturnActive: hasReturnParam || processing || errorMessage != null,
    loaderVisible: (hasReturnParam || processing) && errorMessage == null,
    errorMessage,
    dismissError
  };
}
