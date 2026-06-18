import { useEffect, useId, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { RevenueMonthPicker } from "./RevenueMonthPicker";
import { type RevenuePreset } from "../lib/professionalStatsRangeQuery";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const PRESET_OPTIONS: Array<{ value: RevenuePreset; label: LocalizedText }> = [
  { value: "day", label: { es: "Día", en: "Day", pt: "Dia" } },
  { value: "week", label: { es: "Sem.", en: "Wk", pt: "Sem." } },
  { value: "month", label: { es: "Mes", en: "Mo", pt: "Mes" } },
  { value: "year", label: { es: "Año", en: "Yr", pt: "Ano" } },
  { value: "all", label: { es: "Todo", en: "All", pt: "Todo" } }
];

function formatPeriodSummary(
  language: AppLanguage,
  preset: RevenuePreset,
  day: string,
  month: string,
  year: string
): string {
  if (preset === "all") {
    return t(language, { es: "Todo el historial", en: "All time", pt: "Todo o historico" });
  }
  if (preset === "day") {
    const short = formatDateWithLocale({
      value: new Date(`${day}T12:00:00`).toISOString(),
      language,
      options: { day: "numeric", month: "short" }
    });
    return t(language, { es: `Día · ${short}`, en: `Day · ${short}`, pt: `Dia · ${short}` });
  }
  if (preset === "week") {
    const short = formatDateWithLocale({
      value: new Date(`${day}T12:00:00`).toISOString(),
      language,
      options: { day: "numeric", month: "short" }
    });
    return t(language, { es: `Sem. · ${short}`, en: `Wk · ${short}`, pt: `Sem. · ${short}` });
  }
  if (preset === "month") {
    const [y, m] = month.split("-").map(Number);
    const shortMonth = formatDateWithLocale({
      value: new Date(y, m - 1, 1).toISOString(),
      language,
      options: { month: "short" }
    });
    return t(language, {
      es: `Mes · ${shortMonth} ${String(y).slice(-2)}`,
      en: `Mo · ${shortMonth} ${String(y).slice(-2)}`,
      pt: `Mes · ${shortMonth} ${String(y).slice(-2)}`
    });
  }
  return t(language, { es: `Año · ${year}`, en: `Yr · ${year}`, pt: `Ano · ${year}` });
}

export function DashboardRevenuePeriodControl(props: {
  language: AppLanguage;
  preset: RevenuePreset;
  day: string;
  month: string;
  year: string;
  groupLabel: string;
  onPresetChange: (preset: RevenuePreset) => void;
  onDayChange: (day: string) => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const summary = formatPeriodSummary(props.language, props.preset, props.day, props.month, props.year);

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

  const dateAria =
    props.preset === "week"
      ? t(props.language, { es: "Fecha en la semana a mostrar", en: "Date within week to show", pt: "Data na semana a exibir" })
      : t(props.language, { es: "Día a mostrar", en: "Day to show", pt: "Dia a exibir" });
  const monthAria = t(props.language, { es: "Mes a mostrar", en: "Month to show", pt: "Mes a exibir" });
  const yearAria = t(props.language, { es: "Año a mostrar", en: "Year to show", pt: "Ano a exibir" });

  return (
    <div
      className="pro-dashboard-period-control"
      ref={rootRef}
      role="group"
      aria-label={props.groupLabel}
      data-tour="pro-tour-period"
    >
      <button
        type="button"
        className="pro-dashboard-revenue-control pro-dashboard-period-control-trigger"
        data-tour="pro-tour-period-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title={props.groupLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="pro-dashboard-period-control-trigger-label">{summary}</span>
        <svg className="pro-dashboard-period-control-trigger-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 3v2M17 3v2M4 9h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
        <svg className="pro-dashboard-period-control-trigger-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div id={panelId} className="pro-dashboard-period-control-panel" role="dialog" aria-label={props.groupLabel}>
          <div className="pro-dashboard-period-control-presets" role="tablist" aria-label={props.groupLabel}>
            {PRESET_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={props.preset === option.value}
                className={`pro-dashboard-period-control-preset${props.preset === option.value ? " pro-dashboard-period-control-preset--active" : ""}`}
                onClick={() => props.onPresetChange(option.value)}
              >
                {t(props.language, option.label)}
              </button>
            ))}
          </div>

          <div className="pro-dashboard-period-control-body">
          {props.preset === "day" || props.preset === "week" ? (
            <label className="pro-dashboard-period-control-field">
              <span>{dateAria}</span>
              <input
                className="pro-dashboard-revenue-control"
                type="date"
                value={props.day}
                aria-label={dateAria}
                onChange={(event) => props.onDayChange(event.target.value)}
              />
            </label>
          ) : null}

          {props.preset === "month" ? (
            <RevenueMonthPicker
              language={props.language}
              value={props.month}
              ariaLabel={monthAria}
              embedded
              onChange={props.onMonthChange}
            />
          ) : null}

          {props.preset === "year" ? (
            <label className="pro-dashboard-period-control-field">
              <span>{yearAria}</span>
              <input
                className="pro-dashboard-revenue-control pro-dashboard-revenue-control--year"
                type="number"
                min={2020}
                max={2035}
                value={props.year}
                aria-label={yearAria}
                onChange={(event) => props.onYearChange(event.target.value)}
              />
            </label>
          ) : null}

          {props.preset === "all" ? (
            <p className="pro-dashboard-period-control-all-note">
              {t(props.language, {
                es: "Incluye todas las sesiones ejecutadas registradas.",
                en: "Includes all recorded completed sessions.",
                pt: "Inclui todas as sessoes executadas registradas."
              })}
            </p>
          ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
