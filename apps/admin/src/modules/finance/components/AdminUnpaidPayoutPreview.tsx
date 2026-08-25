import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import type { AdminUnpaidProfessional } from "../types/finance.types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const PREVIEW_ROWS = 5;

export function AdminUnpaidPayoutPreview(props: {
  language: AppLanguage;
  rows: AdminUnpaidProfessional[];
  loading?: boolean;
}) {
  const previewRows = props.rows.slice(0, PREVIEW_ROWS);
  const remaining = Math.max(0, props.rows.length - previewRows.length);
  const totals = props.rows.reduce(
    (acc, row) => {
      acc.sessionsCount += row.sessionsCount;
      acc.professionalNetCents += row.professionalNetCents;
      return acc;
    },
    { sessionsCount: 0, professionalNetCents: 0 }
  );

  return (
    <section className="admin-unpaid-preview">
      <header className="admin-unpaid-preview-head">
        <h2 className="dashboard-section-title">
          {t(props.language, {
            es: "Pagos a profesionales",
            en: "Professional payouts",
            pt: "Pagamentos a profissionais"
          })}
        </h2>
        <Link className="admin-unpaid-preview-open" to="/pagos">
          {t(props.language, { es: "Abrir pagos", en: "Open payouts", pt: "Abrir pagamentos" })}
        </Link>
      </header>
      {props.loading ? (
        <p className="admin-unpaid-split-note">
          {t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}
        </p>
      ) : props.rows.length === 0 ? (
        <p className="admin-unpaid-preview-empty">
          {t(props.language, { es: "Nada por pagar.", en: "Nothing to pay.", pt: "Nada a pagar." })}
        </p>
      ) : (
        <div className="admin-unpaid-professionals-table-wrap">
          <table className="admin-unpaid-professionals-table admin-unpaid-preview-table">
            <thead>
              <tr>
                <th>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</th>
                <th className="num">{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" })}</th>
                <th className="num">{t(props.language, { es: "A pagar", en: "To pay", pt: "A pagar" })}</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => (
                <tr key={row.professionalId}>
                  <td>{row.professionalName}</td>
                  <td className="num">{row.sessionsCount}</td>
                  <td className="num admin-unpaid-net">
                    {formatAdminFinanceUsd(row.professionalNetCents, props.language)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="admin-unpaid-totals-row">
                <td>
                  {t(props.language, { es: "Total", en: "Total", pt: "Total" })}
                  <span className="admin-unpaid-totals-count"> · {props.rows.length}</span>
                  {remaining > 0 ? (
                    <span className="admin-unpaid-totals-count">
                      {" "}
                      {t(props.language, {
                        es: `(+${remaining} más)`,
                        en: `(+${remaining} more)`,
                        pt: `(+${remaining} mais)`
                      })}
                    </span>
                  ) : null}
                </td>
                <td className="num">{totals.sessionsCount}</td>
                <td className="num admin-unpaid-net">
                  {formatAdminFinanceUsd(totals.professionalNetCents, props.language)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
