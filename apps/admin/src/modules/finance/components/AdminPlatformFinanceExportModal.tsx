import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export type ExportDateRange = {
  dateFrom: string;
  dateTo: string;
};

export type AdminFinanceExportTab = "executed" | "purchases";

export type AdminPlatformFinanceExportModalProps = {
  language: AppLanguage;
  open: boolean;
  tab: AdminFinanceExportTab;
  defaultDateFrom: string;
  defaultDateTo: string;
  filtersSummary: string[];
  exporting: boolean;
  onClose: () => void;
  onPreviewCount: (range: ExportDateRange) => Promise<number>;
  onConfirm: (range: ExportDateRange) => void;
};

function isValidRange(range: ExportDateRange): boolean {
  if (!range.dateFrom || !range.dateTo) {
    return false;
  }
  return range.dateFrom <= range.dateTo;
}

export function AdminPlatformFinanceExportModal(props: AdminPlatformFinanceExportModalProps) {
  const [dateFrom, setDateFrom] = useState(props.defaultDateFrom);
  const [dateTo, setDateTo] = useState(props.defaultDateTo);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [rangeError, setRangeError] = useState("");

  const range = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);
  const rangeValid = isValidRange(range);

  useEffect(() => {
    if (!props.open) {
      return;
    }
    setDateFrom(props.defaultDateFrom);
    setDateTo(props.defaultDateTo);
    setRangeError("");
  }, [props.open, props.defaultDateFrom, props.defaultDateTo]);

  useEffect(() => {
    if (!props.open || !rangeValid) {
      setPreviewCount(null);
      if (!rangeValid && dateFrom && dateTo) {
        setRangeError(
          t(props.language, {
            es: "La fecha «Desde» no puede ser posterior a «Hasta».",
            en: "The “From” date cannot be after “To”.",
            pt: "A data «De» nao pode ser posterior a «Ate»."
          })
        );
      } else {
        setRangeError("");
      }
      return;
    }

    setRangeError("");
    let cancelled = false;
    setPreviewLoading(true);
    const handle = window.setTimeout(() => {
      void props
        .onPreviewCount(range)
        .then((count) => {
          if (!cancelled) {
            setPreviewCount(count);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPreviewCount(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setPreviewLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [props.open, props.onPreviewCount, range, rangeValid, dateFrom, dateTo, props.language]);

  if (!props.open) {
    return null;
  }

  const countLabel =
    props.tab === "executed"
      ? t(props.language, { es: "Sesiones en el rango", en: "Sessions in range", pt: "Sessoes no intervalo" })
      : t(props.language, { es: "Ventas en el rango", en: "Sales in range", pt: "Vendas no intervalo" });

  const previewValue =
    previewLoading
      ? t(props.language, { es: "Calculando…", en: "Calculating…", pt: "Calculando…" })
      : previewCount == null
        ? "—"
        : String(previewCount);

  return (
    <div className="admin-export-modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="admin-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-export-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h3 id="admin-export-modal-title">
            {t(props.language, { es: "Exportar reporte", en: "Export report", pt: "Exportar relatorio" })}
          </h3>
          <button type="button" aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })} onClick={props.onClose}>
            ×
          </button>
        </header>

        <div className="admin-export-modal-body">
          <p className="admin-export-modal-lead">
            {props.tab === "executed"
              ? t(props.language, {
                  es: "Elegí el rango de fechas y generá un Excel (.xlsx) con las sesiones ejecutadas en USD, incluyendo totales al final.",
                  en: "Choose the date range and generate an Excel (.xlsx) with completed sessions in USD, including totals at the bottom.",
                  pt: "Escolha o intervalo de datas e gere um Excel (.xlsx) com as sessoes executadas em USD, incluindo totais ao final."
                })
              : t(props.language, {
                  es: "Elegí el rango de fechas y generá un Excel (.xlsx) con las ventas de paquetes en USD, incluyendo totales al final.",
                  en: "Choose the date range and generate an Excel (.xlsx) with package sales in USD, including totals at the bottom.",
                  pt: "Escolha o intervalo de datas e gere um Excel (.xlsx) com as vendas de pacotes em USD, incluindo totais ao final."
                })}
          </p>

          <div className="admin-export-modal-dates">
            <label className="admin-export-modal-date-field">
              <span>{t(props.language, { es: "Desde", en: "From", pt: "De" })}</span>
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="admin-export-modal-date-field">
              <span>{t(props.language, { es: "Hasta", en: "To", pt: "Ate" })}</span>
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>

          {rangeError ? <p className="admin-export-modal-error">{rangeError}</p> : null}

          <dl className="admin-export-modal-meta">
            <div>
              <dt>{countLabel}</dt>
              <dd>{previewValue}</dd>
            </div>
          </dl>

          {props.filtersSummary.length > 0 ? (
            <p className="admin-export-modal-filters">
              {t(props.language, { es: "Filtros activos:", en: "Active filters:", pt: "Filtros ativos:" })}{" "}
              {props.filtersSummary.join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="admin-export-modal-actions">
          <button type="button" disabled={props.exporting} onClick={props.onClose}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </button>
          <button
            type="button"
            className="primary"
            disabled={props.exporting || !rangeValid || previewLoading || previewCount === 0}
            onClick={() => props.onConfirm(range)}
          >
            {props.exporting
              ? t(props.language, { es: "Generando…", en: "Generating…", pt: "Gerando…" })
              : t(props.language, { es: "Descargar Excel", en: "Download Excel", pt: "Baixar Excel" })}
          </button>
        </div>
      </section>
    </div>
  );
}
