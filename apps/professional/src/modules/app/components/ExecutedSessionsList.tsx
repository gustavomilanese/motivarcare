import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { formatRecordedFinanceAmountOnly } from "../lib/formatRecordedFinanceMinor";
import { downloadExecutedSessionsExcel } from "../lib/buildExecutedSessionsExcel";
import { formatExportDateRangeLabel } from "../lib/formatRevenuePeriodLabel";
import { ExecutedSessionsExportModal, type ExportDateRange } from "./ExecutedSessionsExportModal";
import { ProPageLoader } from "./ProPageLoader";
import type { EarningsMovement, EarningsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export type MovementsSortKey = "date_desc" | "date_asc" | "gross_desc" | "gross_asc";
export type MovementsPricingFilter = "all" | "package" | "list";

function formatSessionClock(value: string): string {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  return `${hours}:00`;
}

function resolveSessionEnd(startsAt: string, endsAt?: string): string {
  const start = new Date(startsAt);
  let endHour = start.getHours() + 1;
  if (endsAt) {
    const end = new Date(endsAt);
    endHour = end.getMinutes() > 0 || end.getSeconds() > 0 ? end.getHours() + 1 : end.getHours();
  }
  if (endHour <= start.getHours()) {
    endHour = start.getHours() + 1;
  }
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), endHour, 0, 0, 0).toISOString();
}

function formatSessionDay(startsAt: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value: startsAt,
    language,
    options: {
      month: "short",
      day: "numeric"
    }
  });
}

function formatSessionTimeRange(startsAt: string, endsAt: string | undefined, language: AppLanguage): string {
  const from = formatSessionClock(startsAt);
  const to = formatSessionClock(resolveSessionEnd(startsAt, endsAt));
  const connector = t(language, { es: "a", en: "to", pt: "a" });
  return `${from} ${connector} ${to}`;
}

function sessionNumberLabel(
  language: AppLanguage,
  movement: EarningsMovement
): { label: string; isBadge: boolean; variant?: "trial" | "package" } {
  if (movement.isTrial) {
    return {
      label: t(language, { es: "Prueba", en: "Trial", pt: "Teste" }),
      isBadge: true,
      variant: "trial"
    };
  }
  if (movement.pricingSource === "package") {
    const credits = movement.packageCredits ?? 0;
    const sessionNumber = movement.packageSessionNumber ?? 0;
    if (credits > 0 && sessionNumber > 0) {
      return { label: `${sessionNumber}/${credits}`, isBadge: true, variant: "package" };
    }
    return { label: "—", isBadge: false };
  }
  return { label: "—", isBadge: false };
}

