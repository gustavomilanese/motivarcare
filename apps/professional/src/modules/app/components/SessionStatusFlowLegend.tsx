import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const STEPS: LocalizedText[] = [
  { es: "Reservada", en: "Reserved", pt: "Reservada" },
  { es: "Realizada", en: "Completed", pt: "Realizada" },
  { es: "En cobro", en: "In payout", pt: "Em cobranca" },
  { es: "Pagada", en: "Paid", pt: "Paga" }
];

export function SessionStatusFlowLegend(props: { language: AppLanguage }) {
  return (
    <p
      className="pro-session-status-flow"
      data-tour="pro-tour-status-flow"
      title={t(props.language, {
        es: "Realizada se puede deshacer. Enviar a cobro no: Admin solo paga esas y después quedan Pagada.",
        en: "Completed can be undone. Sending for payout cannot: Admin only pays those, then they become Paid.",
        pt: "Realizada se desfaz. Enviar a cobranca nao: o Admin so paga essas e depois ficam Paga."
      })}
      aria-label={t(props.language, {
        es: "Estados de una sesión: Reservada, Realizada, En cobro, Pagada",
        en: "Session states: Reserved, Completed, In payout, Paid",
        pt: "Estados de uma sessao: Reservada, Realizada, Em cobranca, Paga"
      })}
    >
      {STEPS.map((step, index) => (
        <span key={step.es} className="pro-session-status-flow-item">
          {index > 0 ? (
            <span className="pro-session-status-flow-arrow" aria-hidden>
              →
            </span>
          ) : null}
          <span className="pro-session-status-flow-chip">{t(props.language, step)}</span>
        </span>
      ))}
    </p>
  );
}
