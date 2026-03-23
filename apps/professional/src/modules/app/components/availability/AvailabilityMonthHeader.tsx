import { NavLink } from "react-router-dom";
import type { RefObject } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AvailabilityMonthHeader(props: {
  language: AppLanguage;
  monthLabel: string;
  showSelectAll: boolean;
  allVisibleSelected: boolean;
  isRemoving: boolean;
  selectAllRef: RefObject<HTMLInputElement | null>;
  onToggleAllVisible: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <header className="availability-month-head">
      <div className="availability-month-title">
        <div className="availability-month-topline">
          <NavLink
            to="/horarios"
            className="schedule-back availability-month-back"
            aria-label={t(props.language, { es: "Volver a Horarios", en: "Back to Schedule", pt: "Voltar para Horario" })}
          >
            ‹
          </NavLink>
          <h2>{props.monthLabel}</h2>
          <div className="availability-month-nav">
            <button
              type="button"
              aria-label={t(props.language, { es: "Anterior", en: "Previous", pt: "Anterior" })}
              onClick={props.onPreviousMonth}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={t(props.language, { es: "Siguiente", en: "Next", pt: "Seguinte" })}
              onClick={props.onNextMonth}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {props.showSelectAll ? (
        <label className="availability-day-slot-check header availability-group-check">
          <input
            ref={props.selectAllRef}
            type="checkbox"
            checked={props.allVisibleSelected}
            disabled={props.isRemoving}
            aria-label={t(props.language, {
              es: "Seleccionar todos los horarios visibles",
              en: "Select all visible slots",
              pt: "Selecionar todos os horarios visiveis"
            })}
            onChange={props.onToggleAllVisible}
          />
        </label>
      ) : null}
    </header>
  );
}
