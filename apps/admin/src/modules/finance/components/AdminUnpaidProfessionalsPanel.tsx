import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { adminSurfaceMessage } from "../../app/lib/friendlyAdminSurfaceMessages";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import { downloadUnpaidProfessionalsExcel } from "../lib/buildUnpaidProfessionalsExcel";
import { adminPendingSessionsHint, adminSessionPayoutStatusCopy } from "../lib/adminSessionPayoutStatus";
import { fetchUnpaidProfessionalDetail, fetchUnpaidProfessionals, fetchDlocalPayouts, fetchDlocalPayoutDetail } from "../services/financeApi";
import type {
  AdminDlocalPayoutTransfer,
  AdminUnpaidProfessional,
  AdminDlocalPayoutTransferDetailResponse,
  UnpaidProfessionalDetailResponse
} from "../types/finance.types";
import { FinanceProfessionalPayoutReview } from "./FinanceProfessionalPayoutReview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type SortKey = "name_az" | "sessions_desc" | "net_desc";

const PAGE_SIZE = 10;

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

function emptyPendingCopy(input: {
  language: AppLanguage;
  hasSearch: boolean;
  hasMonthFilter: boolean;
}): string {
  if (input.hasSearch) {
    return t(input.language, {
      es: "Ningún profesional coincide con la búsqueda.",
      en: "No professional matches that search.",
      pt: "Nenhum profissional corresponde a essa busca."
    });
  }
  if (input.hasMonthFilter) {
    return t(input.language, {
      es: "En ese período no hay sesiones listas para pagar.",
      en: "No sessions are ready to pay in that period.",
      pt: "Nesse período nao ha sessoes prontas para pagar."
    });
  }
  return t(input.language, {
    es: "No hay sesiones listas para pagar. Cuando un profesional las envíe a cobro, van a aparecer acá para transferir por dLocal.",
    en: "No sessions are ready to pay. When a professional submits them for payout, they’ll show up here for a dLocal transfer.",
    pt: "Nao ha sessoes prontas para pagar. Quando um profissional enviar a cobranca, elas aparecem aqui para transferir via dLocal."
  });
}

function emptySentCopy(input: {
  language: AppLanguage;
  hasSearch: boolean;
  hasMonthFilter: boolean;
}): string {
  if (input.hasSearch) {
    return t(input.language, {
      es: "Ninguna transferencia coincide con la búsqueda.",
      en: "No transfer matches that search.",
      pt: "Nenhuma transferencia corresponde a essa busca."
    });
  }
  if (input.hasMonthFilter) {
    return t(input.language, {
      es: "En ese período no hay pagos enviados.",
      en: "No sent payments in that period.",
      pt: "Nesse período nao ha pagamentos enviados."
    });
  }
  return t(input.language, {
    es: "Todavía no hay pagos enviados.",
    en: "No payments have been sent yet.",
    pt: "Ainda nao ha pagamentos enviados."
  });
}

