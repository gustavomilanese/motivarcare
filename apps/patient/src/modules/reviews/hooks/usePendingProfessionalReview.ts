import { useCallback, useEffect, useRef, useState } from "react";
import type { PendingProfessionalReviewPrompt } from "@therapy/types";
import { fetchPendingProfessionalReview } from "../services/professionalReviewsApi";

const AUTO_PROMPT_KEY_PREFIX = "motivarcare-professional-review-prompt-shown";

function autoPromptStorageKey(professionalId: string): string {
  return `${AUTO_PROMPT_KEY_PREFIX}:${professionalId}`;
}

function hasAutoPromptBeenShown(professionalId: string): boolean {
  try {
    return window.localStorage.getItem(autoPromptStorageKey(professionalId)) === "1";
  } catch {
    return false;
  }
}

function markAutoPromptShown(professionalId: string): void {
  try {
    window.localStorage.setItem(autoPromptStorageKey(professionalId), "1");
  } catch {
    // ignore quota errors
  }
}

export function usePendingProfessionalReview(
  authToken: string | null,
  options?: { targetProfessionalId?: string | null }
) {
  const [pending, setPending] = useState<PendingProfessionalReviewPrompt | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const refreshGeneration = useRef(0);
  const targetProfessionalId = options?.targetProfessionalId?.trim() || null;

  const refreshPending = useCallback(async () => {
    if (!authToken) {
      setPending(null);
      setModalOpen(false);
      return null;
    }

    const generation = ++refreshGeneration.current;
    setLoading(true);
    try {
      const next = await fetchPendingProfessionalReview(authToken, {
        professionalId: targetProfessionalId ?? undefined
      });
      if (generation !== refreshGeneration.current) {
        return next;
      }
      setPending(next);
      if (next && targetProfessionalId && next.professionalId === targetProfessionalId) {
        setModalOpen(true);
      } else if (next && !targetProfessionalId && !hasAutoPromptBeenShown(next.professionalId)) {
        markAutoPromptShown(next.professionalId);
        setModalOpen(true);
      }
      return next;
    } catch {
      if (generation === refreshGeneration.current) {
        setPending(null);
      }
      return null;
    } finally {
      if (generation === refreshGeneration.current) {
        setLoading(false);
      }
    }
  }, [authToken, targetProfessionalId]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  const openReviewModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  const closeReviewModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const clearPendingAfterSubmit = useCallback(() => {
    setPending(null);
    setModalOpen(false);
    void refreshPending();
  }, [refreshPending]);

  return {
    pending,
    modalOpen,
    loading,
    openReviewModal,
    closeReviewModal,
    clearPendingAfterSubmit,
    refreshPending
  };
}
