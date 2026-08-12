import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchTreatmentChatConversation,
  sendTreatmentChatMessage,
  setTreatmentChatConsent,
  type TreatmentChatDto
} from "../api/client";

export type TreatmentChatLoadState = "idle" | "loading" | "ready" | "error";

export function useTreatmentChat(params: { authToken: string | null; enabled: boolean }) {
  const { authToken, enabled } = params;
  const [loadState, setLoadState] = useState<TreatmentChatLoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversation, setConversation] = useState<TreatmentChatDto | null>(null);
  const [sending, setSending] = useState(false);
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const loadedKeyRef = useRef<string | null>(null);

  const loadConversation = useCallback(async (token: string) => {
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const { chat } = await fetchTreatmentChatConversation(token);
      setConversation(chat);
      if (chat.safetyFlagged && chat.safetyAlertMessage) {
        setSafetyAlert(chat.safetyAlertMessage);
      }
      setLoadState("ready");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "No pudimos abrir Maca ahora.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (!enabled || !authToken) return;
    if (loadedKeyRef.current === authToken) return;
    loadedKeyRef.current = authToken;
    void loadConversation(authToken);
  }, [enabled, authToken, loadConversation]);

  useEffect(() => {
    if (authToken) return;
    loadedKeyRef.current = null;
    setConversation(null);
    setSafetyAlert(null);
    setErrorMessage(null);
    setLoadState("idle");
  }, [authToken]);

  const reload = useCallback(async () => {
    if (!authToken) return;
    loadedKeyRef.current = null;
    await loadConversation(authToken);
    loadedKeyRef.current = authToken;
  }, [authToken, loadConversation]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!authToken) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const optimisticId = `optimistic-${Date.now()}`;
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: optimisticId,
                  role: "user",
                  content: trimmed,
                  createdAt: new Date().toISOString(),
                  safetySeverity: null
                }
              ]
            }
          : prev
      );

      setSending(true);
      setSafetyAlert(null);
      setErrorMessage(null);
      try {
        const { chat } = await sendTreatmentChatMessage({ token: authToken, message: trimmed });
        setConversation(chat);
        if (chat.safetyTriggeredThisTurn && chat.safetyAlertMessage) {
          setSafetyAlert(chat.safetyAlertMessage);
        }
      } catch (err) {
        setConversation((prev) =>
          prev
            ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticId) }
            : prev
        );
        setErrorMessage(err instanceof Error ? err.message : "No pudimos enviar tu mensaje.");
      } finally {
        setSending(false);
      }
    },
    [authToken]
  );

  const setShareConsent = useCallback(
    async (next: boolean) => {
      if (!authToken || !conversation) return;
      const prev = conversation.professionalShareConsent;
      setConversation({ ...conversation, professionalShareConsent: next });
      setConsentSaving(true);
      try {
        await setTreatmentChatConsent({ token: authToken, consent: next });
      } catch (err) {
        setConversation((c) => (c ? { ...c, professionalShareConsent: prev } : c));
        setErrorMessage(err instanceof Error ? err.message : "No se pudo actualizar el consentimiento.");
      } finally {
        setConsentSaving(false);
      }
    },
    [authToken, conversation]
  );

  return {
    loadState,
    errorMessage,
    sending,
    conversation,
    messages: conversation?.messages ?? [],
    safetyAlert,
    reload,
    sendMessage,
    setShareConsent,
    consentSaving
  };
}