function transferStatusLabel(status: AdminDlocalPayoutTransfer["displayStatus"], language: AppLanguage): string {
  if (status === "delivered") {
    return t(language, { es: "Entregada", en: "Delivered", pt: "Entregue" });
  }
  if (status === "failed") {
    return t(language, { es: "No se completó", en: "Didn’t complete", pt: "Nao concluida" });
  }
  return t(language, { es: "En camino", en: "In transit", pt: "A caminho" });
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
  const [sentTransfers, setSentTransfers] = useState<AdminDlocalPayoutTransfer[]>([]);
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [arrivedProfessionalId, setArrivedProfessionalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [error, setError] = useState("");
  const [reviewTarget, setReviewTarget] = useState<AdminUnpaidProfessional | null>(null);
  const [staged, setStaged] = useState<AdminUnpaidProfessional | null>(null);
  const [stagedDetail, setStagedDetail] = useState<UnpaidProfessionalDetailResponse | null>(null);
  const [stagingId, setStagingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("net_desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [expandedDetails, setExpandedDetails] = useState<Record<string, UnpaidProfessionalDetailResponse>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [expandedSentIds, setExpandedSentIds] = useState<Set<string>>(() => new Set());
  const [expandedSentDetails, setExpandedSentDetails] = useState<Record<string, AdminDlocalPayoutTransferDetailResponse>>(
    {}
  );
  const [sentDetailLoadingId, setSentDetailLoadingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pendingPage, setPendingPage] = useState(1);
  const [sentPage, setSentPage] = useState(1);

  const selectedMonths = useMemo(() => expandMonthKeysInRange(monthFrom, monthTo), [monthFrom, monthTo]);
  const monthsKey = selectedMonths.join(",");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchUnpaidProfessionals(props.token, selectedMonths);
      setRows(response.professionals);
      setExpandedDetails({});
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
    } finally {
      setLoading(false);
    }
  }, [props.language, props.token, selectedMonths]);

  const loadSent = useCallback(async () => {
    setLoadingSent(true);
    setError("");
    try {
      const response = await fetchDlocalPayouts(props.token, selectedMonths);
      setSentTransfers(response.transfers);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
    } finally {
      setLoadingSent(false);
    }
  }, [props.language, props.token, selectedMonths]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSent();
  }, [loadSent]);

  useEffect(() => {
    setPendingPage(1);
    setSentPage(1);
    setExpandedIds(new Set());
    setExpandedSentIds(new Set());
  }, [search, sortKey, monthsKey]);

  useEffect(() => {
    if (!arrivedProfessionalId) {
      return;
    }
    const timer = window.setTimeout(() => setArrivedProfessionalId(null), 4200);
    return () => window.clearTimeout(timer);
  }, [arrivedProfessionalId]);

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

  const queueRows = useMemo(() => {
    if (!staged) {
      return filteredSorted;
    }
    return filteredSorted.filter((row) => row.professionalId !== staged.professionalId);
  }, [filteredSorted, staged]);

  const stagedSessions = useMemo(
    () => (stagedDetail?.sessions ?? []).filter((session) => session.payoutStatus === "pending"),
    [stagedDetail]
  );

  const filteredSent = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return sentTransfers;
    }
    return sentTransfers.filter((row) => row.professionalName.toLowerCase().includes(query));
  }, [sentTransfers, search]);

  const pendingTotals = useMemo(
    () =>
      queueRows.reduce(
        (acc, row) => {
          acc.sessionsCount += row.sessionsCount;
          acc.professionalNetCents += row.professionalNetCents;
          return acc;
        },
        { sessionsCount: 0, professionalNetCents: 0 }
      ),
    [queueRows]
  );

  const sentTotals = useMemo(
    () =>
      filteredSent.reduce(
        (acc, row) => {
          acc.sessionsCount += row.sessionsCount;
          acc.professionalNetCents += row.professionalNetUsdCents;
          return acc;
        },
        { sessionsCount: 0, professionalNetCents: 0 }
      ),
    [filteredSent]
  );

  const pendingTotalPages = Math.max(1, Math.ceil(queueRows.length / PAGE_SIZE));
  const sentTotalPages = Math.max(1, Math.ceil(filteredSent.length / PAGE_SIZE));
  const currentPendingPage = Math.min(pendingPage, pendingTotalPages);
  const currentSentPage = Math.min(sentPage, sentTotalPages);
  const pendingPageStart = queueRows.length === 0 ? 0 : (currentPendingPage - 1) * PAGE_SIZE + 1;
  const pendingPageEnd = Math.min(currentPendingPage * PAGE_SIZE, queueRows.length);
  const sentPageStart = filteredSent.length === 0 ? 0 : (currentSentPage - 1) * PAGE_SIZE + 1;
  const sentPageEnd = Math.min(currentSentPage * PAGE_SIZE, filteredSent.length);
  const pageRows = queueRows.slice((currentPendingPage - 1) * PAGE_SIZE, currentPendingPage * PAGE_SIZE);
  const pageSentRows = filteredSent.slice((currentSentPage - 1) * PAGE_SIZE, currentSentPage * PAGE_SIZE);

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
    setDetailLoadingId(row.professionalId);
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
      setDetailLoadingId(null);
    }
  };

  const unstage = () => {
    setStaged(null);
    setStagedDetail(null);
    setStagingId(null);
  };

  const stageProfessional = async (row: AdminUnpaidProfessional) => {
    setStaged(row);
    setStagedDetail(null);
    setStagingId(row.professionalId);
    setError("");
    try {
      const detail = await fetchUnpaidProfessionalDetail(props.token, row.professionalId, selectedMonths);
      setStagedDetail(detail);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
      setStaged(null);
      setStagedDetail(null);
    } finally {
      setStagingId(null);
    }
  };

  const toggleExpandSent = async (row: AdminDlocalPayoutTransfer) => {
    const isOpen = expandedSentIds.has(row.id);
    if (isOpen) {
      setExpandedSentIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
      return;
    }
    setExpandedSentIds((current) => new Set(current).add(row.id));
    if (expandedSentDetails[row.id]) {
      return;
    }
    setSentDetailLoadingId(row.id);
    setError("");
    try {
      const detail = await fetchDlocalPayoutDetail(props.token, row.id);
      setExpandedSentDetails((current) => ({ ...current, [row.id]: detail }));
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
      setExpandedSentIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    } finally {
      setSentDetailLoadingId(null);
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
            <h2
              className="dashboard-section-title"
              title={t(props.language, {
                es: "Cuentas por pagar y pagos ya enviados.",
                en: "Accounts payable and payments already sent.",
                pt: "Contas a pagar e pagamentos ja enviados."
              })}
            >
              {t(props.language, {
                es: "Pagos a profesionales",
                en: "Professional payouts",
                pt: "Pagamentos a profissionais"
              })}
            </h2>
            <p className="admin-unpaid-professionals-lead">
              {t(props.language, {
                es: "Pasá un profesional a la derecha, revisá las sesiones y armá el pago.",
                en: "Move a professional to the right, review the sessions, then assemble the payout.",
                pt: "Passe um profissional para a direita, revise as sessoes e arme o pagamento."
              })}
            </p>
          </div>
          <div className="admin-unpaid-professionals-head-actions">
            <input
              type="search"
              className="admin-unpaid-search"
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
        <div className="admin-unpaid-board">
          <section className="admin-unpaid-board-col" aria-labelledby="admin-unpaid-col-pending">
            <header className="admin-unpaid-board-col-head">
              <h3 id="admin-unpaid-col-pending">
                {t(props.language, { es: "Por pagar", en: "To pay", pt: "A pagar" })}
              </h3>
              {!loading ? <span className="admin-unpaid-tab-count">{queueRows.length}</span> : null}
            </header>
        {loading ? (
          <p>{t(props.language, { es: "Cargando pendientes…", en: "Loading pending…", pt: "Carregando pendentes…" })}</p>
        ) : queueRows.length === 0 ? (
          <p className="admin-unpaid-empty">
            {staged
              ? t(props.language, {
                  es: "Ese profesional está a la derecha. Armá el pago o quitalo para devolverlo acá.",
                  en: "That professional is on the right. Assemble the payout or remove them to bring them back.",
                  pt: "Esse profissional esta à direita. Arme o pagamento ou remova para devolve-lo."
                })
              : emptyPendingCopy({
                  language: props.language,
                  hasSearch: Boolean(search.trim()),
                  hasMonthFilter
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
                {pageRows.map((row) => {
                  const expanded = expandedIds.has(row.professionalId);
                  const expandedDetail = expandedDetails[row.professionalId] ?? null;
                  const pendingSessions = (expandedDetail?.sessions ?? []).filter(
                    (session) => session.payoutStatus === "pending"
                  );
                  const rowLoading = expanded && !expandedDetail && detailLoadingId === row.professionalId;
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
                            disabled={stagingId === row.professionalId}
                            onClick={() => void stageProfessional(row)}
                          >
                            {stagingId === row.professionalId
                              ? t(props.language, { es: "Pasando…", en: "Moving…", pt: "Passando…" })
                              : t(props.language, { es: "Agregar", en: "Add", pt: "Adicionar" })}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="admin-unpaid-detail-row">
                          <td colSpan={4}>
                            {rowLoading ? (
                              <p className="admin-unpaid-detail-loading">
                                {t(props.language, {
                                  es: "Cargando sesiones…",
                                  en: "Loading sessions…",
                                  pt: "Carregando sessões…"
                                })}
                              </p>
                            ) : pendingSessions.length > 0 ? (
                              <div className="admin-unpaid-session-detail">
                                <p className="admin-unpaid-session-hint">{adminPendingSessionsHint(props.language)}</p>
                                <table className="admin-unpaid-session-table">
                                  <thead>
                                    <tr>
                                      <th>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</th>
                                      <th>{t(props.language, { es: "Qué falta", en: "Next step", pt: "O que falta" })}</th>
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
                                    {pendingSessions.map((session) => {
                                      const statusCopy = adminSessionPayoutStatusCopy(session.payoutStatus, props.language);
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
                                          <span className={`admin-unpaid-status admin-unpaid-status--${statusCopy.tone}`}>
                                            {statusCopy.label}
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
                            ) : expandedDetail ? (
                              <p className="admin-unpaid-detail-empty">
                                {t(props.language, {
                                  es: "No hay sesiones pendientes de envío a DLocal para este profesional.",
                                  en: "No sessions waiting to be sent to DLocal for this professional.",
                                  pt: "Nao ha sessoes pendentes de envio ao DLocal para este profissional."
                                })}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="admin-unpaid-totals-row">
                  <td>
                    {t(props.language, { es: "Total", en: "Total", pt: "Total" })}
                    <span className="admin-unpaid-totals-count">
                      {" "}
                      {t(props.language, {
                        es: `· ${queueRows.length} ${queueRows.length === 1 ? "profesional" : "profesionales"}`,
                        en: `· ${queueRows.length} ${queueRows.length === 1 ? "professional" : "professionals"}`,
                        pt: `· ${queueRows.length} ${queueRows.length === 1 ? "profissional" : "profissionais"}`
                      })}
                    </span>
                  </td>
                  <td className="num">{pendingTotals.sessionsCount}</td>
                  <td className="num admin-unpaid-net">
                    {formatAdminFinanceUsd(pendingTotals.professionalNetCents, props.language)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {queueRows.length > PAGE_SIZE ? (
              <div
                className="admin-unpaid-pager"
                aria-label={t(props.language, { es: "Paginación", en: "Pagination", pt: "Paginacao" })}
              >
                <span className="admin-unpaid-pager-range">
                  {t(props.language, {
                    es: `${pendingPageStart}–${pendingPageEnd} de ${queueRows.length}`,
                    en: `${pendingPageStart}–${pendingPageEnd} of ${queueRows.length}`,
                    pt: `${pendingPageStart}–${pendingPageEnd} de ${queueRows.length}`
                  })}
                </span>
                <div className="admin-unpaid-pager-nav">
                  <button
                    type="button"
                    className="admin-unpaid-pager-btn"
                    disabled={currentPendingPage <= 1}
                    onClick={() => setPendingPage((current) => Math.max(1, current - 1))}
                    aria-label={t(props.language, { es: "Anterior", en: "Previous", pt: "Anterior" })}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="admin-unpaid-pager-btn"
                    disabled={currentPendingPage >= pendingTotalPages}
                    onClick={() => setPendingPage((current) => Math.min(pendingTotalPages, current + 1))}
                    aria-label={t(props.language, { es: "Siguiente", en: "Next", pt: "Seguinte" })}
                  >
                    ›
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
          </section>
          <section className="admin-unpaid-board-col" aria-labelledby="admin-unpaid-col-assemble">
            <header className="admin-unpaid-board-col-head">
              <h3 id="admin-unpaid-col-assemble">
                {t(props.language, { es: "Este pago", en: "This payout", pt: "Este pagamento" })}
              </h3>
              {staged ? <span className="admin-unpaid-tab-count">{stagedSessions.length}</span> : null}
            </header>
            {!staged ? (
              <p className="admin-unpaid-empty">
                {t(props.language, {
                  es: "Pasá un profesional de la izquierda. Acá vas a ver las sesiones y podés armar el pago.",
                  en: "Add a professional from the left. You’ll see the sessions here and can assemble the payout.",
                  pt: "Passe um profissional da esquerda. Aqui voce ve as sessoes e arma o pagamento."
                })}
              </p>
            ) : stagingId && !stagedDetail ? (
              <p className="admin-unpaid-detail-loading">
                {t(props.language, { es: "Cargando sesiones…", en: "Loading sessions…", pt: "Carregando sessões…" })}
              </p>
            ) : (
              <div className="admin-unpaid-assemble">
                <div className="admin-unpaid-assemble-toolbar">
                  <strong className="admin-unpaid-assemble-name">{staged.professionalName}</strong>
                  <button type="button" className="secondary admin-unpaid-assemble-remove" onClick={unstage}>
                    {t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
                  </button>
                </div>
                {stagedSessions.length === 0 ? (
                  <p className="admin-unpaid-empty">
                    {t(props.language, {
                      es: "No hay sesiones listas para incluir en este pago.",
                      en: "No sessions are ready to include in this payout.",
                      pt: "Nao ha sessoes prontas para incluir neste pagamento."
                    })}
                  </p>
                ) : (
                  <div className="admin-unpaid-professionals-table-wrap">
                    <table className="admin-unpaid-session-table">
                      <thead>
                        <tr>
                          <th>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</th>
                          <th>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</th>
                          <th>{t(props.language, { es: "Origen", en: "Source", pt: "Origem" })}</th>
                          <th className="num">{t(props.language, { es: "Neto", en: "Net", pt: "Líquido" })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagedSessions.map((session) => (
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
                                    : t(props.language, { es: "Paquete", en: "Package", pt: "Pacote" })}
                                </strong>
                                <span>{session.sourceLabel}</span>
                              </div>
                            </td>
                            <td className="num">
                              {formatAdminFinanceUsd(session.professionalNetUsdCents, props.language)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="admin-unpaid-totals-row">
                          <td colSpan={3}>
                            {t(props.language, { es: "Total", en: "Total", pt: "Total" })}
                            <span className="admin-unpaid-totals-count">
                              {" "}
                              · {stagedSessions.length}{" "}
                              {stagedSessions.length === 1
                                ? t(props.language, { es: "sesión", en: "session", pt: "sessão" })
                                : t(props.language, { es: "sesiones", en: "sessions", pt: "sessões" })}
                            </span>
                          </td>
                          <td className="num admin-unpaid-net">
                            {formatAdminFinanceUsd(
                              stagedDetail?.totals.pendingProfessionalNetUsdCents ?? staged.professionalNetCents,
                              props.language
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                <button
                  type="button"
                  className="admin-unpaid-assemble-btn"
                  disabled={stagedSessions.length === 0}
                  onClick={() => setReviewTarget(staged)}
                >
                  {t(props.language, { es: "Armar pago", en: "Assemble payout", pt: "Armar pagamento" })}
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="admin-unpaid-sent-block" aria-labelledby="admin-unpaid-col-sent">
            <header className="admin-unpaid-board-col-head">
              <h3 id="admin-unpaid-col-sent">
                {t(props.language, { es: "Enviados", en: "Sent", pt: "Enviados" })}
              </h3>
              {!loadingSent ? <span className="admin-unpaid-tab-count">{sentTransfers.length}</span> : null}
            </header>
        {loadingSent ? (
          <p>
            {t(props.language, {
              es: "Cargando transferencias a dLocal…",
              en: "Loading dLocal transfers…",
              pt: "Carregando transferencias dLocal…"
            })}
          </p>
        ) : filteredSent.length === 0 ? (
          <p className="admin-unpaid-empty">
            {emptySentCopy({
              language: props.language,
              hasSearch: Boolean(search.trim()),
              hasMonthFilter
            })}
          </p>
        ) : (
          <div className="admin-unpaid-professionals-table-wrap">
            <table className="admin-unpaid-professionals-table admin-unpaid-professionals-table--sent">
              <thead>
                <tr>
                  <th>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</th>
                  <th>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</th>
                  <th className="num">{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" })}</th>
                  <th className="num">{t(props.language, { es: "Neto", en: "Net", pt: "Líquido" })}</th>
                  <th>{t(props.language, { es: "ID dLocal", en: "dLocal ID", pt: "ID dLocal" })}</th>
                  <th>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</th>
                </tr>
              </thead>
              <tbody>
                {pageSentRows.map((row) => {
                  const expanded = expandedSentIds.has(row.id);
                  const expandedDetail = expandedSentDetails[row.id] ?? null;
                  const sentSessions = expandedDetail?.sessions ?? [];
                  const rowLoading = expanded && !expandedDetail && sentDetailLoadingId === row.id;
                  const grossCents = expandedDetail?.transfer.grossUsdCents ?? row.grossUsdCents ?? 0;
                  const feeCents = expandedDetail?.transfer.platformFeeUsdCents ?? row.platformFeeUsdCents ?? 0;
                  const netCents = expandedDetail?.transfer.professionalNetUsdCents ?? row.professionalNetUsdCents ?? 0;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={`admin-unpaid-pro-row${expanded ? " is-expanded" : ""}${
                          arrivedProfessionalId === row.professionalId ? " is-arrived" : ""
                        }`}
                        tabIndex={0}
                        aria-expanded={expanded}
                        onClick={() => void toggleExpandSent(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void toggleExpandSent(row);
                          }
                        }}
                      >
                        <td>{formatSessionDay(row.createdAt, props.language)}</td>
                        <td>
                          <span className="admin-unpaid-pro-name">
                            <span aria-hidden>{expanded ? "▾" : "▸"}</span>
                            {row.professionalName}
                          </span>
                        </td>
                        <td className="num">{row.sessionsCount}</td>
                        <td className="num admin-unpaid-net">
                          {formatAdminFinanceUsd(row.professionalNetUsdCents, props.language)}
                        </td>
                        <td>
                          {row.dlocalPayoutId ? (
                            <code className="admin-unpaid-dlocal-id" title={row.dlocalPayoutId}>
                              {row.dlocalPayoutId}
                            </code>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span
                            className={`admin-unpaid-status admin-unpaid-status--${
                              row.displayStatus === "delivered"
                                ? "paid"
                                : row.displayStatus === "failed"
                                  ? "failed"
                                  : "pending"
                            }`}
                          >
                            {transferStatusLabel(row.displayStatus, props.language)}
                          </span>
                          {row.displayStatus === "failed" && row.submissionError ? (
                            <small className="admin-unpaid-transfer-error" title={row.submissionError}>
                              {row.submissionError}
                            </small>
                          ) : null}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="admin-unpaid-detail-row">
                          <td colSpan={6}>
                            {rowLoading ? (
                              <p className="admin-unpaid-detail-loading">
                                {t(props.language, {
                                  es: "Cargando sesiones de este envío…",
                                  en: "Loading sessions in this transfer…",
                                  pt: "Carregando sessoes desta transferencia…"
                                })}
                              </p>
                            ) : (
                              <div className="admin-unpaid-session-detail">
                                <dl className="admin-unpaid-transfer-totals">
                                  <div>
                                    <dt>{t(props.language, { es: "Bruto", en: "Gross", pt: "Bruto" })}</dt>
                                    <dd>{formatAdminFinanceUsd(grossCents, props.language)}</dd>
                                  </div>
                                  <div>
                                    <dt>
                                      {t(props.language, { es: "Comisión MotivarCare", en: "MotivarCare fee", pt: "Comissao MotivarCare" })}
                                    </dt>
                                    <dd>{formatAdminFinanceUsd(feeCents, props.language)}</dd>
                                  </div>
                                  <div>
                                    <dt>{t(props.language, { es: "Neto profesional", en: "Professional net", pt: "Liquido profissional" })}</dt>
                                    <dd>{formatAdminFinanceUsd(netCents, props.language)}</dd>
                                  </div>
                                </dl>
                                {sentSessions.length > 0 ? (
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
                                      {sentSessions.map((session) => (
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
                                            </div>
                                          </td>
                                          <td className="num">
                                            {formatAdminFinanceUsd(session.sessionPriceUsdCents, props.language)}
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
                                ) : (
                                  <p className="admin-unpaid-detail-empty">
                                    {t(props.language, {
                                      es: "De este envío quedó el total, pero no el listado de sesiones (envíos anteriores al detalle, o un rechazo de dLocal antes de guardarlas).",
                                      en: "This transfer kept the totals, but not the session list (older sends, or a dLocal rejection before the snapshot was stored).",
                                      pt: "Desta transferencia ficaram os totais, mas nao a lista de sessoes."
                                    })}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="admin-unpaid-totals-row">
                  <td colSpan={2}>
                    {t(props.language, { es: "Total", en: "Total", pt: "Total" })}
                    <span className="admin-unpaid-totals-count">
                      {" "}
                      {t(props.language, {
                        es: `· ${filteredSent.length} ${filteredSent.length === 1 ? "transferencia" : "transferencias"}`,
                        en: `· ${filteredSent.length} ${filteredSent.length === 1 ? "transfer" : "transfers"}`,
                        pt: `· ${filteredSent.length} ${filteredSent.length === 1 ? "transferencia" : "transferencias"}`
                      })}
                    </span>
                  </td>
                  <td className="num">{sentTotals.sessionsCount}</td>
                  <td className="num admin-unpaid-net">
                    {formatAdminFinanceUsd(sentTotals.professionalNetCents, props.language)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
            {filteredSent.length > PAGE_SIZE ? (
              <div
                className="admin-unpaid-pager"
                aria-label={t(props.language, { es: "Paginación", en: "Pagination", pt: "Paginacao" })}
              >
                <span className="admin-unpaid-pager-range">
                  {t(props.language, {
                    es: `${sentPageStart}–${sentPageEnd} de ${filteredSent.length}`,
                    en: `${sentPageStart}–${sentPageEnd} of ${filteredSent.length}`,
                    pt: `${sentPageStart}–${sentPageEnd} de ${filteredSent.length}`
                  })}
                </span>
                <div className="admin-unpaid-pager-nav">
                  <button
                    type="button"
                    className="admin-unpaid-pager-btn"
                    disabled={currentSentPage <= 1}
                    onClick={() => setSentPage((current) => Math.max(1, current - 1))}
                    aria-label={t(props.language, { es: "Anterior", en: "Previous", pt: "Anterior" })}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="admin-unpaid-pager-btn"
                    disabled={currentSentPage >= sentTotalPages}
                    onClick={() => setSentPage((current) => Math.min(sentTotalPages, current + 1))}
                    aria-label={t(props.language, { es: "Siguiente", en: "Next", pt: "Seguinte" })}
                  >
                    ›
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
          </section>
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
            const paidProfessionalId = reviewTarget.professionalId;
            setReviewTarget(null);
            unstage();
            setArrivedProfessionalId(paidProfessionalId);
            void load();
            void loadSent();
            props.onChanged?.();
          }}
        />
      ) : null}
    </>
  );
}
