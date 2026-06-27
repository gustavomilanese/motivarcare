import { describe, expect, it } from "vitest";
import {
  PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID,
  PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES,
  PROFESSIONAL_ATTENTION_AREA_COUPLES_ES,
  patientSeeksCouplesTherapy,
  professionalOffersCouplesTherapy,
  therapyModalityFromIntakeAnswers
} from "./therapyModality.js";

describe("therapyModality", () => {
  it("detects couples from mainReason", () => {
    expect(
      therapyModalityFromIntakeAnswers({ mainReason: PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES })
    ).toBe("COUPLES");
  });

  it("detects couples from couplesTherapyFocus", () => {
    expect(
      therapyModalityFromIntakeAnswers({
        mainReason: "",
        [PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID]: "Comunicación"
      })
    ).toBe("COUPLES");
  });

  it("defaults to individual", () => {
    expect(therapyModalityFromIntakeAnswers({ mainReason: "Ansiedad" })).toBe("INDIVIDUAL");
    expect(patientSeeksCouplesTherapy({ mainReason: "Ansiedad" })).toBe(false);
  });

  it("requires focus area and couples price for professional offer", () => {
    expect(
      professionalOffersCouplesTherapy({
        focusAreas: [PROFESSIONAL_ATTENTION_AREA_COUPLES_ES],
        couplesSessionPriceUsd: 90
      })
    ).toBe(true);
    expect(
      professionalOffersCouplesTherapy({
        focusAreas: [PROFESSIONAL_ATTENTION_AREA_COUPLES_ES],
        couplesSessionPriceUsd: null
      })
    ).toBe(false);
    expect(
      professionalOffersCouplesTherapy({
        focusAreas: ["Ansiedad"],
        couplesSessionPriceUsd: 90
      })
    ).toBe(false);
  });
});
