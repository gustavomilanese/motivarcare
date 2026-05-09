import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";
import { publicApiBase } from "./fetchLandingSessionPackages";

type Role = "assistant" | "user";

interface ChatMsg {
  id: string;
  role: Role;
  content: string;
}

interface ChatStatus {
  enabled: boolean;
  maxTurnsPerSession: number;
  maxInputChars: number;
}

const DEFAULT_STATUS: ChatStatus = {
  enabled: true,
  /** Defaults frontend; el server manda los reales vía /status. */
  maxTurnsPerSession: 8,
  maxInputChars: 400
};

function mkId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mkSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const INITIAL_GREETING =
  "Hola, soy Maca. Soy una IA de MotivarCare: te puedo escuchar un rato y orientarte sobre cómo funciona la terapia online acá. Lo profundo lo trabajás con un profesional dentro del portal.";

function buildInitialMessages(): ChatMsg[] {
  return [
    {
      id: mkId(),
      role: "assistant",
      content: INITIAL_GREETING
    }
  ];
}

const FALLBACK_MESSAGES = {
  rateLimited:
    "Estamos yendo muy rápido. Esperá unos segundos y volvé a probar, por favor.",
  providerError:
    "Tuve un problema para responder en este momento. Probá de nuevo en unos segundos. Si no, en el portal de MotivarCare te pueden orientar mejor.",
  network:
    "No pude conectarme. Revisá tu conexión y volvé a intentar; si sigue, podés seguir en el portal.",
  disabled:
    "Maca está fuera de servicio temporalmente. Podés crear cuenta en MotivarCare y seguir desde ahí cuando quieras."
} as const;

interface SendApiResponse {
  assistantMessage?: string;
  remainingTurns?: number;
  capReached?: boolean;
  code?: string;
  message?: string;
}

interface SendOutcome {
  reply: string;
  capReached: boolean;
  /** `true` si vino del servidor (LLM o crisis). `false` si caímos a un fallback de UX. */
  ok: boolean;
}

async function callMacaApi(params: {
  apiBase: string;
  sessionId: string;
  message: string;
  history: Array<{ role: Role; content: string }>;
}): Promise<SendOutcome> {
  const url = `${params.apiBase}/api/landing-chat/maca`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: params.sessionId,
        message: params.message,
        history: params.history
      })
    });
  } catch {
    return { reply: FALLBACK_MESSAGES.network, capReached: false, ok: false };
  }

  let body: SendApiResponse | null = null;
  try {
    body = (await res.json()) as SendApiResponse;
  } catch {
    body = null;
  }

  if (res.ok && body?.assistantMessage) {
    return {
      reply: body.assistantMessage,
      capReached: Boolean(body.capReached),
      ok: true
    };
  }

  if (res.status === 429) {
    /**
     * El backend distingue rate-limit por IP (mensaje "muy rápido") del cap por
     * sessionId (`details.capReached`). Si llegamos al cap, mostramos el texto
     * exacto que mandó el server y bloqueamos el input.
     */
    if (body && (body as { details?: { capReached?: boolean } }).details?.capReached) {
      return {
        reply: body.message ?? body.assistantMessage ?? FALLBACK_MESSAGES.providerError,
        capReached: true,
        ok: true
      };
    }
    return { reply: FALLBACK_MESSAGES.rateLimited, capReached: false, ok: false };
  }

  if (res.status === 503) {
    return { reply: FALLBACK_MESSAGES.disabled, capReached: false, ok: false };
  }

  return { reply: FALLBACK_MESSAGES.providerError, capReached: false, ok: false };
}

