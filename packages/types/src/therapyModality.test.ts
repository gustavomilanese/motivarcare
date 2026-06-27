import { describe, expect, it } from "vitest";
import {
  PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID,
  PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES,
  focusAreasIncludeCouplesTherapy,
  isCouplesIntakeActive,
  patientSeeksCouplesTherapy,
  PROFESSIONAL_ATTENTION_AREA_COUPLES_ES
} from "./therapyModality.js";

describe("therapyModality (onboarding only)", () => {
  it("detects couples from mainReason", () => {
    expect(isCouplesIntakeActive(PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES, "")).toBe(true);
    expect(patientSeeksCouplesTherapy({ mainReason: PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES })).toBe(true);
  });

  it("detects couples from couplesTherapyFocus", () => {
    expect(
      patientSeeksCouplesTherapy({
        mainReason: "",
        [PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID]: "Comunicación"
      })
    ).toBe(true);
  });

  it("defaults to individual preference", () => {
    expect(patientSeeksCouplesTherapy({ mainReason: "Ansiedad" })).toBe(false);
  });

  it("detects couples focus area on professional profile", () => {
    expect(focusAreasIncludeCouplesTherapy([PROFESSIONAL_ATTENTION_AREA_COUPLES_ES])).toBe(true);
    expect(focusAreasIncludeCouplesTherapy(["Ansiedad"])).toBe(false);
  });
});
