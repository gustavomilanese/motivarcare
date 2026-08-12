import { useCallback, useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../auth/AuthContext";
import { useBookingsRefresh } from "../context/BookingsRefreshContext";
import { usePatientProfile } from "../context/PatientProfileContext";
import { STORAGE_DEFER_PROFESSIONAL_SELECTION } from "../constants/storageKeys";
import {
  clearPendingTrialBooking,
  readPendingTrialBooking
} from "./pendingTrialBooking";
import { parseTrialPaymentReturnUrl, syncAndConfirmTrialBooking } from "./trialCheckout";

export type TrialCheckoutReturnState = {
  processing: boolean;
  success: boolean;
  errorMessage: string | null;
  dismissSuccess: () => void;
  dismissError: () => void;
};

/**
 * Handles dLocal trial return deep links + resume of pending trial checkouts.
 * Mount inside PatientProfileProvider (alongside package return host).
 */
export function useTrialCheckoutReturn(): TrialCheckoutReturnState {
  const { token } = useAuth();
  const { refresh } = usePatientProfile();
  const { touchBookings } = useBookingsRefresh();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handlingRef = useRef(false);

  const dismissSuccess = useCallback(() => setSuccess(false), []);
  const dismissError = useCallback(() => setErrorMessage(null), []);

  const runFulfill = useCallback(
    async (params: { wasCancel?: boolean }) => {
      if (!token || handlingRef.current) {
        return;
      }
      handlingRef.current = true;
      setProcessing(true);
      setErrorMessage(null);
      try {
        if (params.wasCancel) {
          await clearPendingTrialBooking();
          return;
        }

        const pending = await readPendingTrialBooking();
        if (!pending?.paymentId?.trim() || !pending.professionalId || !pending.slot?.startsAt) {
          setErrorMessage(
            "No pudimos recuperar los datos de tu sesión de prueba. Si el pago se debitó, escribinos a soporte."
          );
          return;
        }

        const booked = await syncAndConfirmTrialBooking({
          token,
          paymentId: pending.paymentId,
          professionalId: pending.professionalId,
          slot: pending.slot,
          holdId: pending.holdId
        });

        if (!booked.ok) {
          setErrorMessage(
            booked.error
              ?? "Recibimos tu pago, pero todavía lo estamos confirmando. Volvé a abrir la app en unos segundos."
          );
          return;
        }

        await AsyncStorage.removeItem(STORAGE_DEFER_PROFESSIONAL_SELECTION);
        await refresh();
        touchBookings();
        setSuccess(true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo confirmar la sesión de prueba."
        );
      } finally {
        handlingRef.current = false;
        setProcessing(false);
      }
    },
    [token, refresh, touchBookings]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const handleUrl = (url: string) => {
      const parsed = parseTrialPaymentReturnUrl(url);
      if (!parsed.trialPayment) {
        return;
      }
      void runFulfill({ wasCancel: parsed.trialPayment === "cancel" });
    };

    const sub = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    void Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    void (async () => {
      const pending = await readPendingTrialBooking();
      if (pending?.paymentId) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (!handlingRef.current) {
          void runFulfill({});
        }
      }
    })();

    return () => {
      sub.remove();
    };
  }, [token, runFulfill]);

  return {
    processing,
    success,
    errorMessage,
    dismissSuccess,
    dismissError
  };
}
