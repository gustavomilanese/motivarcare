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
        onClick={(event) => event.stopPropagation()}
      >
        <div className="payment-success-icon" aria-hidden="true">
          ✓
        </div>
        <h3 className="payment-success-title">{props.summary.title}</h3>
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
