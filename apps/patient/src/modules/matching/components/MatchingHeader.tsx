import type { SortOption, TranslationFn } from "../types";

function SortSheet(props: {
  sortOpen: boolean;
  sortMode: string;
  sortOptions: SortOption[];
  onSortModeChange: (value: string) => void;
  t: TranslationFn;
}) {
  if (!props.sortOpen) {
    return null;
  }
  return (
    <div className="patient-sort-sheet" role="dialog" aria-label={props.t({ es: "Ordenar por", en: "Sort by", pt: "Ordenar por" })}>
      <h4>{props.t({ es: "Ordenar por", en: "Sort by", pt: "Ordenar por" })}</h4>
      <div className="patient-sort-options">
        {props.sortOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`patient-sort-option ${props.sortMode === option.value ? "selected" : ""}`}
            onClick={() => props.onSortModeChange(option.value)}
          >
            <span>{option.label}</span>
            <i aria-hidden="true">{props.sortMode === option.value ? "◉" : "○"}</i>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MatchingHeader(props: {
  minimal: boolean;
  onboardingAccent?: boolean;
  heading: string;
  description: string;
  countLabel: string;
  sortOpen: boolean;
  onToggleSort: () => void;
  sortMode: string;
  onSortModeChange: (value: string) => void;
  sortOptions: SortOption[];
  t: TranslationFn;
  /** En flujo trial/onboarding: acción secundaria compacta (sin botón ancho debajo del título). */
  onDeferTherapistSelection?: () => void;
}) {
  const sectionClass = `content-card patient-matching-hero ${props.minimal ? "minimal" : ""} ${props.onboardingAccent ? "patient-matching-hero--onboarding" : ""}`;

  if (props.onboardingAccent) {
    return (
      <section className={sectionClass}>
        <div className="patient-matching-hero-headrow">
          <div className="patient-matching-hero-headrow-main">
            <h2>{props.heading}</h2>
            {props.description ? <p className="patient-matching-hero-desc">{props.description}</p> : null}
          </div>
          <div className="patient-matching-hero-toolbar" role="toolbar" aria-label={props.t({ es: "Acciones de la lista", en: "List actions", pt: "Acoes da lista" })}>
            {props.countLabel ? <span className="patient-matching-count">{props.countLabel}</span> : null}
            <button
              type="button"
              className={`patient-matching-sort-compact ${props.sortOpen ? "active" : ""}`}
              onClick={props.onToggleSort}
              aria-expanded={props.sortOpen}
            >
              <span aria-hidden="true">↕</span>
              {props.t({ es: "Ordenar", en: "Sort", pt: "Ordenar" })}
            </button>
            {props.onDeferTherapistSelection ? (
              <button type="button" className="patient-matching-defer-link" onClick={() => void props.onDeferTherapistSelection?.()}>
                {props.t({
                  es: "Más tarde",
                  en: "Later",
                  pt: "Depois"
                })}
              </button>
            ) : null}
          </div>
        </div>
        <SortSheet
          sortOpen={props.sortOpen}
          sortMode={props.sortMode}
          sortOptions={props.sortOptions}
          onSortModeChange={props.onSortModeChange}
          t={props.t}
        />
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      <h2>{props.heading}</h2>
      {props.description ? <p>{props.description}</p> : null}
      {props.countLabel ? <strong className="patient-matching-count">{props.countLabel}</strong> : null}

      <div className="patient-matching-actions">
        <button type="button" className={props.sortOpen ? "active" : ""} onClick={props.onToggleSort}>
          <span aria-hidden="true">↕</span>
          {props.t({ es: "Clasificación", en: "Sort", pt: "Classificacao" })}
        </button>
      </div>

      <SortSheet
        sortOpen={props.sortOpen}
        sortMode={props.sortMode}
        sortOptions={props.sortOptions}
        onSortModeChange={props.onSortModeChange}
        t={props.t}
      />
    </section>
  );
}
