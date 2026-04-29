import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import type { SessionUser, SubmitIntakeApiResponse } from "../../app/types";
import {
  fetchActiveIntakeChatSession,
  sendIntakeChatMessage,
  startOrResumeIntakeChat,
  submitIntakeChatSession,
  type IntakeChatMessageDto,
  type IntakeChatSessionDto,
  type IntakeChatSubmitMode
} from "../services/intakeChatApi";
import { stripDuplicateQuickReplyLines } from "../utils/stripDuplicateQuickReplyLines";

interface IntakeChatScreenProps {
  user: SessionUser;
  language: AppLanguage;
  authToken: string;
  /** Si el padre ya cargó la sesión activa, se la pasa para evitar un round-trip extra. */
  initialSession?: IntakeChatSessionDto | null;
  /** Después del submit el chat ya creó el PatientIntake; el padre aplica el resultado igual que con el wizard. */
  onComplete: (response: SubmitIntakeApiResponse) => Promise<void>;
  /** Volver al chooser sin perder la sesión (queda activa, retomable). */
  onSwitchToClassic?: () => void;
  /** Cancelar y volver al login/inicio. */
  onCancel?: () => void;
}

interface DisplayMessage extends IntakeChatMessageDto {
  /** `true` para mensajes que se acaban de mandar y todavía no fueron confirmados por el server. */
  optimistic?: boolean;
  /** `true` para errores locales que mostramos en la lista. */
  errorBubble?: boolean;
}

