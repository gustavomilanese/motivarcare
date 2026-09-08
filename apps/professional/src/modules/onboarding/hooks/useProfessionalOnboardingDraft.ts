import { useCallback, useMemo, useState } from "react";
import { useOnboardingDraft, type UseOnboardingDraftResult } from "@therapy/ui";

import { createOnboardingDraftTransport } from "../../app/services/onboardingDraftApi";
import {
  buildProfessionalOnboardingDraftData,
  restoreProfessionalOnboardingDraft,
  withMediaPresenceFlags,
  type DroppedDraftMedia,
  type ProfessionalDraftFormShape
} from "../lib/professionalOnboardingDraft";

export interface UseProfessionalOnboardingDraftResult extends UseOnboardingDraftResult {
  /** Archivos que estaban cargados antes de abandonar y hay que volver a subir. */
  droppedMedia: DroppedDraftMedia[];
}

/**
 * Autoguardado del wizard del profesional. Sólo actúa cuando ya hay sesión, o sea
 * desde que la cuenta existe (al terminar el paso de credenciales).
 */
export function useProfessionalOnboardingDraft<TForm extends ProfessionalDraftFormShape>(input: {
  token: string;
  step: number;
  form: TForm;
  maxStep: number;
  /** Piso: el paso al que ya llegó por verificación de mail. */
  minStep: number;
  setForm: (updater: (current: TForm) => TForm) => void;
  setStep: (step: number) => void;
  onStepRestored: (step: number) => void;
}): UseProfessionalOnboardingDraftResult {
  const [droppedMedia, setDroppedMedia] = useState<DroppedDraftMedia[]>([]);

  const transport = useMemo(() => createOnboardingDraftTransport(input.token), [input.token]);

  const value = useMemo(
    () => ({
      step: input.step,
      data: withMediaPresenceFlags(buildProfessionalOnboardingDraftData(input.form), input.form)
    }),
    [input.step, input.form]
  );

  const { setForm, setStep, onStepRestored, minStep, maxStep } = input;
  const onRestore = useCallback(
    (draft: { step: number; data: unknown }) => {
      const restored = restoreProfessionalOnboardingDraft<TForm>(draft.data);
      setForm((current) => ({ ...current, ...restored.values }));
      setDroppedMedia(restored.droppedMedia);

      const target = Math.max(minStep, Math.min(draft.step, maxStep));
      setStep(target);
      onStepRestored(target);
    },
    [setForm, setStep, onStepRestored, minStep, maxStep]
  );

  const draft = useOnboardingDraft({
    kind: "professional_onboarding",
    enabled: input.token.length > 0,
    transport,
    value,
    onRestore
  });

  return { ...draft, droppedMedia };
}
