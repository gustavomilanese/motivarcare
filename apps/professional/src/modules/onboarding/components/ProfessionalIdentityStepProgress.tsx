import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

export type IdentityStepSegment = "basic" | "location" | "languages" | "focus" | "therapy";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const SEGMENTS: Array<{ id: IdentityStepSegment; label: LocalizedText }> = [
  { id: "basic", label: { es: "Datos", en: "Details", pt: "Dados" } },
  { id: "location", label: { es: "Ubicación", en: "Location", pt: "Localizacao" } },
  { id: "languages", label: { es: "Idiomas", en: "Languages", pt: "Idiomas" } },
  { id: "focus", label: { es: "Áreas", en: "Focus", pt: "Areas" } },
  { id: "therapy", label: { es: "Terapia", en: "Therapy", pt: "Terapia" } }
];

export function identitySegmentIndex(id: IdentityStepSegment): number {
  return SEGMENTS.findIndex((item) => item.id === id);
}

export function ProfessionalIdentityStepProgress(props: {
  language: AppLanguage;
  active: IdentityStepSegment;
  reached: IdentityStepSegment;
}) {
  const activeIdx = identitySegmentIndex(props.active);
  const reachedIdx = identitySegmentIndex(props.reached);
  const progressPct = SEGMENTS.length > 1 ? (activeIdx / (SEGMENTS.length - 1)) * 100 : 0;

  return (
    <nav
      className="pro-web-identity-progress"
      aria-label={t(props.language, { es: "Progreso del formulario", en: "Form progress", pt: "Progresso do formulario" })}
    >
      <div className="pro-web-identity-progress-bar" aria-hidden="true">
        <span className="pro-web-identity-progress-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <ol className="pro-web-identity-progress-track">
        {SEGMENTS.map((segment, index) => {
          const isActive = segment.id === props.active;
          const isDone = index < activeIdx;
          const isReachable = index <= reachedIdx;
          const stepLabel = isDone ? "✓" : String(index + 1);

          return (
            <li
              key={segment.id}
              className={`pro-web-identity-progress-item${isActive ? " is-active" : ""}${isDone ? " is-done" : ""}${isReachable ? " is-reachable" : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="pro-web-identity-progress-step">{stepLabel}</span>
              <span className="pro-web-identity-progress-label">{t(props.language, segment.label)}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
