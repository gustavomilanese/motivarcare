import { useEffect } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyCents,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import { FinanceBreakdownTable } from "../components/FinanceBreakdownTable";
import { FinanceCommissionRulesPanel } from "../components/FinanceCommissionRulesPanel";
import { FinanceMonetizedSessionsPanel } from "../components/FinanceMonetizedSessionsPanel";
import { FinanceOverviewFiltersPanel } from "../components/FinanceOverviewFiltersPanel";
import { FinancePayoutRunDetailPanel } from "../components/FinancePayoutRunDetailPanel";
import { FinancePayoutRunsPanel } from "../components/FinancePayoutRunsPanel";
import { FinanceStripeOperationsPanel } from "../components/FinanceStripeOperationsPanel";
import { FinancesKpiGrid } from "../components/FinancesKpiGrid";
import { useFinanceDashboard } from "../hooks/useFinanceDashboard";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
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

export function FinancesPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const model = useFinanceDashboard({
    token: props.token,
    formatDate: (value) => formatDate(value, props.language)
  });
  const selectedRun = model.selectedRun;

  useEffect(() => {
    void model.loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.token]);

  return (
    <div className="stack-lg ops-page finance-page">
      <section className="card stack finance-kpi-card">
        <header className="toolbar">
          <h2>{t(props.language, { es: "Finanzas y monetización", en: "Finance and monetization", pt: "Financas e monetizacao" })}</h2>
          <div className="toolbar-actions">
            <button className="secondary" type="button" onClick={() => void model.rebuildLedger()} disabled={model.rebuilding}>
              {model.rebuilding ? "Reconstruyendo..." : "Reconstruir ledger"}
            </button>
            <button className="secondary" type="button" onClick={model.exportRecordsCsv} disabled={!model.overview || model.overview.records.length === 0}>
              Exportar CSV
            </button>
            <button className="primary" type="button" onClick={() => void model.loadAll()} disabled={model.loading}>
              {model.loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </header>
        <FinancesKpiGrid
          totals={model.overview?.totals ?? null}
          language={props.language}
          currency={props.currency}
          formatMoney={formatMoneyCents}
        />
      </section>

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
        }}
      />

      <section className="finance-breakdown-grid">
        <FinanceBreakdownTable
          title="Top profesionales por neto"
          rows={model.topProfessionals}
          language={props.language}
          currency={props.currency}
          emptyLabel="No hay profesionales para este filtro."
          formatMoney={formatMoneyCents}
        />
        <FinanceBreakdownTable
          title="Top pacientes por gasto"
          rows={model.topPatients}
          language={props.language}
          currency={props.currency}
          emptyLabel="No hay pacientes para este filtro."
          formatMoney={formatMoneyCents}
        />
        <FinanceBreakdownTable
          title="Top paquetes vendidos"
          rows={model.topPackages}
          language={props.language}
          currency={props.currency}
          emptyLabel="No hay paquetes para este filtro."
          formatMoney={formatMoneyCents}
        />
      </section>

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
    </div>
  );
}
