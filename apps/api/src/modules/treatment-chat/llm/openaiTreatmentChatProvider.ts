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

export class OpenAITreatmentChatProvider implements TreatmentChatProvider {
  readonly providerName = "openai";
  readonly modelName: string;
  private readonly client: OpenAI;
  private readonly safetyModelName: string;

  constructor(params: { apiKey: string; modelName: string; safetyModelName?: string }) {
    if (!params.apiKey) {
      throw new Error("OpenAITreatmentChatProvider requires an apiKey");
    }
    this.client = new OpenAI({ apiKey: params.apiKey });
    this.modelName = params.modelName;
    this.safetyModelName = params.safetyModelName ?? params.modelName;
  }

  async generateAssistantResponse(input: TreatmentChatCallInput): Promise<TreatmentChatCallResult> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: input.systemPrompt },
      ...input.conversationHistory.map(
        (m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam
      )
    ];

    const completion = await this.client.chat.completions.create({
      model: this.modelName,
      messages,
      reasoning_effort: "low",
      max_completion_tokens: input.maxOutputTokens ?? 400
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & { reasoning_effort?: string });

    const choice = completion.choices[0];
    const rawContent = choice?.message?.content?.trim() ?? "";
    const usage = computeUsage(this.modelName, completion.usage);

    /**
     * Si el modelo no devolvió nada (corte por tokens / bug del provider), usamos un
     * fallback empático para no romper la UX. El paciente puede reintentar.
     */
    const assistantMessage =
      rawContent.length > 0
        ? rawContent
        : "Disculpá, tuve un problema generando la respuesta. ¿Podés repetir lo último?";

    return { assistantMessage, usage };
  }

  async classifySafety(input: SafetyClassifierInput): Promise<SafetyClassifierResult> {
    const completion = await this.client.chat.completions.create({
      model: this.safetyModelName,
      messages: [
        { role: "system", content: buildSafetyClassifierSystemPrompt() },
        {
          role: "user",
          content: `Mensaje del paciente:\n"""${input.userMessage}"""\n\nContexto previo (resumen):\n${input.conversationContext}`
        }
      ],
      response_format: { type: "json_object" },
      reasoning_effort: "minimal",
      max_completion_tokens: 200
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & { reasoning_effort?: string });

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
    const completion = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userMessage }
      ],
      response_format: { type: "json_object" },
      /**
       * Reasoning bajo: el resumen no necesita razonamiento profundo, sino
       * extracción y síntesis. `low` mantiene latencia y costo previsibles.
       */
      reasoning_effort: "low",
      max_completion_tokens: input.maxOutputTokens ?? 800
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & { reasoning_effort?: string });

    const rawJson = completion.choices[0]?.message?.content?.trim() ?? "";
    return {
      rawJson,
      usage: computeUsage(this.modelName, completion.usage)
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
