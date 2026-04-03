import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function FinanceSimulatedCashflowCard(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  accruedCents: number;
  collectedCents: number;
  formatMoney: (cents: number, language: AppLanguage, currency: SupportedCurrency) => string;
}) {
  return (
    <section className="finance-simulated-card card">
      <header className="finance-simulated-head">
        <h3>
          {t(props.language, { es: "Devengado y cobrado (simulado)", en: "Accrued & collected (simulated)", pt: "Devengado e cobrado (simulado)" })}
        </h3>
        <span className="finance-pill-demo" title={t(props.language, { es: "Placeholder hasta integrar cobros", en: "Placeholder until payouts are wired", pt: "Placeholder ate integrar cobrancas" })}>
          {t(props.language, { es: "Demo", en: "Demo", pt: "Demo" })}
        </span>
      </header>
      <p className="finance-simulated-note">
        {t(props.language, {
          es: "Cifras de ejemplo ancladas al mes del resumen. Luego reemplazamos por datos reales de cobranza.",
          en: "Sample figures tied to the summary month. We will swap in real collection data later.",
          pt: "Numeros de exemplo ligados ao mes. Depois dados reais de cobranca."
        })}
      </p>
      <div className="finance-simulated-grid">
        <article className="finance-simulated-kpi">
          <span className="finance-simulated-kpi-label">
            {t(props.language, { es: "Devengado hasta el momento", en: "Accrued to date", pt: "Devengado ate o momento" })}
          </span>
          <strong className="finance-simulated-kpi-value">{props.formatMoney(props.accruedCents, props.language, props.currency)}</strong>
        </article>
        <article className="finance-simulated-kpi">
          <span className="finance-simulated-kpi-label">
            {t(props.language, { es: "Cobrado hasta el momento", en: "Collected to date", pt: "Cobrado ate o momento" })}
          </span>
          <strong className="finance-simulated-kpi-value">{props.formatMoney(props.collectedCents, props.language, props.currency)}</strong>
        </article>
      </div>
    </section>
  );
}
