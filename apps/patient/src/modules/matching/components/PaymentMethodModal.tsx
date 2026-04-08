import { useEffect, useState } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatAmount(value: number | null, language: AppLanguage): string {
  if (value === null) {
    return t(language, { es: "A confirmar", en: "To be confirmed", pt: "A confirmar" });
  }
  return `$${value.toFixed(2)} USD`;
}

type PaymentMode = "new-card" | "one-click";

export function PaymentMethodModal(props: {
  language: AppLanguage;
  amountUsd: number | null;
  loading: boolean;
  error: string;
  onBack: () => void;
  onClose: () => void;
  onPay: () => Promise<void> | void;
}) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("new-card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const cardReady = paymentMode === "one-click" || (cardNumber.length >= 16 && expiry.length >= 4 && cvc.length >= 3);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.onClose]);

  return (
    <div className="matching-flow-backdrop" role="presentation" onClick={props.onClose}>
      <section className="matching-flow-modal payment-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="matching-flow-header payment-modal-head">
          <div className="payment-modal-head-copy">
            <p className="payment-modal-mini-title">
              {t(props.language, { es: "Pago seguro", en: "Secure payment", pt: "Pagamento seguro" })}
            </p>
          </div>
          <button type="button" className="matching-flow-close payment-modal-close" onClick={props.onClose} aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}>
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
          <strong>{formatAmount(props.amountUsd, props.language)}</strong>
        </section>

        <div className="payment-method-tabs" role="tablist" aria-label={t(props.language, { es: "Método de pago", en: "Payment method", pt: "Método de pagamento" })}>
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
              <p className="payment-option-caption">{t(props.language, { es: "Ingresá los datos de tu tarjeta", en: "Enter your card details", pt: "Insira os dados do seu cartão" })}</p>
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
            <p className="payment-option-caption">{t(props.language, { es: "Te redirigiremos a Google Pay para confirmar", en: "You will be redirected to Google Pay to confirm", pt: "Vamos redirecionar para o Google Pay para confirmar" })}</p>
          </section>
        ) : null}

        {props.error ? (
          <p className="availability-status-message booking-soft-notice" role="status">
            {props.error}
          </p>
        ) : null}

        <footer className="matching-flow-footer payment-modal-footer">
          <button
            type="button"
            className="matching-flow-primary"
            disabled={!cardReady || props.loading}
            onClick={() => {
              void props.onPay();
            }}
          >
            {props.loading
              ? t(props.language, { es: "Procesando...", en: "Processing...", pt: "Processando..." })
              : t(props.language, { es: "Pagar", en: "Pay", pt: "Pagar" })}
          </button>
        </footer>
      </section>
    </div>
  );
}
