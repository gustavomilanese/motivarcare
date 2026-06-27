export const THERAPY_MODALITIES = ["INDIVIDUAL", "COUPLES"] as const;
export type TherapyModality = (typeof THERAPY_MODALITIES)[number];

/** Valor canónico en `mainReason` / áreas del profesional (ES). */
export const PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES = "Terapia de pareja";
export const PROFESSIONAL_ATTENTION_AREA_COUPLES_ES = PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES;
export const PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID = "couplesTherapyFocus";

const INTAKE_VALUE_JOINER = "\n";

function intakePieces(raw: string): string[] {
  return raw
    .split(INTAKE_VALUE_JOINER)
    .map((piece) => piece.trim())
    .filter(Boolean);
}

export function focusAreasIncludeCouplesTherapy(areas: readonly string[] | null | undefined): boolean {
  return (areas ?? []).includes(PROFESSIONAL_ATTENTION_AREA_COUPLES_ES);
}

export function isCouplesIntakeActive(mainReason: string, couplesFocus: string): boolean {
  return (
    intakePieces(mainReason).includes(PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES)
    || couplesFocus.trim().length > 0
  );
}

export function therapyModalityFromIntakeAnswers(answers: Record<string, string>): TherapyModality {
  const mainReason = answers.mainReason ?? "";
  const couplesFocus = answers[PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID] ?? "";
  return isCouplesIntakeActive(mainReason, couplesFocus) ? "COUPLES" : "INDIVIDUAL";
}

export function patientSeeksCouplesTherapy(answers: Record<string, string>): boolean {
  return therapyModalityFromIntakeAnswers(answers) === "COUPLES";
}

export function professionalOffersCouplesTherapy(professional: {
  focusAreas?: readonly string[] | null;
  couplesSessionPriceUsd?: number | null;
}): boolean {
  return (
    focusAreasIncludeCouplesTherapy(professional.focusAreas)
    && typeof professional.couplesSessionPriceUsd === "number"
    && professional.couplesSessionPriceUsd > 0
  );
}

export function coerceTherapyModality(value: unknown, fallback: TherapyModality = "INDIVIDUAL"): TherapyModality {
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (upper === "COUPLES" || upper === "INDIVIDUAL") {
    return upper;
  }
  return fallback;
}
