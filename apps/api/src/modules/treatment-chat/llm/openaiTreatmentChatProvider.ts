import OpenAI from "openai";
import { buildSafetyClassifierSystemPrompt } from "../../intake-chat/intakeChat.prompts.js";
import type {
  ProviderUsage,
  SafetyClassifierInput,
  SafetyClassifierResult
} from "../../intake-chat/llm/IntakeChatProvider.js";
import type {
  TreatmentChatCallInput,
  TreatmentChatCallResult,
  TreatmentChatProvider,
  TreatmentChatSummarizationInput,
  TreatmentChatSummarizationResult
} from "./TreatmentChatProvider.js";

/**
 * Tarifas (USD por 1M tokens) duplicadas a propósito del intake provider:
 * el costing del treatment-chat puede divergir si en el futuro lo movemos a otro
 * modelo (ej. gpt-4o-mini para conversaciones largas baratas). Mantener locales evita
 * cross-import del intake.
 */
const PRICING_PER_MILLION_TOKENS_USD: Record<string, { prompt: number; completion: number }> = {
  "gpt-5-mini": { prompt: 0.25, completion: 2.0 },
  "gpt-5": { prompt: 1.25, completion: 10.0 },
  "gpt-5.1": { prompt: 1.25, completion: 10.0 },
  "gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
  "gpt-4o": { prompt: 5.0, completion: 15.0 }
};

const DEFAULT_PRICING = { prompt: 1.0, completion: 5.0 };

const EMPTY_REPLY_FALLBACK =
  "Disculpá, tuve un problema generando la respuesta. ¿Podés repetir lo último?";

/**
 * `reasoning_effort` solo aplica a modelos de razonamiento (p. ej. gpt-5*).
 * gpt-4o-mini lo ignora o puede fallar en algunas rutas; evitamos mandarlo.
 */
function modelSupportsReasoningEffort(model: string): boolean {
  const m = model.toLowerCase();
  return m.startsWith("gpt-5") || m.startsWith("o1") || m.startsWith("o3");
}

export class OpenAITreatmentChatProvider implements TreatmentChatProvider {
  readonly providerName = "openai";
  readonly modelName: string;
  private readonly client: OpenAI;
  private readonly safetyModelName: string;
  private readonly summaryModelName: string;

  constructor(params: {
    apiKey: string;
    modelName: string;
    safetyModelName: string;
    summaryModelName: string;
  }) {
    if (!params.apiKey) {
      throw new Error("OpenAITreatmentChatProvider requires an apiKey");
    }
    this.client = new OpenAI({ apiKey: params.apiKey });
    this.modelName = params.modelName;
    this.safetyModelName = params.safetyModelName;
    this.summaryModelName = params.summaryModelName;
  }

  async generateAssistantResponse(input: TreatmentChatCallInput): Promise<TreatmentChatCallResult> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: input.systemPrompt },
      ...input.conversationHistory.map(
        (m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam
      )
    ];

    const body: Record<string, unknown> = {
      model: this.modelName,
      messages,
      max_completion_tokens: input.maxOutputTokens ?? 400
    };
    if (modelSupportsReasoningEffort(this.modelName)) {
      body.reasoning_effort = "low";
    }

    const completion = await this.client.chat.completions.create(
      body as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
    );

    const choice = completion.choices[0];
    const rawContent = choice?.message?.content?.trim() ?? "";
    const usage = computeUsage(this.modelName, completion.usage);

    /**
     * Si el modelo no devolvió nada (corte por tokens / bug del provider), usamos un
     * fallback empático para no romper la UX. El paciente puede reintentar.
     */
    const assistantMessage = rawContent.length > 0 ? rawContent : EMPTY_REPLY_FALLBACK;

    return { assistantMessage, usage };
  }

  async *streamAssistantResponse(
    input: TreatmentChatCallInput
  ): AsyncGenerator<string, ProviderUsage, void> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: input.systemPrompt },
      ...input.conversationHistory.map(
        (m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam
      )
    ];

    const body: Record<string, unknown> = {
      model: this.modelName,
      messages,
      stream: true,
      max_completion_tokens: input.maxOutputTokens ?? 400,
      stream_options: { include_usage: true }
    };
    if (modelSupportsReasoningEffort(this.modelName)) {
      body.reasoning_effort = "low";
    }

    const stream = (await this.client.chat.completions.create(
      body as unknown as OpenAI.Chat.ChatCompletionCreateParamsStreaming
    )) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

    let full = "";
    let usage: ProviderUsage = { promptTokens: 0, completionTokens: 0, costUsdCents: 0 };

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const piece = choice?.delta?.content ?? "";
      if (typeof piece === "string" && piece.length > 0) {
        full += piece;
        yield piece;
      }
      if (chunk.usage) {
        usage = computeUsage(this.modelName, chunk.usage);
      }
    }

    const outText = full.trim();
    if (outText.length === 0) {
      yield EMPTY_REPLY_FALLBACK;
    }
    if (usage.promptTokens + usage.completionTokens === 0) {
      const approxPromptChars = [input.systemPrompt, ...input.conversationHistory.map((m) => m.content)]
        .join(" ").length;
      const approxText = outText || EMPTY_REPLY_FALLBACK;
      return computeUsage(this.modelName, {
        prompt_tokens: Math.max(1, Math.ceil(approxPromptChars / 4)),
        completion_tokens: Math.max(1, Math.ceil(approxText.length / 4)),
        total_tokens: 0
      } as OpenAI.CompletionUsage);
    }
    return usage;
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
      max_completion_tokens: 200
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

  async summarizeChat(input: TreatmentChatSummarizationInput): Promise<TreatmentChatSummarizationResult> {
    const body: Record<string, unknown> = {
      model: this.summaryModelName,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userMessage }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: input.maxOutputTokens ?? 800
    };
    if (modelSupportsReasoningEffort(this.summaryModelName)) {
      /**
       * Reasoning bajo: el resumen no necesita razonamiento profundo, sino
       * extracción y síntesis. `low` mantiene latencia y costo previsibles.
       */
      body.reasoning_effort = "low";
    }

    const completion = await this.client.chat.completions.create(
      body as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
    );

    const rawJson = completion.choices[0]?.message?.content?.trim() ?? "";
    return {
      rawJson,
      usage: computeUsage(this.summaryModelName, completion.usage)
    };
  }
}

function computeUsage(modelName: string, openaiUsage: OpenAI.CompletionUsage | undefined): ProviderUsage {
  const promptTokens = openaiUsage?.prompt_tokens ?? 0;
  const completionTokens = openaiUsage?.completion_tokens ?? 0;
  const pricing = PRICING_PER_MILLION_TOKENS_USD[modelName] ?? DEFAULT_PRICING;
  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  const costUsdCents = Math.ceil((promptCost + completionCost) * 100);
  return { promptTokens, completionTokens, costUsdCents };
}