export function LandingMacaChat(props: { portalUrl: string }) {
  const { portalUrl } = props;
  const apiBase = useMemo(() => publicApiBase(), []);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ChatStatus>(DEFAULT_STATUS);
  const [messages, setMessages] = useState<ChatMsg[]>(buildInitialMessages);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const sessionIdRef = useRef<string>(mkSessionId());
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /** Lee feature flag y caps reales del backend. Si falla, usamos los defaults. */
  useEffect(() => {
    if (!apiBase) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/landing-chat/status`);
        if (!res.ok) return;
        const data = (await res.json()) as Partial<ChatStatus>;
        if (cancelled) return;
        setStatus({
          enabled: data.enabled !== false,
          maxTurnsPerSession: typeof data.maxTurnsPerSession === "number" ? data.maxTurnsPerSession : DEFAULT_STATUS.maxTurnsPerSession,
          maxInputChars: typeof data.maxInputChars === "number" ? data.maxInputChars : DEFAULT_STATUS.maxInputChars
        });
      } catch {
        /** Silencioso: si no podemos leer el status, asumimos enabled y usamos defaults. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typing, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open, typing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSend = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed.length === 0 || typing || inputLocked) return;
      const safeMessage = trimmed.slice(0, status.maxInputChars);

      setMessages((prev) => [...prev, { id: mkId(), role: "user", content: safeMessage }]);
      setDraft("");
      setTyping(true);

      /**
       * Mandamos al server SOLO los últimos turnos (rol user/assistant) para que
       * el LLM tenga contexto pero sin inflar tokens. El cap final lo aplica el server.
       */
      const historyForApi = messages
        .filter((m) => m.role === "assistant" || m.role === "user")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const outcome = await callMacaApi({
        apiBase,
        sessionId: sessionIdRef.current,
        message: safeMessage,
        history: historyForApi
      });

      setMessages((prev) => [
        ...prev,
        { id: mkId(), role: "assistant", content: outcome.reply }
      ]);
      if (outcome.capReached) {
        setInputLocked(true);
      }
      setTyping(false);
    },
    [apiBase, inputLocked, messages, status.maxInputChars, typing]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSend(draft);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(draft);
    }
  };

  if (!status.enabled) {
    return null;
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="treatment-chat-fab"
          onClick={() => setOpen(true)}
          aria-label="Abrir chat y escribirle a Maca"
        >
          <span aria-hidden="true" className="treatment-chat-fab__icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z" />
            </svg>
          </span>
          <span className="treatment-chat-fab__label">Escribirle a Maca</span>
        </button>
      ) : null}

      {open ? (
        <div className="treatment-chat-overlay" role="presentation">
          <aside className="treatment-chat-panel" role="dialog" aria-label="Maca">
            <header className="treatment-chat-panel__header">
              <div className="treatment-chat-panel__header-text">
                <strong>Maca</strong>
              </div>
              <button
                type="button"
                className="treatment-chat-panel__close"
                onClick={() => setOpen(false)}
                aria-label="Cerrar chat y volver a la landing"
              >
                <span className="treatment-chat-panel__close-x" aria-hidden="true">
                  ×
                </span>
                <span className="treatment-chat-panel__close-label">Cerrar</span>
              </button>
            </header>

            <div className="treatment-chat-panel__body">
              <ul className="treatment-chat-panel__messages">
                {messages.map((m) => (
                  <li key={m.id} className={`treatment-chat-panel__message treatment-chat-panel__message--${m.role}`}>
                    {m.content}
                  </li>
                ))}
                {typing ? (
                  <li
                    className="treatment-chat-panel__message treatment-chat-panel__message--assistant treatment-chat-panel__message--typing"
                    aria-live="polite"
                  >
                    <span className="treatment-chat-panel__typing-dot" />
                    <span className="treatment-chat-panel__typing-dot" />
                    <span className="treatment-chat-panel__typing-dot" />
                  </li>
                ) : null}
                <div ref={endRef} />
              </ul>
            </div>

            <a className="landing-maca-portal-cta" href={portalUrl} target="_blank" rel="noreferrer">
              Crear cuenta — terapia online y todo en un solo lugar
            </a>

            <form className="treatment-chat-panel__form" onSubmit={onSubmit}>
              <textarea
                ref={inputRef}
                rows={2}
                value={draft}
                disabled={typing || inputLocked}
                maxLength={status.maxInputChars}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  inputLocked
                    ? "Podés seguir en MotivarCare cuando quieras."
                    : "Escribí lo que te gustaría saber o lo que sentís…"
                }
              />
              <button type="submit" disabled={typing || inputLocked || draft.trim().length === 0} className="treatment-chat-panel__send">
                Enviar
              </button>
            </form>

            <p className="treatment-chat-panel__disclaimer">
              Esta charla es pública y no queda guardada. Maca es IA: orienta y acompaña, no reemplaza la terapia con un profesional. Si estás en peligro o en crisis, buscá ayuda de emergencia en tu zona.
            </p>
          </aside>
        </div>
      ) : null}
    </>
  );
}
