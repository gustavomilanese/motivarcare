import OpenAI from "openai";
import type {
  ProviderUsage,
  SafetyClassifierInput,
  SafetyClassifierResult
} from "../intake-chat/llm/IntakeChatProvider.js";
import { buildSafetyClassifierSystemPrompt } from "../intake-chat/intakeChat.prompts.js";
import type { SafetyCapableProvider } from "../intake-chat/llm/safetyClassifier.js";

/**
 * Provider mínimo del landing-chat (Maca pública). Es deliberadamente más simple
 * que `TreatmentChatProvider`: no hay streaming, ni resumen profesional, ni
 * extracción de campos. El service decide cuándo llamarlo y cuándo cortocircuitar.
 *
 * Cumple `SafetyCapableProvider` para reusar `evaluateSafety()` del intake.
 */
export interface LandingChatProvider extends SafetyCapableProvider {
  readonly providerName: string;
  readonly modelName: string;

  generateAssistantMessage(input: LandingChatGenerateInput): Promise<LandingChatGenerateResult>;
  classifySafety(input: SafetyClassifierInput): Promise<SafetyClassifierResult>;
}

export interface LandingChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LandingChatGenerateInput {
  systemPrompt: string;
  /** Historia conversacional (sin el system); ya recortada al context window por el service. */
  conversationHistory: LandingChatMessage[];
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
}

export interface LandingChatGenerateResult {
  assistantMessage: string;
  usage: ProviderUsage;
}

/** Tarifas locales para el modelo del landing-chat (USD por 1M tokens). */
const PRICING_PER_MILLION_TOKENS_USD: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
  "gpt-4o": { prompt: 5.0, completion: 15.0 },
  "gpt-5-mini": { prompt: 0.25, completion: 2.0 },
  "gpt-5": { prompt: 1.25, completion: 10.0 }
};

const DEFAULT_PRICING = { prompt: 1.0, completion: 5.0 };

const EMPTY_REPLY_FALLBACK =
  "Disculpame, me quedé colgada. ¿Podés repetir lo último?";

function modelSupportsReasoningEffort(model: string): boolean {
  const m = model.toLowerCase();
  return m.startsWith("gpt-5") || m.startsWith("o1") || m.startsWith("o3");
}

function computeUsage(
  modelName: string,
  openaiUsage: OpenAI.CompletionUsage | undefined
): ProviderUsage {
  const promptTokens = openaiUsage?.prompt_tokens ?? 0;
  const completionTokens = openaiUsage?.completion_tokens ?? 0;
  const pricing = PRICING_PER_MILLION_TOKENS_USD[modelName] ?? DEFAULT_PRICING;
  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  const costUsdCents = Math.ceil((promptCost + completionCost) * 100);
  return { promptTokens, completionTokens, costUsdCents };
}

export class OpenAILandingChatProvider implements LandingChatProvider {
  readonly providerName = "openai";
  readonly modelName: string;
  private readonly client: OpenAI;
  private readonly safetyModelName: string;

  constructor(params: { apiKey: string; modelName: string; safetyModelName: string }) {
    if (!params.apiKey) {
      throw new Error("OpenAILandingChatProvider requires an apiKey");
    }
    this.client = new OpenAI({ apiKey: params.apiKey });
    this.modelName = params.modelName;
    this.safetyModelName = params.safetyModelName;
  }

  async generateAssistantMessage(input: LandingChatGenerateInput): Promise<LandingChatGenerateResult> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: input.systemPrompt },
      ...input.conversationHistory.map(
        (m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam
      )
    ];

    const body: Record<string, unknown> = {
      model: this.modelName,
      messages,
      max_completion_tokens: input.maxOutputTokens ?? 220,
      temperature: 0.6
    };
    if (modelSupportsReasoningEffort(this.modelName)) {
      body.reasoning_effort = "low";
    }

    const completion = await this.client.chat.completions.create(
      body as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
      input.abortSignal ? { signal: input.abortSignal } : undefined
    );

    const choice = completion.choices[0];
    const rawContent = choice?.message?.content?.trim() ?? "";
    const usage = computeUsage(this.modelName, completion.usage);
    const assistantMessage = rawContent.length > 0 ? rawContent : EMPTY_REPLY_FALLBACK;
    return { assistantMessage, usage };
  }

  async classifySafety(input: SafetyClassifierInput): Promise<SafetyClassifierResult> {
    const body: Record<string, unknown> = {
      model: this.safetyModelName,
      messages: [
        { role: "system", content: buildSafetyClassifierSystemPrompt() },
        {
          role: "user",
          content: `Mensaje del visitante:\n"""${input.userMessage}"""\n\nContexto previo (resumen):\n${input.conversationContext}`
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
      const parsed = JSON.parse(raw) as { severity?: string; reasoning?: string };
      if (parsed.severity === "high" || parsed.severity === "low" || parsed.severity === "none") {
        severity = parsed.severity;
      }
      reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : undefined;
    } catch {
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

/**
 * Mock determinístico para tests/dev sin OPENAI_API_KEY. Devuelve un eco corto
 * y nunca dispara crisis (eso lo cubre la heurística determinística de
 * `evaluateSafety()`, que es lo que valida los tests).
 */
export class MockLandingChatProvider implements LandingChatProvider {
  readonly providerName = "mock";
  readonly modelName = "mock-landing";

  async generateAssistantMessage(input: LandingChatGenerateInput): Promise<LandingChatGenerateResult> {
    if (input.abortSignal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    const lastUser = [...input.conversationHistory].reverse().find((m) => m.role === "user");
    const userText = lastUser?.content?.trim() ?? "";
    const reply =
      userText.length > 0
        ? `Mock-landing: te leo "${truncate(userText, 80)}". ¿Querés contarme un poco más?`
        : "Hola, soy Maca (mock). ¿Cómo puedo orientarte?";
    return {
      assistantMessage: reply,
      usage: { promptTokens: 0, completionTokens: 0, costUsdCents: 0 }
    };
  }

  async classifySafety(_input: SafetyClassifierInput): Promise<SafetyClassifierResult> {
    return { triggered: false, severity: "none", reasoning: "mock" };
  }
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}
