import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import {
  ExecutedSessionsList,
  type MovementsPricingFilter,
  type MovementsSortKey
} from "../components/ExecutedSessionsList";
import type { ExportDateRange } from "../components/ExecutedSessionsExportModal";
import { formatRecordedFinanceMinor } from "../lib/formatRecordedFinanceMinor";
import { DashboardRevenuePeriodControl } from "../components/DashboardRevenuePeriodControl";
import { ProPageLoader } from "../components/ProPageLoader";
import { useProPortalChrome } from "../components/ProPortalChromeContext";
import {
  buildProfessionalStatsQuery,
  buildProfessionalStatsQueryFromYmd,
  resolveRevenueDateRangeYmd,
  type RevenuePreset,
  ymLocal,
  ymdLocal
} from "../lib/professionalStatsRangeQuery";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";
import { professionalPortalGreetingDisplayName } from "../lib/portalGreetingDisplayName";
import type { AuthUser, EarningsMovement, EarningsResponse } from "../types";

const EXECUTED_SESSIONS_SECTION_ID = "sesiones-ejecutadas";
const MOVEMENTS_PAGE_SIZE = 25;

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function buildEarningsQuery(input: {
  revenuePreset: RevenuePreset;
  revenueDay: string;
  revenueMonth: string;
  revenueYear: string;
  filterPatientId: string;
  movementsPage: number;
  movementsSearch: string;
  movementsPricing: MovementsPricingFilter;
  movementsSort: MovementsSortKey;
}): string {
  const base = buildProfessionalStatsQuery(
    input.revenuePreset,
    input.revenueDay,
    input.revenueMonth,
    input.revenueYear
  );
  const params = new URLSearchParams(base.startsWith("?") ? base.slice(1) : base);
  if (input.filterPatientId) {
    params.set("patientId", input.filterPatientId);
  }
  params.set("movementsPage", String(input.movementsPage));
  params.set("movementsPageSize", String(MOVEMENTS_PAGE_SIZE));
  if (input.movementsSearch.trim()) {
    params.set("movementsSearch", input.movementsSearch.trim());
  }
  if (input.movementsPricing !== "all") {
    params.set("movementsPricing", input.movementsPricing);
  }
  params.set("movementsSort", input.movementsSort);
  return `?${params.toString()}`;
}

function buildEarningsQueryFromRange(input: {
  dateFrom: string;
  dateTo: string;
  filterPatientId: string;
  movementsPage: number;
  movementsSearch: string;
  movementsPricing: MovementsPricingFilter;
  movementsSort: MovementsSortKey;
}): string {
  const base = buildProfessionalStatsQueryFromYmd(input.dateFrom, input.dateTo);
  const params = new URLSearchParams(base.startsWith("?") ? base.slice(1) : base);
  if (input.filterPatientId) {
    params.set("patientId", input.filterPatientId);
  }
  params.set("movementsPage", String(input.movementsPage));
  params.set("movementsPageSize", String(MOVEMENTS_PAGE_SIZE));
  if (input.movementsSearch.trim()) {
    params.set("movementsSearch", input.movementsSearch.trim());
  }
  if (input.movementsPricing !== "all") {
    params.set("movementsPricing", input.movementsPricing);
  }
  params.set("movementsSort", input.movementsSort);
  return `?${params.toString()}`;
}

