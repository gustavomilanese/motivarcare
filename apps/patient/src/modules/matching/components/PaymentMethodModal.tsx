import { useEffect, useState } from "react";
import {
  textByLanguage,
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency
} from "@therapy/i18n-config";
import { formatPatientUsdPrice } from "../../app/lib/formatPatientUsdPrice";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function normalizeDisplayCurrency(currency: string | undefined): SupportedCurrency {
  const upper = (currency ?? "USD").trim().toUpperCase();
  if (upper === "ARS" || upper === "BRL" || upper === "EUR" || upper === "GBP" || upper === "USD") {
    return upper;
  }
  return "USD";
}

/** `amountMajor` está en USD; se muestra convertido a moneda local (máscara de display). */
function formatAmount(
  value: number | null,
  language: AppLanguage,
  displayCurrency: string | undefined,
  fxRates?: DisplayFxRates
): string {
  if (value === null) {
    return t(language, { es: "A confirmar", en: "To be confirmed", pt: "A confirmar" });
  }
  const currency = normalizeDisplayCurrency(displayCurrency);
  return formatPatientUsdPrice({
    usdMajor: value,
    displayCurrency: currency,
    language,
    fxRates,
    maximumFractionDigits: currency === "USD" ? 2 : 0
  });
}

export type PaymentSuccessSummary = {
  title: string;
  detail: string;
  primaryLabel?: string;
};

