import { INTAKE_MAIN_REASON_VALUE_JOINER } from "../../app/constants";
import {
  PATIENT_INDIVIDUAL_MAIN_REASON_OPTIONS_ES,
  PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID,
  PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES
} from "../patientClinicalIntakeQuestions";

export type MainReasonCategory = "individual" | "couples";

const OTHER_OPTION_ES = "Otro";

export function intakeMainReasonPieces(raw: string): string[] {
  return raw
    .split(INTAKE_MAIN_REASON_VALUE_JOINER)
    .map((piece) => piece.trim())
    .filter(Boolean);
}

export function individualMainReasonPieces(mainReason: string): string[] {
  return intakeMainReasonPieces(mainReason).filter((piece) => piece !== PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES);
}

export function isCouplesMainReasonActive(mainReason: string, couplesFocus: string): boolean {
  return (
    intakeMainReasonPieces(mainReason).includes(PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES)
    || couplesFocus.trim().length > 0
  );
}

export function detectMainReasonCategory(mainReason: string, couplesFocus: string): MainReasonCategory {
  return isCouplesMainReasonActive(mainReason, couplesFocus) ? "couples" : "individual";
}

export function activateCouplesMainReason(prev: Record<string, string>): Record<string, string> {
  return {
    ...prev,
    mainReason: PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES,
    [PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID]: prev[PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID] ?? ""
  };
}

export function activateIndividualMainReason(prev: Record<string, string>): Record<string, string> {
  return {
    ...prev,
    mainReason: individualMainReasonPieces(prev.mainReason ?? "").join(INTAKE_MAIN_REASON_VALUE_JOINER),
    [PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID]: ""
  };
}

export function toggleIndividualMainReason(prev: Record<string, string>, option: string): Record<string, string> {
  let pieces = individualMainReasonPieces(prev.mainReason ?? "");

  if (pieces.includes(option)) {
    pieces = pieces.filter((piece) => {
      if (piece === option) {
        return false;
      }
      if (option === OTHER_OPTION_ES) {
        return !piece.startsWith(`${OTHER_OPTION_ES}:`);
      }
      return true;
    });
  } else {
    pieces = [...pieces, option];
  }

  return {
    ...prev,
    mainReason: pieces.join(INTAKE_MAIN_REASON_VALUE_JOINER),
    [PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID]: ""
  };
}

export function toggleCouplesFocusAnswer(prev: Record<string, string>, option: string): Record<string, string> {
  const pieces = intakeMainReasonPieces(prev[PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID] ?? "");
  const next = pieces.includes(option)
    ? pieces.filter((item) => item !== option)
    : [...pieces, option];

  return {
    ...prev,
    mainReason: PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES,
    [PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID]: next.join(INTAKE_MAIN_REASON_VALUE_JOINER)
  };
}

export function updateIndividualOtherDetail(prev: Record<string, string>, detail: string): Record<string, string> {
  const pieces = individualMainReasonPieces(prev.mainReason ?? "").filter(
    (piece) => piece !== OTHER_OPTION_ES && !piece.startsWith(`${OTHER_OPTION_ES}:`)
  );
  const trimmed = detail.trim();
  const next = trimmed ? [...pieces, `${OTHER_OPTION_ES}: ${detail}`] : pieces;
  return {
    ...prev,
    mainReason: next.join(INTAKE_MAIN_REASON_VALUE_JOINER),
    [PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID]: ""
  };
}

export function validateMainReasonAnswers(answers: Record<string, string>): boolean {
  const mainReason = answers.mainReason ?? "";
  const couplesFocus = answers[PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID] ?? "";
  const category = detectMainReasonCategory(mainReason, couplesFocus);

  if (category === "couples") {
    return couplesFocus.trim().length > 0;
  }

  const pieces = individualMainReasonPieces(mainReason);
  if (pieces.length === 0) {
    return false;
  }

  const hasOther =
    pieces.includes(OTHER_OPTION_ES) || pieces.some((piece) => piece.startsWith(`${OTHER_OPTION_ES}:`));
  if (hasOther) {
    const detail = pieces.find((piece) => piece.startsWith(`${OTHER_OPTION_ES}:`));
    if (!detail || detail.slice(OTHER_OPTION_ES.length + 1).trim().length === 0) {
      return false;
    }
  }

  return true;
}

export function isIndividualMainReasonOption(option: string): option is (typeof PATIENT_INDIVIDUAL_MAIN_REASON_OPTIONS_ES)[number] {
  return (PATIENT_INDIVIDUAL_MAIN_REASON_OPTIONS_ES as readonly string[]).includes(option);
}
