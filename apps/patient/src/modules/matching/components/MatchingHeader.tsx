import type { FilterOption, SortOption, TranslationFn } from "../types";

export function MatchingHeader(props: {
  firstFlow: boolean;
  heading: string;
  description: string;
  countLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  specialtyFilter: string;
  onSpecialtyFilterChange: (value: string) => void;
  specialtyOptions: FilterOption[];
  languageFilter: string;
  onLanguageFilterChange: (value: string) => void;
  languageOptions: FilterOption[];
  sortMode: string;
  onSortModeChange: (value: string) => void;
  sortOptions: SortOption[];
  t: TranslationFn;
}) {
  return (
    <section className={`content-card patient-matching-hero ${props.firstFlow ? "first-flow" : ""}`}>
      <span className="chip">
        {props.firstFlow
          ? props.t({ es: "Paso inicial", en: "First step", pt: "Primeiro passo" })
          : props.t({ es: "Matching inteligente", en: "Smart matching", pt: "Matching inteligente" })}
      </span>
      <h2>{props.heading}</h2>
      <p>{props.description}</p>
      <strong className="patient-matching-count">{props.countLabel}</strong>

      <div className="patient-matching-filters">
        <input
          placeholder={props.searchPlaceholder}
          value={props.searchValue}
          onChange={(event) => props.onSearchChange(event.target.value)}
        />

        <select value={props.specialtyFilter} onChange={(event) => props.onSpecialtyFilterChange(event.target.value)}>
          {props.specialtyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select value={props.languageFilter} onChange={(event) => props.onLanguageFilterChange(event.target.value)}>
          {props.languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select value={props.sortMode} onChange={(event) => props.onSortModeChange(event.target.value)}>
          {props.sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
