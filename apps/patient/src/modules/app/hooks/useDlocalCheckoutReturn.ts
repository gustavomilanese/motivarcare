import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import {
  clearPendingCheckoutDlocalReturn,
  readPendingCheckoutDlocalReturn,
  type PendingCheckoutDlocalReturn
} from "../lib/checkoutDlocalReturn";
import { friendlyCheckoutPackageMessage } from "../lib/friendlyPatientMessages";
import type { PaymentSuccessSummary } from "../../matching/components/PaymentSuccessModal";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/**
 * Construye el resumen de éxito según el tipo de compra pendiente. Se usa el
 * dato guardado antes de redirigir a dLocal (sessionStorage) para no depender
 * del catálogo ni del estado del portal, que puede no estar hidratado todavía.
 */
function buildSuccessSummary(
  language: AppLanguage,
  pending: PendingCheckoutDlocalReturn | null
): PaymentSuccessSummary {
  if (pending?.kind === "individual" && pending.sessionCount) {
    return {
      title: t(language, {
        es: "¡Sesiones acreditadas!",
        en: "Sessions credited!",
        pt: "Sessoes creditadas!"
      }),
      detail: replaceTemplate(
        t(language, {
          es: "Sumaste {count} sesiones a tu cuenta. Ya podés reservar turno.",
          en: "You added {count} sessions to your account. You can book now.",
          pt: "Voce adicionou {count} sessoes a sua conta. Ja pode reservar."
        }),
        { count: String(pending.sessionCount) }
      )
    };
  }

  if (pending?.kind === "package") {
    const packageLabel =
      pending.packageName?.trim()
      || t(language, { es: "tu paquete", en: "your package", pt: "seu pacote" });
    return {
      title: t(language, {
        es: "¡Compra confirmada!",
        en: "Purchase confirmed!",
        pt: "Compra confirmada!"
      }),
      detail: replaceTemplate(
        t(language, {
          es: "Acreditamos {package} en tu cuenta. Ya podés reservar turno.",
          en: "We credited {package} to your account. You can book now.",
          pt: "Creditamos {package} na sua conta. Ja pode reservar."
        }),
        { package: packageLabel }
      )
    };
  }

  return {
    title: t(language, {
      es: "¡Pago confirmado!",
      en: "Payment confirmed!",
      pt: "Pagamento confirmado!"
    }),
    detail: t(language, {
      es: "Tu compra fue procesada. Si no ves las sesiones al instante, actualizá la página en unos segundos.",
      en: "Your purchase was processed. If sessions do not appear right away, refresh in a few seconds.",
      pt: "Sua compra foi processada. Se as sessoes nao aparecerem de imediato, atualize em alguns segundos."
    })
  };
}

export type DlocalCheckoutReturnState = {
  /**
   * `true` mientras se está procesando un retorno de dLocal. Se usa para
   * suprimir cualquier redirección de guard (p. ej. lock a matching) y evitar
   * que se muestren pantallas viejas antes de confirmar la compra.
   */
  checkoutReturnActive: boolean;
  /**
   * `true` mientras hay que cubrir la pantalla con un loader a pantalla completa:
   * desde que se detecta el retorno hasta que la compra quedó acreditada y el
   * portal se resincronizó. Evita el "flash" de la pantalla vieja sin actualizar.
   */
  loaderVisible: boolean;
  successSummary: PaymentSuccessSummary | null;
  errorMessage: string | null;
  dismissSuccess: () => void;
  dismissError: () => void;
};

