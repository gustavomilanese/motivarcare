import { useMemo, useState } from "react";
import {
  closePayoutRun,
  createPayoutRun,
  fetchFinanceOverview,
  fetchFinanceSettings,
  fetchPayoutRunDetail,
  fetchPayoutRuns,
  fetchStripeOperations,
  markPayoutLinePaid,
  patchFinanceSettings,
  rebuildFinanceSessionRecords,
  retryStripeEvent
} from "../services/financeApi";
import {
  EMPTY_CREATE_PAYOUT_DRAFT,
  EMPTY_FINANCE_FILTERS,
  EMPTY_STRIPE_FILTERS,
  type CreatePayoutDraft,
  type FinanceFilters,
  type FinanceOverviewResponse,
  type FinancePayoutRunDetailResponse,
  type FinancePayoutRunSummary,
  type FinanceRules,
  type FinanceStripeEvent,
  type FinanceStripeFilters,
  type FinanceStripeOpsSummary
} from "../types/finance.types";
import {
  buildFinanceOverviewQuery,
  buildFinanceRecordsCsv,
  buildPayoutRunsQuery,
  buildStripeOperationsQuery
} from "../utils/financeDashboard.utils";

interface UseFinanceDashboardParams {
  token: string;
  formatDate: (value: string) => string;
}