export function PaymentMethodModal(props: {
  language: AppLanguage;
  /** Monto en USD (unidades mayores). */
  amountMajor: number | null;
  /** Moneda local a mostrar (ARS/BRL/EUR/USD). */
  displayCurrency?: string;
  fxRates?: DisplayFxRates;
  loading: boolean;
  error: string;
  /** Solo billetera simulada (GPay); sin formulario de tarjeta. */
  walletOnly?: boolean;
  /** Tras pago exitoso: pantalla de confirmación antes de cerrar. */
  successSummary?: PaymentSuccessSummary | null;
  onBack: () => void;
  onClose: () => void;
  onPay: () => Promise<void> | void;
  onSuccessDismiss?: () => void;
}) {
  const [paymentMode, setPaymentMode] = useState<"new-card" | "one-click">("one-click");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const showSuccess = Boolean(props.successSummary);

  const cardReady =
    props.walletOnly || paymentMode === "one-click" || (cardNumber.length >= 16 && expiry.length >= 4 && cvc.length >= 3);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showSuccess) {
          props.onSuccessDismiss?.();
        } else {
          props.onClose();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.onClose, props.onSuccessDismiss, showSuccess]);

  return (
    <div className="matching-flow-backdrop payment-modal-backdrop" role="presentation" onClick={showSuccess ? props.onSuccessDismiss : props.onClose}>
      <section
        className={`matching-flow-modal payment-modal${props.walletOnly ? " payment-modal--wallet" : ""}${showSuccess ? " payment-modal--success" : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {showSuccess && props.successSummary ? (
          <>
            <div className="payment-success-icon" aria-hidden="true">
              ✓
            </div>
            <h3 className="payment-success-title">{props.successSummary.title}</h3>
            <p className="payment-success-detail">{props.successSummary.detail}</p>
            <footer className="matching-flow-footer payment-modal-footer">
              <button
                type="button"
                className="matching-flow-primary payment-modal-primary"
                onClick={() => props.onSuccessDismiss?.()}
              >
                {props.successSummary.primaryLabel
                  ?? t(props.language, { es: "Continuar", en: "Continue", pt: "Continuar" })}
              </button>
            </footer>
          </>
        ) : (
          <>
            <header className="matching-flow-header payment-modal-head">
              <div className="payment-modal-head-copy">
                <p className="payment-modal-mini-title">
                  {t(props.language, { es: "Pago seguro", en: "Secure payment", pt: "Pagamento seguro" })}
                </p>
                <h3 className="payment-modal-heading">
                  {props.walletOnly
                    ? t(props.language, { es: "Confirmar compra", en: "Confirm purchase", pt: "Confirmar compra" })
                    : t(props.language, { es: "Método de pago", en: "Payment method", pt: "Metodo de pagamento" })}
                </h3>
              </div>
              <button
                type="button"
                className="matching-flow-close payment-modal-close"
                onClick={props.onClose}
                aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
              >
                ×
              </button>
            </header>

            <div className="payment-sim-notice" role="status">
              {t(props.language, {
                es: "Modo demostración: el cobro está simulado. En producción se procesará con tu proveedor de pagos.",
                en: "Demo mode: payment is simulated. In production it will be processed by your payment provider.",
                pt: "Modo demonstracao: o pagamento e simulado. Em producao sera processado pelo provedor de pagamentos."
              })}
            </div>

            <section className="payment-amount-card">
              <span>{t(props.language, { es: "A pagar", en: "To pay", pt: "A pagar" })}</span>
              <strong>{formatAmount(props.amountMajor, props.language, props.displayCurrency, props.fxRates)}</strong>
            </section>

            {props.walletOnly ? (
              <section className="payment-wallet-panel">
                <div className="payment-wallet-brand" aria-hidden="true">
                  <span className="payment-wallet-g">G</span>
                  <span className="payment-wallet-pay">Pay</span>
                </div>
                <p className="payment-wallet-caption">
                  {t(props.language, {
                    es: "Simulamos la confirmación con Google Pay. Tocá el botón de abajo para acreditar tus sesiones al instante.",
                    en: "We simulate Google Pay confirmation. Tap the button below to credit your sessions instantly.",
                    pt: "Simulamos a confirmacao com Google Pay. Toque no botao abaixo para creditar suas sessoes na hora."
                  })}
                </p>
              </section>
            ) : (
              <>
                <div className="payment-method-tabs" role="tablist" aria-label={t(props.language, { es: "Método de pago", en: "Payment method", pt: "Metodo de pagamento" })}>
                  <button
                    type="button"
                    className={`payment-method-tab ${paymentMode === "new-card" ? "active" : ""}`}
                    onClick={() => setPaymentMode("new-card")}
                  >
                    {t(props.language, { es: "Tarjeta", en: "Card", pt: "Cartao" })}
                  </button>
                  <button
                    type="button"
                    className={`payment-method-tab ${paymentMode === "one-click" ? "active" : ""}`}
                    onClick={() => setPaymentMode("one-click")}
                  >
                    {t(props.language, { es: "Pago rápido", en: "Quick pay", pt: "Pagamento rápido" })} · GPay
                  </button>
                </div>

                <section className={`payment-option-card payment-option-card-modern ${paymentMode === "new-card" ? "selected" : ""}`}>
                  {paymentMode === "new-card" ? (
                    <>
                      <p className="payment-option-caption">
                        {t(props.language, { es: "Ingresá los datos de tu tarjeta", en: "Enter your card details", pt: "Insira os dados do seu cartao" })}
                      </p>
                      <div className="payment-card-form">
                        <input
                          value={cardNumber}
                          onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, "").slice(0, 16))}
                          placeholder="1234 1234 1234 1234"
                          inputMode="numeric"
                        />
                        <div className="payment-card-form-row">
                          <input
                            value={expiry}
                            onChange={(event) => setExpiry(event.target.value.replace(/[^0-9/]/g, "").slice(0, 5))}
                            placeholder="MM/AA"
                          />
                          <input
                            value={cvc}
                            onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="CVC"
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                    </>
                  ) : null}
                </section>

                {paymentMode === "one-click" ? (
                  <section className="payment-option-card payment-option-card-modern selected">
                    <p className="payment-option-caption">
                      {t(props.language, {
                        es: "Te redirigiremos a Google Pay para confirmar",
                        en: "You will be redirected to Google Pay to confirm",
                        pt: "Vamos redirecionar para o Google Pay para confirmar"
                      })}
                    </p>
                  </section>
                ) : null}
              </>
            )}

            {props.error ? (
              <p className="availability-status-message booking-soft-notice payment-modal-error" role="alert">
                {props.error}
              </p>
            ) : null}

            <footer className="matching-flow-footer payment-modal-footer">
              {!props.walletOnly ? (
                <button type="button" className="matching-flow-secondary payment-modal-back" onClick={props.onBack}>
                  {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
                </button>
              ) : null}
              <button
                type="button"
                className={`matching-flow-primary payment-modal-primary${props.walletOnly ? " payment-modal-primary--gpay" : ""}`}
                disabled={!cardReady || props.loading}
                onClick={() => {
                  void props.onPay();
                }}
              >
                {props.loading
                  ? t(props.language, { es: "Procesando...", en: "Processing...", pt: "Processando..." })
                  : props.walletOnly
                    ? t(props.language, { es: "Pagar con Google Pay", en: "Pay with Google Pay", pt: "Pagar com Google Pay" })
                    : t(props.language, { es: "Pagar", en: "Pay", pt: "Pagar" })}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
