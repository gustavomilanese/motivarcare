import type { OnboardingDraftKind, OnboardingDraftTransport } from "@therapy/ui";

import { apiRequest } from "./api";

interface OnboardingDraftEnvelope {
  draft: { kind: OnboardingDraftKind; step: number; data: unknown; updatedAt: string; expiresAt: string } | null;
}

/** Transporte de `useOnboardingDraft` contra `/api/onboarding-drafts/:kind`. */
export function createOnboardingDraftTransport(token: string): OnboardingDraftTransport {
  return {
    async get(kind) {
      const result = await apiRequest<OnboardingDraftEnvelope>(
        `/api/onboarding-drafts/${kind}`,
        { method: "GET" },
        token
      );
      return result.draft ? { step: result.draft.step, data: result.draft.data } : null;
    },
    async put(kind, payload) {
      await apiRequest<OnboardingDraftEnvelope>(
        `/api/onboarding-drafts/${kind}`,
        { method: "PUT", body: JSON.stringify(payload) },
        token
      );
    },
    async remove(kind) {
      await apiRequest<{ ok: boolean }>(`/api/onboarding-drafts/${kind}`, { method: "DELETE" }, token);
    }
  };
}
