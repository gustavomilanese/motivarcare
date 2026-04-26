import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { TreatmentChatMessageDto } from "../services/treatmentChatApi";
import type { TreatmentChatLoadState } from "../hooks/useTreatmentChat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const ASSISTANT_NAME = "Maca";

interface TreatmentChatPanelProps {
  language: AppLanguage;
  loadState: TreatmentChatLoadState;
  errorMessage: string | null;
  messages: TreatmentChatMessageDto[];
  isAssistantTyping: boolean;
  safetyAlert: string | null;
  dailyTurnsRemaining: number | null;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onRetryLoad: () => void;
}

export function TreatmentChatPanel(props: TreatmentChatPanelProps) {
  const {
    language,
    loadState,
    errorMessage,
    messages,
    isAssistantTyping,
    safetyAlert,
    dailyTurnsRemaining,
    onClose,
    onSendMessage,
    onRetryLoad
  } = props;

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /** Auto-scroll al final cada vez que entra un mensaje nuevo o llega el typing. */
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isAssistantTyping]);

  /** Foco al input al montar y cuando termina el "sending" (para encadenar mensajes). */
  useEffect(() => {
    if (loadState !== "ready") return;
    inputRef.current?.focus();
  }, [loadState]);
  useEffect(() => {
    if (isAssistantTyping) return;
    inputRef.current?.focus();
  }, [isAssistantTyping]);

  const dailyLimitReached = dailyTurnsRemaining !== null && dailyTurnsRemaining <= 0;
  const inputDisabled = loadState !== "ready" || isAssistantTyping || dailyLimitReached;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length === 0 || inputDisabled) return;
    onSendMessage(trimmed);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    /**
     * Enter envía, Shift+Enter inserta salto. Mantenemos el patrón del intake-chat.
     */
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const trimmed = draft.trim();
      if (trimmed.length === 0 || inputDisabled) return;
      onSendMessage(trimmed);
      setDraft("");
    }
  };

  return (
    <aside className="treatment-chat-panel" role="dialog" aria-label={ASSISTANT_NAME}>
      <header className="treatment-chat-panel__header">
        <div className="treatment-chat-panel__header-text">
          <strong>{ASSISTANT_NAME}</strong>
          <span>
            {t(language, {
              es: "Te acompaño entre sesiones",
              en: "I'm here between sessions",
              pt: "Te acompanho entre sessões"
            })}
          </span>
        </div>
        <button
          type="button"
          className="treatment-chat-panel__close"
          onClick={onClose}
          aria-label={t(language, { es: "Cerrar chat", en: "Close chat", pt: "Fechar chat" })}
        >
          ×
        </button>
      </header>

      <div className="treatment-chat-panel__body">
        {loadState === "loading" ? (
          <p className="treatment-chat-panel__hint">
            {t(language, { es: "Abriendo tu chat...", en: "Opening your chat...", pt: "Abrindo seu chat..." })}
          </p>
        ) : null}

        {loadState === "error" ? (
          <div className="treatment-chat-panel__error">
            <p>{errorMessage ?? t(language, {
              es: "No pudimos abrir el chat ahora.",
              en: "We couldn't open the chat right now.",
              pt: "Não conseguimos abrir o chat agora."
            })}</p>
            <button type="button" onClick={onRetryLoad}>
              {t(language, { es: "Reintentar", en: "Retry", pt: "Tentar de novo" })}
            </button>
          </div>
        ) : null}

        {loadState === "ready" ? (
          <ul className="treatment-chat-panel__messages">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`treatment-chat-panel__message treatment-chat-panel__message--${m.role}`}
              >
                {m.content}
              </li>
            ))}
            {isAssistantTyping ? (
              <li
                className="treatment-chat-panel__message treatment-chat-panel__message--assistant treatment-chat-panel__message--typing"
                aria-live="polite"
              >
                <span className="treatment-chat-panel__typing-dot" />
                <span className="treatment-chat-panel__typing-dot" />
                <span className="treatment-chat-panel__typing-dot" />
              </li>
            ) : null}
            <div ref={messagesEndRef} />
          </ul>
        ) : null}
      </div>

      {safetyAlert ? (
        <div className="treatment-chat-panel__safety" role="status">
          {safetyAlert}
        </div>
      ) : null}

      {errorMessage && loadState === "ready" ? (
        <div className="treatment-chat-panel__inline-error" role="status">
          {errorMessage}
        </div>
      ) : null}

      <form className="treatment-chat-panel__form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          rows={2}
          value={draft}
          disabled={inputDisabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            dailyLimitReached
              ? t(language, {
                  es: "Llegaste al límite diario. Volvé mañana o agendá con tu profesional.",
                  en: "You've hit today's limit. Come back tomorrow or book with your therapist.",
                  pt: "Você atingiu o limite diário. Volte amanhã ou agende com seu profissional."
                })
              : t(language, {
                  es: "Contame cómo va todo...",
                  en: "Tell me how it's going...",
                  pt: "Me conta como vai tudo..."
                })
          }
        />
        <button
          type="submit"
          disabled={inputDisabled || draft.trim().length === 0}
          className="treatment-chat-panel__send"
        >
          {t(language, { es: "Enviar", en: "Send", pt: "Enviar" })}
        </button>
      </form>

      <p className="treatment-chat-panel__disclaimer">
        {t(language, {
          es: "No reemplaza tu terapia. Si hay urgencia, contactá a tu profesional o servicios de emergencia.",
          en: "This doesn't replace therapy. If it's urgent, reach your therapist or emergency services.",
          pt: "Não substitui sua terapia. Em emergência, contate seu profissional ou serviços de emergência."
        })}
      </p>
    </aside>
  );
}
