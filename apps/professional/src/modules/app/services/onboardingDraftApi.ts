import type { OnboardingDraftKind, OnboardingDraftTransport } from "@therapy/ui";

import { apiRequest } from "./api";

interface OnboardingDraftEnvelope {
  draft: { kind: OnboardingDraftKind; step: number; data: unknown; updatedAt: string; expiresAt: string } | null;
}

/** GET suelto, para decidir el ruteo antes de montar el wizard. */
export async function fetchOnboardingDraft(
  token: string,
  kind: OnboardingDraftKind
): Promise<{ step: number; data: unknown } | null> {
  const result = await apiRequest<OnboardingDraftEnvelope>(`/api/onboarding-drafts/${kind}`, token, {
    method: "GET"
  });
  return result.draft ? { step: result.draft.step, data: result.draft.data } : null;
}

/** Transporte de `useOnboardingDraft` contra `/api/onboarding-drafts/:kind`. */
export function createOnboardingDraftTransport(token: string): OnboardingDraftTransport {
  return {
    async get(kind) {
      return fetchOnboardingDraft(token, kind);
    },
    async put(kind, payload) {
      await apiRequest<OnboardingDraftEnvelope>(`/api/onboarding-drafts/${kind}`, token, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    async remove(kind) {
      await apiRequest<{ ok: boolean }>(`/api/onboarding-drafts/${kind}`, token, { method: "DELETE" });
    }
  };
}
