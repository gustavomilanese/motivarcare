import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { PORTAL_SESSION_FLOW } from "../lib/sessionLifecycle";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function SessionStatusFlowLegend(props: { language: AppLanguage }) {
  return (
    <div
      className="pro-session-status-flow"
      data-tour="pro-tour-status-flow"
      title={t(props.language, {
        es: "Al marcar Realizada confirmás el cobro: pasa a Pendiente de cobro y no se deshace. Pagada cuando Admin deposita.",
        en: "Marking Completed confirms payout: it becomes Pending payout and cannot be undone. Paid when Admin deposits.",
        pt: "Ao marcar Realizada voce confirma a cobranca: fica Pendente de cobranca e nao se desfaz. Paga quando o Admin deposita."
      })}
    >
      <span className="pro-session-status-flow-label">
        {t(props.language, {
          es: "Estados de la sesión",
          en: "Session states",
          pt: "Estados da sessao"
        })}
      </span>
      <span
        className="pro-session-status-flow-steps"
        aria-label={t(props.language, {
          es: "Reservada, Realizada, Pendiente de cobro, Pagada",
          en: "Reserved, Completed, Pending payout, Paid",
          pt: "Reservada, Realizada, Pendente de cobranca, Paga"
        })}
      >
        {PORTAL_SESSION_FLOW.map((step, index) => (
          <span key={step.id} className="pro-session-status-flow-item">
            {index > 0 ? (
              <span className="pro-session-status-flow-arrow" aria-hidden>
                →
              </span>
            ) : null}
            <span className={`pro-session-status-flow-chip is-${step.id}`}>{t(props.language, step.label)}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