export function IncomePage(props: { token: string; language: AppLanguage; user: AuthUser }) {
  const [searchParams] = useSearchParams();
  const filterPatientId = searchParams.get("patientId")?.trim() || "";
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [error, setError] = useState("");
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [revenuePreset, setRevenuePreset] = useState<RevenuePreset>("month");
  const [revenueDay, setRevenueDay] = useState(() => ymdLocal(new Date()));
  const [revenueMonth, setRevenueMonth] = useState(() => ymLocal(new Date()));
  const [revenueYear, setRevenueYear] = useState(() => String(new Date().getFullYear()));
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsSearch, setMovementsSearch] = useState("");
  const [movementsPricing, setMovementsPricing] = useState<MovementsPricingFilter>("all");
  const [movementsSort, setMovementsSort] = useState<MovementsSortKey>("date_desc");

  const statsQuery = useMemo(
    () =>
      buildEarningsQuery({
        revenuePreset,
        revenueDay,
        revenueMonth,
        revenueYear,
        filterPatientId,
        movementsPage,
        movementsSearch,
        movementsPricing,
        movementsSort
      }),
    [
      revenuePreset,
      revenueDay,
      revenueMonth,
      revenueYear,
      filterPatientId,
      movementsPage,
      movementsSearch,
      movementsPricing,
      movementsSort
    ]
  );

  useEffect(() => {
    setMovementsPage(1);
  }, [revenuePreset, revenueDay, revenueMonth, revenueYear, filterPatientId]);

  const handleMovementsSearchChange = useCallback((value: string) => {
    setMovementsSearch(value);
    setMovementsPage(1);
  }, []);

  const handleMovementsPricingChange = useCallback((value: MovementsPricingFilter) => {
    setMovementsPricing(value);
    setMovementsPage(1);
  }, []);

  const handleMovementsSortChange = useCallback((value: MovementsSortKey) => {
    setMovementsSort(value);
    setMovementsPage(1);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setMovementsLoading(true);
      try {
        const response = await apiRequest<EarningsResponse>(`/api/professional/earnings${statsQuery}`, props.token);
        if (active) {
          setData(response);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          const raw = requestError instanceof Error ? requestError.message : "";
          setError(professionalSurfaceMessage("income-load", props.language, raw));
        }
      } finally {
        if (active) {
          setMovementsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [props.token, statsQuery, props.language]);

  useEffect(() => {
    if (window.location.hash !== `#${EXECUTED_SESSIONS_SECTION_ID}`) {
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById(EXECUTED_SESSIONS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [data]);

  const display = data?.display;
  const displayCurrency = display?.currency ?? "usd";
  const summary = display?.summary;

  const formatDisplay = (cents: number) => formatRecordedFinanceMinor(cents, displayCurrency, props.language);

  const scrollToExecutedSessions = () => {
    document.getElementById(EXECUTED_SESSIONS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${EXECUTED_SESSIONS_SECTION_ID}`);
  };

  const defaultExportDates = useMemo(
    () => resolveRevenueDateRangeYmd(revenuePreset, revenueDay, revenueMonth, revenueYear),
    [revenuePreset, revenueDay, revenueMonth, revenueYear]
  );

  const exportFilters = useMemo(
    () => ({
      filterPatientId,
      movementsSearch,
      movementsPricing,
      movementsSort
    }),
    [filterPatientId, movementsSearch, movementsPricing, movementsSort]
  );

  const fetchAllMovementsForExport = useCallback(
    async (range: ExportDateRange): Promise<EarningsMovement[]> => {
      const exportQueryBase = buildEarningsQueryFromRange({
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        filterPatientId: exportFilters.filterPatientId,
        movementsPage: 1,
        movementsSearch: exportFilters.movementsSearch,
        movementsPricing: exportFilters.movementsPricing,
        movementsSort: exportFilters.movementsSort
      });
      const first = await apiRequest<EarningsResponse>(`/api/professional/earnings${exportQueryBase}`, props.token);
      const totalPages = first.movementsPagination?.totalPages ?? 1;
      if (totalPages <= 1) {
        return first.movements;
      }

      const all: EarningsMovement[] = [...first.movements];
      for (let page = 2; page <= totalPages; page += 1) {
        const pageQuery = exportQueryBase.replace(/movementsPage=\d+/, `movementsPage=${page}`);
        const response = await apiRequest<EarningsResponse>(`/api/professional/earnings${pageQuery}`, props.token);
        all.push(...response.movements);
      }
      return all;
    },
    [exportFilters, props.token]
  );

  const previewExportCount = useCallback(
    async (range: ExportDateRange): Promise<number> => {
      const query = buildEarningsQueryFromRange({
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        filterPatientId: exportFilters.filterPatientId,
        movementsPage: 1,
        movementsSearch: exportFilters.movementsSearch,
        movementsPricing: exportFilters.movementsPricing,
        movementsSort: exportFilters.movementsSort
      });
      const response = await apiRequest<EarningsResponse>(`/api/professional/earnings${query}`, props.token);
      return response.movementsPagination?.total ?? response.movements.length;
    },
    [exportFilters, props.token]
  );

  const professionalName = useMemo(
    () => professionalPortalGreetingDisplayName(props.user) || props.user.fullName.trim(),
    [props.user]
  );

  const periodGroupLabel = t(props.language, { es: "Periodo de ingresos", en: "Earnings period", pt: "Periodo de receita" });

  const periodToolbar = useMemo(
    () => (
      <DashboardRevenuePeriodControl
        language={props.language}
        preset={revenuePreset}
        day={revenueDay}
        month={revenueMonth}
        year={revenueYear}
        groupLabel={periodGroupLabel}
        onPresetChange={setRevenuePreset}
        onDayChange={setRevenueDay}
        onMonthChange={setRevenueMonth}
        onYearChange={setRevenueYear}
      />
    ),
    [props.language, periodGroupLabel, revenuePreset, revenueDay, revenueMonth, revenueYear]
  );

  useProPortalChrome({
    title: t(props.language, { es: "Ingresos", en: "Earnings", pt: "Receitas" }),
    toolbar: periodToolbar
  });

  return (
    <div className="pro-grid-stack">
      {filterPatientId ? (
        <div className="pro-income-patient-filter-banner" role="status">
          <p>
            {t(props.language, {
              es: "Mostrando solo movimientos de un paciente.",
              en: "Showing movements for one patient only.",
              pt: "Mostrando apenas movimentos de um paciente."
            })}{" "}
            <Link to="/ingresos">{t(props.language, { es: "Ver todos", en: "View all", pt: "Ver todos" })}</Link>
          </p>
        </div>
      ) : null}
      <section className="pro-card pro-dashboard-revenue" data-tour="pro-tour-income-summary">
        <p className="pro-dashboard-revenue-lead pro-dashboard-revenue-lead--page">
          {t(props.language, {
            es: "Totales de sesiones completadas, según el precio de compra del paciente.",
            en: "Totals from completed sessions, based on the patient's purchase price.",
            pt: "Totais de sessoes concluidas, conforme o preco de compra do paciente."
          })}
        </p>

        {error ? <p className="pro-error">{error}</p> : null}

        {!data || !summary ? (
          <ProPageLoader language={props.language} layout="inline" />
        ) : (
          <>
            <div className="pro-kpi-grid pro-kpi-grid--revenue" data-tour="pro-tour-income-kpis">
              <button type="button" className="pro-kpi-card pro-kpi-card--drilldown" onClick={scrollToExecutedSessions}>
                <span>{t(props.language, { es: "Ejecutado", en: "Executed", pt: "Executado" })}</span>
                <strong>{formatDisplay(summary.grossCents)}</strong>
                <small className="pro-kpi-card-hint">
                  {t(props.language, {
                    es: `${summary.completedSessions} sesión(es) completadas · ver detalle`,
                    en: `${summary.completedSessions} completed session(s) · view detail`,
                    pt: `${summary.completedSessions} sessao(oes) concluidas · ver detalhe`
                  })}
                </small>
              </button>
              <article className="pro-kpi-card">
                <span>{t(props.language, { es: "Comisión", en: "Platform fee", pt: "Comissao" })}</span>
                <strong>{formatDisplay(summary.platformFeeCents)}</strong>
                <small className="pro-kpi-card-hint">
                  {summary.platformCommissionPercent != null
                    ? t(props.language, {
                        es: `MotivarCare · ${summary.platformCommissionPercent}% del ejecutado`,
                        en: `MotivarCare · ${summary.platformCommissionPercent}% of executed`,
                        pt: `MotivarCare · ${summary.platformCommissionPercent}% do executado`
                      })
                    : t(props.language, { es: "MotivarCare.", en: "MotivarCare.", pt: "MotivarCare." })}
                </small>
              </article>
              <div
                className="pro-dashboard-kpi-tip-wrap pro-dashboard-kpi-tip-wrap--focusable"
                tabIndex={0}
                aria-describedby="pro-income-tip-pending"
              >
                <article className="pro-kpi-card">
                  <span>{t(props.language, { es: "Pendiente de cobrar", en: "Pending payout", pt: "Pendente de receber" })}</span>
                  <strong>{formatDisplay(summary.pendingToCollectCents ?? summary.professionalNetCents)}</strong>
                  {summary.collectedNetCents != null && summary.collectedNetCents > 0 ? (
                    <small className="pro-kpi-card-hint">
                      {t(props.language, {
                        es: `Ya cobrado ${formatDisplay(summary.collectedNetCents)} en el período`,
                        en: `Already collected ${formatDisplay(summary.collectedNetCents)} in period`,
                        pt: `Ja recebido ${formatDisplay(summary.collectedNetCents)} no periodo`
                      })}
                    </small>
                  ) : null}
                </article>
                <div id="pro-income-tip-pending" role="tooltip" className="pro-dashboard-kpi-tooltip">
                  <p>
                    {t(props.language, {
                      es: "Ejecutado - Comisión - Cobrado",
                      en: "Executed - Fee - Collected",
                      pt: "Executado - Comissao - Recebido"
                    })}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="pro-card income-details-card" id={EXECUTED_SESSIONS_SECTION_ID} data-tour="pro-tour-income-sessions">
        <div className="pro-income-movements-heading">
          <h2>{t(props.language, { es: "Sesiones ejecutadas", en: "Completed sessions", pt: "Sessoes executadas" })}</h2>
        </div>
        {!data ? null : (
          <ExecutedSessionsList
            language={props.language}
            movements={data.movements}
            displayCurrency={displayCurrency}
            pagination={data.movementsPagination}
            search={movementsSearch}
            pricingFilter={movementsPricing}
            sortKey={movementsSort}
            loading={movementsLoading}
            defaultExportDateFrom={defaultExportDates.dateFrom}
            defaultExportDateTo={defaultExportDates.dateTo}
            professionalName={professionalName}
            patientFilterActive={Boolean(filterPatientId)}
            onSearchChange={handleMovementsSearchChange}
            onPricingFilterChange={handleMovementsPricingChange}
            onSortKeyChange={handleMovementsSortChange}
            onPageChange={setMovementsPage}
            onPreviewExportCount={previewExportCount}
            onExportAll={fetchAllMovementsForExport}
          />
        )}
      </section>
    </div>
  );
}
