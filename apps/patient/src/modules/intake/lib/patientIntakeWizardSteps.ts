export type PatientIntakeWizardStep =
  | { kind: "intro" }
  | { kind: "country" }
  | { kind: "question"; questionId: string };

export function buildPatientIntakeWizardSteps(params: {
  countryStepEnabled: boolean;
  questionIds: readonly string[];
}): PatientIntakeWizardStep[] {
  const steps: PatientIntakeWizardStep[] = [{ kind: "intro" }];
  if (params.countryStepEnabled) {
    steps.push({ kind: "country" });
  }
  for (const questionId of params.questionIds) {
    steps.push({ kind: "question", questionId });
  }
  return steps;
}

export function wizardStepIndexForQuestion(
  steps: readonly PatientIntakeWizardStep[],
  questionId: string
): number {
  return steps.findIndex((step) => step.kind === "question" && step.questionId === questionId);
}
