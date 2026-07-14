import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { adminSurfaceMessage } from "../../app/lib/friendlyAdminSurfaceMessages";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import { downloadUnpaidProfessionalsExcel } from "../lib/buildUnpaidProfessionalsExcel";
import { fetchUnpaidProfessionalDetail, fetchUnpaidProfessionals } from "../services/financeApi";
import type { AdminUnpaidProfessional, UnpaidProfessionalDetailResponse } from "../types/finance.types";
import { FinanceProfessionalPayoutReview } from "./FinanceProfessionalPayoutReview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type SortKey = "name_az" | "sessions_desc" | "gross_desc" | "fee_desc" | "net_desc";

function averageSessionCents(row: AdminUnpaidProfessional): number {
  if (row.sessionsCount <= 0) {
    return 0;
  }
  return Math.round(row.grossCents / row.sessionsCount);
}

function formatSessionDay(value: string | null, language: AppLanguage): string {
  if (!value) return "—";
  return formatDateWithLocale({
    value,
    language,
    options: { month: "short", day: "numeric", year: "numeric" }
  });
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
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("net_desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, UnpaidProfessionalDetailResponse>>({});
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const filteredSorted = useMemo(() => {
    const query = search.trim().toLowerCase();
    let next = [...rows];
    if (query) {
      next = next.filter((row) => row.professionalName.toLowerCase().includes(query));
    }
    next.sort((left, right) => {
      switch (sortKey) {
        case "name_az":
          return left.professionalName.localeCompare(right.professionalName, undefined, { sensitivity: "base" });
        case "sessions_desc":
          return right.sessionsCount - left.sessionsCount || right.professionalNetCents - left.professionalNetCents;
        case "gross_desc":
          return right.grossCents - left.grossCents;
        case "fee_desc":
          return right.platformFeeCents - left.platformFeeCents;
        case "net_desc":
        default:
          return right.professionalNetCents - left.professionalNetCents;
      }
    });
    return next;
  }, [rows, search, sortKey]);

  const toggleExpand = async (row: AdminUnpaidProfessional) => {
    if (expandedId === row.professionalId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.professionalId);
    if (expandedDetails[row.professionalId]) {
      return;
    }
    setExpandedLoading(true);
    setError("");
    try {
      const detail = await fetchUnpaidProfessionalDetail(props.token, row.professionalId);
      setExpandedDetails((current) => ({ ...current, [row.professionalId]: detail }));
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
      setExpandedId(null);
    } finally {
      setExpandedLoading(false);
    }
  };

  const exportExcel = async () => {
    if (filteredSorted.length === 0 || exporting) {
      return;
    }
    setExporting(true);
    setError("");
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await downloadUnpaidProfessionalsExcel({
        rows: filteredSorted,
        language: props.language,
        filenameStem: `motivarcare-pendientes-profesionales-${stamp}`
      });
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <section className={`admin-unpaid-professionals${props.compact ? " admin-unpaid-professionals--compact" : ""}`}>
        <header className="admin-unpaid-professionals-head">
          <h3>
            {t(props.language, {
              es: "Pendiente de pagar a profesionales",
              en: "Pending professional payouts",
              pt: "Pendente de pagar a profissionais"
            })}
          </h3>
          <button
            type="button"
            className="secondary"
            disabled={exporting || filteredSorted.length === 0}
            onClick={() => void exportExcel()}
          >
            {exporting
              ? t(props.language, { es: "Exportando…", en: "Exporting…", pt: "Exportando…" })
              : t(props.language, { es: "Exportar Excel", en: "Export Excel", pt: "Exportar Excel" })}
          </button>
        </header>

        <div className="admin-unpaid-professionals-toolbar">
          <label>
            <span>{t(props.language, { es: "Buscar profesional", en: "Search professional", pt: "Buscar profissional" })}</span>
            <input
              type="search"
              value={search}
              placeholder={t(props.language, { es: "Nombre…", en: "Name…", pt: "Nome…" })}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            <span>{t(props.language, { es: "Orden", en: "Sort", pt: "Ordem" })}</span>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="net_desc">
                {t(props.language, { es: "Neto · mayor", en: "Net · highest", pt: "Líquido · maior" })}
              </option>
              <option value="gross_desc">
                {t(props.language, { es: "Ejecutado · mayor", en: "Gross · highest", pt: "Executado · maior" })}
              </option>
              <option value="fee_desc">
                {t(props.language, { es: "Comisión · mayor", en: "Fee · highest", pt: "Comissão · maior" })}
              </option>
              <option value="sessions_desc">
                {t(props.language, { es: "Sesiones · más", en: "Sessions · most", pt: "Sessões · mais" })}
              </option>
              <option value="name_az">{t(props.language, { es: "Nombre A–Z", en: "Name A–Z", pt: "Nome A–Z" })}</option>
            </select>
          </label>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {loading ? (
          <p>{t(props.language, { es: "Cargando pendientes…", en: "Loading pending…", pt: "Carregando pendentes…" })}</p>
        ) : filteredSorted.length === 0 ? (
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
                  <th className="num">{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" })}</th>
                  <th className="num">
                    {t(props.language, { es: "Valor / sesión", en: "Value / session", pt: "Valor / sessão" })}
                  </th>
                  <th className="num">{t(props.language, { es: "Ejecutado", en: "Executed", pt: "Executado" })}</th>
                  <th className="num">{t(props.language, { es: "Comisión", en: "Fee", pt: "Comissão" })}</th>
                  <th className="num">{t(props.language, { es: "Neto a pagar", en: "Net to pay", pt: "Líquido" })}</th>
                  <th className="admin-unpaid-actions-col">{t(props.language, { es: "Acciones", en: "Actions", pt: "Ações" })}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((row) => {
                  const expanded = expandedId === row.professionalId;
                  const expandedDetail = expandedDetails[row.professionalId] ?? null;
                  const unit = averageSessionCents(row);
                  return (
                    <Fragment key={row.professionalId}>
                      <tr className={expanded ? "is-expanded" : undefined}>
                        <td>
                          <button
                            type="button"
                            className="admin-unpaid-pro-name"
                            onClick={() => void toggleExpand(row)}
                            aria-expanded={expanded}
                          >
                            <span aria-hidden>{expanded ? "▾" : "▸"}</span>
                            {row.professionalName}
                          </button>
                        </td>
                        <td className="num">{row.sessionsCount}</td>
                        <td className="num">{formatAdminFinanceUsd(unit, props.language)}</td>
                        <td className="num">{formatAdminFinanceUsd(row.grossCents, props.language)}</td>
                        <td className="num">{formatAdminFinanceUsd(row.platformFeeCents, props.language)}</td>
                        <td className="num admin-unpaid-net">
                          {formatAdminFinanceUsd(row.professionalNetCents, props.language)}
                        </td>
                        <td className="admin-unpaid-actions">
                          <button
                            type="button"
                            className="admin-unpaid-icon-btn"
                            onClick={() => void toggleExpand(row)}
                            aria-expanded={expanded}
                            aria-label={
                              expanded
                                ? t(props.language, { es: "Ocultar sesiones", en: "Hide sessions", pt: "Ocultar sessões" })
                                : t(props.language, { es: "Ver sesiones", en: "Show sessions", pt: "Ver sessões" })
                            }
                            title={
                              expanded
                                ? t(props.language, { es: "Ocultar sesiones", en: "Hide sessions", pt: "Ocultar sessões" })
                                : t(props.language, { es: "Ver sesiones", en: "Show sessions", pt: "Ver sessões" })
                            }
                          >
                            <span aria-hidden>{expanded ? "−" : "+"}</span>
                          </button>
                          <button
                            type="button"
                            className="admin-unpaid-icon-btn admin-unpaid-icon-btn--pay"
                            onClick={() => setReviewTarget(row)}
                            aria-label={t(props.language, {
                              es: "Revisar y pagar",
                              en: "Review & pay",
                              pt: "Revisar e pagar"
                            })}
                            title={t(props.language, {
                              es: "Revisar y pagar",
                              en: "Review & pay",
                              pt: "Revisar e pagar"
                            })}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="5" width="20" height="14" rx="2" />
                              <path d="M2 10h20" />
                              <path d="M6 15h2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="admin-unpaid-detail-row">
                          <td colSpan={7}>
                            {expandedLoading ? (
                              <p className="admin-unpaid-detail-loading">
                                {t(props.language, {
                                  es: "Cargando sesiones…",
                                  en: "Loading sessions…",
                                  pt: "Carregando sessões…"
                                })}
                              </p>
                            ) : expandedDetail ? (
                              <div className="admin-unpaid-session-detail">
                                <table className="admin-unpaid-session-table">
                                  <thead>
                                    <tr>
                                      <th>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</th>
                                      <th>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</th>
                                      <th>{t(props.language, { es: "Origen / paquete", en: "Source / package", pt: "Origem" })}</th>
                                      <th className="num">{t(props.language, { es: "Valor sesión", en: "Session value", pt: "Valor" })}</th>
                                      <th className="num">%</th>
                                      <th className="num">{t(props.language, { es: "Comisión", en: "Fee", pt: "Comissão" })}</th>
                                      <th className="num">{t(props.language, { es: "Neto", en: "Net", pt: "Líquido" })}</th>
                                      <th>{t(props.language, { es: "Acción", en: "Action", pt: "Ação" })}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {expandedDetail.sessions.map((session) => (
                                      <tr key={session.id}>
                                        <td>
                                          {formatSessionDay(
                                            session.bookingCompletedAt ?? session.bookingStartsAt,
                                            props.language
                                          )}
                                        </td>
                                        <td>{session.patient.fullName}</td>
                                        <td>
                                          <div className="admin-unpaid-source">
                                            <strong>
                                              {session.sourceKind === "trial"
                                                ? t(props.language, {
                                                    es: "Sesión de prueba",
                                                    en: "Trial session",
                                                    pt: "Sessão teste"
                                                  })
                                                : t(props.language, {
                                                    es: "Paquete",
                                                    en: "Package",
                                                    pt: "Pacote"
                                                  })}
                                            </strong>
                                            <span>{session.sourceLabel}</span>
                                            {session.purchaseId ? (
                                              <small>purchase · {session.purchaseId.slice(0, 8)}</small>
                                            ) : null}
                                            {session.paymentCheckoutId ? (
                                              <small>checkout · {session.paymentCheckoutId.slice(0, 8)}</small>
                                            ) : null}
                                          </div>
                                        </td>
                                        <td className="num">
                                          {formatAdminFinanceUsd(session.sessionPriceUsdCents, props.language)}
                                          {session.currency.toLowerCase() !== "usd" ? (
                                            <small className="admin-unpaid-original">
                                              {" "}
                                              ({session.currency.toUpperCase()}{" "}
                                              {(session.sessionPriceCents / 100).toFixed(2)})
                                            </small>
                                          ) : null}
                                        </td>
                                        <td className="num">{session.platformCommissionPercent}%</td>
                                        <td className="num">
                                          {formatAdminFinanceUsd(session.platformFeeUsdCents, props.language)}
                                        </td>
                                        <td className="num">
                                          {formatAdminFinanceUsd(session.professionalNetUsdCents, props.language)}
                                        </td>
                                        <td>
                                          <Link
                                            className="admin-unpaid-session-link"
                                            to={`/sessions?patientId=${encodeURIComponent(session.patient.id)}`}
                                          >
                                            {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" })}
                                          </Link>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
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
            setReviewTarget(null);
            void load();
            props.onChanged?.();
          }}
        />
      ) : null}
    </>
  );
}
