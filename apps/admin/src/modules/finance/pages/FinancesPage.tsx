import { useCallback, useEffect, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyCents,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import { CollapsiblePageSection } from "../../app/components/CollapsiblePageSection";
import { useStickySectionNavigation } from "../../app/hooks/useStickySectionNavigation";
import { apiRequest } from "../../app/services/api";
import type { KpisResponse } from "../../app/types";
import { FinanceBreakdownTable } from "../components/FinanceBreakdownTable";
import { FinanceCommissionRulesPanel } from "../components/FinanceCommissionRulesPanel";
import { FinanceMonetizedSessionsPanel } from "../components/FinanceMonetizedSessionsPanel";
import { FinanceMonthOverviewSection } from "../components/FinanceMonthOverviewSection";
import { FinanceOverviewFiltersPanel } from "../components/FinanceOverviewFiltersPanel";
import { FINANCE_SCROLL_SECTION_IDS, FinancePageSubnav } from "../components/FinancePageSubnav";
import { FinanceSearchRecordsModal } from "../components/FinanceSearchRecordsModal";
import { FinancePayoutRunDetailPanel } from "../components/FinancePayoutRunDetailPanel";
import { FinancePayoutRunsPanel } from "../components/FinancePayoutRunsPanel";
import { FinanceSimulatedCashflowCard } from "../components/FinanceSimulatedCashflowCard";
import { FinanceStripeOperationsPanel } from "../components/FinanceStripeOperationsPanel";
import { FinancesKpiGrid } from "../components/FinancesKpiGrid";
import { useFinanceDashboard } from "../hooks/useFinanceDashboard";
import { financeSimulatedAccruedCollected } from "../utils/financeSimulated.utils";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function FinanceSearchLensGlyph() {
  return (
    <svg className="finance-hero-search-svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4.2-4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      month: "short",
      day: "numeric",
      year: "numeric",
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

function utcMonthKeyFromDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function FinancesPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const model = useFinanceDashboard({
    token: props.token,
    formatDate: (value) => formatDate(value, props.language)
  });
  const selectedRun = model.selectedRun;

  const [kpisMonth, setKpisMonth] = useState(() => utcMonthKeyFromDate(new Date()));
  const maxKpisMonth = utcMonthKeyFromDate(new Date());
  const [kpisResponse, setKpisResponse] = useState<KpisResponse | null>(null);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [kpisError, setKpisError] = useState("");

  useEffect(() => {
    void model.loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.token]);

  const loadKpis = useCallback(async () => {
    setKpisLoading(true);
    setKpisError("");
    try {
      const query = new URLSearchParams();
      query.set("month", kpisMonth);
      if (model.filters.professionalId) {
        query.set("professionalId", model.filters.professionalId);
      }
      if (model.filters.patientId) {
        query.set("patientId", model.filters.patientId);
      }
      const data = await apiRequest<KpisResponse>(`/api/admin/kpis?${query.toString()}`, {}, props.token);
      setKpisResponse(data);
    } catch (requestError) {
      setKpisResponse(null);
      setKpisError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, { es: "No se pudo cargar el resumen mensual.", en: "Could not load monthly summary.", pt: "Nao foi possivel carregar o resumo." })
      );
    } finally {
      setKpisLoading(false);
    }
  }, [props.token, kpisMonth, props.language, model.filters.professionalId, model.filters.patientId]);

  useEffect(() => {
    void loadKpis();
  }, [loadKpis]);

  const sim = financeSimulatedAccruedCollected(kpisResponse?.kpis);

  const { activeSection: activeFinanceSection, scrollToSection: scrollToFinanceSection } = useStickySectionNavigation(
    FINANCE_SCROLL_SECTION_IDS
  );
  const [searchRecordsModalOpen, setSearchRecordsModalOpen] = useState(false);

  const ledgerSearchTitle = t(props.language, {
    es: "Buscar y filtrar registros del ledger",
    en: "Search and filter ledger records",
    pt: "Buscar e filtrar registros do ledger"
  });

  return (
    <div className="ops-page finance-page">
      <section className="card stack finance-kpi-card finance-page-hero">
        <header className="toolbar">
          <h2>{t(props.language, { es: "Finanzas y monetización", en: "Finance and monetization", pt: "Financas e monetizacao" })}</h2>
          <div className="toolbar-actions">
            <button className="secondary" type="button" onClick={model.exportRecordsCsv} disabled={!model.overview || model.overview.records.length === 0}>
              {t(props.language, { es: "Exportar CSV", en: "Export CSV", pt: "Exportar CSV" })}
            </button>
          </div>
        </header>
        {model.error ? <p className="error-text">{model.error}</p> : null}
      </section>

      <div className="finance-page-subnav-sticky">
        <FinancePageSubnav language={props.language} activeId={activeFinanceSection} onSectionClick={scrollToFinanceSection} />
      </div>

      <FinanceSearchRecordsModal
        open={searchRecordsModalOpen}
        onClose={() => setSearchRecordsModalOpen(false)}
        title={t(props.language, {
          es: "Buscar registros",
          en: "Search records",
          pt: "Buscar registros"
        })}
        closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      >
        <FinanceOverviewFiltersPanel
          filters={model.filters}
          professionals={model.professionals}
          patients={model.patients}
          packages={model.packages}
          overviewPageSize={model.overviewPageSize}
          onFilterChange={(next) => model.setFilters((current) => ({ ...current, ...next }))}
          onPageSizeChange={(nextPageSize) => {
            model.setOverviewPageSize(nextPageSize);
            model.setOverviewPage(1);
            void model.loadOverview(1, nextPageSize);
          }}
          onApplyQuickRange={model.applyQuickRange}
          onClearFilters={model.clearFilters}
          onApplyFilters={() => {
            model.setOverviewPage(1);
            void model.loadOverview(1);
            setSearchRecordsModalOpen(false);
          }}
        />
      </FinanceSearchRecordsModal>

      <CollapsiblePageSection
        sectionId="fin-resumen"
        summary={t(props.language, { es: "Resumen", en: "Overview", pt: "Resumo" })}
        summaryEnd={
          <div
            className="finance-resumen-summary-actions"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <button
              className="secondary finance-resumen-search"
              type="button"
              aria-label={ledgerSearchTitle}
              title={ledgerSearchTitle}
              onClick={() => setSearchRecordsModalOpen(true)}
            >
              <FinanceSearchLensGlyph />
            </button>
            <div className="finance-resumen-month finance-resumen-month--in-summary">
              <div className="dashboard-month-field">
                <input
                  className="dashboard-month-input"
                  type="month"
                  value={kpisMonth}
                  max={maxKpisMonth}
                  onChange={(event) => setKpisMonth(event.target.value)}
                  aria-label={t(props.language, { es: "Mes del resumen", en: "Summary month", pt: "Mes do resumo" })}
                />
              </div>
            </div>
          </div>
        }
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <FinanceMonthOverviewSection
          language={props.language}
          currency={props.currency}
          viewingPastMonth={kpisMonth !== maxKpisMonth}
          scopedToEntity={Boolean(model.filters.professionalId || model.filters.patientId)}
          kpis={kpisResponse?.kpis ?? null}
          loading={kpisLoading}
          error={kpisError || null}
        />
        {kpisResponse?.kpis ? (
          <FinanceSimulatedCashflowCard
            language={props.language}
            currency={props.currency}
            accruedCents={sim.accruedCents}
            collectedCents={sim.collectedCents}
            formatMoney={formatMoneyCents}
          />
        ) : null}
        <h3 className="finance-resume-ledger-heading">
          {t(props.language, { es: "Totales del ledger", en: "Ledger totals", pt: "Totais do ledger" })}
        </h3>
        <p className="finance-resume-ledger-hint">
          {t(props.language, {
            es: "Los totales de abajo siguen los mismos filtros que la lupa en este encabezado (fechas de sesión completada en el ledger).",
            en: "The totals below use the same filters as the search icon in this header (completed session dates in the ledger).",
            pt: "Os totais abaixo seguem os filtros da lupa neste cabecalho."
          })}
        </p>
        <FinancesKpiGrid
          totals={model.overview?.totals ?? null}
          planned={model.overview?.plannedInRange ?? null}
          language={props.language}
          currency={props.currency}
          formatMoney={formatMoneyCents}
        />
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="fin-desglose"
        summary={t(props.language, { es: "Desglose", en: "Breakdown", pt: "Detalhe" })}
      >
        <div className="finance-breakdown-grid">
          <FinanceBreakdownTable
            title={t(props.language, { es: "Top profesionales por neto", en: "Top professionals by net", pt: "Top profissionais por liquido" })}
            rows={model.topProfessionals}
            language={props.language}
            currency={props.currency}
            emptyLabel={t(props.language, { es: "No hay profesionales para este filtro.", en: "No professionals for this filter.", pt: "Sem profissionais neste filtro." })}
            formatMoney={formatMoneyCents}
          />
          <FinanceBreakdownTable
            title={t(props.language, { es: "Top pacientes por gasto", en: "Top patients by spend", pt: "Top pacientes por gasto" })}
            rows={model.topPatients}
            language={props.language}
            currency={props.currency}
            emptyLabel={t(props.language, { es: "No hay pacientes para este filtro.", en: "No patients for this filter.", pt: "Sem pacientes neste filtro." })}
            formatMoney={formatMoneyCents}
          />
          <FinanceBreakdownTable
            title={t(props.language, { es: "Top paquetes vendidos", en: "Top packages sold", pt: "Top pacotes vendidos" })}
            rows={model.topPackages}
            language={props.language}
            currency={props.currency}
            emptyLabel={t(props.language, { es: "No hay paquetes para este filtro.", en: "No packages for this filter.", pt: "Sem pacotes neste filtro." })}
            formatMoney={formatMoneyCents}
          />
        </div>
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="fin-reglas"
        summary={t(props.language, { es: "Reglas", en: "Rules", pt: "Regras" })}
      >
        <FinanceCommissionRulesPanel
          rules={model.rules}
          savingRules={model.savingRules}
          onRuleChange={(key, value) =>
            model.setRules((current) => (current ? { ...current, [key]: value } : current))
          }
          onSave={() => {
            void model.saveRules();
          }}
        />
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="fin-liquidaciones"
        summary={t(props.language, { es: "Liquidaciones", en: "Payouts", pt: "Liquidações" })}
      >
        <FinancePayoutRunsPanel
        language={props.language}
        currency={props.currency}
        payoutStatusFilter={model.payoutStatusFilter}
        payoutPageSize={model.payoutPageSize}
        payoutPage={model.payoutPage}
        payoutTotalPages={model.payoutTotalPages}
        createPayoutDraft={model.createPayoutDraft}
        creatingRun={model.creatingRun}
        payoutRuns={model.payoutRuns}
        onPayoutStatusFilterChange={(value) => {
          model.setPayoutStatusFilter(value);
          model.setPayoutPage(1);
        }}
        onPayoutPageSizeChange={(nextPageSize) => {
          model.setPayoutPageSize(nextPageSize);
          model.setPayoutPage(1);
          void model.loadPayoutRuns(1, nextPageSize);
        }}
        onRefreshRuns={() => {
          void model.loadPayoutRuns(1);
        }}
        onDraftChange={(next) => model.setCreatePayoutDraft((current) => ({ ...current, ...next }))}
        onCreateRun={() => {
          void model.submitCreatePayoutRun();
        }}
        onViewRunDetail={(runId) => {
          void model.loadRunDetail(runId);
        }}
        onPreviousPage={() => {
          const nextPage = Math.max(1, model.payoutPage - 1);
          model.setPayoutPage(nextPage);
          void model.loadPayoutRuns(nextPage);
        }}
        onNextPage={() => {
          const nextPage = model.payoutPage + 1;
          model.setPayoutPage(nextPage);
          void model.loadPayoutRuns(nextPage);
        }}
        formatDate={formatDate}
        formatMoney={formatMoneyCents}
        />
      </CollapsiblePageSection>

      {selectedRun ? (
        <FinancePayoutRunDetailPanel
          language={props.language}
          currency={props.currency}
          run={selectedRun}
          onCloseDetail={() => model.setSelectedRun(null)}
          onCloseRun={() => {
            void model.closeSelectedRun(selectedRun.id);
          }}
          onMarkLinePaid={(lineId) => {
            void model.markLineAsPaid(lineId);
          }}
          formatMoney={formatMoneyCents}
        />
      ) : null}

      <CollapsiblePageSection
        sectionId="fin-stripe"
        summary={t(props.language, { es: "Stripe", en: "Stripe", pt: "Stripe" })}
      >
        <FinanceStripeOperationsPanel
        language={props.language}
        filters={model.stripeFilters}
        summary={model.stripeSummary}
        events={model.stripeEvents}
        page={model.stripePage}
        pageSize={model.stripePageSize}
        totalPages={model.stripeTotalPages}
        totalEvents={model.stripeEventsTotal}
        retryingEventId={model.retryingStripeEventId}
        formatDate={formatDate}
        onFilterChange={(next) => model.setStripeFilters((current) => ({ ...current, ...next }))}
        onPageSizeChange={(nextPageSize) => {
          model.setStripePageSize(nextPageSize);
          model.setStripePage(1);
          void model.loadStripeOperations(1, nextPageSize);
        }}
        onRefresh={() => {
          void model.loadStripeOperations(1);
        }}
        onApplyFilters={() => {
          model.setStripePage(1);
          void model.loadStripeOperations(1);
        }}
        onClearFilters={model.clearStripeFilters}
        onRetry={(eventId) => {
          void model.retryStripeOperationEvent(eventId);
        }}
        onPreviousPage={() => {
          const nextPage = Math.max(1, model.stripePage - 1);
          model.setStripePage(nextPage);
          void model.loadStripeOperations(nextPage);
        }}
        onNextPage={() => {
          const nextPage = model.stripePage + 1;
          model.setStripePage(nextPage);
          void model.loadStripeOperations(nextPage);
        }}
      />
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="fin-registros"
        summary={t(props.language, { es: "Registros", en: "Records", pt: "Registros" })}
      >
      <FinanceMonetizedSessionsPanel
        language={props.language}
        currency={props.currency}
        records={model.overview?.records ?? []}
        total={model.overview?.total ?? 0}
        page={model.overviewPage}
        totalPages={model.overviewTotalPages}
        error={model.error}
        success={model.success}
        onPreviousPage={() => {
          const nextPage = Math.max(1, model.overviewPage - 1);
          model.setOverviewPage(nextPage);
          void model.loadOverview(nextPage);
        }}
        onNextPage={() => {
          const nextPage = model.overviewPage + 1;
          model.setOverviewPage(nextPage);
          void model.loadOverview(nextPage);
        }}
        formatDate={formatDate}
        formatMoney={formatMoneyCents}
      />
      </CollapsiblePageSection>
    </div>
  );
}
