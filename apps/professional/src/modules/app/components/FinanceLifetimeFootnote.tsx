import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { formatRecordedFinanceMinor } from "../lib/formatRecordedFinanceMinor";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type LifetimeRow = { currency: string; professionalNetCents: number; sessions: number };

export function FinanceLifetimeFootnote(props: {
  language: AppLanguage;
  lifetimeByCurrency?: LifetimeRow[] | undefined;
  /** Fallback cuando la API no envía desglose */
  legacyNetCents: number;
  legacySessions: number;
  formatLegacyNet: (cents: number) => string;
}) {
  const breakdown = props.lifetimeByCurrency?.length ? props.lifetimeByCurrency : null;

  return (
    <div className="pro-finance-footnote" role="note">
      <span className="pro-finance-footnote__title">
        {t(props.language, { es: "Histórico total", en: "All-time total", pt: "Total historico" })}
      </span>
      {breakdown ? (
        <ul className="pro-finance-lifetime-list">
          {breakdown.map((row) => (
            <li key={row.currency}>
              <span className="pro-currency-chip">{row.currency.toUpperCase()}</span>
              <strong>{formatRecordedFinanceMinor(row.professionalNetCents, row.currency, props.language)}</strong>
              <span className="pro-finance-lifetime-sessions">
                {t(props.language, {
                  es: `${row.sessions} sesiones cobradas`,
                  en: `${row.sessions} paid sessions`,
                  pt: `${row.sessions} sessoes pagas`
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pro-finance-lifetime-legacy">
          <strong>{props.formatLegacyNet(props.legacyNetCents)}</strong>
          <span className="pro-finance-lifetime-sessions">
            {" · "}
            {t(props.language, {
              es: `${props.legacySessions} sesiones`,
              en: `${props.legacySessions} sessions`,
              pt: `${props.legacySessions} sessoes`
            })}
          </span>
        </p>
      )}
    </div>
  );
}
