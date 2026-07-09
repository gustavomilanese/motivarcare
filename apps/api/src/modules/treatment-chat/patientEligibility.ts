import type { TreatmentChatPatientContext } from "./patientContext.js";
import { loadPatientContext } from "./patientContext.js";
import { TreatmentChatError } from "./treatmentChat.errors.js";

export function isPatientEligibleForTreatmentChat(context: TreatmentChatPatientContext): boolean {
  return context.creditsRemaining > 0 || context.nextSession != null;
}

export async function assertPatientEligibleForTreatmentChat(patientId: string): Promise<TreatmentChatPatientContext> {
  const context = await loadPatientContext(patientId);
  if (!isPatientEligibleForTreatmentChat(context)) {
    throw new TreatmentChatError(
      "NOT_ELIGIBLE",
      "Maca está disponible cuando tenés sesiones para usar o una sesión reservada. Cuando compres o reserves, volvé a encontrarme acá."
    );
  }
  return context;
}
