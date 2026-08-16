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

type SortKey = "name_az" | "sessions_desc" | "net_desc";

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

function currentUtcMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive UTC month keys between `from` and `to` (`YYYY-MM`). Empty → []. */
function expandMonthKeysInRange(from: string, to: string): string[] {
  const startKey = from || to;
  const endKey = to || from;
  if (!startKey || !/^\d{4}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}$/.test(endKey)) {
    return [];
  }
  let [fromY, fromM] = startKey.split("-").map(Number);
  let [toY, toM] = endKey.split("-").map(Number);
  if (fromY > toY || (fromY === toY && fromM > toM)) {
    [fromY, fromM, toY, toM] = [toY, toM, fromY, fromM];
  }
  const keys: string[] = [];
  let cy = fromY;
  let cm = fromM;
  while (cy < toY || (cy === toY && cm <= toM)) {
    keys.push(`${cy}-${String(cm).padStart(2, "0")}`);
    cm += 1;
    if (cm > 12) {
      cm = 1;
      cy += 1;
    }
  }
  return keys;
}

function formatMonthKeyLabel(key: string, language: AppLanguage): string {
  if (!/^\d{4}-\d{2}$/.test(key)) return key;
  const [year, month] = key.split("-").map(Number);
  return formatDateWithLocale({
    value: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    language,
    timeZone: "UTC",
    options: { month: "short", year: "numeric" }
  });
}

