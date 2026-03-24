import { useState } from "react";
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

  return (
    <div className="matching-flow-backdrop" role="presentation" onClick={props.onClose}>
      <section className="matching-flow-modal payment-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="matching-flow-header">
          <button type="button" className="matching-flow-back-button" onClick={props.onBack}>
            ←
          </button>
          <div>
            <h3>{t(props.language, { es: "Método de pago", en: "Payment method", pt: "Metodo de pagamento" })}</h3>
          </div>
          <button type="button" className="matching-flow-close" onClick={props.onClose}>
            ×
          </button>
        </header>

        <section className="payment-amount-card">
          <span>{t(props.language, { es: "A pagar", en: "To pay", pt: "A pagar" })}</span>
          <strong>{formatAmount(props.amountUsd, props.language)}</strong>
        </section>

        <section className={`payment-option-card ${paymentMode === "new-card" ? "selected" : ""}`}>
          <button type="button" className="payment-option-toggle" onClick={() => setPaymentMode("new-card")}>
            <span className={`payment-check ${paymentMode === "new-card" ? "checked" : ""}`} />
            <span className="payment-option-label">
              {t(props.language, { es: "Tarjeta nueva", en: "New card", pt: "Novo cartao" })}
            </span>
          </button>

          {paymentMode === "new-card" ? (
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
          ) : null}
        </section>

        <section className={`payment-option-card ${paymentMode === "one-click" ? "selected" : ""}`}>
          <button type="button" className="payment-option-toggle" onClick={() => setPaymentMode("one-click")}>
            <span className={`payment-check ${paymentMode === "one-click" ? "checked" : ""}`} />
            <span className="payment-option-label">
              {t(props.language, { es: "Pago rápido", en: "Quick pay", pt: "Pagamento rapido" })}
            </span>
            <small className="payment-option-badge">GPay</small>
          </button>
        </section>

        {props.error ? <p className="availability-status-message error">{props.error}</p> : null}

        <footer className="matching-flow-footer">
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
