import { type DragEvent, type ReactNode, Fragment } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import type {
  AdminUnpaidProfessional,
  UnpaidProfessionalDetailResponse,
  UnpaidProfessionalSessionDetail
} from "../types/finance.types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type SortKey = "name_az" | "sessions_desc" | "net_desc";
type PaneSide = "pending" | "assemble";

const MIN_BODY_ROWS = 8;

function formatSessionDay(value: string | null, language: AppLanguage): string {
  if (!value) return "—";
  return formatDateWithLocale({
    value,
    language,
    options: { day: "2-digit", month: "2-digit", year: "numeric" }
  });
}

function PayoutRow(props: {
  row: AdminUnpaidProfessional;
  language: AppLanguage;
  dragging: boolean;
  expanded: boolean;
  moveTitle: string;
  expandTitle: string;
  moveLabel: string;
  skipTitle?: string;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onToggleExpand: () => void;
  onMove: () => void;
  onSkip?: () => void;
}) {
  return (
    <tr
      className={`admin-unpaid-pro-row admin-unpaid-package-row${props.expanded ? " is-expanded" : ""}${props.dragging ? " is-dragging" : ""}`}
      draggable
      tabIndex={0}
      aria-expanded={props.expanded}
      title={props.expandTitle}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onClick={props.onToggleExpand}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onToggleExpand();
        }
      }}
    >
      <td>
        <span className="admin-unpaid-package-name">
          <span className="admin-unpaid-grip" aria-hidden />
          <span className="admin-unpaid-expand" aria-hidden>
            {props.expanded ? "▾" : "▸"}
          </span>
          <span className="admin-unpaid-package-title">{props.row.professionalName}</span>
        </span>
      </td>
      <td className="num">
        <span className="admin-unpaid-package-metric">{props.row.sessionsCount}</span>
      </td>
      <td className="num">
        <span className="admin-unpaid-package-amount">
          {formatAdminFinanceUsd(props.row.professionalNetCents, props.language)}
        </span>
      </td>
      <td className="admin-unpaid-package-move">
        <span className="admin-unpaid-row-actions">
          {props.onSkip ? (
            <button
              type="button"
              className="admin-unpaid-skip-btn"
              title={props.skipTitle}
              aria-label={props.skipTitle}
              onClick={(event) => {
                event.stopPropagation();
                props.onSkip?.();
              }}
            >
              ×
            </button>
          ) : null}
          <button
            type="button"
            className="admin-unpaid-move-btn"
            title={props.moveTitle}
            aria-label={props.moveTitle}
            onClick={(event) => {
              event.stopPropagation();
              props.onMove();
            }}
          >
            {props.moveLabel}
          </button>
        </span>
      </td>
    </tr>
  );
}