export function IntakeChatScreen(props: IntakeChatScreenProps) {
  const { language, authToken } = props;
  const t = (values: { es: string; en: string; pt: string }) => textByLanguage(language, values);

  const [session, setSession] = useState<IntakeChatSessionDto | null>(props.initialSession ?? null);
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(!props.initialSession);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /** Carga inicial: si no llegó initialSession, intentamos resume y si no hay arrancamos nueva. */
  useEffect(() => {
    if (props.initialSession) {
      setSession(props.initialSession);
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      setBootstrapError(null);
      try {
        const active = await fetchActiveIntakeChatSession(authToken);
        if (cancelled) return;
        if (active) {
          setSession(active);
        } else {
          const fresh = await startOrResumeIntakeChat(authToken);
          if (cancelled) return;
          setSession(fresh);
        }
      } catch (err) {
        if (cancelled) return;
        setBootstrapError(humanizeError(err, language));
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authToken, props.initialSession, language]);

  /** Auto-scroll al final cuando llegan mensajes nuevos. */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session?.messages.length, optimisticMessages.length, sending]);

  /**
   * Devuelve el foco al textarea cuando termina la respuesta del asistente, así el usuario
   * puede seguir escribiendo sin tener que volver a clickear el input. El focus() en el
   * finally del handleSend se perdía porque corría antes del re-render que removía disabled.
   */
  useEffect(() => {
    if (!sending && !submitting && !bootstrapping) {
      inputRef.current?.focus();
    }
  }, [sending, submitting, bootstrapping, session?.messages.length]);

  const allMessages: DisplayMessage[] = useMemo(() => {
    const serverMessages = session?.messages ?? [];
    return [...serverMessages, ...optimisticMessages];
  }, [session, optimisticMessages]);

  const sendText = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || !session || sending || submitting) return;

    setSendError(null);
    const optimistic: DisplayMessage = {
      role: "user",
      content: trimmed,
      ts: new Date().toISOString(),
      optimistic: true
    };
    setOptimisticMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);

    try {
      const updated = await sendIntakeChatMessage(session.sessionId, trimmed, authToken);
      setSession(updated);
      setOptimisticMessages([]);
    } catch (err) {
      setOptimisticMessages((prev) => prev.filter((m) => m !== optimistic));
      setInput(trimmed);
      setSendError(humanizeError(err, language));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault();
    await sendText(input);
  };

  const handleSubmit = async (mode: IntakeChatSubmitMode = "full") => {
    if (!session || submitting) return;
    if (mode === "full" && !session.readyToSubmit) return;
    if (mode === "early" && !session.canSubmitEarly) return;
    setSubmitting(true);
    setSendError(null);
    try {
      const response = await submitIntakeChatSession(session.sessionId, authToken, mode);
      await props.onComplete(response);
    } catch (err) {
      setSendError(humanizeError(err, language));
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  if (bootstrapping) {
    return (
      <div className="intake-shell intake-shell--chat">
        <section className="intake-card intake-card--chat">
          <p className="intake-chat-loading">
            {t({
              es: "Preparando tu conversación...",
              en: "Preparing your conversation...",
              pt: "Preparando sua conversa..."
            })}
          </p>
        </section>
      </div>
    );
  }

  if (bootstrapError || !session) {
    return (
      <div className="intake-shell intake-shell--chat">
        <section className="intake-card intake-card--chat">
          <h1 className="intake-chat-title">
            {t({ es: "No pudimos abrir el chat", en: "Couldn't open the chat", pt: "Não conseguimos abrir o chat" })}
          </h1>
          <p className="intake-chat-error">
            {bootstrapError ??
              t({
                es: "Probá de nuevo en un momento o usá el cuestionario tradicional.",
                en: "Try again in a moment or use the traditional questionnaire.",
                pt: "Tente novamente em instantes ou use o questionário tradicional."
              })}
          </p>
          <div className="intake-chat-error-actions">
            {props.onSwitchToClassic ? (
              <button type="button" className="intake-chat-secondary-btn" onClick={props.onSwitchToClassic}>
                {t({
                  es: "Usar cuestionario tradicional",
                  en: "Use traditional questionnaire",
                  pt: "Usar questionário tradicional"
                })}
              </button>
            ) : null}
            {props.onCancel ? (
              <button type="button" className="intake-chat-secondary-btn" onClick={props.onCancel}>
                {t({ es: "Volver", en: "Go back", pt: "Voltar" })}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  const turnsRemaining = session.quota.turnsRemaining;
  const showTurnsWarning = turnsRemaining > 0 && turnsRemaining <= 5;
  const turnsExhausted = turnsRemaining <= 0;

  return (
    <div className="intake-shell intake-shell--chat">
      <section className="intake-card intake-card--chat">
        <header className="intake-chat-header">
          <div className="intake-chat-header-text">
            <span className="intake-chat-header-eyebrow">
              {t({
                es: "Entrevista conversacional · Beta",
                en: "Conversational intake · Beta",
                pt: "Entrevista conversacional · Beta"
              })}
            </span>
            <h1 className="intake-chat-title">
              {t({
                es: "Charlemos para conocerte",
                en: "Let's chat to get to know you",
                pt: "Vamos conversar para te conhecer"
              })}
            </h1>
          </div>
          {props.onSwitchToClassic ? (
            <button
              type="button"
              className="intake-chat-switch-btn"
              onClick={props.onSwitchToClassic}
              disabled={submitting}
              title={t({
                es: "Cambiar al cuestionario tradicional",
                en: "Switch to traditional questionnaire",
                pt: "Mudar para o questionário tradicional"
              })}
            >
              {t({ es: "Usar formulario", en: "Use form", pt: "Usar formulário" })}
            </button>
          ) : null}
        </header>

        {session.safetyFlagged && session.safetyAlertMessage ? (
          <div className="intake-chat-safety-banner" role="alert">
            <strong>
              {t({ es: "Información importante", en: "Important information", pt: "Informação importante" })}
            </strong>
            <p>{session.safetyAlertMessage}</p>
          </div>
        ) : null}

        <div className="intake-chat-messages" aria-live="polite">
          {allMessages.map((message, index) => {
            const isLast = index === allMessages.length - 1;
            const qr = message.role === "assistant" ? message.quickReplies : undefined;
            const showQuick =
              Boolean(qr && qr.length > 0)
              && isLast
              && !sending;
            return (
              <MessageBubble
                key={`${message.ts}-${index}`}
                message={message}
                language={language}
                showQuickReplies={showQuick}
                onQuickReply={showQuick ? (label) => void sendText(label) : undefined}
              />
            );
          })}
          {sending ? (
            <div className="intake-chat-typing" aria-label={t({ es: "Escribiendo", en: "Typing", pt: "Digitando" })}>
              <span className="intake-chat-typing-dot" />
              <span className="intake-chat-typing-dot" />
              <span className="intake-chat-typing-dot" />
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {sendError ? <p className="intake-chat-error" role="alert">{sendError}</p> : null}

        {turnsExhausted && !session.readyToSubmit ? (
          <div className="intake-chat-quota-blocked" role="alert">
            <p>
              {t({
                es: "Llegamos al máximo de mensajes para esta entrevista. Si querés, podés enviar lo que tengamos hasta ahora o pasarte al cuestionario tradicional.",
                en: "We've reached the message limit for this intake. You can submit what we have so far or switch to the traditional questionnaire.",
                pt: "Atingimos o limite de mensagens desta entrevista. Você pode enviar o que temos ou mudar para o questionário tradicional."
              })}
            </p>
          </div>
        ) : null}

        <form className="intake-chat-input-row" onSubmit={handleSend}>
          <textarea
            ref={inputRef}
            className="intake-chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t({
              es: "Escribí tu respuesta y presioná Enter...",
              en: "Type your answer and press Enter...",
              pt: "Digite sua resposta e pressione Enter..."
            })}
            rows={2}
            maxLength={4000}
            // Importante: NO deshabilitar mientras `sending` está en true. Si lo deshabilitamos,
            // el navegador saca el foco y queda mal el UX. El botón Enviar ya bloquea el doble
            // submit. Sólo bloqueamos cuando finaliza la entrevista o no quedan turnos.
            disabled={submitting || turnsExhausted}
            autoFocus
          />
          <div className="intake-chat-input-actions">
            <button
              type="submit"
              className="intake-chat-send-btn"
              disabled={!input.trim() || sending || submitting || turnsExhausted}
            >
              {sending
                ? t({ es: "Enviando...", en: "Sending...", pt: "Enviando..." })
                : t({ es: "Enviar", en: "Send", pt: "Enviar" })}
            </button>
            {session.readyToSubmit ? (
              <button
                type="button"
                className="intake-chat-submit-btn"
                onClick={() => handleSubmit("full")}
                disabled={submitting}
              >
                {submitting
                  ? t({ es: "Finalizando...", en: "Finishing...", pt: "Finalizando..." })
                  : t({
                      es: "Finalizar y buscar profesionales",
                      en: "Finish and find professionals",
                      pt: "Finalizar e buscar profissionais"
                    })}
              </button>
            ) : session.canSubmitEarly ? (
              <button
                type="button"
                className="intake-chat-early-submit-btn"
                onClick={() => handleSubmit("early")}
                disabled={submitting}
                title={t({
                  es: "Saltá las preguntas restantes y vé a ver profesionales con lo que ya respondiste.",
                  en: "Skip the remaining questions and go straight to professionals.",
                  pt: "Pule as perguntas restantes e veja profissionais com o que já respondeu."
                })}
              >
                {submitting
                  ? t({ es: "Buscando...", en: "Searching...", pt: "Buscando..." })
                  : t({
                      es: "Ver profesionales con lo que tengo",
                      en: "See professionals with what I have",
                      pt: "Ver profissionais com o que tenho"
                    })}
              </button>
            ) : null}
          </div>
        </form>

        <footer className="intake-chat-footer">
          <span className="intake-chat-footer-meta">
            {t({ es: "Mensajes:", en: "Messages:", pt: "Mensagens:" })} {session.quota.turnsUsed}
            {showTurnsWarning ? (
              <em className="intake-chat-footer-warn">
                {" "}
                · {t({
                  es: `Te quedan ${turnsRemaining}`,
                  en: `${turnsRemaining} left`,
                  pt: `Restam ${turnsRemaining}`
                })}
              </em>
            ) : null}
          </span>
          {props.onCancel ? (
            <button
              type="button"
              className="intake-chat-footer-cancel"
              onClick={props.onCancel}
              disabled={submitting}
            >
              {t({ es: "Salir y volver luego", en: "Exit and come back later", pt: "Sair e voltar depois" })}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

function MessageBubble({
  message,
  language,
  showQuickReplies,
  onQuickReply
}: {
  message: DisplayMessage;
  language: AppLanguage;
  showQuickReplies?: boolean;
  onQuickReply?: (label: string) => void;
}) {
  const isAssistant = message.role === "assistant";
  const quickReplies = isAssistant && message.quickReplies?.length ? message.quickReplies : null;
  const stripped =
    showQuickReplies && quickReplies?.length
      ? stripDuplicateQuickReplyLines(message.content, quickReplies)
      : message.content;
  const displayContent = stripped.length > 0 ? stripped : message.content;

  return (
    <div
      className={`intake-chat-bubble intake-chat-bubble--${isAssistant ? "assistant" : "user"}${
        message.optimistic ? " intake-chat-bubble--optimistic" : ""
      }${message.errorBubble ? " intake-chat-bubble--error" : ""}`}
    >
      <div className="intake-chat-bubble-meta">
        {isAssistant
          ? textByLanguage(language, { es: "Asistente", en: "Assistant", pt: "Assistente" })
          : textByLanguage(language, { es: "Vos", en: "You", pt: "Você" })}
      </div>
      <div className="intake-chat-bubble-content">{displayContent}</div>
      {showQuickReplies && quickReplies && onQuickReply ? (
        <div className="intake-chat-quick-replies" role="group" aria-label={textByLanguage(language, {
          es: "Respuestas sugeridas",
          en: "Suggested replies",
          pt: "Respostas sugeridas"
        })}>
          {quickReplies.map((label, idx) => (
            <button
              key={`${idx}-${label.slice(0, 64)}`}
              type="button"
              className="intake-chat-quick-reply-btn"
              onClick={() => onQuickReply(label)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function humanizeError(err: unknown, language: AppLanguage): string {
  const fallback = textByLanguage(language, {
    es: "Hubo un problema. Probá de nuevo en un momento.",
    en: "Something went wrong. Try again in a moment.",
    pt: "Houve um problema. Tente novamente em instantes."
  });
  if (!(err instanceof Error)) return fallback;
  const msg = err.message;
  if (/Cantidad máxima de mensajes|TURN_LIMIT/i.test(msg)) {
    return textByLanguage(language, {
      es: "Llegaste al máximo de mensajes en esta sesión.",
      en: "You've reached the maximum number of messages for this session.",
      pt: "Você atingiu o número máximo de mensagens desta sessão."
    });
  }
  if (/COST_LIMIT/i.test(msg)) {
    return textByLanguage(language, {
      es: "La sesión llegó al límite de uso. Probá con el cuestionario tradicional.",
      en: "The session hit its usage limit. Try the traditional questionnaire.",
      pt: "A sessão atingiu o limite de uso. Tente o questionário tradicional."
    });
  }
  if (/INCOMPLETE_ANSWERS|MISSING_RESIDENCY/i.test(msg)) {
    return textByLanguage(language, {
      es: "Todavía faltan algunas respuestas para poder finalizar.",
      en: "We still need a few answers before we can finish.",
      pt: "Ainda faltam algumas respostas para finalizar."
    });
  }
  return fallback;
}
