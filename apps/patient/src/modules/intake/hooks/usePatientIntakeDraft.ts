import { useCallback, useMemo } from "react";
import { useOnboardingDraft } from "@therapy/ui";

import { createOnboardingDraftTransport } from "../../app/services/onboardingDraftApi";

interface PatientIntakeDraftData {
  answers?: Record<string, string>;
  residencyCountry?: string;
}

/**
 * Guarda el avance del cuestionario del paciente en el servidor y lo devuelve al entrar.
 * Al vivir en servidor (y no en `localStorage`) se retoma desde otro dispositivo.
 */
export function usePatientIntakeDraft(input: {
  authToken: string;
  stepIndex: number;
  answers: Record<string, string>;
  residencyCountry: string;
  setStepIndex: (step: number) => void;
  setAnswers: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  setResidencyCountry: (value: string) => void;
}) {
  const transport = useMemo(() => createOnboardingDraftTransport(input.authToken), [input.authToken]);

  const value = useMemo(
    () => ({
      step: input.stepIndex,
      data: { answers: input.answers, residencyCountry: input.residencyCountry }
    }),
    [input.stepIndex, input.answers, input.residencyCountry]
  );

  const { setAnswers, setResidencyCountry, setStepIndex } = input;
  const onRestore = useCallback(
    (draft: { step: number; data: PatientIntakeDraftData }) => {
      const saved = draft.data?.answers;
      if (saved) {
        // Merge sobre el estado inicial: si se agregaron preguntas nuevas, no quedan `undefined`.
        setAnswers((prev) => ({ ...prev, ...saved }));
      }
      if (draft.data?.residencyCountry) {
        setResidencyCountry(draft.data.residencyCountry);
      }
      setStepIndex(Math.max(0, draft.step));
    },
    [setAnswers, setResidencyCountry, setStepIndex]
  );

  return useOnboardingDraft<PatientIntakeDraftData>({
    kind: "patient_intake",
    enabled: input.authToken.length > 0,
    transport,
    value,
    onRestore
  });
}
