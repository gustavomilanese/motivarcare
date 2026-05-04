import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";

type Role = "assistant" | "user";

interface ChatMsg {
  id: string;
  role: Role;
  content: string;
}

function mkId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEMO_CAP = 8;

function buildInitialMessages(): ChatMsg[] {
  return [
    {
      id: mkId(),
      role: "assistant",
      content: "¡Hola! Soy Maca. Acá podés preguntarme lo esencial sobre MotivarCare o escribir cómo te sentís."
    }
  ];
}

/**
 * Demo **sin** modelo de lenguaje: no hay “entendimiento” real. Conviene imaginar un
 * desvío: si el texto parece de precio, de terapeuta, de ánimo, etc., respondemos con
 * un guion fijo; si no, una **lista de frases** que **rota** (según cuántos mensajes
 * mandó el usuario) para que no suene siempre igual. Eso da sensación de charla, pero
 * no memoria ni hilo: el hilo de verdad está en el portal, con Maca + IA y tu cuenta.
 */
function replyForUserMessage(text: string, userTurnIndex: number): string {
  const lower = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  if (/precio|pagar|pago|costo|cu[aá]nto|tarifa|\$|peso|paquete|sesion|sesiones/.test(lower)) {
    return "Cada profesional define sus honorarios: los ves antes de pagar en el portal, sin sorpresas. Ahí podés comparar, elegir y comprar paquetes cuando quieras.";
  }
  if (/match|psic[oó]logo|terapeuta|elegir|reserv|agenda|hora|turno/.test(lower)) {
    return "Puedo orientarte con lo que me cuentes. Para elegir profesional, ver la agenda y reservar, todo eso se gestiona en el portal —la IA y el equipo te acompañan en serio.";
  }
  if (
    /c[oó]mo funciona|c[oó]mo es (esto)?|qu[eé] es (esto|motivar|motivacare)|para qu[eé] (sirve|es esto)|de qu[eé] se trata|en qu[eé] consiste|qu[eé] tipo de (plataforma|servicio|app)|para qu[eé] es esto|qu[eé] ofrece/.test(
      lower
    )
  ) {
    return (
      "MotivarCare es una plataforma de terapia online: te conectás con psicólogos para sesiones por videollamada, con reservas y pagos claros. " +
      "Está pensada para estar disponible las 24 horas para escribir y acompañarte cuando lo necesites. " +
      "Además del trabajo clínico con tu profesional, sumamos IA (yo, Maca), música, ejercicios e información para apoyarte entre sesiones y hacer el proceso más completo. " +
      "Eso complementa la terapia; no la reemplaza."
    );
  }
  if (/\b(hola|buenas|hey|gracias)\b|^(\s*)(ok|si|s[ií])(\s*)$/i.test(lower)) {
    return "Un gusto leerte.";
  }
  if (
    /ansiedad|miedo|miedos|nervio|nervios|triste|baj[oó]n|angustia|no puedo m[aá]s|estoy mal|me siento|solo|sola|solas|ayuda|desesper|duro|dif[ií]cil|insomnio|ataque|p[aá]nico/.test(
      lower
    )
  ) {
    return "Gracias por contarlo: lo que sentís importa. Un profesional puede acompañarte a fondo; en MotivarCare podés reservar cuando quieras. Si sentís riesgo inmediato, buscá ayuda de emergencia en tu zona.";
  }
  if (/primera vez|nunca fui|no s[eé] si|tengo dudas|me da vergüenza|verguenza|da miedo agendar/.test(lower)) {
    return "Es normal el miedo o la duda al empezar: mucha gente tarda en dar el primer paso. El proceso en MotivarCare va por etapas; nadie te apura. La terapia en profundidad la lleva tu psicólogo o psicóloga; yo sigo en el chat para el día a día.";
  }
  if (/privacidad|secreto|nadie se entere|discreto|an[oó]nimo/.test(lower)) {
    return "Entiendo el cuidado con la privacidad. En la app, el chat y los datos clínicos están protegidos para eso.";
  }
  if (
    /demo|muestra|vista previa|es (real|falso|en serio|un bot)|me lees|me guardan|se guarda|queda guardado|esto graba|privado (aca|aqui|en la web)/.test(
      lower
    )
  ) {
    return "Lo que escribís en esta página no queda guardado: sirve para orientarte en la web. En MotivarCare, con tu registro, el chat y el resto del servicio van en tu cuenta de forma privada.";
  }

  const empatheticGeneral = [
    "Te leo. Lo que contás no es una molestia: mucha gente atraviesa algo parecido.",
    "A veces alcanza con ponerlo en palabras, aunque sea un poco.",
    "No tenés que tener todo resuelto para acercarte: curiosidad o necesidad, las dos cuentan.",
    "Si sirve de algo: dar el primer paso suele ser lo más pesado; después el proceso se ordena un poco más.",
    "Gracias por escribir. Hay espacio en MotivarCare para cuando quieras dar el siguiente paso.",
    "Si necesitás ordenar lo operativo, pagos y turnos quedan claros al reservar; lo importante es que no estés solo con lo que te pasa.",
    "Gracias por la confianza. Lo que sentís por dentro merece espacio: un profesional puede trabajarlo en profundidad y yo sumo en el camino.",
    "Si te sentís muy mal o en riesgo, pedí ayuda de emergencia o apoyo cercano. También podés hablar con tu psicólogo o psicóloga en MotivarCare."
  ];
  return empatheticGeneral[userTurnIndex % empatheticGeneral.length];
}

export function LandingMacaChat(props: { portalUrl: string }) {
  const { portalUrl } = props;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>(buildInitialMessages);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [userSendCount, setUserSendCount] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const inputLocked = userSendCount >= DEMO_CAP;

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
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed.length === 0 || typing || inputLocked) return;

      setMessages((prev) => [...prev, { id: mkId(), role: "user", content: trimmed }]);
      setDraft("");
      setTyping(true);

      const turn = userSendCount;
      setUserSendCount((c) => c + 1);

      window.setTimeout(() => {
        const body = replyForUserMessage(trimmed, turn);
        const capClose =
          turn + 1 >= DEMO_CAP
            ? "Llegaste al tope de mensajes de esta charla. Podés seguir en MotivarCare cuando quieras."
            : null;
        setMessages((prev) => {
          const next = [...prev, { id: mkId(), role: "assistant" as const, content: body }];
          if (capClose) next.push({ id: mkId(), role: "assistant", content: capClose });
          return next;
        });
        setTyping(false);
      }, 750);
    },
    [typing, inputLocked, userSendCount]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(draft);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(draft);
    }
  };

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
              <button type="button" className="treatment-chat-panel__close" onClick={() => setOpen(false)} aria-label="Cerrar chat">
                ×
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
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  inputLocked ? "Podés seguir en MotivarCare cuando quieras." : "Escribí lo que te gustaría saber o lo que sentís…"
                }
              />
              <button type="submit" disabled={typing || inputLocked || draft.trim().length === 0} className="treatment-chat-panel__send">
                Enviar
              </button>
            </form>

            <p className="treatment-chat-panel__disclaimer">
              Si estás en peligro o en crisis, buscá ayuda de emergencia en tu zona. Maca no reemplaza la terapia con un profesional: suma acompañamiento entre sesiones y recursos en la plataforma.
            </p>
          </aside>
        </div>
      ) : null}
    </>
  );
}
