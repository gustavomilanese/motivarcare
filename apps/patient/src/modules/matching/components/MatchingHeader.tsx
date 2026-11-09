import type { ReactNode } from "react";
import { AuthBrand } from "../../auth/AuthBrand";
import { PortalAccountToolsMount } from "../../app/components/PortalAccountToolsMount";
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

function MarkedHeading(props: { text: string; mark?: string }) {
  const mark = props.mark?.trim() ?? "";
  const index = mark ? props.text.toLowerCase().indexOf(mark.toLowerCase()) : -1;
  if (index < 0) {
    return <>{props.text}</>;
  }
  return (
    <>
      {props.text.slice(0, index)}
      <em className="auth-mark">
        {props.text.slice(index, index + mark.length)}
        <svg className="auth-wave" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
          <path d="M3 12 C 30 3, 50 3, 70 10 S 110 18, 130 10 S 170 3, 197 9" />
        </svg>
      </em>
      {props.text.slice(index + mark.length)}
    </>
  );
}

export function MatchingHeader(props: {
  minimal: boolean;
  onboardingAccent?: boolean;
  heading: string;
  headingMark?: string;
  description: string;
  countLabel: string;
  sortOpen: boolean;
  onToggleSort: () => void;
  sortMode: string;
  onSortModeChange: (value: string) => void;
  sortOptions: SortOption[];
  /** Dos píldoras (compatibilidad / precio) en lugar del menú de orden. */
  pillSort?: boolean;
  filters?: ReactNode;
  t: TranslationFn;
  /** En flujo trial/onboarding: acción secundaria compacta (sin botón ancho debajo del título). */
  onDeferTherapistSelection?: () => void;
}) {
  const sectionClass = `content-card patient-matching-hero ${props.minimal ? "minimal" : ""} ${props.onboardingAccent ? "patient-matching-hero--onboarding" : ""}`;

  if (props.onboardingAccent) {
    return (
      <>
      {props.pillSort ? (
        <div className="calm-pick-top">
          <AuthBrand />
          <PortalAccountToolsMount id="dashboard-hero-toolbar-mount" className="calm-pick-tools" />
        </div>
      ) : null}
      <section className={sectionClass}>
        {props.pillSort ? (
          <p className="calm-pick-step">
            {props.t({ es: "Paso 2 de 4", en: "Step 2 of 4", pt: "Passo 2 de 4" })}
          </p>
        ) : null}
        <div className="patient-matching-hero-headrow">
          <div className="patient-matching-hero-headrow-main">
            <h2>
              <MarkedHeading text={props.heading} mark={props.headingMark} />
            </h2>
            {props.filters}
            {props.description ? <p className="patient-matching-hero-desc">{props.description}</p> : null}
          </div>
          <div className="patient-matching-hero-toolbar" role="toolbar" aria-label={props.t({ es: "Acciones de la lista", en: "List actions", pt: "Acoes da lista" })}>
            {props.countLabel ? <span className="patient-matching-count">{props.countLabel}</span> : null}
            {props.pillSort ? (
              <div className="patient-matching-sort-pills" role="group" aria-label={props.t({ es: "Ordenar por", en: "Sort by", pt: "Ordenar por" })}>
                {props.sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`patient-matching-sort-pill ${props.sortMode === option.value ? "is-active" : ""}`}
                    aria-pressed={props.sortMode === option.value}
                    onClick={() => props.onSortModeChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                className={`patient-matching-sort-compact ${props.sortOpen ? "active" : ""}`}
                onClick={props.onToggleSort}
                aria-expanded={props.sortOpen}
              >
                <span aria-hidden="true">↕</span>
                {props.t({ es: "Ordenar", en: "Sort", pt: "Ordenar" })}
              </button>
            )}
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
      </>
    );
  }

  return (
    <section className={sectionClass}>
      <h2>
        <MarkedHeading text={props.heading} mark={props.headingMark} />
      </h2>
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