export function useFinanceDashboard({ token, formatDate }: UseFinanceDashboardParams) {
  const [filters, setFilters] = useState<FinanceFilters>(EMPTY_FINANCE_FILTERS);
  const [rules, setRules] = useState<FinanceRules | null>(null);
  const [overview, setOverview] = useState<FinanceOverviewResponse | null>(null);
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewPageSize, setOverviewPageSize] = useState(30);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("");
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutPageSize, setPayoutPageSize] = useState(20);
  const [payoutRuns, setPayoutRuns] = useState<FinancePayoutRunSummary[]>([]);
  const [payoutRunsTotal, setPayoutRunsTotal] = useState(0);
  const [stripeFilters, setStripeFilters] = useState<FinanceStripeFilters>(EMPTY_STRIPE_FILTERS);
  const [stripePage, setStripePage] = useState(1);
  const [stripePageSize, setStripePageSize] = useState(12);
  const [stripeEvents, setStripeEvents] = useState<FinanceStripeEvent[]>([]);
  const [stripeSummary, setStripeSummary] = useState<FinanceStripeOpsSummary | null>(null);
  const [stripeEventsTotal, setStripeEventsTotal] = useState(0);
  const [retryingStripeEventId, setRetryingStripeEventId] = useState("");
  const [selectedRun, setSelectedRun] = useState<FinancePayoutRunDetailResponse["run"] | null>(null);
  const [createPayoutDraft, setCreatePayoutDraft] = useState<CreatePayoutDraft>(EMPTY_CREATE_PAYOUT_DRAFT);
  const [loading, setLoading] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [creatingRun, setCreatingRun] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPayoutRuns = async (page = payoutPage, pageSize = payoutPageSize) => {
    const query = buildPayoutRunsQuery(payoutStatusFilter, page, pageSize);
    const response = await fetchPayoutRuns(token, query);
    setPayoutRuns(response.runs);
    setPayoutRunsTotal(response.total);
  };

  const loadStripeOperations = async (page = stripePage, pageSize = stripePageSize) => {
    const query = buildStripeOperationsQuery(stripeFilters, page, pageSize);
    const response = await fetchStripeOperations(token, query);
    setStripeEvents(response.events);
    setStripeSummary(response.summary);
    setStripeEventsTotal(response.total);
  };

  const loadOverview = async (page = overviewPage, pageSize = overviewPageSize) => {
    const [rulesResponse, overviewResponse] = await Promise.all([
      fetchFinanceSettings(token),
      fetchFinanceOverview(token, buildFinanceOverviewQuery(filters, page, pageSize))
    ]);

    setRules(rulesResponse);
    setOverview(overviewResponse);
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadOverview(overviewPage), loadPayoutRuns(payoutPage), loadStripeOperations(stripePage)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los datos de finanzas");
    } finally {
      setLoading(false);
    }
  };

  const loadRunDetail = async (runId: string) => {
    setError("");
    try {
      const run = await fetchPayoutRunDetail(token, runId);
      setSelectedRun(run);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el detalle de la liquidación");
    }
  };

  const saveRules = async () => {
    if (!rules) {
      return;
    }

    setSavingRules(true);
    setError("");
    setSuccess("");
    try {
      const updatedRules = await patchFinanceSettings(token, rules);
      setRules(updatedRules);
      setSuccess("Reglas financieras actualizadas");
      await loadOverview();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron guardar las reglas");
    } finally {
      setSavingRules(false);
    }
  };

  const rebuildLedger = async () => {
    setRebuilding(true);
    setError("");
    setSuccess("");
    try {
      const response = await rebuildFinanceSessionRecords(token);
      setSuccess(`Ledger reconstruido. Registros procesados: ${response.processed}`);
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo reconstruir el ledger financiero");
    } finally {
      setRebuilding(false);
    }
  };

  const submitCreatePayoutRun = async () => {
    if (!createPayoutDraft.periodStart || !createPayoutDraft.periodEnd) {
      setError("Completá fecha de inicio y fecha de fin para generar la liquidación.");
      return;
    }

    setCreatingRun(true);
    setError("");
    setSuccess("");

    try {
      const run = await createPayoutRun(token, {
        periodStart: new Date(`${createPayoutDraft.periodStart}T00:00:00.000Z`).toISOString(),
        periodEnd: new Date(`${createPayoutDraft.periodEnd}T23:59:59.999Z`).toISOString(),
        notes: createPayoutDraft.notes.trim() || undefined
      });

      setSuccess("Corrida de liquidación creada");
      await loadPayoutRuns(1);
      setPayoutPage(1);
      await loadOverview();
      await loadRunDetail(run.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear la corrida de liquidación");
    } finally {
      setCreatingRun(false);
    }
  };

  const markLineAsPaid = async (lineId: string) => {
    setError("");
    setSuccess("");
    try {
      await markPayoutLinePaid(token, lineId);
      setSuccess("Liquidación marcada como pagada");
      if (selectedRun) {
        await loadRunDetail(selectedRun.id);
      }
      await loadPayoutRuns(payoutPage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo marcar el pago");
    }
  };

  const closeSelectedRun = async (runId: string) => {
    setError("");
    setSuccess("");
    try {
      await closePayoutRun(token, runId);
      setSuccess("Corrida de liquidación cerrada");
      await loadPayoutRuns(payoutPage);
      await loadRunDetail(runId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cerrar la corrida de liquidación");
    }
  };

  const clearFilters = () => {
    setFilters(EMPTY_FINANCE_FILTERS);
    setOverviewPage(1);
  };

  const clearStripeFilters = () => {
    setStripeFilters(EMPTY_STRIPE_FILTERS);
    setStripePage(1);
  };

  const retryStripeOperationEvent = async (eventId: string) => {
    setError("");
    setSuccess("");
    setRetryingStripeEventId(eventId);
    try {
      await retryStripeEvent(token, eventId);
      setSuccess("Evento Stripe reencolado para reintento");
      await loadStripeOperations(stripePage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo reintentar el evento Stripe");
    } finally {
      setRetryingStripeEventId("");
    }
  };

  const applyQuickRange = (preset: "7d" | "30d" | "month") => {
    const now = new Date();
    const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

    if (preset === "month") {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      setFilters((current) => ({ ...current, dateFrom: formatDateInput(start), dateTo: formatDateInput(now) }));
      setOverviewPage(1);
      return;
    }

    const days = preset === "7d" ? 7 : 30;
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    setFilters((current) => ({ ...current, dateFrom: formatDateInput(from), dateTo: formatDateInput(now) }));
    setOverviewPage(1);
  };

  const exportRecordsCsv = () => {
    if (!overview || overview.records.length === 0) {
      return;
    }

    const csv = buildFinanceRecordsCsv({
      records: overview.records,
      formatDate
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finanzas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const professionals = useMemo(() => overview?.byProfessional ?? [], [overview]);
  const patients = useMemo(() => overview?.byPatient ?? [], [overview]);
  const packages = useMemo(() => overview?.byPackage ?? [], [overview]);

  const topProfessionals = useMemo(
    () =>
      professionals
        .slice()
        .sort((a, b) => b.professionalNetCents - a.professionalNetCents)
        .slice(0, 8)
        .map((row) => ({
          id: row.professionalId,
          label: row.professionalName,
          subLabel: row.professionalEmail,
          sessions: row.sessions,
          grossCents: row.grossCents,
          platformFeeCents: row.platformFeeCents,
          professionalNetCents: row.professionalNetCents
        })),
    [professionals]
  );

  const topPatients = useMemo(
    () =>
      patients
        .slice()
        .sort((a, b) => b.grossCents - a.grossCents)
        .slice(0, 8)
        .map((row) => ({
          id: row.patientId,
          label: row.patientName,
          subLabel: row.patientEmail,
          sessions: row.sessions,
          grossCents: row.grossCents,
          platformFeeCents: row.platformFeeCents,
          professionalNetCents: row.professionalNetCents
        })),
    [patients]
  );

  const topPackages = useMemo(
    () =>
      packages
        .slice()
        .sort((a, b) => b.grossCents - a.grossCents)
        .slice(0, 8)
        .map((row) => ({
          id: row.packageId ?? "no-package",
          label: row.packageName,
          sessions: row.sessions,
          grossCents: row.grossCents,
          platformFeeCents: row.platformFeeCents,
          professionalNetCents: row.professionalNetCents
        })),
    [packages]
  );

  const overviewTotalPages = Math.max(1, Math.ceil((overview?.total ?? 0) / overviewPageSize));
  const payoutTotalPages = Math.max(1, Math.ceil(payoutRunsTotal / payoutPageSize));
  const stripeTotalPages = Math.max(1, Math.ceil(stripeEventsTotal / stripePageSize));

  return {
    filters,
    setFilters,
    rules,
    setRules,
    overview,
    overviewPage,
    setOverviewPage,
    overviewPageSize,
    setOverviewPageSize,
    payoutStatusFilter,
    setPayoutStatusFilter,
    payoutPage,
    setPayoutPage,
    payoutPageSize,
    setPayoutPageSize,
    payoutRuns,
    stripeFilters,
    setStripeFilters,
    stripePage,
    setStripePage,
    stripePageSize,
    setStripePageSize,
    stripeEvents,
    stripeEventsTotal,
    stripeSummary,
    retryingStripeEventId,
    selectedRun,
    setSelectedRun,
    createPayoutDraft,
    setCreatePayoutDraft,
    loading,
    savingRules,
    rebuilding,
    creatingRun,
    error,
    success,
    topProfessionals,
    topPatients,
    topPackages,
    professionals,
    patients,
    packages,
    overviewTotalPages,
    payoutTotalPages,
    stripeTotalPages,

    loadAll,
    loadOverview,
    loadPayoutRuns,
    loadStripeOperations,
    loadRunDetail,
    saveRules,
    rebuildLedger,
    submitCreatePayoutRun,
    markLineAsPaid,
    closeSelectedRun,
    clearFilters,
    clearStripeFilters,
    applyQuickRange,
    retryStripeOperationEvent,
    exportRecordsCsv
  };
}
