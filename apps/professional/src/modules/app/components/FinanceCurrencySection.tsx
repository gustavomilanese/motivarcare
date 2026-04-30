import type { ReactNode } from "react";

/** Agrupa KPIs cuando hay varias monedas y evita repetir marcado en JSX. */
export function FinanceCurrencySection(props: {
  currencyCode: string;
  /** Solo si hay más de una moneda en pantalla */
  emphasizeCurrency?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="pro-finance-region">
      {props.emphasizeCurrency ? (
        <span className="pro-finance-region__badge">{props.currencyCode.toUpperCase()}</span>
      ) : null}
      {props.children}
    </div>
  );
}
