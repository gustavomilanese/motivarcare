/**
 * Lógica compartida del intake clínico del paciente.
 * Usada tanto por el wizard tradicional (`profiles.routes.ts`) como por
 * el chat conversacional (`intake-chat`).
 */

export type IntakeRiskLevel = "low" | "medium" | "high";

/**
 * Evalúa el riesgo del paciente a partir de las respuestas crudas del intake.
 * - `high`: ideación de autolesión / no querer vivir (texto libre) o "Frecuentemente" en `safetyRisk`.
 * - `medium`: "A veces" en `safetyRisk`.
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

  const safetyAnswer = (answers.safetyRisk ?? "").toLowerCase();

  if (["frequently", "frecuentemente", "frequentemente"].includes(safetyAnswer)) {
    return "high";
  }

  if (["sometimes", "a veces", "as vezes"].includes(safetyAnswer)) {
    return "medium";
  }

  return "low";
}
