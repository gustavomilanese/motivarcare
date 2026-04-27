import OpenAI from "openai";
import {
  buildSafetyClassifierSystemPrompt
} from "../intakeChat.prompts.js";
import type {
  ExtractedIntakeAnswers,
  IntakeChatProvider,
  InterviewerCallInput,
  InterviewerCallResult,
  ProviderUsage,
  SafetyClassifierInput,
  SafetyClassifierResult
} from "./IntakeChatProvider.js";

/**
 * Tarifas (USD por 1M tokens) usadas para estimar costo por sesión.
 * Fuente: dashboard de OpenAI para gpt-5-mini al 2026-04. Si cambian, actualizar acá.
 * Mantengo precios conservadores (sobreestiman) para que el cap de costo no sub-cuente.
 */
const PRICING_PER_MILLION_TOKENS_USD: Record<string, { prompt: number; completion: number }> = {
  "gpt-5-mini": { prompt: 0.25, completion: 2.0 },
  "gpt-5": { prompt: 1.25, completion: 10.0 },
  "gpt-5.1": { prompt: 1.25, completion: 10.0 },
  "gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
  "gpt-4o": { prompt: 5.0, completion: 15.0 }
};

const DEFAULT_PRICING = { prompt: 1.0, completion: 5.0 };

function modelSupportsReasoningEffort(model: string): boolean {
  const m = model.toLowerCase();
  return m.startsWith("gpt-5") || m.startsWith("o1") || m.startsWith("o3");
}

/**
 * Implementación de IntakeChatProvider usando OpenAI Chat Completions API.
 *
 * Estrategia: una sola call por turno con `response_format: json_object` (extracción
 * y mensaje al paciente en el mismo round-trip) para minimizar latencia y costo.
 * Para `gpt-5-mini` (modelo de razonamiento), usamos `reasoning_effort: "low"` por defecto;
 * los reasoning tokens se cobran como completion pero no se devuelven al usuario.
 */
export class OpenAIIntakeChatProvider implements IntakeChatProvider {
  readonly providerName = "openai";
  readonly modelName: string;
  private readonly client: OpenAI;
  private readonly safetyModelName: string;

  constructor(params: { apiKey: string; modelName: string; safetyModelName: string }) {
    if (!params.apiKey) {
      throw new Error("OpenAIIntakeChatProvider requires an apiKey");
    }
    this.client = new OpenAI({ apiKey: params.apiKey });
    this.modelName = params.modelName;
    this.safetyModelName = params.safetyModelName;
  }

