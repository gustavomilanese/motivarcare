import type { AppLanguage, SupportedCurrency } from "@therapy/i18n-config";

interface FinanceBreakdownRow {
  id: string;
  label: string;
  subLabel?: string;
  sessions: number;
  grossCents: number;
  platformFeeCents: number;
  professionalNetCents: number;
}

interface FinanceBreakdownTableProps {
  title: string;
  rows: FinanceBreakdownRow[];
  language: AppLanguage;
  currency: SupportedCurrency;
  emptyLabel: string;
  formatMoney: (cents: number, language: AppLanguage, currency: SupportedCurrency) => string;
}

export function FinanceBreakdownTable(props: FinanceBreakdownTableProps) {
  const maxNet = Math.max(...props.rows.map((row) => row.professionalNetCents), 1);

  return (
    <article className="finance-breakdown-card">
      <header>
        <h4>{props.title}</h4>
      </header>
      {props.rows.length === 0 ? (
        <p className="finance-breakdown-empty">{props.emptyLabel}</p>
      ) : (
        <div className="finance-breakdown-list">
          {props.rows.map((row) => (
            <div key={row.id} className="finance-breakdown-row">
              <div className="finance-breakdown-top">
                <div>
                  <strong>{row.label}</strong>
                  {row.subLabel ? <small>{row.subLabel}</small> : null}
                </div>
                <strong>{props.formatMoney(row.professionalNetCents, props.language, props.currency)}</strong>
              </div>
              <div className="finance-breakdown-meter">
                <span style={{ width: `${Math.max(5, Math.round((row.professionalNetCents / maxNet) * 100))}%` }} />
              </div>
              <div className="finance-breakdown-meta">
                <small>{row.sessions} sesiones</small>
                <small>Bruto: {props.formatMoney(row.grossCents, props.language, props.currency)}</small>
                <small>Plataforma: {props.formatMoney(row.platformFeeCents, props.language, props.currency)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
