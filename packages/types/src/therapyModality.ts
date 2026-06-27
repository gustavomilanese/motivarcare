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

/** Preferencia clínica del paciente (onboarding); no altera precios ni créditos. */
export function patientSeeksCouplesTherapy(answers: Record<string, string>): boolean {
  const mainReason = answers.mainReason ?? "";
  const couplesFocus = answers[PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID] ?? "";
  return isCouplesIntakeActive(mainReason, couplesFocus);
}