export function ExecutedSessionsList(props: {
  language: AppLanguage;
  movements: EarningsMovement[];
  displayCurrency: string;
  pagination?: EarningsResponse["movementsPagination"];
  search: string;
  pricingFilter: MovementsPricingFilter;
  sortKey: MovementsSortKey;
  loading?: boolean;
  defaultExportDateFrom: string;
  defaultExportDateTo: string;
  professionalName?: string;
  patientFilterActive?: boolean;
  onSearchChange: (value: string) => void;
  onPricingFilterChange: (value: MovementsPricingFilter) => void;
  onSortKeyChange: (value: MovementsSortKey) => void;
  onPageChange: (page: number) => void;
  onPreviewExportCount: (range: ExportDateRange) => Promise<number>;
  onExportAll: (range: ExportDateRange) => Promise<EarningsMovement[]>;
}) {
  const [searchDraft, setSearchDraft] = useState(props.search);
  const [exporting, setExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    setSearchDraft(props.search);
  }, [props.search]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchDraft !== props.search) {
        props.onSearchChange(searchDraft);
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchDraft, props.search, props.onSearchChange]);

  const formatAmount = (cents: number) => formatRecordedFinanceAmountOnly(cents, props.language);

  const pagination = props.pagination;
  const total = pagination?.total ?? props.movements.length;
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 25;
  const totalPages = pagination?.totalPages ?? 1;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const handleExportConfirm = async (range: ExportDateRange) => {
    setExporting(true);
    try {
      const rows = await props.onExportAll(range);
      const exportMeta = formatExportDateRangeLabel({
        language: props.language,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo
      });
      const filterParts: string[] = [];
      if (props.patientFilterActive) {
        filterParts.push(t(props.language, { es: "Un paciente", en: "One patient", pt: "Um paciente" }));
      }
      if (props.search.trim()) {
        filterParts.push(`${t(props.language, { es: "Búsqueda", en: "Search", pt: "Busca" })}: ${props.search.trim()}`);
      }
      if (props.pricingFilter === "package") {
        filterParts.push(t(props.language, { es: "Tipo: paquete", en: "Type: package", pt: "Tipo: pacote" }));
      }
      if (props.pricingFilter === "list") {
        filterParts.push(t(props.language, { es: "Tipo: individual", en: "Type: single", pt: "Tipo: avulsa" }));
      }

      await downloadExecutedSessionsExcel({
        movements: rows,
        filenameStem: exportMeta.filenameStem,
        meta: {
          periodLabel: exportMeta.label,
          generatedAt: new Date(),
          displayCurrency: props.displayCurrency,
          language: props.language,
          professionalName: props.professionalName,
          filtersSummary: filterParts.length > 0 ? filterParts.join(" · ") : null
        }
      });
      setExportModalOpen(false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="pro-executed-sessions">
      <ExecutedSessionsExportModal
        language={props.language}
        open={exportModalOpen}
        defaultDateFrom={props.defaultExportDateFrom}
        defaultDateTo={props.defaultExportDateTo}
        search={props.search}
        pricingFilter={props.pricingFilter}
        patientFilterActive={props.patientFilterActive ?? false}
        exporting={exporting}
        onPreviewCount={props.onPreviewExportCount}
        onClose={() => {
          if (!exporting) {
            setExportModalOpen(false);
          }
        }}
        onConfirm={(range) => void handleExportConfirm(range)}
      />
      <div className="pro-executed-sessions-toolbar">
        <input
          type="search"
          className="pro-dashboard-revenue-control pro-executed-sessions-control--search"
          value={searchDraft}
          placeholder={t(props.language, {
            es: "Buscar paciente o paquete…",
            en: "Search patient or package…",
            pt: "Buscar paciente ou pacote…"
          })}
          aria-label={t(props.language, { es: "Buscar paciente o paquete", en: "Search patient or package", pt: "Buscar paciente ou pacote" })}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <select
          className="pro-dashboard-revenue-control pro-executed-sessions-control--filter"
          value={props.pricingFilter}
          aria-label={t(props.language, { es: "Tipo de sesión", en: "Session type", pt: "Tipo de sessao" })}
          onChange={(event) => props.onPricingFilterChange(event.target.value as MovementsPricingFilter)}
        >
          <option value="all">{t(props.language, { es: "Todos", en: "All", pt: "Todos" })}</option>
          <option value="package">{t(props.language, { es: "Paquete", en: "Package", pt: "Pacote" })}</option>
          <option value="list">{t(props.language, { es: "Individual", en: "Single", pt: "Avulsa" })}</option>
        </select>
        <select
          className="pro-dashboard-revenue-control pro-executed-sessions-control--sort"
          value={props.sortKey}
          aria-label={t(props.language, { es: "Orden", en: "Sort", pt: "Ordem" })}
          onChange={(event) => props.onSortKeyChange(event.target.value as MovementsSortKey)}
        >
          <option value="date_desc">{t(props.language, { es: "Fecha · reciente", en: "Date · newest", pt: "Data · recente" })}</option>
          <option value="date_asc">{t(props.language, { es: "Fecha · antigua", en: "Date · oldest", pt: "Data · antiga" })}</option>
          <option value="gross_desc">{t(props.language, { es: "Ejecutado · mayor", en: "Executed · highest", pt: "Executado · maior" })}</option>
          <option value="gross_asc">{t(props.language, { es: "Ejecutado · menor", en: "Executed · lowest", pt: "Executado · menor" })}</option>
        </select>
        <button
          type="button"
          className="pro-dashboard-revenue-control pro-executed-sessions-export"
          disabled={exporting}
          onClick={() => setExportModalOpen(true)}
        >
          {exporting
            ? t(props.language, { es: "Exportando…", en: "Exporting…", pt: "Exportando…" })
            : t(props.language, { es: "Exportar Excel", en: "Export Excel", pt: "Exportar Excel" })}
        </button>
      </div>

      {props.loading ? (
        <ProPageLoader language={props.language} layout="inline" />
      ) : props.movements.length === 0 ? (
        <p>
          {total === 0
            ? t(props.language, {
                es: "Sin sesiones completadas en este período.",
                en: "No completed sessions in this period.",
                pt: "Sem sessoes concluidas neste periodo."
              })
            : t(props.language, {
                es: "Ninguna sesión coincide con los filtros.",
                en: "No sessions match the filters.",
                pt: "Nenhuma sessao corresponde aos filtros."
              })}
        </p>
      ) : (
        <>
          <div className="pro-executed-sessions-table">
            <div className="pro-executed-sessions-table-scroll">
              <div className="pro-executed-sessions-table-head">
                <span>{t(props.language, { es: "Nombre", en: "Name", pt: "Nome" })}</span>
                <span>{t(props.language, { es: "Día", en: "Day", pt: "Dia" })}</span>
                <span>{t(props.language, { es: "Horario", en: "Time", pt: "Horario" })}</span>
                <span>{t(props.language, { es: "# Sesión", en: "# Session", pt: "# Sessao" })}</span>
                <span>{t(props.language, { es: "Ejecutado", en: "Executed", pt: "Executado" })}</span>
                <span>{t(props.language, { es: "Comisión", en: "Fee", pt: "Comissao" })}</span>
                <span>{t(props.language, { es: "Neto", en: "Net", pt: "Liquido" })}</span>
              </div>
              <ul className="pro-executed-sessions-list">
                {props.movements.map((movement) => {
                  const sessionNumber = sessionNumberLabel(props.language, movement);
                  return (
                    <li key={movement.bookingId} className="pro-executed-session-row">
                      <div className="pro-executed-session-cell pro-executed-session-cell--name">
                        {movement.patientId ? (
                          <Link className="pro-executed-session-patient-link" to={`/pacientes/${movement.patientId}`}>
                            {movement.patientName}
                          </Link>
                        ) : (
                          <span className="pro-executed-session-patient-name">{movement.patientName}</span>
                        )}
                      </div>
                      <span className="pro-executed-session-cell pro-executed-session-cell--day">
                        {formatSessionDay(movement.startsAt, props.language)}
                      </span>
                      <span className="pro-executed-session-cell pro-executed-session-cell--time">
                        {formatSessionTimeRange(movement.startsAt, movement.endsAt, props.language)}
                      </span>
                      <span className="pro-executed-session-cell pro-executed-session-cell--session">
                        {sessionNumber.isBadge ? (
                          <span
                            className={`pro-executed-session-session-badge${
                              sessionNumber.variant === "trial" ? " pro-executed-session-session-badge--trial" : ""
                            }`}
                          >
                            {sessionNumber.label}
                          </span>
                        ) : (
                          sessionNumber.label
                        )}
                      </span>
                      <span className="pro-executed-session-cell pro-executed-session-cell--money">
                        {formatAmount(movement.grossCents)}
                      </span>
                      <span className="pro-executed-session-cell pro-executed-session-cell--money">
                        {formatAmount(movement.platformFeeCents)}
                      </span>
                      <span className="pro-executed-session-cell pro-executed-session-cell--money pro-executed-session-cell--net">
                        {formatAmount(movement.amountCents)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <nav
              className="pro-executed-sessions-pagination"
              aria-label={t(props.language, { es: "Paginación", en: "Pagination", pt: "Paginacao" })}
            >
              <span className="pro-executed-sessions-pagination-range" aria-live="polite">
                {t(props.language, {
                  es: `${rangeStart}–${rangeEnd} de ${total}`,
                  en: `${rangeStart}–${rangeEnd} of ${total}`,
                  pt: `${rangeStart}–${rangeEnd} de ${total}`
                })}
              </span>
              <div className="pro-executed-sessions-pagination-nav">
                <button
                  type="button"
                  className="pro-executed-sessions-pagination-arrow"
                  disabled={page <= 1}
                  aria-label={t(props.language, { es: "Página anterior", en: "Previous page", pt: "Pagina anterior" })}
                  onClick={() => props.onPageChange(page - 1)}
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  className="pro-executed-sessions-pagination-arrow"
                  disabled={page >= totalPages}
                  aria-label={t(props.language, { es: "Página siguiente", en: "Next page", pt: "Proxima pagina" })}
                  onClick={() => props.onPageChange(page + 1)}
                >
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
