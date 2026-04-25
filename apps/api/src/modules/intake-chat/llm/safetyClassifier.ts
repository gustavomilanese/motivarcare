import type { IntakeChatProvider, SafetyClassifierResult } from "./IntakeChatProvider.js";

/**
 * Heurísticas de seguridad determinísticas: si matchean, devolvemos `high` SIN
 * llamar al LLM. Esto nos ahorra latencia en los casos más críticos y nos da un
 * piso de seguridad si el LLM falla / la API está caída.
 *
 * Conservador: preferimos falso positivo (mostrar recursos de crisis cuando no
 * había crisis) a falso negativo (no mostrarlos cuando sí la había).
 */
const HIGH_RISK_KEYWORDS_ES = [
  "suicid",
  "matarme",
  "matar me",
  "hacerme daño",
  "hacerme dano",
  "no quiero vivir",
  "no quiero seguir vivo",
  "no quiero seguir viva",
  "quitarme la vida",
  "terminar con todo",
  "ya no aguanto más",
  "ya no aguanto mas",
  "pensé en suicidarme",
  "pense en suicidarme",
  "auto-lesión",
  "autolesion",
  "cortarme"
];

const HIGH_RISK_KEYWORDS_EN = [
  "kill myself",
  "suicid",
  "want to die",
  "don't want to live",
  "dont want to live",
  "self-harm",
  "self harm",
  "hurt myself",
  "end it all"
];

const HIGH_RISK_KEYWORDS_PT = [
  "suicíd",
  "suicid",
  "me machucar",
  "me matar",
  "não quero viver",
  "nao quero viver"
];

/** Frases que parecen crisis pero suelen ser metafóricas. Las usamos para bajar la sensibilidad. */
const METAPHOR_PHRASES = [
  "me quiero morir de vergüenza",
  "me muero de risa",
  "me mata el trabajo",
  "me muero de hambre",
  "me muero de sueño",
  "i'm dying laughing",
  "i could kill for"
];

export interface SafetyEvalInput {
  userMessage: string;
  /** Mensajes recientes (en orden cronológico) para dar contexto al LLM clasificador. */
  recentMessages: Array<{ role: string; content: string }>;
}

/**
 * Resultado combinado de heurística + LLM.
 * - Si la heurística dispara, devuelve `high` directamente sin llamar al LLM.
 * - Sino, delega en el provider para una evaluación más matizada.
 */
export async function evaluateSafety(
  provider: IntakeChatProvider,
  input: SafetyEvalInput
): Promise<SafetyClassifierResult & { source: "heuristic" | "llm" }> {
  const lower = input.userMessage.toLowerCase();

  /** Si solo es una metáfora reconocida, no disparamos heurística. */
  const onlyMetaphor = METAPHOR_PHRASES.some((p) => lower.includes(p))
    && !HIGH_RISK_KEYWORDS_ES.some((k) => lower.includes(k) && !METAPHOR_PHRASES.some((m) => lower.includes(m) && m.includes(k)));

  if (!onlyMetaphor) {
    const heuristicHit =
      HIGH_RISK_KEYWORDS_ES.some((k) => lower.includes(k))
      || HIGH_RISK_KEYWORDS_EN.some((k) => lower.includes(k))
      || HIGH_RISK_KEYWORDS_PT.some((k) => lower.includes(k));
    if (heuristicHit) {
      return {
        triggered: true,
        severity: "high",
        reasoning: "heuristic: matched crisis keyword",
        source: "heuristic"
      };
    }
  }

  /** Sino delegamos al LLM, que puede captar matices más sutiles. */
  const conversationContext = input.recentMessages
    .slice(-6)
    .map((m) => `[${m.role}] ${m.content.slice(0, 200)}`)
    .join("\n");

  try {
    const llmResult = await provider.classifySafety({
      userMessage: input.userMessage,
      conversationContext
    });
    return { ...llmResult, source: "llm" };
  } catch (err) {
    /** Si el LLM falla, fail-safe: no marcamos crisis (la heurística ya pasó), pero loguemos. */
    console.warn("[intake-chat] safety classifier LLM failed:", err instanceof Error ? err.message : err);
    return {
      triggered: false,
      severity: "none",
      reasoning: "llm-error: defaulted to none after heuristic miss",
      source: "llm"
    };
  }
}