export function AdminUnpaidProfessionalsPanel(props: {
  token: string;
  language: AppLanguage;
  /** Si viene del KPI, se usa como prefetch hasta el primer fetch con meses. */
  initialRows?: AdminUnpaidProfessional[];
  compact?: boolean;
  creatingLiquidacion?: boolean;
  onCreateLiquidacion?: (months: string[]) => void;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<AdminUnpaidProfessional[]>(props.initialRows ?? []);
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewTarget, setReviewTarget] = useState<AdminUnpaidProfessional | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("net_desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [expandedDetails, setExpandedDetails] = useState<Record<string, UnpaidProfessionalDetailResponse>>({});
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const selectedMonths = useMemo(() => expandMonthKeysInRange(monthFrom, monthTo), [monthFrom, monthTo]);
  const monthsKey = selectedMonths.join(",");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchUnpaidProfessionals(props.token, selectedMonths);
      setRows(response.professionals);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
    } finally {
      setLoading(false);
    }
  }, [props.language, props.token, selectedMonths]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading) {
      return;
    }
    const ids = rows.map((row) => row.professionalId);
    setExpandedIds(new Set(ids));
    if (ids.length === 0) {
      setExpandedDetails({});
      return;
    }

    let cancelled = false;
    setExpandedLoading(true);
    setError("");
    void Promise.all(
      rows.map((row) => fetchUnpaidProfessionalDetail(props.token, row.professionalId, selectedMonths))
    )
      .then((details) => {
        if (cancelled) {
          return;
        }
        const next: Record<string, UnpaidProfessionalDetailResponse> = {};
        details.forEach((detail, index) => {
          next[rows[index].professionalId] = detail;
        });
        setExpandedDetails(next);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
      })
      .finally(() => {
        if (!cancelled) {
          setExpandedLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading, rows, monthsKey, props.language, props.token, selectedMonths]);

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
        case "net_desc":
        default:
          return right.professionalNetCents - left.professionalNetCents;
      }
    });
    return next;
  }, [rows, search, sortKey]);

  const listTotals = useMemo(() => {
    return filteredSorted.reduce(
      (acc, row) => {
        acc.sessionsCount += row.sessionsCount;
        acc.professionalNetCents += row.professionalNetCents;
        return acc;
      },
      { sessionsCount: 0, professionalNetCents: 0 }
    );
  }, [filteredSorted]);

  const maxMonth = useMemo(() => currentUtcMonthKey(), []);
  const hasMonthFilter = Boolean(monthFrom || monthTo);

  const clearMonthFilter = () => {
    setMonthFrom("");
    setMonthTo("");
  };

  const toggleExpand = async (row: AdminUnpaidProfessional) => {
    const isOpen = expandedIds.has(row.professionalId);
    if (isOpen) {
      setExpandedIds((current) => {
        const next = new Set(current);
        next.delete(row.professionalId);
        return next;
      });
      return;
    }
    setExpandedIds((current) => new Set(current).add(row.professionalId));
    if (expandedDetails[row.professionalId]) {
      return;
    }
    setExpandedLoading(true);
    setError("");
    try {
      const detail = await fetchUnpaidProfessionalDetail(props.token, row.professionalId, selectedMonths);
      setExpandedDetails((current) => ({ ...current, [row.professionalId]: detail }));
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
      setExpandedIds((current) => {
        const next = new Set(current);
        next.delete(row.professionalId);
        return next;
      });
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
      const monthsSuffix = selectedMonths.length > 0 ? `-${selectedMonths.join("_")}` : "";
      await downloadUnpaidProfessionalsExcel({
        rows: filteredSorted,
        language: props.language,
        filenameStem: `motivarcare-pendientes-profesionales${monthsSuffix}-${stamp}`
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
          <div className="admin-unpaid-professionals-head-copy">
            <h2 className="dashboard-page-heading">
              {t(props.language, {
                es: "Pendiente de pagar a profesionales",
                en: "Pending professional payouts",
                pt: "Pendente de pagar a profissionais"
              })}
            </h2>
            {!loading && filteredSorted.length > 0 ? (
              <p className="admin-unpaid-professionals-head-total">
                <strong>{formatAdminFinanceUsd(listTotals.professionalNetCents, props.language)}</strong>
                <span>
                  {t(props.language, {
                    es: `${filteredSorted.length === 1 ? "1 profesional" : `${filteredSorted.length} profesionales`} · ${listTotals.sessionsCount} ${listTotals.sessionsCount === 1 ? "sesión" : "sesiones"}`,
                    en: `${filteredSorted.length === 1 ? "1 professional" : `${filteredSorted.length} professionals`} · ${listTotals.sessionsCount} ${listTotals.sessionsCount === 1 ? "session" : "sessions"}`,
                    pt: `${filteredSorted.length === 1 ? "1 profissional" : `${filteredSorted.length} profissionais`} · ${listTotals.sessionsCount} ${listTotals.sessionsCount === 1 ? "sessão" : "sessões"}`
                  })}
                </span>
              </p>
            ) : null}
          </div>
          <div className="admin-unpaid-professionals-head-actions">
            <button
              type="button"
              className={`admin-unpaid-filters-toggle${filtersOpen || hasMonthFilter ? " is-active" : ""}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              {t(props.language, { es: "Filtros", en: "Filters", pt: "Filtros" })}
              {hasMonthFilter ? <span className="admin-unpaid-filters-dot" aria-hidden /> : null}
            </button>
            <button
              type="button"
              className="admin-unpaid-excel-btn"
              disabled={exporting || filteredSorted.length === 0}
              onClick={() => void exportExcel()}
              aria-label={
                exporting
                  ? t(props.language, { es: "Exportando…", en: "Exporting…", pt: "Exportando…" })
                  : t(props.language, { es: "Exportar Excel", en: "Export Excel", pt: "Exportar Excel" })
              }
              title={t(props.language, { es: "Exportar Excel", en: "Export Excel", pt: "Exportar Excel" })}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                <rect x="3" y="2" width="14" height="18" rx="2" fill="#217346" />
                <path d="M6 7h8M6 11h8M6 15h5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="17.5" cy="17.5" r="5.5" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />
                <path d="M17.5 14.5v5M15.5 17.5l2 2 2-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
          </div>
        </header>

        <div className="admin-unpaid-professionals-toolbar">
          <input
            type="search"
            value={search}
            placeholder={t(props.language, {
              es: "Buscar profesional…",
              en: "Search professional…",
              pt: "Buscar profissional…"
            })}
            aria-label={t(props.language, {
              es: "Buscar profesional",
              en: "Search professional",
              pt: "Buscar profissional"
            })}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {filtersOpen ? (
          <div className="admin-unpaid-professionals-filters">
            <div className="admin-unpaid-month-range" role="group" aria-label={t(props.language, { es: "Periodo", en: "Period", pt: "Período" })}>
              <label className="admin-unpaid-filter-label">
                {t(props.language, { es: "Desde", en: "From", pt: "Desde" })}
                <input
                  className="dashboard-month-input"
                  type="month"
                  value={monthFrom}
                  max={monthTo || maxMonth}
                  onChange={(event) => setMonthFrom(event.target.value)}
                />
              </label>
              <label className="admin-unpaid-filter-label">
                {t(props.language, { es: "Hasta", en: "To", pt: "Até" })}
                <input
                  className="dashboard-month-input"
                  type="month"
                  value={monthTo}
                  min={monthFrom || undefined}
                  max={maxMonth}
                  onChange={(event) => setMonthTo(event.target.value)}
                />
              </label>
              {hasMonthFilter ? (
                <button type="button" className="secondary admin-unpaid-month-clear" onClick={clearMonthFilter}>
                  {t(props.language, { es: "Todos los meses", en: "All months", pt: "Todos os meses" })}
                </button>
              ) : null}
            </div>
            {props.onCreateLiquidacion ? (
              <button
                type="button"
                className="primary"
                disabled={props.creatingLiquidacion || selectedMonths.length === 0 || filteredSorted.length === 0}
                onClick={() => props.onCreateLiquidacion?.(selectedMonths)}
                title={t(props.language, {
                  es: "Crea una corrida de liquidación con las sesiones unpaid del mes seleccionado",
                  en: "Creates a payout run with unpaid sessions for the selected month(s)",
                  pt: "Cria uma corrida de liquidacao com sessoes pendentes do(s) mes(es) selecionado(s)"
                })}
              >
                {props.creatingLiquidacion
                  ? t(props.language, { es: "Creando…", en: "Creating…", pt: "Criando…" })
                  : t(props.language, {
                      es: "Crear liquidación del mes",
                      en: "Create month payout run",
                      pt: "Criar liquidacao do mes"
                    })}
              </button>
            ) : null}
          </div>
        ) : hasMonthFilter ? (
          <p className="admin-unpaid-active-period">
            {t(props.language, {
              es: `Periodo: ${formatMonthKeyLabel(monthFrom || monthTo, props.language)}${monthFrom && monthTo && monthFrom !== monthTo ? ` – ${formatMonthKeyLabel(monthTo, props.language)}` : ""}`,
              en: `Period: ${formatMonthKeyLabel(monthFrom || monthTo, props.language)}${monthFrom && monthTo && monthFrom !== monthTo ? ` – ${formatMonthKeyLabel(monthTo, props.language)}` : ""}`,
              pt: `Período: ${formatMonthKeyLabel(monthFrom || monthTo, props.language)}${monthFrom && monthTo && monthFrom !== monthTo ? ` – ${formatMonthKeyLabel(monthTo, props.language)}` : ""}`
            })}
          </p>
        ) : null}

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
              <colgroup>
                <col className="admin-unpaid-col-pro" />
                <col className="admin-unpaid-col-sessions" />
                <col className="admin-unpaid-col-net" />
                <col className="admin-unpaid-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className={`admin-unpaid-sort${sortKey === "name_az" ? " is-active" : ""}`}
                      onClick={() => setSortKey("name_az")}
                    >
                      {t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}
                    </button>
                  </th>
                  <th className="num">
                    <button
                      type="button"
                      className={`admin-unpaid-sort${sortKey === "sessions_desc" ? " is-active" : ""}`}
                      onClick={() => setSortKey("sessions_desc")}
                    >
                      {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" })}
                    </button>
                  </th>
                  <th className="num">
                    <button
                      type="button"
                      className={`admin-unpaid-sort${sortKey === "net_desc" ? " is-active" : ""}`}
                      onClick={() => setSortKey("net_desc")}
                    >
                      {t(props.language, { es: "A pagar", en: "To pay", pt: "A pagar" })}
                    </button>
                  </th>
                  <th className="admin-unpaid-actions-col" />
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((row) => {
                  const expanded = expandedIds.has(row.professionalId);
                  const expandedDetail = expandedDetails[row.professionalId] ?? null;
                  const unit = averageSessionCents(row);
                  const rowLoading = expanded && !expandedDetail && expandedLoading;
                  return (
                    <Fragment key={row.professionalId}>
                      <tr
                        className={`admin-unpaid-pro-row${expanded ? " is-expanded" : ""}`}
                        tabIndex={0}
                        aria-expanded={expanded}
                        onClick={() => void toggleExpand(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void toggleExpand(row);
                          }
                        }}
                      >
                        <td>
                          <span className="admin-unpaid-pro-name">
                            <span aria-hidden>{expanded ? "▾" : "▸"}</span>
                            {row.professionalName}
                          </span>
                        </td>
                        <td className="num">{row.sessionsCount}</td>
                        <td className="num admin-unpaid-net">
                          {formatAdminFinanceUsd(row.professionalNetCents, props.language)}
                        </td>
                        <td
                          className="admin-unpaid-actions"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="admin-unpaid-pay-btn"
                            onClick={() => setReviewTarget(row)}
                          >
                            {t(props.language, {
                              es: "Pagar",
                              en: "Pay",
                              pt: "Pagar"
                            })}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="admin-unpaid-detail-row">
                          <td colSpan={4}>
                            <div className="admin-unpaid-row-metrics">
                              <span>
                                {t(props.language, { es: "Valor / sesión", en: "Value / session", pt: "Valor / sessão" })}
                                <strong>{formatAdminFinanceUsd(unit, props.language)}</strong>
                              </span>
                              <span>
                                {t(props.language, { es: "Ejecutado", en: "Executed", pt: "Executado" })}
                                <strong>{formatAdminFinanceUsd(row.grossCents, props.language)}</strong>
                              </span>
                              <span>
                                {t(props.language, { es: "Comisión", en: "Fee", pt: "Comissão" })}
                                <strong>{formatAdminFinanceUsd(row.platformFeeCents, props.language)}</strong>
                              </span>
                            </div>
                            {rowLoading ? (
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
                                      <th>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</th>
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
                                    {expandedDetail.sessions.map((session) => {
                                      const isPaid = session.payoutStatus === "paid";
                                      const awaitingSubmit = session.payoutStatus === "not_submitted";
                                      return (
                                      <tr key={session.id} className={isPaid ? "is-paid" : awaitingSubmit ? "is-waiting" : "is-pending"}>
                                        <td>
                                          {formatSessionDay(
                                            session.bookingCompletedAt ?? session.bookingStartsAt,
                                            props.language
                                          )}
                                        </td>
                                        <td>
                                          <span
                                            className={`admin-unpaid-status${
                                              isPaid
                                                ? " admin-unpaid-status--paid"
                                                : awaitingSubmit
                                                  ? " admin-unpaid-status--waiting"
                                                  : " admin-unpaid-status--pending"
                                            }`}
                                          >
                                            {isPaid
                                              ? t(props.language, { es: "Pagada", en: "Paid", pt: "Paga" })
                                              : awaitingSubmit
                                                ? t(props.language, {
                                                    es: "No enviada",
                                                    en: "Not sent",
                                                    pt: "Nao enviada"
                                                  })
                                                : t(props.language, {
                                                    es: "En cobro",
                                                    en: "In payout",
                                                    pt: "Em cobranca"
                                                  })}
                                          </span>
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
                                      );
                                    })}
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
          months={selectedMonths}
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
