import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export type PaymentSuccessSummary = {
  title: string;
  detail: string;
  primaryLabel?: string;
};

export function PaymentSuccessModal(props: {
  language: AppLanguage;
  summary: PaymentSuccessSummary;
  onDismiss: () => void;
}) {
  return (
    <div
      className="matching-flow-backdrop payment-modal-backdrop"
      role="presentation"
      onClick={props.onDismiss}
    >
      <section
        className="matching-flow-modal payment-modal payment-modal--success"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-success-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="payment-success-hero" aria-hidden="true">
          <span className="payment-success-spark payment-success-spark--a" />
          <span className="payment-success-spark payment-success-spark--b" />
          <span className="payment-success-spark payment-success-spark--c" />
          <span className="payment-success-spark payment-success-spark--d" />
          <div className="payment-success-icon">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" aria-hidden="true">
              <path
                d="M5 12.5 9.2 17 19 7"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <p className="payment-success-kicker">
          {t(props.language, { es: "Pago acreditado", en: "Payment credited", pt: "Pagamento creditado" })}
        </p>
        <h3 id="payment-success-title" className="payment-success-title">
          {props.summary.title}
        </h3>
        <p className="payment-success-detail">{props.summary.detail}</p>
        <footer className="matching-flow-footer payment-modal-footer">
          <button type="button" className="matching-flow-primary payment-modal-primary" onClick={props.onDismiss}>
            {props.summary.primaryLabel
              ?? t(props.language, { es: "Continuar", en: "Continue", pt: "Continuar" })}
          </button>
        </footer>
      </section>
    </div>
  );
}
