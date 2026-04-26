import { describe, expect, it } from "vitest";
import type { TreatmentChatPatientContext } from "./patientContext.js";
import { buildTreatmentChatSystemPrompt } from "./treatmentChat.prompts.js";

function makeContext(partial: Partial<TreatmentChatPatientContext> = {}): TreatmentChatPatientContext {
  return {
    patientFirstName: null,
    timezone: "America/Argentina/Buenos_Aires",
    residencyCountry: null,
    assignedProfessional: null,
    nextSession: null,
    creditsRemaining: 0,
    ...partial
  };
}

describe("buildTreatmentChatSystemPrompt", () => {
  it("devuelve el prompt base sin bloque de contexto cuando no hay contexto", () => {
    const prompt = buildTreatmentChatSystemPrompt();
    expect(prompt).toContain("Eres \"Maca\"");
    expect(prompt).not.toContain("CONTEXTO DEL PACIENTE");
  });

  it("agrega bloque de contexto cuando hay datos", () => {
    const prompt = buildTreatmentChatSystemPrompt(
      makeContext({
        patientFirstName: "Lucía",
        residencyCountry: "AR",
        creditsRemaining: 3
      })
    );
    expect(prompt).toContain("CONTEXTO DEL PACIENTE");
    expect(prompt).toContain("Lucía");
    expect(prompt).toContain("AR");
    expect(prompt).toContain("3");
  });

  it("incluye el profesional asignado con título cuando aparece", () => {
    const prompt = buildTreatmentChatSystemPrompt(
      makeContext({
        patientFirstName: "Pablo",
        assignedProfessional: {
          fullName: "María Gómez",
          professionalTitle: "Lic. en Psicología"
        }
      })
    );
    expect(prompt).toContain("María Gómez");
    expect(prompt).toContain("Lic. en Psicología");
  });

  it("incluye la próxima sesión con el label local pre-formateado", () => {
    const prompt = buildTreatmentChatSystemPrompt(
      makeContext({
        nextSession: {
          startsAtIso: "2026-04-28T18:30:00.000Z",
          startsAtLocalLabel: "lunes 28 de abril, 15:30",
          professionalFullName: "María Gómez",
          status: "CONFIRMED"
        }
      })
    );
    expect(prompt).toContain("lunes 28 de abril, 15:30");
    expect(prompt).toContain("confirmada");
  });

  it("explicita 'pendiente de confirmación' cuando el booking sigue REQUESTED", () => {
    const prompt = buildTreatmentChatSystemPrompt(
      makeContext({
        nextSession: {
          startsAtIso: "2026-04-28T18:30:00.000Z",
          startsAtLocalLabel: "lunes 28 de abril, 15:30",
          professionalFullName: "María Gómez",
          status: "REQUESTED"
        }
      })
    );
    expect(prompt).toContain("pendiente de confirmación");
  });

  it("informa explícitamente cuando no hay sesiones agendadas o créditos en cero", () => {
    const prompt = buildTreatmentChatSystemPrompt(
      makeContext({
        patientFirstName: "Lu",
        creditsRemaining: 0,
        nextSession: null
      })
    );
    expect(prompt).toContain("no tiene sesiones agendadas todavía");
    expect(prompt).toContain("0 (no tiene paquete activo");
  });
});
