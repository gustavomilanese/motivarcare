import { env } from "../../../config/env.js";
import { MockTreatmentChatProvider } from "./mockTreatmentChatProvider.js";
import { OpenAITreatmentChatProvider } from "./openaiTreatmentChatProvider.js";
import type { TreatmentChatProvider } from "./TreatmentChatProvider.js";

let cachedProvider: TreatmentChatProvider | null = null;

/**
 * Singleton del provider del treatment-chat. Reglas:
 * - `TREATMENT_CHAT_PROVIDER=mock` → siempre mock (tests / dev sin costo).
 * - `TREATMENT_CHAT_PROVIDER=openai`:
 *     - si hay `OPENAI_API_KEY`, OpenAI con `OPENAI_MODEL` (compartido con el intake).
 *     - si no, fallback a mock con warning para no romper local.
 */
export function getTreatmentChatProvider(): TreatmentChatProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  if (env.TREATMENT_CHAT_PROVIDER === "mock") {
    cachedProvider = new MockTreatmentChatProvider();
    return cachedProvider;
  }

  if (!env.OPENAI_API_KEY) {
    console.warn(
      "[treatment-chat] OPENAI_API_KEY no configurada → usando MockTreatmentChatProvider. " +
        "Configurá OPENAI_API_KEY en .env para usar el provider real."
    );
    cachedProvider = new MockTreatmentChatProvider();
    return cachedProvider;
  }

  const summaryModel =
    env.TREATMENT_CHAT_SUMMARY_OPENAI_MODEL?.trim().length > 0
      ? env.TREATMENT_CHAT_SUMMARY_OPENAI_MODEL.trim()
      : env.OPENAI_MODEL;

  cachedProvider = new OpenAITreatmentChatProvider({
    apiKey: env.OPENAI_API_KEY,
    modelName: env.TREATMENT_CHAT_OPENAI_MODEL,
    safetyModelName: env.OPENAI_SAFETY_MODEL,
    summaryModelName: summaryModel
  });
  return cachedProvider;
}

/** Solo para tests: inyectar un provider y resetear el caché. */
export function __setTreatmentChatProviderForTests(provider: TreatmentChatProvider | null): void {
  cachedProvider = provider;
}
