import type { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { getTreatmentChatProvider } from "./llm/providerFactory.js";
import {
  TREATMENT_CHAT_SUMMARY_SYSTEM_PROMPT,
  buildSummarizationUserMessage,
  type TreatmentChatProfessionalSummary,
  type TreatmentChatSummaryJson
} from "./treatmentChat.prompts.js";

/**
 * Servicio que provee al panel del profesional un resumen IA del chat de un
 * paciente bajo su cuidado, dividido en "última semana" y "histórico".
 *
 * Reglas:
 * - El paciente debe haber dado consent (`professionalShareConsent = true`).
 *   Sin consent, este servicio devuelve `null` (la API responde 403 / 404).
 * - Cacheamos el resumen en `patient_treatment_chat.professional_summary_*`
 *   para no regenerar a cada vista del profesional.
 * - Regeneramos cuando: (a) no existe cache, o (b) hay >= REGEN_DELTA mensajes
 *   nuevos desde el último resumen, o (c) la cache expiró por TTL.
 * - El resumen se construye sobre TODOS los mensajes user/assistant no ocultos.
 *
 * Costos:
 * - Para un chat de 200 mensajes (~10kB), el prompt cabe holgado en context.
 *   Si crece más, podríamos resumir incrementalmente — por ahora no.
 */

const REGEN_MESSAGE_DELTA = 6;
const SUMMARY_TTL_MS = 12 * 60 * 60 * 1000;
const WEEKLY_WINDOW_DAYS = 7;
const SUMMARIZATION_MAX_OUTPUT_TOKENS = 800;

export type ProfessionalReportFetchResult =
  | { kind: "ok"; summary: TreatmentChatProfessionalSummary; chatId: string; safetyFlagged: boolean; lastSafetyEventAt: string | null; lastUserMessageAt: string | null; messageCount: number }
  | { kind: "no-consent" }
  | { kind: "no-chat" }
  | { kind: "no-data" };

export class ProfessionalReportError extends Error {
  constructor(
    public readonly code: "FEATURE_DISABLED" | "PROVIDER_ERROR" | "INVALID_SUMMARY",
    message: string
  ) {
    super(message);
    this.name = "ProfessionalReportError";
  }
}

/**
 * Devuelve el resumen del chat de tratamiento de un paciente, generándolo o
 * reusando cache según corresponda.
 *
 * No hace verificación de relación profesional/paciente — eso lo hace el caller
 * (la routes del profesional) consultando bookings.
 */
export async function getOrGenerateProfessionalReport(
  patientId: string
): Promise<ProfessionalReportFetchResult> {
  if (!env.TREATMENT_CHAT_ENABLED) {
    /**
     * Si el feature está OFF, igual permitimos al profesional ver chats que ya
     * existieron antes (degradación). Pero si no hay chat, no hay nada que
     * mostrar.
     */
  }
  const chat = await prisma.patientTreatmentChat.findUnique({
    where: { patientId }
  });
  if (!chat) return { kind: "no-chat" };
  if (!chat.professionalShareConsent) return { kind: "no-consent" };

  const messages = await prisma.patientTreatmentChatMessage.findMany({
    where: {
      chatId: chat.id,
      hidden: false,
      role: { in: ["user", "assistant"] }
    },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true, createdAt: true }
  });

  if (messages.length === 0) return { kind: "no-data" };

  const cached = parseCachedSummary(chat.professionalSummaryJson);
  const cachedFresh = isCacheFresh(
    cached,
    chat.professionalSummaryAt,
    chat.professionalSummaryMessageCount,
    messages.length
  );

  if (cachedFresh && cached) {
    return {
      kind: "ok",
      summary: cached,
      chatId: chat.id,
      safetyFlagged: chat.highestSafetySeverity === "high",
      lastSafetyEventAt: chat.lastSafetyEventAt?.toISOString() ?? null,
      lastUserMessageAt: chat.lastUserMessageAt?.toISOString() ?? null,
      messageCount: messages.length
    };
  }

  /** Regenerar. */
  const provider = getTreatmentChatProvider();
  const weeklyCutoff = new Date(Date.now() - WEEKLY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const userMessage = buildSummarizationUserMessage(
    messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt
    })),
    weeklyCutoff
  );

  let rawJson: string;
  try {
    const result = await provider.summarizeChat({
      systemPrompt: TREATMENT_CHAT_SUMMARY_SYSTEM_PROMPT,
      userMessage,
      maxOutputTokens: SUMMARIZATION_MAX_OUTPUT_TOKENS
    });
    rawJson = result.rawJson;
  } catch (err) {
    console.error("[treatment-chat] summarize provider failed:", err instanceof Error ? err.message : err);
    /**
     * Si el LLM falla pero tenemos cache (incluso vencida), preferimos servir la
     * vieja antes que devolver "sin datos". El profesional ve un dato un poco
     * desactualizado pero usable.
     */
    if (cached) {
      return {
        kind: "ok",
        summary: cached,
        chatId: chat.id,
        safetyFlagged: chat.highestSafetySeverity === "high",
        lastSafetyEventAt: chat.lastSafetyEventAt?.toISOString() ?? null,
        lastUserMessageAt: chat.lastUserMessageAt?.toISOString() ?? null,
        messageCount: messages.length
      };
    }
    throw new ProfessionalReportError("PROVIDER_ERROR", "El asistente no pudo generar el resumen ahora.");
  }

  const parsed = parseAndValidateSummaryJson(rawJson);
  if (!parsed) {
    if (cached) {
      return {
        kind: "ok",
        summary: cached,
        chatId: chat.id,
        safetyFlagged: chat.highestSafetySeverity === "high",
        lastSafetyEventAt: chat.lastSafetyEventAt?.toISOString() ?? null,
        lastUserMessageAt: chat.lastUserMessageAt?.toISOString() ?? null,
        messageCount: messages.length
      };
    }
    throw new ProfessionalReportError(
      "INVALID_SUMMARY",
      "El resumen generado no tenía el formato esperado."
    );
  }

  const summary: TreatmentChatProfessionalSummary = {
    generatedAt: new Date().toISOString(),
    model: provider.modelName,
    messageCountAtGeneration: messages.length,
    weekly: parsed.weekly,
    overall: parsed.overall
  };

  await prisma.patientTreatmentChat.update({
    where: { id: chat.id },
    data: {
      professionalSummaryJson: summary as unknown as Prisma.InputJsonValue,
      professionalSummaryAt: new Date(),
      professionalSummaryMessageCount: messages.length
    }
  });

  return {
    kind: "ok",
    summary,
    chatId: chat.id,
    safetyFlagged: chat.highestSafetySeverity === "high",
    lastSafetyEventAt: chat.lastSafetyEventAt?.toISOString() ?? null,
    lastUserMessageAt: chat.lastUserMessageAt?.toISOString() ?? null,
    messageCount: messages.length
  };
}