function PackageSessionDetail(props: {
  language: AppLanguage;
  loading: boolean;
  sessions: UnpaidProfessionalSessionDetail[];
  excludedIds?: Set<string>;
  onExcludeSession?: (sessionId: string) => void;
}) {
  const pending = props.sessions.filter((session) => session.payoutStatus === "pending");
  if (props.loading) {
    return (
      <p className="admin-unpaid-detail-loading">
        {t(props.language, { es: "Cargando sesiones…", en: "Loading sessions…", pt: "Carregando sessões…" })}
      </p>
    );
  }
  if (pending.length === 0) {
    return (
      <p className="admin-unpaid-detail-empty">
        {t(props.language, {
          es: "Este paquete no tiene sesiones listas.",
          en: "This package has no sessions ready.",
          pt: "Este pacote nao tem sessoes prontas."
        })}
      </p>
    );
  }
  const excludeTitle = t(props.language, {
    es: "Quitar del pago",
    en: "Remove from payout",
    pt: "Tirar do pagamento"
  });
  const restoreTitle = t(props.language, {
    es: "Volver a incluir",
    en: "Include again",
    pt: "Incluir de novo"
  });
  return (
    <div className="admin-unpaid-package-detail">
      <p className="admin-unpaid-package-detail-kicker">
        {t(props.language, { es: "Sesiones del paquete", en: "Sessions in package", pt: "Sessoes do pacote" })}
      </p>
      <ul className="admin-unpaid-package-sessions">
        {pending.map((session) => {
          const excluded = props.excludedIds?.has(session.id) ?? false;
          return (
            <li key={session.id} className={excluded ? "is-excluded" : undefined}>
              <span className="admin-unpaid-package-session-date">
                {formatSessionDay(session.bookingCompletedAt ?? session.bookingStartsAt, props.language)}
              </span>
              <Link className="admin-unpaid-package-session-patient" to={`/sessions?patientId=${encodeURIComponent(session.patient.id)}`}>
                {session.patient.fullName}
              </Link>
              <span className="admin-unpaid-package-session-origin">
                {session.sourceKind === "trial"
                  ? t(props.language, { es: "Prueba", en: "Trial", pt: "Teste" })
                  : t(props.language, { es: "Paquete", en: "Package", pt: "Pacote" })}
                {session.sourceLabel ? ` · ${session.sourceLabel}` : ""}
              </span>
              <span className="admin-unpaid-package-session-net">
                {formatAdminFinanceUsd(session.professionalNetUsdCents, props.language)}
              </span>
              {props.onExcludeSession ? (
                <button
                  type="button"
                  className="admin-unpaid-session-skip-btn"
                  title={excluded ? restoreTitle : excludeTitle}
                  aria-label={excluded ? restoreTitle : excludeTitle}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onExcludeSession?.(session.id);
                  }}
                >
                  {excluded ? "↺" : "×"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SlotRows(props: { filled: number; emptyLabel: string }) {
  const slots = Math.max(0, MIN_BODY_ROWS - props.filled);
  if (slots === 0) {
    return null;
  }
  return (
    <>
      {Array.from({ length: slots }, (_, index) => (
        <tr key={`slot-${index}`} className="admin-unpaid-split-slot">
          <td colSpan={4}>{index === 0 && props.filled === 0 ? props.emptyLabel : null}</td>
        </tr>
      ))}
    </>
  );
}

function PaneHead(props: { id: string; title: string; count: number | null }) {
  return (
    <header className="admin-unpaid-split-head">
      <h3 id={props.id}>{props.title}</h3>
      {props.count === null ? null : <span className="admin-unpaid-tab-count">{props.count}</span>}
    </header>
  );
}

function TotalsFoot(props: {
  language: AppLanguage;
  professionals: number;
  sessionsCount: number;
  netCents: number;
}) {
  return (
    <tfoot>
      <tr className="admin-unpaid-totals-row">
        <td>
          {t(props.language, { es: "Total", en: "Total", pt: "Total" })}
          <span className="admin-unpaid-totals-count"> · {props.professionals}</span>
        </td>
        <td className="num">{props.sessionsCount}</td>
        <td className="num">
          <span className="admin-unpaid-package-amount">{formatAdminFinanceUsd(props.netCents, props.language)}</span>
        </td>
        <td />
      </tr>
    </tfoot>
  );
}

function ColumnHead(props: {
  language: AppLanguage;
  sortKey?: SortKey;
  onSort?: (key: SortKey) => void;
}) {
  const sortable = Boolean(props.onSort);
  const label = (key: SortKey, copy: LocalizedText, extraClass?: string) => {
    const text = t(props.language, copy);
    if (!sortable || !props.onSort) {
      return <th className={extraClass}>{text}</th>;
    }
    return (
      <th className={extraClass}>
        <button
          type="button"
          className={`admin-unpaid-sort${props.sortKey === key ? " is-active" : ""}`}
          onClick={() => props.onSort?.(key)}
        >
          {text}
        </button>
      </th>
    );
  };
  return (
    <thead>
      <tr>
        {label("name_az", { es: "Profesional", en: "Professional", pt: "Profissional" })}
        {label("sessions_desc", { es: "Sesiones", en: "Sessions", pt: "Sessões" }, "num")}
        {label("net_desc", { es: "A pagar", en: "To pay", pt: "A pagar" }, "num")}
        <th className="admin-unpaid-package-move" />
      </tr>
    </thead>
  );
}

export function AdminUnpaidPayoutBoard(props: {
  language: AppLanguage;
  loading: boolean;
  emptyPending: string;
  queueRows: AdminUnpaidProfessional[];
  pageRows: AdminUnpaidProfessional[];
  stagedRows: AdminUnpaidProfessional[];
  pendingTotals: { sessionsCount: number; professionalNetCents: number };
  stagedTotals: { sessionsCount: number; professionalNetCents: number };
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
  dropTarget: PaneSide | null;
  draggingId: string | null;
  onDragOverPending: (event: DragEvent) => void;
  onDragOverAssemble: (event: DragEvent) => void;
  onDropPending: (event: DragEvent) => void;
  onDropAssemble: (event: DragEvent) => void;
  onDragStart: (row: AdminUnpaidProfessional) => (event: DragEvent) => void;
  onDragEnd: () => void;
  onStage: (row: AdminUnpaidProfessional) => void;
  onUnstage: (row: AdminUnpaidProfessional) => void;
  onSkipPending: (row: AdminUnpaidProfessional) => void;
  onToggleExpand: (row: AdminUnpaidProfessional) => void;
  onExcludeSession: (professionalId: string, sessionId: string) => void;
  expandedIds: Set<string>;
  expandedDetails: Record<string, UnpaidProfessionalDetailResponse>;
  excludedSessionIds: Record<string, string[]>;
  detailLoadingId: string | null;
  onAssemble: () => void;
  pager: {
    visible: boolean;
    rangeLabel: string;
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    prevLabel: string;
    nextLabel: string;
  };
}) {
  const language = props.language;
  const moveRightTitle = t(language, {
    es: "Pasar a aprobados",
    en: "Move to approved",
    pt: "Passar para aprovados"
  });
  const moveLeftTitle = t(language, {
    es: "Devolver a pendiente de aprobación",
    en: "Move back to pending approval",
    pt: "Devolver para pendente de aprovação"
  });
  const skipPendingTitle = t(language, {
    es: "Quitar de pendiente de aprobación",
    en: "Remove from pending approval",
    pt: "Tirar de pendente de aprovação"
  });

  const expandTitle = t(language, {
    es: "Ver sesiones de este paquete",
    en: "See sessions in this package",
    pt: "Ver sessoes deste pacote"
  });

  const renderPackageRows = (rows: AdminUnpaidProfessional[], side: PaneSide): ReactNode =>
    rows.map((row) => {
      const expanded = props.expandedIds.has(row.professionalId);
      const detail = props.expandedDetails[row.professionalId] ?? null;
      const loading = expanded && !detail && props.detailLoadingId === row.professionalId;
      const excluded = new Set(props.excludedSessionIds[row.professionalId] ?? []);
      return (
        <Fragment key={row.professionalId}>
          <PayoutRow
            row={row}
            language={language}
            dragging={props.draggingId === row.professionalId}
            expanded={expanded}
            expandTitle={expandTitle}
            moveTitle={side === "pending" ? moveRightTitle : moveLeftTitle}
            moveLabel={side === "pending" ? "→" : "←"}
            skipTitle={side === "pending" ? skipPendingTitle : undefined}
            onDragStart={props.onDragStart(row)}
            onDragEnd={props.onDragEnd}
            onToggleExpand={() => props.onToggleExpand(row)}
            onMove={() => (side === "pending" ? props.onStage(row) : props.onUnstage(row))}
            onSkip={side === "pending" ? () => props.onSkipPending(row) : undefined}
          />
          {expanded ? (
            <tr className="admin-unpaid-package-detail-row">
              <td colSpan={4}>
                <PackageSessionDetail
                  language={language}
                  loading={loading}
                  sessions={detail?.sessions ?? []}
                  excludedIds={excluded}
                  onExcludeSession={(sessionId) => props.onExcludeSession(row.professionalId, sessionId)}
                />
              </td>
            </tr>
          ) : null}
        </Fragment>
      );
    });

  return (
    <div
      className={[
        "admin-unpaid-split",
        props.dropTarget ? `is-drop-${props.dropTarget}` : "",
        props.draggingId ? "is-dragging" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <section
        className="admin-unpaid-split-pane"
        aria-labelledby="admin-unpaid-col-pending"
        onDragOver={props.onDragOverPending}
        onDrop={props.onDropPending}
      >
        <PaneHead
          id="admin-unpaid-col-pending"
          title={t(language, { es: "Pendiente de aprobación", en: "Pending approval", pt: "Pendente de aprovação" })}
          count={props.loading ? null : props.queueRows.length}
        />
        {props.loading ? (
          <p className="admin-unpaid-split-note">
            {t(language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}
          </p>
        ) : (
          <div className="admin-unpaid-professionals-table-wrap">
            <table className="admin-unpaid-professionals-table admin-unpaid-professionals-table--split">
              <colgroup>
                <col />
                <col className="admin-unpaid-col-sessions" />
                <col className="admin-unpaid-col-net" />
                <col className="admin-unpaid-col-move" />
              </colgroup>
              <ColumnHead language={language} sortKey={props.sortKey} onSort={props.onSort} />
              <tbody>
                {renderPackageRows(props.pageRows, "pending")}
                <SlotRows filled={props.pageRows.length} emptyLabel={props.emptyPending} />
              </tbody>
              <TotalsFoot
                language={language}
                professionals={props.queueRows.length}
                sessionsCount={props.pendingTotals.sessionsCount}
                netCents={props.pendingTotals.professionalNetCents}
              />
            </table>
            {props.pager.visible ? (
              <div className="admin-unpaid-pager" aria-label={t(language, { es: "Paginación", en: "Pagination", pt: "Paginacao" })}>
                <span className="admin-unpaid-pager-range">{props.pager.rangeLabel}</span>
                <div className="admin-unpaid-pager-nav">
                  <button
                    type="button"
                    className="admin-unpaid-pager-btn"
                    disabled={props.pager.page <= 1}
                    onClick={props.pager.onPrev}
                    aria-label={props.pager.prevLabel}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="admin-unpaid-pager-btn"
                    disabled={props.pager.page >= props.pager.totalPages}
                    onClick={props.pager.onNext}
                    aria-label={props.pager.nextLabel}
                  >
                    ›
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section
        className="admin-unpaid-split-pane"
        aria-labelledby="admin-unpaid-col-assemble"
        onDragOver={props.onDragOverAssemble}
        onDrop={props.onDropAssemble}
      >
        <PaneHead
          id="admin-unpaid-col-assemble"
          title={t(language, { es: "Aprobados", en: "Approved", pt: "Aprovados" })}
          count={props.stagedRows.length > 0 ? props.stagedRows.length : null}
        />
        <div className="admin-unpaid-professionals-table-wrap">
          <table className="admin-unpaid-professionals-table admin-unpaid-professionals-table--split">
            <colgroup>
              <col />
              <col className="admin-unpaid-col-sessions" />
              <col className="admin-unpaid-col-net" />
              <col className="admin-unpaid-col-move" />
            </colgroup>
            <ColumnHead language={language} />
            <tbody>
              {renderPackageRows(props.stagedRows, "assemble")}
              <SlotRows
                filled={props.stagedRows.length}
                emptyLabel={t(language, {
                  es: "Arrastrá acá",
                  en: "Drop here",
                  pt: "Arraste aqui"
                })}
              />
            </tbody>
            <TotalsFoot
              language={language}
              professionals={props.stagedRows.length}
              sessionsCount={props.stagedTotals.sessionsCount}
              netCents={props.stagedTotals.professionalNetCents}
            />
          </table>
        </div>
        {props.stagedRows.length > 0 ? (
          <button type="button" className="admin-unpaid-assemble-btn" onClick={props.onAssemble}>
            {t(language, { es: "Armar pago", en: "Assemble payout", pt: "Armar pagamento" })}
          </button>
        ) : null}
      </section>
    </div>
  );
}
