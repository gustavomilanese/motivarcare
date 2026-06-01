/**
 * Lógica compartida del intake clínico del paciente.
 * Usada tanto por el wizard tradicional (`profiles.routes.ts`) como por
 * el chat conversacional (`intake-chat`).
 */

export type IntakeRiskLevel = "low" | "medium" | "high";

const SAFETY_RISK_NEGATIVE_ANSWERS = new Set([
  "no",
  "nao"
]);

/**
 * Cualquier respuesta distinta de «No» en la pregunta de autolesión implica
 * derivación inmediata (no continúa el onboarding ni accede al portal).
 */
export function isSafetyRiskPositiveAnswer(raw: string | null | undefined): boolean {
  const normalized = (raw ?? "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return !SAFETY_RISK_NEGATIVE_ANSWERS.has(normalized);
}

/**
 * Evalúa el riesgo del paciente a partir de las respuestas crudas del intake.
 * - `high`: ideación de autolesión / no querer vivir (texto libre) o cualquier
 *   respuesta distinta de «No» en `safetyRisk`.
 * - `low`: resto.
 *
 * El criterio se mantiene espejado del wizard clásico para que un mismo paciente
 * obtenga el mismo `riskLevel` independientemente de qué método de intake usó.
 */
export function evaluateIntakeRiskLevel(answers: Record<string, string>): IntakeRiskLevel {
  const emotional = (answers.emotionalState ?? "").toLowerCase();
  if (
    emotional.includes("pensamientos")
    && (emotional.includes("daño") || emotional.includes("dano") || emotional.includes("vivir"))
  ) {
    return "high";
  }

  if (isSafetyRiskPositiveAnswer(answers.safetyRisk)) {
    return "high";
  }

  return "low";
}