/**
 * Toggle del consentimiento del paciente para compartir el resumen con el
 * profesional. El paciente lo controla desde el panel del chat.
 */
export async function setProfessionalShareConsent(
  patientId: string,
  consent: boolean
): Promise<{ consent: boolean; consentAt: string | null }> {
  /**
   * Si el chat no existe todavía, lo creamos sin mensajes para guardar el toggle
   * del consent — el primer mensaje del paciente disparará el greeting.
   * Pero en realidad nuestro flujo siempre crea el chat al abrir el panel, así
   * que esto es defensivo.
   */
  const chat = await prisma.patientTreatmentChat.upsert({
    where: { patientId },
    create: {
      patientId,
      status: "active",
      professionalShareConsent: consent,
      professionalShareConsentAt: consent ? new Date() : null
    },
    update: {
      professionalShareConsent: consent,
      professionalShareConsentAt: consent ? new Date() : null
    }
  });
  return {
    consent: chat.professionalShareConsent,
    consentAt: chat.professionalShareConsentAt?.toISOString() ?? null
  };
}

/* ========================================================================== */
/* Helpers                                                                     */
/* ========================================================================== */

function parseCachedSummary(json: Prisma.JsonValue | null): TreatmentChatProfessionalSummary | null {
  if (!json || typeof json !== "object") return null;
  const candidate = json as Record<string, unknown>;
  if (
    typeof candidate.generatedAt === "string" &&
    typeof candidate.model === "string" &&
    typeof candidate.messageCountAtGeneration === "number" &&
    candidate.overall &&
    typeof candidate.overall === "object"
  ) {
    return candidate as unknown as TreatmentChatProfessionalSummary;
  }
  return null;
}

function isCacheFresh(
  cached: TreatmentChatProfessionalSummary | null,
  generatedAt: Date | null,
  generatedMessageCount: number | null,
  currentMessageCount: number
): boolean {
  if (!cached || !generatedAt) return false;
  const ageMs = Date.now() - generatedAt.getTime();
  if (ageMs > SUMMARY_TTL_MS) return false;
  const messagesSince = currentMessageCount - (generatedMessageCount ?? 0);
  if (messagesSince >= REGEN_MESSAGE_DELTA) return false;
  return true;
}

function parseAndValidateSummaryJson(
  raw: string
): { weekly: TreatmentChatSummaryJson | null; overall: TreatmentChatSummaryJson } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const overall = validateSummarySection(obj.overall);
  if (!overall) return null;
  const weeklyRaw = obj.weekly;
  const weekly =
    weeklyRaw === null || weeklyRaw === undefined ? null : validateSummarySection(weeklyRaw);
  return { weekly: weekly ?? null, overall };
}

function validateSummarySection(value: unknown): TreatmentChatSummaryJson | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.moodSummary !== "string") return null;
  if (!Array.isArray(v.topics)) return null;
  if (!Array.isArray(v.signalsToWatch)) return null;
  if (typeof v.narrative !== "string") return null;
  return {
    moodSummary: String(v.moodSummary).slice(0, 80),
    topics: v.topics.filter((t): t is string => typeof t === "string").slice(0, 8),
    signalsToWatch: v.signalsToWatch.filter((t): t is string => typeof t === "string").slice(0, 8),
    narrative: String(v.narrative).slice(0, 1500)
  };
}

/** Exportado solo para tests. */
export const __internals = {
  parseCachedSummary,
  isCacheFresh,
  parseAndValidateSummaryJson,
  validateSummarySection,
  REGEN_MESSAGE_DELTA,
  SUMMARY_TTL_MS
};
