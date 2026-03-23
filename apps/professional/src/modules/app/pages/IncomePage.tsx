import { useEffect, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyCents,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import type { EarningsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function formatMoneyCents(cents: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency,
    maximumFractionDigits: 0
  });
}

export function IncomePage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<EarningsResponse>("/api/professional/earnings", props.token)
      .then((response) => {
        setData(response);
        setError("");
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudieron cargar ingresos.",
                en: "Could not load earnings.",
                pt: "Nao foi possivel carregar receitas."
              })
        );
      });
  }, [props.token]);

  return (
    <div className="pro-grid-stack">
      <section className="pro-kpi-grid">
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Monto acumulado", en: "Total amount", pt: "Valor acumulado" })}</span>
          <strong>{data ? formatMoneyCents(data.summary.totalCents, props.language, props.currency) : "-"}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Periodo actual", en: "Current period", pt: "Periodo atual" })}</span>
          <strong>{data ? formatMoneyCents(data.summary.currentPeriodCents, props.language, props.currency) : "-"}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Sesiones pagas (mes)", en: "Paid sessions (month)", pt: "Sessoes pagas (mes)" })}</span>
          <strong>{data?.summary.currentPeriodSessions ?? 0}</strong>
        </article>
      </section>

      <section className="pro-card income-details-card">
        <h2>{t(props.language, { es: "Detalle de sesiones", en: "Session details", pt: "Detalhe das sessoes" })}</h2>
        {error ? <p className="pro-error">{error}</p> : null}
        {!data ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
        {data && data.movements.length === 0 ? <p>{t(props.language, { es: "Sin movimientos en el periodo actual.", en: "No movements in the current period.", pt: "Sem movimentos no periodo atual." })}</p> : null}
        {data && data.movements.length > 0 ? (
          <ul className="pro-list">
            {data.movements.map((movement) => (
              <li key={movement.bookingId}>
                <div>
                  <strong>{movement.patientName}</strong>
                  <span>{formatDateTime(movement.startsAt, props.language)}</span>
                </div>
                <span>{formatMoneyCents(movement.amountCents, props.language, props.currency)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
