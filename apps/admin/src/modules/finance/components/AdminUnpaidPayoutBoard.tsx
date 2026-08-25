import { type DragEvent, type ReactNode } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import type { AdminUnpaidProfessional } from "../types/finance.types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type SortKey = "name_az" | "sessions_desc" | "net_desc";
type PaneSide = "pending" | "assemble";

const MIN_BODY_ROWS = 8;

function PayoutRow(props: {
  row: AdminUnpaidProfessional;
  language: AppLanguage;
  dragging: boolean;
  title: string;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onActivate: () => void;
}) {
  return (
    <tr
      className={`admin-unpaid-pro-row${props.dragging ? " is-dragging" : ""}`}
      draggable
      tabIndex={0}
      title={props.title}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onClick={props.onActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onActivate();
        }
      }}
    >
      <td>
        <span className="admin-unpaid-pro-name">
          <span className="admin-unpaid-grip" aria-hidden />
          {props.row.professionalName}
        </span>
      </td>
      <td className="num">{props.row.sessionsCount}</td>
      <td className="num admin-unpaid-net">
        {formatAdminFinanceUsd(props.row.professionalNetCents, props.language)}
      </td>
    </tr>
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
          <td colSpan={3}>{index === 0 && props.filled === 0 ? props.emptyLabel : null}</td>
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
        <td className="num admin-unpaid-net">{formatAdminFinanceUsd(props.netCents, props.language)}</td>
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
    es: "Pasar a este pago",
    en: "Move to this payout",
    pt: "Passar para este pagamento"
  });
  const moveLeftTitle = t(language, {
    es: "Devolver a por pagar",
    en: "Move back to unpaid",
    pt: "Devolver para a pagar"
  });

  const renderPackageRows = (rows: AdminUnpaidProfessional[], side: PaneSide): ReactNode =>
    rows.map((row) => (
      <PayoutRow
        key={row.professionalId}
        row={row}
        language={language}
        dragging={props.draggingId === row.professionalId}
        title={side === "pending" ? moveRightTitle : moveLeftTitle}
        onDragStart={props.onDragStart(row)}
        onDragEnd={props.onDragEnd}
        onActivate={() => (side === "pending" ? props.onStage(row) : props.onUnstage(row))}
      />
    ));

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
          title={t(language, { es: "Por pagar", en: "To pay", pt: "A pagar" })}
          count={props.loading ? null : props.queueRows.length}
        />
        {props.loading ? (
          <p className="admin-unpaid-split-note">
            {t(language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}
          </p>
        ) : (
          <div className="admin-unpaid-professionals-table-wrap">
            <table className="admin-unpaid-professionals-table admin-unpaid-professionals-table--split">
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
          title={t(language, { es: "Este pago", en: "This payout", pt: "Este pagamento" })}
          count={props.stagedRows.length > 0 ? props.stagedRows.length : null}
        />
        <div className="admin-unpaid-professionals-table-wrap">
          <table className="admin-unpaid-professionals-table admin-unpaid-professionals-table--split">
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
