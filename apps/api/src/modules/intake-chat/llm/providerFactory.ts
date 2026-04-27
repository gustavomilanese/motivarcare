import { env } from "../../../config/env.js";
import type { IntakeChatProvider } from "./IntakeChatProvider.js";
import { OpenAIIntakeChatProvider } from "./openaiProvider.js";
import { MockIntakeChatProvider } from "./mockProvider.js";

let cachedProvider: IntakeChatProvider | null = null;

/**
 * Singleton del provider del intake-chat. Se elige a partir de:
 * - `INTAKE_CHAT_PROVIDER=mock` → siempre mock (para tests/demo).
 * - `INTAKE_CHAT_PROVIDER=openai` (default):
 *     - si hay `OPENAI_API_KEY`, usa OpenAI con `OPENAI_MODEL`.
 *     - sino, fallback a mock con un warning (para que el dev local no se rompa).
 */
export function getIntakeChatProvider(): IntakeChatProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  if (env.INTAKE_CHAT_PROVIDER === "mock") {
    cachedProvider = new MockIntakeChatProvider();
    return cachedProvider;
  }

  if (!env.OPENAI_API_KEY) {
    console.warn(
      "[intake-chat] OPENAI_API_KEY no configurada → usando MockIntakeChatProvider. " +
        "Configurá OPENAI_API_KEY en .env para usar el provider real."
    );
    cachedProvider = new MockIntakeChatProvider();
    return cachedProvider;
  }

  cachedProvider = new OpenAIIntakeChatProvider({
    apiKey: env.OPENAI_API_KEY,
    modelName: env.OPENAI_MODEL,
    /** Mismo criterio que treatment-chat: clasificador de crisis rápido. */
    safetyModelName: env.OPENAI_SAFETY_MODEL
  });
  return cachedProvider;
}

/** Solo para tests: inyectar un provider y resetear el caché. */
export function __setIntakeChatProviderForTests(provider: IntakeChatProvider | null): void {
  cachedProvider = provider;
}