  async generateInterviewerResponse(input: InterviewerCallInput): Promise<InterviewerCallResult> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: input.systemPrompt },
      {
        role: "system",
        content: buildExtractedStateSystemSnippet(input.alreadyExtracted, input.residencyCountryAlreadyCaptured)
      },
      ...input.conversationHistory.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam)
    ];

    const body: Record<string, unknown> = {
      model: this.modelName,
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: input.maxOutputTokens ?? 1500
    };
    if (input.abortSignal) {
      body.signal = input.abortSignal;
    }
    if (modelSupportsReasoningEffort(this.modelName)) {
      body.reasoning_effort = "low";
    }

    const completion = await this.client.chat.completions.create(
      body as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
    );

    const choice = completion.choices[0];
    const rawContent = choice?.message?.content ?? "";
    const parsed = parseInterviewerJson(rawContent);

    const usage = computeUsage(this.modelName, completion.usage);

    return {
      assistantMessage: parsed.assistant_message,
      extractedAnswers: parsed.extracted_answers ?? {},
      residencyCountry: parsed.residency_country ?? null,
      isComplete: Boolean(parsed.is_complete),
      usage
    };
  }

  async classifySafety(input: SafetyClassifierInput): Promise<SafetyClassifierResult> {
    const body: Record<string, unknown> = {
      model: this.safetyModelName,
      messages: [
        { role: "system", content: buildSafetyClassifierSystemPrompt() },
        {
          role: "user",
          content: `Mensaje del paciente:\n"""${input.userMessage}"""\n\nContexto previo (resumen):\n${input.conversationContext}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 80
    };
    if (modelSupportsReasoningEffort(this.safetyModelName)) {
      body.reasoning_effort = "minimal";
    }
    const completion = await this.client.chat.completions.create(
      body as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
    );

    const raw = completion.choices[0]?.message?.content ?? "";
    let severity: "none" | "low" | "high" = "none";
    let reasoning: string | undefined;
    try {
      const parsedRaw = JSON.parse(raw) as { severity?: string; reasoning?: string };
      if (parsedRaw.severity === "high" || parsedRaw.severity === "low" || parsedRaw.severity === "none") {
        severity = parsedRaw.severity;
      }
      reasoning = typeof parsedRaw.reasoning === "string" ? parsedRaw.reasoning : undefined;
    } catch {
      /** Si el clasificador devuelve algo no-JSON, fail-safe: tratamos como "none" pero quedamos con reasoning crudo. */
      reasoning = `unparsed: ${raw.slice(0, 200)}`;
    }

    return {
      triggered: severity !== "none",
      severity,
      reasoning,
      usage: computeUsage(this.safetyModelName, completion.usage)
    };
  }
}

function computeUsage(modelName: string, openaiUsage: OpenAI.CompletionUsage | undefined): ProviderUsage {
  const promptTokens = openaiUsage?.prompt_tokens ?? 0;
  const completionTokens = openaiUsage?.completion_tokens ?? 0;
  const pricing = PRICING_PER_MILLION_TOKENS_USD[modelName] ?? DEFAULT_PRICING;
  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  /** Multiplicamos por 100 (USD → cents) y redondeamos hacia arriba para no sub-cuentar. */
  const costUsdCents = Math.ceil((promptCost + completionCost) * 100);
  return { promptTokens, completionTokens, costUsdCents };
}

interface InterviewerJsonResponse {
  assistant_message: string;
  extracted_answers?: ExtractedIntakeAnswers;
  residency_country?: string | null;
  is_complete?: boolean;
}

/**
 * Parser tolerante: si el LLM devuelve algo que no sea JSON válido, intentamos
 * recortar a la primera "{...}" que matchee. Si falla totalmente, devolvemos un
 * mensaje genérico para no romper la conversación.
 */
function parseInterviewerJson(raw: string): InterviewerJsonResponse {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      assistant_message: "Disculpá, tuve un problema procesando tu mensaje. ¿Podés repetir lo último?",
      extracted_answers: {},
      residency_country: null,
      is_complete: false
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as InterviewerJsonResponse;
    if (typeof parsed.assistant_message !== "string" || parsed.assistant_message.trim().length === 0) {
      throw new Error("missing assistant_message");
    }
    return parsed;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as InterviewerJsonResponse;
        if (typeof parsed.assistant_message === "string" && parsed.assistant_message.trim().length > 0) {
          return parsed;
        }
      } catch {
        /** continúa al fallback */
      }
    }
    return {
      assistant_message: trimmed.slice(0, 400),
      extracted_answers: {},
      residency_country: null,
      is_complete: false
    };
  }
}

/**
 * Snippet de estado que inyectamos como `system` extra antes de la conversación,
 * para que el LLM sepa "qué ya tiene capturado" sin tener que releer toda la historia.
 * Esto evita que repita preguntas que ya fueron respondidas.
 */
function buildExtractedStateSystemSnippet(
  extracted: ExtractedIntakeAnswers,
  residencyCountry: string | null
): string {
  const lines: string[] = ["Estado actual de la entrevista (lo que YA capturaste):"];
  const entries = Object.entries(extracted ?? {});
  if (entries.length === 0) {
    lines.push("- (vacío) — todavía no extrajiste nada");
  } else {
    for (const [key, value] of entries) {
      lines.push(`- ${key}: ${value}`);
    }
  }
  lines.push(`- residencyCountry: ${residencyCountry ?? "(no capturado)"}`);
  lines.push("\nNo vuelvas a preguntar nada que ya esté en este estado salvo que necesites confirmar.");
  return lines.join("\n");
}
