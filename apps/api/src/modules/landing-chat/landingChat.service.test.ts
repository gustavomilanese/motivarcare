import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetSessionCountersForTests,
  __setLandingChatProviderForTests,
  LandingChatError,
  sendLandingMessage
} from "./landingChat.service.js";
import { LANDING_MACA_CRISIS_MESSAGE } from "./landingChat.prompts.js";
import type {
  LandingChatGenerateInput,
  LandingChatGenerateResult,
  LandingChatProvider
} from "./landingChat.provider.js";
import type {
  SafetyClassifierInput,
  SafetyClassifierResult
} from "../intake-chat/llm/IntakeChatProvider.js";

interface FakeProviderOptions {
  reply?: string;
  shouldThrow?: boolean;
  classify?: SafetyClassifierResult;
}

function buildFakeProvider(opts: FakeProviderOptions = {}): LandingChatProvider & {
  calls: LandingChatGenerateInput[];
  safetyCalls: SafetyClassifierInput[];
} {
  const calls: LandingChatGenerateInput[] = [];
  const safetyCalls: SafetyClassifierInput[] = [];
  return {
    providerName: "fake",
    modelName: "fake-landing",
    async generateAssistantMessage(input): Promise<LandingChatGenerateResult> {
      calls.push(input);
      if (opts.shouldThrow) {
        throw new Error("simulated provider failure");
      }
      return {
        assistantMessage: opts.reply ?? "Mock reply",
        usage: { promptTokens: 10, completionTokens: 5, costUsdCents: 1 }
      };
    },
    async classifySafety(input): Promise<SafetyClassifierResult> {
      safetyCalls.push(input);
      return opts.classify ?? { triggered: false, severity: "none" };
    },
    calls,
    safetyCalls
  };
}

describe("landing-chat service", () => {
  beforeEach(() => {
    __resetSessionCountersForTests();
  });

  afterEach(() => {
    __setLandingChatProviderForTests(null);
    vi.restoreAllMocks();
  });

  it("rechaza mensajes vacíos sin tocar al provider", async () => {
    const provider = buildFakeProvider();
    __setLandingChatProviderForTests(provider);
    await expect(
      sendLandingMessage({ sessionId: "abcdefgh-1", history: [], message: "   " })
    ).rejects.toBeInstanceOf(LandingChatError);
    expect(provider.calls).toHaveLength(0);
    expect(provider.safetyCalls).toHaveLength(0);
  });

  it("rechaza mensajes excesivamente largos", async () => {
    const provider = buildFakeProvider();
    __setLandingChatProviderForTests(provider);
    const huge = "x".repeat(50_000);
    await expect(
      sendLandingMessage({ sessionId: "abcdefgh-2", history: [], message: huge })
    ).rejects.toMatchObject({ code: "MESSAGE_INVALID" });
    expect(provider.calls).toHaveLength(0);
  });

  it("devuelve la respuesta del provider y descuenta turnos por sessionId", async () => {
    const provider = buildFakeProvider({ reply: "Te leo, contame más." });
    __setLandingChatProviderForTests(provider);

    const r1 = await sendLandingMessage({
      sessionId: "abcdefgh-3",
      history: [],
      message: "Hola"
    });
    expect(r1.assistantMessage).toBe("Te leo, contame más.");
    expect(r1.source).toBe("llm");
    expect(r1.capReached).toBe(false);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.conversationHistory.at(-1)).toEqual({
      role: "user",
      content: "Hola"
    });

    const r2 = await sendLandingMessage({
      sessionId: "abcdefgh-3",
      history: [],
      message: "Hola otra vez"
    });
    expect(r2.remainingTurns).toBeLessThan(r1.remainingTurns);
  });

  it("dispara mensaje de crisis sin llamar al LLM cuando la heurística matchea", async () => {
    const provider = buildFakeProvider({
      reply: "respuesta normal",
      classify: { triggered: false, severity: "none" }
    });
    __setLandingChatProviderForTests(provider);

    const result = await sendLandingMessage({
      sessionId: "crisis-001",
      history: [],
      message: "no quiero seguir vivo, no aguanto más"
    });

    expect(result.assistantMessage).toBe(LANDING_MACA_CRISIS_MESSAGE);
    expect(result.source).toBe("crisis");
    expect(provider.calls).toHaveLength(0);
  });

  it("recorta la historia al context window antes de pasarla al provider", async () => {
    const provider = buildFakeProvider();
    __setLandingChatProviderForTests(provider);

    const longHistory = Array.from({ length: 30 }, (_v, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `m${i}`
    }));

    await sendLandingMessage({
      sessionId: "ctxwindow-1",
      history: longHistory,
      message: "nuevo"
    });

    const passed = provider.calls[0];
    expect(passed).toBeDefined();
    /** El último item es el "nuevo" del visitante. El resto fue recortado al window. */
    expect(passed?.conversationHistory.at(-1)?.content).toBe("nuevo");
    expect(passed?.conversationHistory.length).toBeLessThanOrEqual(40);
  });

  it("revierte el contador y propaga PROVIDER_ERROR si el LLM falla", async () => {
    const provider = buildFakeProvider({ shouldThrow: true });
    __setLandingChatProviderForTests(provider);

    await expect(
      sendLandingMessage({
        sessionId: "fails-001",
        history: [],
        message: "hola maca"
      })
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });

    /** Como falló, el counter no debería sumar; el siguiente turno arranca como turno 1. */
    const okProvider = buildFakeProvider({ reply: "ok" });
    __setLandingChatProviderForTests(okProvider);
    const r = await sendLandingMessage({
      sessionId: "fails-001",
      history: [],
      message: "reintento"
    });
    expect(r.source).toBe("llm");
    expect(r.capReached).toBe(false);
  });

  it("devuelve SESSION_CAP_REACHED al superar el cap por sessionId", async () => {
    const provider = buildFakeProvider({ reply: "ok" });
    __setLandingChatProviderForTests(provider);

    const sessionId = "capped-001";
    /**
     * Disparamos turnos hasta agotar el cap. El default `LANDING_MACA_MAX_TURNS_PER_SESSION`
     * es bajo (single-digit), así que 50 iteraciones cubre ampliamente.
     */
    let lastResult = null as Awaited<ReturnType<typeof sendLandingMessage>> | null;
    for (let i = 0; i < 50; i += 1) {
      try {
        lastResult = await sendLandingMessage({
          sessionId,
          history: [],
          message: `turno ${i}`
        });
      } catch (err) {
        expect(err).toBeInstanceOf(LandingChatError);
        expect((err as LandingChatError).code).toBe("SESSION_CAP_REACHED");
        return;
      }
    }
    expect(lastResult).toBeNull();
    throw new Error("Esperaba SESSION_CAP_REACHED pero no se disparó");
  });
});
