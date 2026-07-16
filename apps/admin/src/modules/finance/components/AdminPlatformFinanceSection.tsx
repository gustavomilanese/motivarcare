import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import { adminSurfaceMessage } from "../../app/lib/friendlyAdminSurfaceMessages";
import {
  buildAdminFinanceRangeQuery,
  buildAdminFinanceRangeQueryFromYmd,
  resolveRevenueDateRangeYmd,
  type RevenuePreset,
  ymLocal,
  ymdLocal
} from "../lib/adminFinanceRangeQuery";
import {
  downloadAdminPlatformExecutedExcel,
  downloadAdminPlatformPurchasesExcel
} from "../lib/buildAdminPlatformFinanceExcel";
import { formatAdminExportDateRangeLabel } from "../lib/formatAdminExportDateRangeLabel";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import {
  AdminPlatformFinanceExportModal,
  type ExportDateRange
} from "./AdminPlatformFinanceExportModal";
import { fetchAdminPlatformExecuted, fetchAdminPlatformPurchases } from "../services/financeApi";
import type {
  AdminPlatformExecutedResponse,
  AdminPlatformMovement,
  AdminPlatformPurchase,
  AdminPlatformPurchasesResponse
} from "../types/finance.types";

const EXPORT_PAGE_SIZE = 100;

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type FinanceTab = "executed" | "purchases";
type MovementsSortKey = "date_desc" | "date_asc" | "gross_desc" | "gross_asc";
type MovementsPricingFilter = "all" | "package" | "list";

function formatSessionDay(startsAt: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value: startsAt,
    language,
    options: { month: "short", day: "numeric" }
  });
}

function formatPurchasedDay(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: { year: "numeric", month: "short", day: "numeric" }
  });
}

function sessionNumberLabel(language: AppLanguage, movement: AdminPlatformExecutedResponse["movements"][number]): string {
  if (movement.isTrial) {
    return t(language, { es: "Prueba", en: "Trial", pt: "Teste" });
  }
  if (movement.pricingSource === "package") {
    const credits = movement.packageCredits ?? 0;
    const n = movement.packageSessionNumber ?? 0;
    if (credits > 0 && n > 0) {
      return `${n}/${credits}`;
    }
  }
  return "—";
}

