import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchTreatmentChatConversation,
  sendTreatmentChatMessage,
  setTreatmentChatConsent,
  type TreatmentChatDto,
  type TreatmentChatMessageDto
} from "../services/treatmentChatApi";

export type TreatmentChatLoadState = "idle" | "loading" | "ready" | "error";

interface UseTreatmentChatParams {
  /** Token JWT del paciente. Si es null, el hook queda inerte hasta que llegue. */
  authToken: string | null;
  /** Si el usuario abrió alguna vez el panel: solo entonces hacemos fetch real. */
  enabled: boolean;
}

interface UseTreatmentChatResult {
  loadState: TreatmentChatLoadState;
  /** Descripción amigable del último error (por ejemplo cuando el cap diario se llena). */
  errorMessage: string | null;
  /** True mientras esperamos respuesta del backend a `sendMessage`. */
  sending: boolean;
  /** True mientras el cliente "muestra" el assistant typing (sending + delay mínimo). */
  isAssistantTyping: boolean;
  conversation: TreatmentChatDto | null;
  /** Mensajes ordenados de más viejo a más nuevo, listos para render. */
  messages: TreatmentChatMessageDto[];
  /** Banner de crisis si en el último turno se disparó safety high. */
  safetyAlert: string | null;
  /** Forzar recarga del backend (por ejemplo al reabrir el panel después de mucho rato). */
  reload: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  /** Toggle del consentimiento del paciente para compartir resumen con su profesional. */
  setShareConsent: (consent: boolean) => Promise<void>;
  /** True mientras se actualiza el toggle (PR-T4). */
  consentSaving: boolean;
}

export function useTreatmentChat(params: UseTreatmentChatParams): UseTreatmentChatResult {
  const { authToken, enabled } = params;
  const [loadState, setLoadState] = useState<TreatmentChatLoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversation, setConversation] = useState<TreatmentChatDto | null>(null);
  const [sending, setSending] = useState(false);
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);
  const [consentSaving, setConsentSaving] = useState(false);
  /**
   * `loadedKey` evita refetchear infinito si auth/enabled rebotan a su valor original.
   * Usamos el token como clave: si el paciente cambió de cuenta (logout + login),
   * arrancamos de nuevo.
   */
  const loadedKeyRef = useRef<string | null>(null);

  const loadConversation = useCallback(
    async (token: string): Promise<void> => {
      setLoadState("loading");
      setErrorMessage(null);
      try {
        const dto = await fetchTreatmentChatConversation(token);
        setConversation(dto);
        if (dto.safetyFlagged && dto.safetyAlertMessage) {
          /**
           * Un chat con safety previa muestra el banner solo si el backend lo manda
           * (ahora mismo el GET no lo manda, por lo que el banner queda solo para el
           * turno en curso).
           */
          setSafetyAlert(dto.safetyAlertMessage);
        }
        setLoadState("ready");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No pudimos abrir tu chat ahora mismo.";
        console.warn("[useTreatmentChat] load failed:", msg);
        setErrorMessage(msg);
        setLoadState("error");
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled || !authToken) return;
    if (loadedKeyRef.current === authToken) return;
    loadedKeyRef.current = authToken;
    void loadConversation(authToken);
  }, [enabled, authToken, loadConversation]);

  /** Reset si el token desaparece (logout). */
  useEffect(() => {
    if (authToken) return;
    loadedKeyRef.current = null;
    setConversation(null);
    setSafetyAlert(null);
    setErrorMessage(null);
    setLoadState("idle");
  }, [authToken]);

  const reload = useCallback(async (): Promise<void> => {
    if (!authToken) return;
    await loadConversation(authToken);
  }, [authToken, loadConversation]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!authToken) return;
      const trimmed = text.trim();
      if (trimmed.length === 0) return;

      /**
       * Optimistic update del mensaje del paciente para que el textarea sienta
       * "instantáneo" aun cuando el backend tarda 1-2s en responder.
       */
      const optimisticUserMsg: TreatmentChatMessageDto = {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
        safetySeverity: null
      };
      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, optimisticUserMsg] } : prev
      );

      setSending(true);
      setSafetyAlert(null);
      setErrorMessage(null);
      try {
        const result = await sendTreatmentChatMessage(trimmed, authToken);
        setConversation(result);
        if (result.safetyTriggeredThisTurn && result.safetyAlertMessage) {
          setSafetyAlert(result.safetyAlertMessage);
        }
      } catch (err) {
        /**
         * Rollback del optimistic: volvemos al estado previo y dejamos que el usuario
         * reintente. Mensajes amigables ya vienen del backend (ver handleTreatmentChatError).
         */
        setConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.filter((m) => m.id !== optimisticUserMsg.id)
          };
        });
        const msg = err instanceof Error ? err.message : "No pudimos enviar tu mensaje.";
        setErrorMessage(msg);
      } finally {
        setSending(false);
      }
    },
    [authToken]
  );

  /**
   * Optimistic toggle del consent para que el switch reaccione instantáneo.
   * Si la API falla revertimos al valor anterior y dejamos un errorMessage
   * para que la UI lo muestre en el inline alert estándar.
   */
  const setShareConsent = useCallback(
    async (next: boolean): Promise<void> => {
      if (!authToken) return;
      setConsentSaving(true);
      setErrorMessage(null);
      const previous = conversation?.professionalShareConsent ?? false;
      setConversation((prev) =>
        prev ? { ...prev, professionalShareConsent: next } : prev
      );
      try {
        const result = await setTreatmentChatConsent(next, authToken);
        setConversation((prev) =>
          prev ? { ...prev, professionalShareConsent: result.consent } : prev
        );
      } catch (err) {
        setConversation((prev) =>
          prev ? { ...prev, professionalShareConsent: previous } : prev
        );
        const msg = err instanceof Error ? err.message : "No pudimos actualizar el consentimiento.";
        setErrorMessage(msg);
      } finally {
        setConsentSaving(false);
      }
    },
    [authToken, conversation?.professionalShareConsent]
  );

  return {
    loadState,
    errorMessage,
    sending,
    isAssistantTyping: sending,
    conversation,
    messages: conversation?.messages ?? [],
    safetyAlert,
    reload,
    sendMessage,
    setShareConsent,
    consentSaving
  };
}
