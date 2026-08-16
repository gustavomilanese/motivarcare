import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const STEPS: Array<{ id: "reserved" | "completed" | "payout" | "paid"; label: LocalizedText }> = [
  { id: "reserved", label: { es: "Reservada", en: "Reserved", pt: "Reservada" } },
  { id: "completed", label: { es: "Realizada", en: "Completed", pt: "Realizada" } },
  { id: "payout", label: { es: "En cobro", en: "In payout", pt: "Em cobranca" } },
  { id: "paid", label: { es: "Pagada", en: "Paid", pt: "Paga" } }
];

export function SessionStatusFlowLegend(props: { language: AppLanguage }) {
  return (
    <div
      className="pro-session-status-flow"
      data-tour="pro-tour-status-flow"
      title={t(props.language, {
        es: "Realizada se puede deshacer. Enviar a cobro no: Admin solo paga esas y después quedan Pagada.",
        en: "Completed can be undone. Sending for payout cannot: Admin only pays those, then they become Paid.",
        pt: "Realizada se desfaz. Enviar a cobranca nao: o Admin so paga essas e depois ficam Paga."
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
          es: "Reservada, Realizada, En cobro, Pagada",
          en: "Reserved, Completed, In payout, Paid",
          pt: "Reservada, Realizada, Em cobranca, Paga"
        })}
      >
        {STEPS.map((step, index) => (
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
