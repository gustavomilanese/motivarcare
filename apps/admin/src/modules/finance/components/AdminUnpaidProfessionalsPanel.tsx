import { useCallback, useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { adminSurfaceMessage } from "../../app/lib/friendlyAdminSurfaceMessages";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import { fetchUnpaidProfessionals } from "../services/financeApi";
import type { AdminUnpaidProfessional } from "../types/finance.types";
import { FinanceProfessionalPayoutReview } from "./FinanceProfessionalPayoutReview";

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
  const [error, setError] = useState("");
  const [reviewTarget, setReviewTarget] = useState<AdminUnpaidProfessional | null>(null);

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

  const totalNet = rows.reduce((sum, row) => sum + row.professionalNetCents, 0);

  return (
    <>
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
                es: "Revisá sesión por sesión antes de liquidar. Montos en USD (valor al cobrar).",
                en: "Review session by session before paying out. Amounts in USD (value at checkout).",
                pt: "Revise sessão por sessão antes de liquidar. Valores em USD."
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
                        onClick={() => setReviewTarget(row)}
                      >
                        {t(props.language, {
                          es: "Revisar y pagar",
                          en: "Review & pay",
                          pt: "Revisar e pagar"
                        })}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {reviewTarget ? (
        <FinanceProfessionalPayoutReview
          token={props.token}
          language={props.language}
          professionalId={reviewTarget.professionalId}
          professionalName={reviewTarget.professionalName}
          onClose={() => setReviewTarget(null)}
          onPaid={() => {
            void load();
            props.onChanged?.();
          }}
        />
      ) : null}
    </>
  );
}