export function AdminPlatformFinanceSection(props: {
  token: string;
  language: AppLanguage;
  professionals: Array<{ professionalId: string; professionalName: string }>;
}) {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<FinanceTab>("executed");
  const [revenuePreset, setRevenuePreset] = useState<RevenuePreset>("month");
  const [revenueDay, setRevenueDay] = useState(() => ymdLocal(new Date()));
  const [revenueMonth, setRevenueMonth] = useState(() => ymLocal(new Date()));
  const [revenueYear, setRevenueYear] = useState(() => String(new Date().getFullYear()));
  const [professionalId, setProfessionalId] = useState("");

  useEffect(() => {
    const platformTab = searchParams.get("platformTab");
    if (platformTab === "purchases" || platformTab === "executed") {
      setTab(platformTab);
    }
    const month = searchParams.get("month")?.trim() ?? "";
    if (/^\d{4}-\d{2}$/.test(month)) {
      setRevenuePreset("month");
      setRevenueMonth(month);
    }
  }, [searchParams]);

  const [executed, setExecuted] = useState<AdminPlatformExecutedResponse | null>(null);
  const [purchases, setPurchases] = useState<AdminPlatformPurchasesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsSearch, setMovementsSearch] = useState("");
  const [movementsSearchDraft, setMovementsSearchDraft] = useState("");
  const [movementsPricing, setMovementsPricing] = useState<MovementsPricingFilter>("all");
  const [movementsSort, setMovementsSort] = useState<MovementsSortKey>("date_desc");

  const [purchasesPage, setPurchasesPage] = useState(1);
  const [purchasesSearch, setPurchasesSearch] = useState("");
  const [purchasesSearchDraft, setPurchasesSearchDraft] = useState("");
  const [purchasesSort, setPurchasesSort] = useState<MovementsSortKey>("date_desc");

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTab, setExportTab] = useState<FinanceTab>("executed");
  const [exporting, setExporting] = useState(false);

  const defaultExportDates = useMemo(
    () => resolveRevenueDateRangeYmd(revenuePreset, revenueDay, revenueMonth, revenueYear),
    [revenuePreset, revenueDay, revenueMonth, revenueYear]
  );

  const selectedProfessionalName = useMemo(() => {
    if (!professionalId) {
      return null;
    }
    return props.professionals.find((pro) => pro.professionalId === professionalId)?.professionalName ?? null;
  }, [professionalId, props.professionals]);

  const exportScopeLabel = useMemo(() => {
    const label = t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" });
    const value =
      selectedProfessionalName ??
      t(props.language, { es: "Todos los profesionales", en: "All professionals", pt: "Todos os profissionais" });
    return `${label}: ${value}`;
  }, [props.language, selectedProfessionalName]);

  const buildExportFiltersSummary = useCallback(
    (tab: FinanceTab): string[] => {
      const parts: string[] = [];
      if (selectedProfessionalName) {
        parts.push(`${t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}: ${selectedProfessionalName}`);
      }
      if (tab === "executed") {
        if (movementsSearch.trim()) {
          parts.push(
            `${t(props.language, { es: "Búsqueda", en: "Search", pt: "Busca" })}: ${movementsSearch.trim()}`
          );
        }
        if (movementsPricing === "package") {
          parts.push(t(props.language, { es: "Tipo: paquete", en: "Type: package", pt: "Tipo: pacote" }));
        }
        if (movementsPricing === "list") {
          parts.push(t(props.language, { es: "Tipo: individual", en: "Type: single", pt: "Tipo: avulsa" }));
        }
      } else if (purchasesSearch.trim()) {
        parts.push(`${t(props.language, { es: "Búsqueda", en: "Search", pt: "Busca" })}: ${purchasesSearch.trim()}`);
      }
      return parts;
    },
    [movementsPricing, movementsSearch, props.language, purchasesSearch, selectedProfessionalName]
  );

  const buildExecutedExportParams = useCallback(
    (range: ExportDateRange, page: number) => {
      const params = new URLSearchParams(buildAdminFinanceRangeQueryFromYmd(range.dateFrom, range.dateTo));
      if (professionalId) {
        params.set("professionalId", professionalId);
      }
      params.set("movementsPage", String(page));
      params.set("movementsPageSize", String(EXPORT_PAGE_SIZE));
      if (movementsSearch.trim()) {
        params.set("movementsSearch", movementsSearch.trim());
      }
      if (movementsPricing !== "all") {
        params.set("movementsPricing", movementsPricing);
      }
      params.set("movementsSort", movementsSort);
      return params.toString();
    },
    [movementsPricing, movementsSearch, movementsSort, professionalId]
  );

  const buildPurchasesExportParams = useCallback(
    (range: ExportDateRange, page: number) => {
      const params = new URLSearchParams(buildAdminFinanceRangeQueryFromYmd(range.dateFrom, range.dateTo));
      if (professionalId) {
        params.set("professionalId", professionalId);
      }
      params.set("purchasesPage", String(page));
      params.set("purchasesPageSize", String(EXPORT_PAGE_SIZE));
      if (purchasesSearch.trim()) {
        params.set("purchasesSearch", purchasesSearch.trim());
      }
      params.set("purchasesSort", purchasesSort);
      return params.toString();
    },
    [professionalId, purchasesSearch, purchasesSort]
  );

  const previewExportCount = useCallback(
    async (range: ExportDateRange): Promise<number> => {
      if (exportTab === "executed") {
        const response = await fetchAdminPlatformExecuted(
          props.token,
          buildExecutedExportParams(range, 1)
        );
        return response.movementsPagination?.total ?? response.movements.length;
      }
      const response = await fetchAdminPlatformPurchases(props.token, buildPurchasesExportParams(range, 1));
      return response.purchasesPagination?.total ?? response.purchases.length;
    },
    [buildExecutedExportParams, buildPurchasesExportParams, exportTab, props.token]
  );

  const fetchAllExecutedForExport = useCallback(
    async (range: ExportDateRange): Promise<AdminPlatformMovement[]> => {
      const first = await fetchAdminPlatformExecuted(props.token, buildExecutedExportParams(range, 1));
      const totalPages = first.movementsPagination?.totalPages ?? 1;
      const all: AdminPlatformMovement[] = [...first.movements];
      for (let page = 2; page <= totalPages; page += 1) {
        const response = await fetchAdminPlatformExecuted(props.token, buildExecutedExportParams(range, page));
        all.push(...response.movements);
      }
      return all;
    },
    [buildExecutedExportParams, props.token]
  );

  const fetchAllPurchasesForExport = useCallback(
    async (range: ExportDateRange): Promise<AdminPlatformPurchase[]> => {
      const first = await fetchAdminPlatformPurchases(props.token, buildPurchasesExportParams(range, 1));
      const totalPages = first.purchasesPagination?.totalPages ?? 1;
      const all: AdminPlatformPurchase[] = [...first.purchases];
      for (let page = 2; page <= totalPages; page += 1) {
        const response = await fetchAdminPlatformPurchases(props.token, buildPurchasesExportParams(range, page));
        all.push(...response.purchases);
      }
      return all;
    },
    [buildPurchasesExportParams, props.token]
  );

  const handleExportConfirm = async (range: ExportDateRange) => {
    setExporting(true);
    try {
      const exportMeta = formatAdminExportDateRangeLabel({
        language: props.language,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        tab: exportTab
      });
      const filtersSummary = buildExportFiltersSummary(exportTab);
      const meta = {
        tab: exportTab,
        periodLabel: exportMeta.label,
        generatedAt: new Date(),
        language: props.language,
        scopeLabel: exportScopeLabel,
        filtersSummary: filtersSummary.length > 0 ? filtersSummary.join(" · ") : null
      };

      if (exportTab === "executed") {
        const movements = await fetchAllExecutedForExport(range);
        await downloadAdminPlatformExecutedExcel({
          movements,
          filenameStem: exportMeta.filenameStem,
          meta
        });
      } else {
        const purchases = await fetchAllPurchasesForExport(range);
        await downloadAdminPlatformPurchasesExcel({
          purchases,
          filenameStem: exportMeta.filenameStem,
          meta
        });
      }
      setExportModalOpen(false);
    } finally {
      setExporting(false);
    }
  };

  const openExportModal = (tab: FinanceTab) => {
    setExportTab(tab);
    setExportModalOpen(true);
  };

  const rangeQuery = useMemo(
    () => buildAdminFinanceRangeQuery(revenuePreset, revenueDay, revenueMonth, revenueYear),
    [revenuePreset, revenueDay, revenueMonth, revenueYear]
  );

  useEffect(() => {
    setMovementsPage(1);
    setPurchasesPage(1);
  }, [revenuePreset, revenueDay, revenueMonth, revenueYear, professionalId]);

  useEffect(() => {
    setMovementsSearchDraft(movementsSearch);
  }, [movementsSearch]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (movementsSearchDraft !== movementsSearch) {
        setMovementsSearch(movementsSearchDraft);
        setMovementsPage(1);
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [movementsSearchDraft, movementsSearch]);

  useEffect(() => {
    setPurchasesSearchDraft(purchasesSearch);
  }, [purchasesSearch]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (purchasesSearchDraft !== purchasesSearch) {
        setPurchasesSearch(purchasesSearchDraft);
        setPurchasesPage(1);
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [purchasesSearchDraft, purchasesSearch]);

  const loadExecuted = useCallback(async () => {
    const params = new URLSearchParams(rangeQuery);
    if (professionalId) {
      params.set("professionalId", professionalId);
    }
    params.set("movementsPage", String(movementsPage));
    params.set("movementsPageSize", "25");
    if (movementsSearch.trim()) {
      params.set("movementsSearch", movementsSearch.trim());
    }
    if (movementsPricing !== "all") {
      params.set("movementsPricing", movementsPricing);
    }
    params.set("movementsSort", movementsSort);
    return fetchAdminPlatformExecuted(props.token, params.toString());
  }, [
    props.token,
    rangeQuery,
    professionalId,
    movementsPage,
    movementsSearch,
    movementsPricing,
    movementsSort
  ]);

  const loadPurchases = useCallback(async () => {
    const params = new URLSearchParams(rangeQuery);
    if (professionalId) {
      params.set("professionalId", professionalId);
    }
    params.set("purchasesPage", String(purchasesPage));
    params.set("purchasesPageSize", "25");
    if (purchasesSearch.trim()) {
      params.set("purchasesSearch", purchasesSearch.trim());
    }
    params.set("purchasesSort", purchasesSort);
    return fetchAdminPlatformPurchases(props.token, params.toString());
  }, [props.token, rangeQuery, professionalId, purchasesPage, purchasesSearch, purchasesSort]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [executedResponse, purchasesResponse] = await Promise.all([loadExecuted(), loadPurchases()]);
        if (!active) {
          return;
        }
        setExecuted(executedResponse);
        setPurchases(purchasesResponse);
      } catch (requestError) {
        if (!active) {
          return;
        }
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(adminSurfaceMessage("admin-kpis-load", props.language, raw));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loadExecuted, loadPurchases, props.language]);

  const activeSummary = tab === "executed" ? executed?.summary : purchases?.summary;

  return (
    <div className="admin-platform-finance">
      <AdminPlatformFinanceExportModal
        language={props.language}
        open={exportModalOpen}
        tab={exportTab}
        defaultDateFrom={defaultExportDates.dateFrom}
        defaultDateTo={defaultExportDates.dateTo}
        filtersSummary={buildExportFiltersSummary(exportTab)}
        exporting={exporting}
        onPreviewCount={previewExportCount}
        onClose={() => {
          if (!exporting) {
            setExportModalOpen(false);
          }
        }}
        onConfirm={(range) => void handleExportConfirm(range)}
      />
      <div className="admin-platform-finance-toolbar" role="group">
        <select
          className="admin-platform-finance-control admin-platform-finance-control--preset"
          value={revenuePreset}
          onChange={(event) => setRevenuePreset(event.target.value as RevenuePreset)}
          aria-label={t(props.language, { es: "Periodo", en: "Period", pt: "Período" })}
        >
          <option value="day">{t(props.language, { es: "Día", en: "Day", pt: "Dia" })}</option>
          <option value="week">{t(props.language, { es: "Semana", en: "Week", pt: "Semana" })}</option>
          <option value="month">{t(props.language, { es: "Mes", en: "Month", pt: "Mes" })}</option>
          <option value="year">{t(props.language, { es: "Año", en: "Year", pt: "Ano" })}</option>
          <option value="all">{t(props.language, { es: "Todo", en: "All time", pt: "Todo" })}</option>
        </select>
        {revenuePreset === "day" || revenuePreset === "week" ? (
          <input
            className="admin-platform-finance-control"
            type="date"
            value={revenueDay}
            onChange={(event) => setRevenueDay(event.target.value)}
            aria-label={t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}
          />
        ) : null}
        {revenuePreset === "month" ? (
          <input
            className="admin-platform-finance-control"
            type="month"
            value={revenueMonth}
            onChange={(event) => setRevenueMonth(event.target.value)}
            aria-label={t(props.language, { es: "Mes", en: "Month", pt: "Mês" })}
          />
        ) : null}
        {revenuePreset === "year" ? (
          <input
            className="admin-platform-finance-control admin-platform-finance-control--year"
            type="number"
            min={2020}
            max={2035}
            value={revenueYear}
            onChange={(event) => setRevenueYear(event.target.value)}
            aria-label={t(props.language, { es: "Año", en: "Year", pt: "Ano" })}
          />
        ) : null}
        <select
          className="admin-platform-finance-control admin-platform-finance-control--pro"
          value={professionalId}
          onChange={(event) => setProfessionalId(event.target.value)}
          aria-label={t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}
        >
          <option value="">{t(props.language, { es: "Todos los profesionales", en: "All professionals", pt: "Todos os profissionais" })}</option>
          {props.professionals.map((pro) => (
            <option key={pro.professionalId} value={pro.professionalId}>
              {pro.professionalName}
            </option>
          ))}
        </select>
        <div className="admin-platform-finance-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "executed"}
            className={tab === "executed" ? "active" : ""}
            onClick={() => setTab("executed")}
          >
            {t(props.language, { es: "Sesiones ejecutadas", en: "Executed sessions", pt: "Sessoes executadas" })}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "purchases"}
            className={tab === "purchases" ? "active" : ""}
            onClick={() => setTab("purchases")}
          >
            {t(props.language, { es: "Ventas", en: "Sales", pt: "Vendas" })}
          </button>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading && !executed ? <p>{t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}</p> : null}

      {activeSummary ? (
        <div className="admin-platform-finance-kpis">
          <article className="kpi-card">
            <span>{tab === "executed" ? t(props.language, { es: "Ejecutado", en: "Executed", pt: "Executado" }) : t(props.language, { es: "Vendido", en: "Sold", pt: "Vendido" })}</span>
            <strong>{formatAdminFinanceUsd(activeSummary.grossCents, props.language)}</strong>
            <small>
              {tab === "executed"
                ? t(props.language, {
                    es: `${(activeSummary as AdminPlatformExecutedResponse["summary"]).completedSessions} sesión(es)`,
                    en: `${(activeSummary as AdminPlatformExecutedResponse["summary"]).completedSessions} session(s)`,
                    pt: `${(activeSummary as AdminPlatformExecutedResponse["summary"]).completedSessions} sessao(oes)`
                  })
                : t(props.language, {
                    es: `${(activeSummary as AdminPlatformPurchasesResponse["summary"]).purchaseCount} venta(s)`,
                    en: `${(activeSummary as AdminPlatformPurchasesResponse["summary"]).purchaseCount} sale(s)`,
                    pt: `${(activeSummary as AdminPlatformPurchasesResponse["summary"]).purchaseCount} venda(s)`
                  })}
            </small>
          </article>
          <article className="kpi-card">
            <span>{t(props.language, { es: "Comisión plataforma", en: "Platform fee", pt: "Comissao plataforma" })}</span>
            <strong>{formatAdminFinanceUsd(activeSummary.platformFeeCents, props.language)}</strong>
            <small>
              {t(props.language, {
                es: `MotivarCare · ${activeSummary.platformCommissionPercent}%`,
                en: `MotivarCare · ${activeSummary.platformCommissionPercent}%`,
                pt: `MotivarCare · ${activeSummary.platformCommissionPercent}%`
              })}
            </small>
          </article>
          <article className="kpi-card">
            <span>{t(props.language, { es: "Neto profesionales", en: "Professional net", pt: "Liquido profissionais" })}</span>
            <strong>{formatAdminFinanceUsd(activeSummary.professionalNetCents, props.language)}</strong>
            <small>
              {t(props.language, {
                es: "después de comisión",
                en: "after platform fee",
                pt: "após comissão"
              })}
            </small>
          </article>
        </div>
      ) : null}

      {tab === "executed" && executed ? (
        <section className="admin-platform-finance-list">
          <div className="admin-platform-finance-list-toolbar admin-platform-finance-list-toolbar--executed">
            <input
              type="search"
              className="admin-platform-finance-control admin-platform-finance-control--search"
              value={movementsSearchDraft}
              placeholder={t(props.language, { es: "Buscar paciente, profesional o paquete…", en: "Search patient, professional or package…", pt: "Buscar paciente, profissional ou pacote…" })}
              onChange={(event) => setMovementsSearchDraft(event.target.value)}
            />
            <select
              className="admin-platform-finance-control"
              value={movementsPricing}
              onChange={(event) => {
                setMovementsPricing(event.target.value as MovementsPricingFilter);
                setMovementsPage(1);
              }}
            >
              <option value="all">{t(props.language, { es: "Todos", en: "All", pt: "Todos" })}</option>
              <option value="package">{t(props.language, { es: "Paquete", en: "Package", pt: "Pacote" })}</option>
              <option value="list">{t(props.language, { es: "Individual", en: "Single", pt: "Avulsa" })}</option>
            </select>
            <select
              className="admin-platform-finance-control"
              value={movementsSort}
              onChange={(event) => setMovementsSort(event.target.value as MovementsSortKey)}
            >
              <option value="date_desc">{t(props.language, { es: "Fecha · reciente", en: "Date · newest", pt: "Data · recente" })}</option>
              <option value="date_asc">{t(props.language, { es: "Fecha · antigua", en: "Date · oldest", pt: "Data · antiga" })}</option>
              <option value="gross_desc">{t(props.language, { es: "Ejecutado · mayor", en: "Executed · highest", pt: "Executado · maior" })}</option>
              <option value="gross_asc">{t(props.language, { es: "Ejecutado · menor", en: "Executed · lowest", pt: "Executado · menor" })}</option>
            </select>
            <button
              type="button"
              className="admin-platform-finance-control admin-platform-finance-export"
              disabled={exporting}
              onClick={() => openExportModal("executed")}
            >
              {exporting && exportTab === "executed"
                ? t(props.language, { es: "Exportando…", en: "Exporting…", pt: "Exportando…" })
                : t(props.language, { es: "Exportar Excel", en: "Export Excel", pt: "Exportar Excel" })}
            </button>
          </div>

          {executed.movements.length === 0 ? (
            <p>{t(props.language, { es: "Sin sesiones en este período.", en: "No sessions in this period.", pt: "Sem sessoes neste periodo." })}</p>
          ) : (
            <>
              <div className="admin-platform-finance-table-wrap">
                <table className="admin-platform-finance-table">
                  <thead>
                    <tr>
                      <th>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</th>
                      <th>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</th>
                      <th>{t(props.language, { es: "Día", en: "Day", pt: "Dia" })}</th>
                      <th>{t(props.language, { es: "# Sesión", en: "# Session", pt: "# Sessao" })}</th>
                      <th>{t(props.language, { es: "Ejecutado", en: "Executed", pt: "Executado" })}</th>
                      <th>{t(props.language, { es: "Comisión", en: "Fee", pt: "Comissao" })}</th>
                      <th>{t(props.language, { es: "Neto", en: "Net", pt: "Liquido" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executed.movements.map((movement) => (
                      <tr key={movement.bookingId}>
                        <td>{movement.professionalName}</td>
                        <td>{movement.patientName}</td>
                        <td>{formatSessionDay(movement.startsAt, props.language)}</td>
                        <td>
                          <span className={movement.isTrial ? "admin-platform-finance-badge admin-platform-finance-badge--trial" : "admin-platform-finance-badge"}>
                            {sessionNumberLabel(props.language, movement)}
                          </span>
                        </td>
                        <td className="num">{formatAdminFinanceUsd(movement.grossCents, props.language)}</td>
                        <td className="num">{formatAdminFinanceUsd(movement.platformFeeCents, props.language)}</td>
                        <td className="num">{formatAdminFinanceUsd(movement.amountCents, props.language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className="admin-platform-finance-pagination">
                <span>
                  {executed.movementsPagination.total === 0
                    ? "0"
                    : `${(executed.movementsPagination.page - 1) * executed.movementsPagination.pageSize + 1}–${Math.min(
                        executed.movementsPagination.page * executed.movementsPagination.pageSize,
                        executed.movementsPagination.total
                      )} / ${executed.movementsPagination.total}`}
                </span>
                <div>
                  <button type="button" disabled={executed.movementsPagination.page <= 1} onClick={() => setMovementsPage((p) => p - 1)}>
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={executed.movementsPagination.page >= executed.movementsPagination.totalPages}
                    onClick={() => setMovementsPage((p) => p + 1)}
                  >
                    ›
                  </button>
                </div>
              </nav>
            </>
          )}
        </section>
      ) : null}

      {tab === "purchases" && purchases ? (
        <section className="admin-platform-finance-list">
          <div className="admin-platform-finance-list-toolbar">
            <input
              type="search"
              className="admin-platform-finance-control admin-platform-finance-control--search"
              value={purchasesSearchDraft}
              placeholder={t(props.language, {
                es: "Buscar paciente, profesional o paquete…",
                en: "Search patient, professional or package…",
                pt: "Buscar paciente, profissional ou pacote…"
              })}
              onChange={(event) => setPurchasesSearchDraft(event.target.value)}
            />
            <select
              className="admin-platform-finance-control"
              value={purchasesSort}
              onChange={(event) => setPurchasesSort(event.target.value as MovementsSortKey)}
            >
              <option value="date_desc">{t(props.language, { es: "Fecha · reciente", en: "Date · newest", pt: "Data · recente" })}</option>
              <option value="date_asc">{t(props.language, { es: "Fecha · antigua", en: "Date · oldest", pt: "Data · antiga" })}</option>
              <option value="gross_desc">{t(props.language, { es: "Vendido · mayor", en: "Sold · highest", pt: "Vendido · maior" })}</option>
              <option value="gross_asc">{t(props.language, { es: "Vendido · menor", en: "Sold · lowest", pt: "Vendido · menor" })}</option>
            </select>
            <button
              type="button"
              className="admin-platform-finance-control admin-platform-finance-export"
              disabled={exporting}
              onClick={() => openExportModal("purchases")}
            >
              {exporting && exportTab === "purchases"
                ? t(props.language, { es: "Exportando…", en: "Exporting…", pt: "Exportando…" })
                : t(props.language, { es: "Exportar Excel", en: "Export Excel", pt: "Exportar Excel" })}
            </button>
          </div>

          {purchases.purchases.length === 0 ? (
            <p>{t(props.language, { es: "Sin ventas en este período.", en: "No sales in this period.", pt: "Sem vendas neste periodo." })}</p>
          ) : (
            <>
              <div className="admin-platform-finance-table-wrap">
                <table className="admin-platform-finance-table">
                  <thead>
                    <tr>
                      <th>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</th>
                      <th>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</th>
                      <th>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</th>
                      <th>{t(props.language, { es: "Paquete", en: "Package", pt: "Pacote" })}</th>
                      <th>{t(props.language, { es: "Créditos", en: "Credits", pt: "Creditos" })}</th>
                      <th>{t(props.language, { es: "Vendido", en: "Sold", pt: "Vendido" })}</th>
                      <th>{t(props.language, { es: "Comisión", en: "Fee", pt: "Comissao" })}</th>
                      <th>{t(props.language, { es: "Neto", en: "Net", pt: "Liquido" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.purchases.map((row) => (
                      <tr key={row.purchaseId}>
                        <td>{formatPurchasedDay(row.purchasedAt, props.language)}</td>
                        <td>{row.professionalName}</td>
                        <td>{row.patientName}</td>
                        <td>{row.packageName}</td>
                        <td>
                          {row.remainingCredits}/{row.totalCredits}
                        </td>
                        <td className="num">{formatAdminFinanceUsd(row.grossCents, props.language)}</td>
                        <td className="num">{formatAdminFinanceUsd(row.platformFeeCents, props.language)}</td>
                        <td className="num">{formatAdminFinanceUsd(row.professionalNetCents, props.language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className="admin-platform-finance-pagination">
                <span>
                  {purchases.purchasesPagination.total === 0
                    ? "0"
                    : `${(purchases.purchasesPagination.page - 1) * purchases.purchasesPagination.pageSize + 1}–${Math.min(
                        purchases.purchasesPagination.page * purchases.purchasesPagination.pageSize,
                        purchases.purchasesPagination.total
                      )} / ${purchases.purchasesPagination.total}`}
                </span>
                <div>
                  <button type="button" disabled={purchases.purchasesPagination.page <= 1} onClick={() => setPurchasesPage((p) => p - 1)}>
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={purchases.purchasesPagination.page >= purchases.purchasesPagination.totalPages}
                    onClick={() => setPurchasesPage((p) => p + 1)}
                  >
                    ›
                  </button>
                </div>
              </nav>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
