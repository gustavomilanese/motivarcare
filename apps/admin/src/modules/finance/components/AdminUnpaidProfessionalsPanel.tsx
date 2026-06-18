import { useCallback, useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { adminSurfaceMessage } from "../../app/lib/friendlyAdminSurfaceMessages";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import { fetchUnpaidProfessionals, payProfessionalUnpaid } from "../services/financeApi";
import type { AdminUnpaidProfessional } from "../types/finance.types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AdminUnpaidProfessionalsPanel(props: {
  token: string;
  language: AppLanguage;
  /** Si viene del KPI, evita fetch inicial duplicado. */
  initialRows?: AdminUnpaidProfessional[];
  compact?: boolean;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<AdminUnpaidProfessional[]>(props.initialRows ?? []);
  const [loading, setLoading] = useState(!props.initialRows);
  const [payingId, setPayingId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchUnpaidProfessionals(props.token);
      setRows(response.professionals);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
    } finally {
      setLoading(false);
    }
  }, [props.language, props.token]);

  useEffect(() => {
    if (props.initialRows) {
      setRows(props.initialRows);
      return;
    }
    void load();
  }, [load, props.initialRows]);

  useEffect(() => {
    if (props.initialRows) {
      setRows(props.initialRows);
    }
  }, [props.initialRows]);

  const handlePay = async (professionalId: string, professionalName: string) => {
    const confirmed = window.confirm(
      t(props.language, {
        es: `¿Confirmás el pago a ${professionalName}? Las sesiones pendientes saldrán de la lista.`,
        en: `Confirm payment to ${professionalName}? Pending sessions will be removed from the list.`,
        pt: `Confirmar pagamento a ${professionalName}? As sessoes pendentes sairao da lista.`
      })
    );
    if (!confirmed) {
      return;
    }
    setPayingId(professionalId);
    setError("");
    try {
      await payProfessionalUnpaid(props.token, professionalId);
      await load();
      props.onChanged?.();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-run-detail", props.language, raw));
    } finally {
      setPayingId("");
    }
  };

  const totalNet = rows.reduce((sum, row) => sum + row.professionalNetCents, 0);

  return (
    <section className={`admin-unpaid-professionals${props.compact ? " admin-unpaid-professionals--compact" : ""}`}>
      <header className="admin-unpaid-professionals-head">
        <div>
          <h3>
            {t(props.language, {
              es: "Pendiente de pagar a profesionales",
              en: "Pending professional payouts",
              pt: "Pendente de pagar a profissionais"
            })}
          </h3>
          <p className="admin-unpaid-professionals-lead">
            {t(props.language, {
              es: "Montos en USD (valor original al cobrar). Al pagar, las sesiones ejecutadas salen de pendientes.",
              en: "Amounts in USD (original value at checkout). Paying removes completed sessions from pending.",
              pt: "Valores em USD (original na cobranca). Ao pagar, as sessoes saem de pendentes."
            })}
          </p>
        </div>
        {!props.compact ? (
          <strong className="admin-unpaid-professionals-total">
            {t(props.language, { es: "Total neto", en: "Total net", pt: "Total liquido" })}:{" "}
            {formatAdminFinanceUsd(totalNet, props.language)}
          </strong>
        ) : null}
      </header>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? (
        <p>{t(props.language, { es: "Cargando pendientes…", en: "Loading pending…", pt: "Carregando pendentes…" })}</p>
      ) : rows.length === 0 ? (
        <p>
          {t(props.language, {
            es: "No hay pagos pendientes a profesionales.",
            en: "No pending payouts to professionals.",
            pt: "Nao ha pagamentos pendentes a profissionais."
          })}
        </p>
      ) : (
        <div className="admin-unpaid-professionals-table-wrap">
          <table className="admin-unpaid-professionals-table">
            <thead>
              <tr>
                <th>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</th>
                <th>{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}</th>
                <th>{t(props.language, { es: "Ejecutado", en: "Executed", pt: "Executado" })}</th>
                <th>{t(props.language, { es: "Comisión", en: "Fee", pt: "Comissao" })}</th>
                <th>{t(props.language, { es: "Neto a pagar", en: "Net to pay", pt: "Liquido a pagar" })}</th>
                <th>{t(props.language, { es: "Acción", en: "Action", pt: "Acao" })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.professionalId}>
                  <td>{row.professionalName}</td>
                  <td>{row.sessionsCount}</td>
                  <td className="num">{formatAdminFinanceUsd(row.grossCents, props.language)}</td>
                  <td className="num">{formatAdminFinanceUsd(row.platformFeeCents, props.language)}</td>
                  <td className="num">{formatAdminFinanceUsd(row.professionalNetCents, props.language)}</td>
                  <td>
                    <button
                      type="button"
                      className="primary"
                      disabled={payingId === row.professionalId}
                      onClick={() => void handlePay(row.professionalId, row.professionalName)}
                    >
                      {payingId === row.professionalId
                        ? t(props.language, { es: "Pagando…", en: "Paying…", pt: "Pagando…" })
                        : t(props.language, { es: "Pagar", en: "Pay", pt: "Pagar" })}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