export function useDlocalCheckoutReturn(options: {
  language: AppLanguage;
  onSyncDlocalPayment?: (params: {
    paymentId?: string | null;
    orderId?: string | null;
  }) => Promise<{ ok: boolean; fulfilled?: boolean; error?: string }>;
  onRefreshPortalFromApi?: () => void | Promise<void>;
  /**
   * Se dispara cuando una compra se confirmó (fulfilled). Permite al portal
   * marcar el onboarding como completado localmente y evitar que el guard
   * vuelva a la pantalla de matching mientras llega el resync del backend.
   */
  onCheckoutFulfilled?: () => void;
}): DlocalCheckoutReturnState {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [successSummary, setSuccessSummary] = useState<PaymentSuccessSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const paymentParam = searchParams.get("payment");
  const hasReturnParam = paymentParam === "success" || paymentParam === "cancel";

  const handledParamRef = useRef(false);
  const resumeRef = useRef(false);

  const dismissSuccess = useCallback(() => setSuccessSummary(null), []);
  const dismissError = useCallback(() => setErrorMessage(null), []);

  const goHome = useCallback(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  // Retorno explícito desde dLocal (con parámetro `payment` en la URL).
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

    const pending = readPendingCheckoutDlocalReturn();
    const paymentId =
      pending?.paymentId?.trim()
      || searchParams.get("payment_id")?.trim()
      || searchParams.get("paymentId")?.trim()
      || null;
    const orderId = pending?.orderId?.trim() || searchParams.get("dlocalOrder")?.trim() || null;
    const wasCancel = paymentParam === "cancel";

    // Limpiar la URL de parámetros de checkout dejando al paciente en Home.
    const cleaned = new URLSearchParams(searchParams);
    for (const key of ["payment", "purchase", "dlocalOrder", "payment_id", "paymentId", "flow", "plan", "source"]) {
      cleaned.delete(key);
    }
    setSearchParams(cleaned, { replace: true });

    void (async () => {
      try {
        if (wasCancel) {
          clearPendingCheckoutDlocalReturn({ clearIdempotency: true });
          goHome();
          return;
        }

        if (!paymentId && !orderId) {
          setErrorMessage(
            t(options.language, {
              es: "No pudimos confirmar la compra automáticamente. Actualizá la página; si el pago ya se realizó y no ves sesiones, contactanos.",
              en: "We couldn't confirm the purchase automatically. Refresh the page; if you already paid and sessions are missing, contact us.",
              pt: "Nao foi possivel confirmar a compra automaticamente. Atualize a pagina; se o pagamento ja foi feito e as sessoes nao aparecem, fale conosco."
            })
          );
          goHome();
          return;
        }

        if (options.onSyncDlocalPayment) {
          const synced = await options.onSyncDlocalPayment({ paymentId, orderId });
          if (!synced.ok) {
            setErrorMessage(
              friendlyCheckoutPackageMessage(synced.error ?? "Could not confirm payment", options.language)
            );
            goHome();
            return;
          }
          if (!synced.fulfilled) {
            setErrorMessage(
              t(options.language, {
                es: "Recibimos tu pago, pero todavía lo estamos confirmando. Actualizá la página en unos segundos o escribinos si no ves las sesiones.",
                en: "We received your payment, but we're still confirming it. Refresh in a few seconds or contact us if sessions don't appear.",
                pt: "Recebemos seu pagamento, mas ainda estamos confirmando. Atualize em alguns segundos ou fale conosco se as sessoes nao aparecerem."
              })
            );
            goHome();
            return;
          }
        }

        options.onCheckoutFulfilled?.();
        // Ir a Home y esperar el resync ANTES de mostrar el popup para no
        // exponer la pantalla vieja sin actualizar (el loader sigue arriba).
        goHome();
        await Promise.resolve(options.onRefreshPortalFromApi?.());
        clearPendingCheckoutDlocalReturn({ clearIdempotency: true });
        setSuccessSummary(buildSuccessSummary(options.language, pending));
      } finally {
        setProcessing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasReturnParam]);

  // Reanudación: hay un checkout pendiente en storage pero sin parámetro en la
  // URL (p. ej. el paciente reabrió la app). Intentamos confirmar en segundo
  // plano y, si ya está acreditado, mostramos el éxito.
  useEffect(() => {
    if (hasReturnParam || resumeRef.current || !options.onSyncDlocalPayment) {
      return;
    }
    const pending = readPendingCheckoutDlocalReturn();
    if (!pending?.paymentId?.trim() && !pending?.orderId?.trim()) {
      return;
    }
    resumeRef.current = true;

    void (async () => {
      const synced = await options.onSyncDlocalPayment!({
        paymentId: pending.paymentId,
        orderId: pending.orderId
      });
      if (synced.ok && synced.fulfilled) {
        options.onCheckoutFulfilled?.();
        await Promise.resolve(options.onRefreshPortalFromApi?.());
        clearPendingCheckoutDlocalReturn({ clearIdempotency: true });
        setSuccessSummary(buildSuccessSummary(options.language, pending));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasReturnParam]);

  return {
    // Mantener el lock suprimido también mientras el modal de éxito está
    // abierto: cubre la ventana entre el fin del proceso y el resync backend.
    checkoutReturnActive: hasReturnParam || processing || successSummary != null,
    // El loader tapa la pantalla mientras confirmamos+resincronizamos, y se va
    // recién cuando aparece el popup de éxito (o un error). Así nunca se ve la
    // pantalla vieja intermedia.
    loaderVisible: (hasReturnParam || processing) && successSummary == null && errorMessage == null,
    successSummary,
    errorMessage,
    dismissSuccess,
    dismissError
  };
}
