import { useCallback, useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { useAuth } from "../auth/AuthContext";
import { usePatientProfile } from "../context/PatientProfileContext";
import {
  fulfillPendingDlocalCheckout,
  parsePaymentReturnUrl
} from "./dlocalCheckout";
import {
  clearPendingCheckoutDlocalReturn,
  readPendingCheckoutDlocalReturn
} from "./checkoutDlocalReturn";

export type DlocalCheckoutReturnState = {
  processing: boolean;
  successCredits: number | null;
  errorMessage: string | null;
  dismissSuccess: () => void;
  dismissError: () => void;
};

/**
 * Handles dLocal return deep links + resume of pending checkouts after the
 * in-app browser closes. Mount inside PatientProfileProvider.
 */
export function useDlocalCheckoutReturn(): DlocalCheckoutReturnState {
  const { token } = useAuth();
  const { profile, refresh } = usePatientProfile();
  const [processing, setProcessing] = useState(false);
  const [successCredits, setSuccessCredits] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handlingRef = useRef(false);

  const dismissSuccess = useCallback(() => setSuccessCredits(null), []);
  const dismissError = useCallback(() => setErrorMessage(null), []);

  const runFulfill = useCallback(
    async (params: { paymentId?: string | null; orderId?: string | null; wasCancel?: boolean }) => {
      if (!token || handlingRef.current) {
        return;
      }
      handlingRef.current = true;
      setProcessing(true);
      setErrorMessage(null);
      try {
        if (params.wasCancel) {
          await clearPendingCheckoutDlocalReturn({ clearIdempotency: true });
          return;
        }

        const pending = await readPendingCheckoutDlocalReturn();
        const synced = await fulfillPendingDlocalCheckout({
          token,
          paymentId: params.paymentId ?? pending?.paymentId,
          orderId: params.orderId ?? pending?.orderId
        });

        if (!synced.ok || !synced.fulfilled) {
          setErrorMessage(
            synced.error
              ?? "Recibimos tu pago, pero todavía lo estamos confirmando. Volvé a abrir la app en unos segundos."
          );
          return;
        }

        await refresh();
        const credits =
          pending?.sessionCount
          ?? profile?.latestPackage?.remainingCredits
          ?? null;
        setSuccessCredits(typeof credits === "number" && credits > 0 ? credits : 1);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo confirmar el pago.");
      } finally {
        handlingRef.current = false;
        setProcessing(false);
      }
    },
    [token, refresh, profile?.latestPackage?.remainingCredits]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const handleUrl = (url: string) => {
      const parsed = parsePaymentReturnUrl(url);
      if (!parsed.payment) {
        return;
      }
      void runFulfill({
        paymentId: parsed.paymentId,
        orderId: parsed.orderId,
        wasCancel: parsed.payment === "cancel"
      });
    };

    const sub = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    void Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    // Resume pending checkout if the auth session closed without a deep link event.
    void (async () => {
      const pending = await readPendingCheckoutDlocalReturn();
      if (pending?.paymentId || pending?.orderId) {
        // Small delay so openAuthSessionAsync can settle first.
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (!handlingRef.current) {
          void runFulfill({
            paymentId: pending.paymentId,
            orderId: pending.orderId
          });
        }
      }
    })();

    return () => {
      sub.remove();
    };
  }, [token, runFulfill]);

  return {
    processing,
    successCredits,
    errorMessage,
    dismissSuccess,
    dismissError
  };
}
