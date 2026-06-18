import { useEffect, useId, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { ymLocal } from "../lib/professionalStatsRangeQuery";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function parseMonthValue(value: string): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year, month };
}

function toMonthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatMonthLabel(value: string, language: AppLanguage, compact?: boolean): string {
  const { year, month } = parseMonthValue(value);
  if (compact) {
    const shortMonth = formatDateWithLocale({
      value: new Date(year, month - 1, 1).toISOString(),
      language,
      options: { month: "short" }
    });
    return `${shortMonth} ${String(year).slice(-2)}`;
  }
  return formatDateWithLocale({
    value: new Date(year, month - 1, 1).toISOString(),
    language,
    options: { month: "long", year: "numeric" }
  });
}

function monthOptions(language: AppLanguage): string[] {
  return Array.from({ length: 12 }, (_, index) =>
    formatDateWithLocale({
      value: new Date(2020, index, 1).toISOString(),
      language,
      options: { month: "short" }
    })
  );
}

export function RevenueMonthPicker(props: {
  language: AppLanguage;
  value: string;
  ariaLabel: string;
  title?: string;
  compact?: boolean;
  /** Panel embebido (sin botón propio), p. ej. dentro del selector unificado de período. */
  embedded?: boolean;
  onChange: (value: string) => void;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const parsed = parseMonthValue(props.value);
  const [panelYear, setPanelYear] = useState(parsed.year);
  const months = monthOptions(props.language);

  useEffect(() => {
    setPanelYear(parsed.year);
  }, [parsed.year, props.value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectMonth = (month: number) => {
    props.onChange(toMonthValue(panelYear, month));
    if (!props.embedded) {
      setOpen(false);
    }
  };

  const selectCurrentMonth = () => {
    const now = ymLocal(new Date());
    props.onChange(now);
    setPanelYear(parseMonthValue(now).year);
    if (!props.embedded) {
      setOpen(false);
    }
  };

  const panelContent = (
    <div
      id={props.embedded ? undefined : panelId}
      className={`pro-revenue-month-picker-panel${props.embedded ? " pro-revenue-month-picker-panel--embedded" : ""}`}
      role={props.embedded ? undefined : "dialog"}
      aria-label={props.ariaLabel}
    >
      <div className="pro-revenue-month-picker-year">
        <button
          type="button"
          className="pro-revenue-month-picker-year-arrow"
          aria-label={t(props.language, { es: "Año anterior", en: "Previous year", pt: "Ano anterior" })}
          onClick={() => setPanelYear((year) => year - 1)}
        >
          ‹
        </button>
        <span>{panelYear}</span>
        <button
          type="button"
          className="pro-revenue-month-picker-year-arrow"
          aria-label={t(props.language, { es: "Año siguiente", en: "Next year", pt: "Proximo ano" })}
          onClick={() => setPanelYear((year) => year + 1)}
        >
          ›
        </button>
      </div>

      <div className="pro-revenue-month-picker-grid">
        {months.map((label, index) => {
          const month = index + 1;
          const selected = panelYear === parsed.year && month === parsed.month;
          return (
            <button
              key={label}
              type="button"
              className={`pro-revenue-month-picker-month${selected ? " pro-revenue-month-picker-month--selected" : ""}`}
              aria-pressed={selected}
              onClick={() => selectMonth(month)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="pro-revenue-month-picker-footer">
        <button type="button" className="pro-revenue-month-picker-action" onClick={selectCurrentMonth}>
          {t(props.language, { es: "Este mes", en: "This month", pt: "Este mes" })}
        </button>
      </div>
    </div>
  );

  if (props.embedded) {
    return (
      <div className="pro-revenue-month-picker pro-revenue-month-picker--embedded" ref={rootRef}>
        {panelContent}
      </div>
    );
  }

  return (
    <div className={`pro-revenue-month-picker${props.compact ? " pro-revenue-month-picker--compact" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="pro-dashboard-revenue-control pro-revenue-month-picker-trigger"
        aria-label={props.ariaLabel}
        title={props.title ?? formatMonthLabel(props.value, props.language, false)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{formatMonthLabel(props.value, props.language, props.compact)}</span>
        <svg className="pro-revenue-month-picker-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 3v2M17 3v2M4 9h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? panelContent : null}
    </div>
  );
}
