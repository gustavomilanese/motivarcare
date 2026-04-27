import type { PatientIntakeChatSession, Prisma } from "@prisma/client";
import { marketFromResidencyCountry } from "@therapy/types";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { evaluateIntakeRiskLevel, type IntakeRiskLevel } from "../profiles/intake.shared.js";
import {
  INTAKE_CHAT_FALLBACK_GREETING,
  INTAKE_CHAT_SAFETY_ALERT_MESSAGE,
  buildInterviewerSystemPrompt,
  buildResumeGreeting
} from "./intakeChat.prompts.js";
import {
  INTAKE_CHAT_QUESTIONS,
  INTAKE_CHAT_REQUIRED_QUESTION_IDS,
  INTAKE_CHAT_CRISIS_EMOTIONAL_OPTION
} from "./intakeChat.questions.js";
import { evaluateSafety } from "./llm/safetyClassifier.js";
import { getIntakeChatProvider } from "./llm/providerFactory.js";
import type { IntakeChatProvider, ExtractedIntakeAnswers } from "./llm/IntakeChatProvider.js";

export type IntakeChatSessionStatus = "active" | "completed" | "abandoned" | "safety_blocked" | "error";

export interface IntakeChatStoredMessage {
  role: "system" | "assistant" | "user";
  content: string;
  ts: string;
  /** Si true, no se manda al LLM ni se renderiza al paciente. Útil para notas internas. */
  hidden?: boolean;
}

export interface IntakeChatSessionDto {
  sessionId: string;
  status: IntakeChatSessionStatus;
  /** Mensajes visibles al paciente (sin los `hidden`). */
  messages: Array<{ role: "assistant" | "user"; content: string; ts: string }>;
  extractedAnswers: ExtractedIntakeAnswers;
  residencyCountry: string | null;
  isResume: boolean;
  /** El service cree que ya tiene todo para hacer submit. */
  readyToSubmit: boolean;
  /**
   * El paciente ya puede saltar a ver profesionales aunque le falten respuestas:
   * tenemos al menos `mainReason` y `residencyCountry`. Las preguntas faltantes
   * se completan con defaults neutros del lado del backend.
   * No se setea cuando `readyToSubmit` ya es true (ahí mostramos el botón "full").
   */
  canSubmitEarly: boolean;
  /** `true` si el clasificador de seguridad disparó "high" en algún turno. */
  safetyFlagged: boolean;
  /** Mensaje extra para mostrar como banner si safetyFlagged (recursos de crisis). */
  safetyAlertMessage?: string;
  /** Estado de cuotas: turnos restantes y costo acumulado. */
  quota: {
    turnsUsed: number;
    turnsRemaining: number;
    estimatedCostUsdCents: number;
  };
}

export interface SendMessageResult extends IntakeChatSessionDto {
  /** El mensaje del assistant generado en este turno. */
  lastAssistantMessage: string;
  /** Si en este turno se detectó crisis. */
  safetyTriggeredThisTurn: boolean;
}

export interface SubmitSessionResult {
  intakeId: string;
  riskLevel: IntakeRiskLevel;
  residencyCountry: string;
  /** ISO timestamp del intake creado — alineado con `SubmitIntakeApiResponse.intake.completedAt`. */
  completedAt: string;
  /** Mercado derivado del país de residencia — alineado con el wizard tradicional. */
  market: ReturnType<typeof marketFromResidencyCountry>;
}

/**
 * Errores específicos del dominio para que las routes traduzcan a HTTP claros.
 */
export class IntakeChatError extends Error {
  constructor(
    public readonly code:
      | "FEATURE_DISABLED"
      | "ALREADY_HAS_INTAKE"
      | "SESSION_NOT_FOUND"
      | "SESSION_NOT_ACTIVE"
      | "TURN_LIMIT_REACHED"
      | "COST_LIMIT_REACHED"
      | "INCOMPLETE_ANSWERS"
      | "MISSING_RESIDENCY"
      | "PROVIDER_ERROR",
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "IntakeChatError";
  }
}

/**
 * Punto de entrada principal del intake-chat.
 *
 * Cada método maneja:
 * - validaciones (feature flag, intake previo, ownership);
 * - llamada al provider LLM;
 * - safety check antes de procesar la respuesta;
 * - persistencia incremental (cada turno se guarda);
 * - cuotas (turnos / costo).
 */
export async function startOrResumeChat(patientId: string): Promise<IntakeChatSessionDto> {
  ensureFeatureEnabled();
  await ensurePatientHasNoIntake(patientId);

  const existing = await findResumableSession(patientId);
  if (existing) {
    /** Si la sesión existente vence por TTL, la marcamos abandoned y empezamos nueva. */
    if (isExpired(existing)) {
      await prisma.patientIntakeChatSession.update({
        where: { id: existing.id },
        data: { status: "abandoned" }
      });
    } else {
      return toSessionDto(existing, { isResume: true });
    }
  }

  const provider = getIntakeChatProvider();
  const greeting = INTAKE_CHAT_FALLBACK_GREETING;

  const messages: IntakeChatStoredMessage[] = [
    {
      role: "assistant",
      content: greeting,
      ts: new Date().toISOString()
    }
  ];

  const session = await prisma.patientIntakeChatSession.create({
    data: {
      patientId,
      status: "active",
      messages: messages as unknown as Prisma.InputJsonValue,
      extractedAnswers: {},
      llmProvider: provider.providerName,
      llmModel: provider.modelName
    }
  });

  return toSessionDto(session, { isResume: false });
}

export async function getActiveSession(patientId: string): Promise<IntakeChatSessionDto | null> {
  ensureFeatureEnabled();
  const existing = await findResumableSession(patientId);
  if (!existing) return null;
  if (isExpired(existing)) return null;
  return toSessionDto(existing, { isResume: true });
}

export async function sendMessage(params: { patientId: string; sessionId: string; userMessage: string }): Promise<SendMessageResult> {
  ensureFeatureEnabled();
  const trimmed = params.userMessage.trim();
  if (trimmed.length === 0) {
    throw new IntakeChatError("PROVIDER_ERROR", "Empty user message");
  }
  if (trimmed.length > 4000) {
    throw new IntakeChatError("PROVIDER_ERROR", "User message too long (max 4000 chars)");
  }

  const session = await loadOwnedSession(params.patientId, params.sessionId);
  ensureSessionActive(session);
  ensureWithinQuotas(session);

  const messagesBefore = parseStoredMessages(session.messages);
  const updatedMessages: IntakeChatStoredMessage[] = [
    ...messagesBefore,
    { role: "user", content: trimmed, ts: new Date().toISOString() }
  ];

  const provider = getIntakeChatProvider();

  const conversationForInterviewer = updatedMessages
    .filter((m) => !m.hidden && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content }) as { role: "user" | "assistant"; content: string });

  /**
   * Mientras se evalúa el safety, el entrevistador (JSON) **ya** corre: el tiempo
   * pasa a ser aprox. max(safety, LLM) en vez de la suma. En crisis abortamos la
   * petición al modelo principal.
   */
  const ac = new AbortController();
  const interviewerP = provider.generateInterviewerResponse({
    systemPrompt: buildInterviewerSystemPrompt(),
    conversationHistory: conversationForInterviewer,
    alreadyExtracted: parseExtractedAnswers(session.extractedAnswers),
    residencyCountryAlreadyCaptured: session.residencyCountry,
    abortSignal: ac.signal
  });

  const safetyResult = await evaluateSafety(provider, {
    userMessage: trimmed,
    recentMessages: updatedMessages
  });

  let safetyTriggeredThisTurn = false;
  let assistantMessage: string;
  let newExtracted: ExtractedIntakeAnswers = {};
  let detectedCountry: string | null = null;
  let isCompleteFromLLM = false;
  let costFromTurnCents = 0;

  if (safetyResult.triggered && safetyResult.severity === "high") {
    ac.abort();
    try {
      await interviewerP;
    } catch {
      /* abort esperado al cancelar el entrevistador */
    }
    safetyTriggeredThisTurn = true;
    /**
     * En crisis aguda: NO usamos el resultado del entrevistador.
     * Forzamos el assistant message empático + recursos, marcamos las respuestas
     * críticas, y cortamos el flujo normal.
     */
    assistantMessage = INTAKE_CHAT_SAFETY_ALERT_MESSAGE;
    newExtracted = {
      emotionalState: INTAKE_CHAT_CRISIS_EMOTIONAL_OPTION,
      safetyRisk: "Frecuentemente"
    };
  } else {
    try {
      const interviewerResult = await interviewerP;
      assistantMessage = interviewerResult.assistantMessage;
      newExtracted = interviewerResult.extractedAnswers ?? {};
      detectedCountry = normalizeCountryCode(interviewerResult.residencyCountry);
      isCompleteFromLLM = interviewerResult.isComplete;
      costFromTurnCents = interviewerResult.usage.costUsdCents;
    } catch (err) {
      console.error("[intake-chat] provider error", err);
      throw new IntakeChatError(
        "PROVIDER_ERROR",
        "El asistente tuvo un problema. Probá de nuevo en un momento.",
        { cause: err instanceof Error ? err.message : String(err) }
      );
    }
  }

  const messagesAfter: IntakeChatStoredMessage[] = [
    ...updatedMessages,
    { role: "assistant", content: assistantMessage, ts: new Date().toISOString() }
  ];

  const mergedAnswers: ExtractedIntakeAnswers = sanitizeExtractedAnswers({
    ...parseExtractedAnswers(session.extractedAnswers),
    ...newExtracted
  });

  const finalResidency = session.residencyCountry ?? detectedCountry ?? null;
  const newCostTotal = session.estimatedCostUsdCents + costFromTurnCents;
  const shouldFlagSafety = session.safetyFlagged || safetyTriggeredThisTurn;
  const newSafetyContext = safetyTriggeredThisTurn
    ? `${new Date().toISOString()} severity=${safetyResult.severity} source=${safetyResult.source} reason=${safetyResult.reasoning ?? ""}`
    : session.safetyContext;

  const updated = await prisma.patientIntakeChatSession.update({
    where: { id: session.id },
    data: {
      messages: messagesAfter as unknown as Prisma.InputJsonValue,
      extractedAnswers: mergedAnswers as unknown as Prisma.InputJsonValue,
      residencyCountry: finalResidency,
      turnCount: session.turnCount + 1,
      safetyFlagged: shouldFlagSafety,
      safetyContext: newSafetyContext,
      estimatedCostUsdCents: newCostTotal
    }
  });

  return {
    ...toSessionDto(updated, { isResume: false }),
    lastAssistantMessage: assistantMessage,
    safetyTriggeredThisTurn,
    /** El backend confía en su propia validación, no solo en is_complete del LLM. */
    readyToSubmit: hasAllRequired(mergedAnswers) && Boolean(finalResidency) ? true : isCompleteFromLLM && hasAllRequired(mergedAnswers) && Boolean(finalResidency)
  };
}

export async function submitSession(params: {
  patientId: string;
  sessionId: string;
  /**
   * `"full"` (default): exige todas las preguntas required + país.
   * `"early"`: el paciente quiere ver profesionales ya. Sólo exigimos `mainReason`
   * y país; el resto se completa con `EARLY_SUBMIT_DEFAULTS` neutros para que el
   * matching funcione sin imponer respuestas inventadas.
   */
  mode?: "full" | "early";
}): Promise<SubmitSessionResult> {
  ensureFeatureEnabled();
  const session = await loadOwnedSession(params.patientId, params.sessionId);
  const mode = params.mode ?? "full";

  if (session.status !== "active" && session.status !== "safety_blocked") {
    throw new IntakeChatError("SESSION_NOT_ACTIVE", `Session status is ${session.status}`);
  }

  await ensurePatientHasNoIntake(params.patientId);

  const rawAnswers = parseExtractedAnswers(session.extractedAnswers);
  if (!session.residencyCountry) {
    throw new IntakeChatError("MISSING_RESIDENCY", "Falta país de residencia");
  }

  let answers: ExtractedIntakeAnswers;
  if (mode === "early") {
    if (!rawAnswers.mainReason) {
      throw new IntakeChatError(
        "INCOMPLETE_ANSWERS",
        "Necesitamos al menos saber qué te trae a buscar terapia para mostrarte profesionales",
        { missing: ["mainReason"] }
      );
    }
    answers = applyEarlySubmitDefaults(rawAnswers);
  } else {
    if (!hasAllRequired(rawAnswers)) {
      const missing = INTAKE_CHAT_REQUIRED_QUESTION_IDS.filter((id) => !rawAnswers[id]);
      throw new IntakeChatError("INCOMPLETE_ANSWERS", "Faltan respuestas obligatorias", { missing });
    }
    answers = rawAnswers;
  }

  const sanitizedAnswers = sanitizeExtractedAnswers(answers);
  const riskLevel = evaluateIntakeRiskLevel(sanitizedAnswers as Record<string, string>);

  const intake = await prisma.patientIntake.create({
    data: {
      patientId: params.patientId,
      riskLevel,
      answers: sanitizedAnswers as unknown as Prisma.InputJsonValue
    }
  });

  await prisma.patientProfile.update({
    where: { id: params.patientId },
    data: {
      residencyCountry: session.residencyCountry,
      market: marketFromResidencyCountry(session.residencyCountry)
    }
  });

  await prisma.patientIntakeChatSession.update({
    where: { id: session.id },
    data: {
      status: "completed",
      intakeId: intake.id,
      completedAt: new Date()
    }
  });

  /**
   * NOTA: el lado tradicional también escribe `patient-intake-triage` en SystemConfig
   * cuando el riesgo es no-low (ver profiles.routes.ts POST /me/intake). En PR2 vamos
   * a unificar ambos flujos en un único `submitPatientIntake` que haga eso. Por ahora,
   * en PR1, solo creamos el intake y la actualización de PatientProfile, que es lo mínimo
   * para que el matching funcione end-to-end.
   */

  return {
    intakeId: intake.id,
    riskLevel,
    residencyCountry: session.residencyCountry,
    completedAt: intake.createdAt.toISOString(),
    market: marketFromResidencyCountry(session.residencyCountry)
  };
}

function ensureFeatureEnabled(): void {
  if (!env.INTAKE_CHAT_ENABLED) {
    throw new IntakeChatError("FEATURE_DISABLED", "Intake chat is disabled");
  }
}

async function ensurePatientHasNoIntake(patientProfileId: string): Promise<void> {
  const existing = await prisma.patientIntake.findUnique({ where: { patientId: patientProfileId } });
  if (existing) {
    throw new IntakeChatError("ALREADY_HAS_INTAKE", "Patient already has an intake submitted");
  }
}

async function findResumableSession(patientProfileId: string): Promise<PatientIntakeChatSession | null> {
  return prisma.patientIntakeChatSession.findFirst({
    where: { patientId: patientProfileId, status: "active" },
    orderBy: { updatedAt: "desc" }
  });
}

async function loadOwnedSession(patientProfileId: string, sessionId: string): Promise<PatientIntakeChatSession> {
  const session = await prisma.patientIntakeChatSession.findUnique({ where: { id: sessionId } });
  if (!session || session.patientId !== patientProfileId) {
    throw new IntakeChatError("SESSION_NOT_FOUND", "Session not found");
  }
  return session;
}

function ensureSessionActive(session: PatientIntakeChatSession): void {
  if (session.status !== "active") {
    throw new IntakeChatError("SESSION_NOT_ACTIVE", `Session status is ${session.status}`);
  }
}

function ensureWithinQuotas(session: PatientIntakeChatSession): void {
  if (session.turnCount >= env.INTAKE_CHAT_MAX_TURNS) {
    throw new IntakeChatError("TURN_LIMIT_REACHED", "Cantidad máxima de mensajes alcanzada para esta sesión");
  }
  if (session.estimatedCostUsdCents >= env.INTAKE_CHAT_MAX_COST_USD_CENTS) {
    throw new IntakeChatError("COST_LIMIT_REACHED", "Límite de costo de la sesión alcanzado");
  }
}

function isExpired(session: PatientIntakeChatSession): boolean {
  const ttlMs = env.INTAKE_CHAT_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - session.updatedAt.getTime() > ttlMs;
}

function parseStoredMessages(raw: Prisma.JsonValue): IntakeChatStoredMessage[] {
  if (!Array.isArray(raw)) return [];
  const result: IntakeChatStoredMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object" || Array.isArray(m)) continue;
    const obj = m as Record<string, unknown>;
    const role = obj.role;
    if (role !== "assistant" && role !== "user" && role !== "system") continue;
    if (typeof obj.content !== "string") continue;
    if (typeof obj.ts !== "string") continue;
    const stored: IntakeChatStoredMessage = {
      role,
      content: obj.content,
      ts: obj.ts
    };
    if (typeof obj.hidden === "boolean") {
      stored.hidden = obj.hidden;
    }
    result.push(stored);
  }
  return result;
}

function parseExtractedAnswers(raw: Prisma.JsonValue): ExtractedIntakeAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: ExtractedIntakeAnswers = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim().length > 0) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Limpia cosas que el LLM podría haber alucinado:
 * - keys que no son de nuestro catálogo;
 * - valores no-string;
 * - whitespace excesivo.
 */
function sanitizeExtractedAnswers(answers: ExtractedIntakeAnswers): ExtractedIntakeAnswers {
  const validIds = new Set(INTAKE_CHAT_QUESTIONS.map((q) => q.id));
  const result: ExtractedIntakeAnswers = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!validIds.has(key)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    result[key] = trimmed;
  }
  return result;
}

function hasAllRequired(answers: ExtractedIntakeAnswers): boolean {
  return INTAKE_CHAT_REQUIRED_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

/**
 * Defaults conservadores que se aplican cuando el paciente pide submit "early"
 * para ir directo al matching sin haber respondido todas las preguntas requeridas.
 *
 * Criterios de elección:
 * - Para preferencias del/de la profesional: marcamos "no tengo preferencias" para
 *   no sesgar el matching.
 * - Para enfoque terapéutico: "lo que recomiende el profesional".
 * - Para experiencia previa: "No, nunca fui a terapia" (el caso más neutro / común).
 * - Para emocionalidad y red de apoyo: rellenamos con valores intermedios para no
 *   inflar ni desinflar el riesgo. evaluateIntakeRiskLevel se basa principalmente
 *   en safetyRisk y emotionalState explícitos.
 * - Para safetyRisk: "Prefiero no responder" como default conservador. Si en el chat
 *   se disparó safety high, el sistema ya marcó la sesión como flagged (eso domina).
 *
 * `mainReason` y `therapyGoal` no tienen default: si no respondió mainReason,
 * directamente no permitimos early submit. `therapyGoal` se llena con un genérico
 * para que el matcher tenga algo, aunque idealmente venga del paciente.
 */
const EARLY_SUBMIT_DEFAULTS: Readonly<Record<string, string>> = {
  therapyGoal: "Sentirme mejor emocionalmente",
  therapistPreferences: "No tengo preferencias",
  preferredApproach: "No estoy seguro/a; lo que recomiende el profesional",
  previousTherapy: "No, nunca fui a terapia",
  emotionalState: "Con altibajos",
  supportNetwork: "Prefiero no responder",
  safetyRisk: "Prefiero no responder"
};

function applyEarlySubmitDefaults(answers: ExtractedIntakeAnswers): ExtractedIntakeAnswers {
  /** Lo que ya respondió el paciente pisa al default — no sobreescribimos respuestas reales. */
  return { ...EARLY_SUBMIT_DEFAULTS, ...answers };
}

function computeCanSubmitEarly(answers: ExtractedIntakeAnswers, residencyCountry: string | null): boolean {
  if (!residencyCountry) return false;
  if (!answers.mainReason) return false;
  /** Si ya tenemos todo, mostramos el botón "full" (readyToSubmit), no el early. */
  if (hasAllRequired(answers)) return false;
  return true;
}

function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(trimmed)) return null;
  return trimmed;
}

function toSessionDto(
  session: PatientIntakeChatSession,
  opts: { isResume: boolean }
): IntakeChatSessionDto {
  const allMessages = parseStoredMessages(session.messages);
  const visibleMessages = allMessages
    .filter((m) => !m.hidden && (m.role === "assistant" || m.role === "user"))
    .map((m) => ({ role: m.role as "assistant" | "user", content: m.content, ts: m.ts }));

  const extracted = parseExtractedAnswers(session.extractedAnswers);

  let resumeIntro: string | null = null;
  if (opts.isResume) {
    resumeIntro = buildResumeGreeting(Object.keys(extracted).length);
  }

  return {
    sessionId: session.id,
    status: session.status as IntakeChatSessionStatus,
    messages: resumeIntro
      ? [...visibleMessages, { role: "assistant" as const, content: resumeIntro, ts: new Date().toISOString() }]
      : visibleMessages,
    extractedAnswers: extracted,
    residencyCountry: session.residencyCountry,
    isResume: opts.isResume,
    readyToSubmit: hasAllRequired(extracted) && Boolean(session.residencyCountry),
    canSubmitEarly: computeCanSubmitEarly(extracted, session.residencyCountry),
    safetyFlagged: session.safetyFlagged,
    safetyAlertMessage: session.safetyFlagged ? INTAKE_CHAT_SAFETY_ALERT_MESSAGE : undefined,
    quota: {
      turnsUsed: session.turnCount,
      turnsRemaining: Math.max(0, env.INTAKE_CHAT_MAX_TURNS - session.turnCount),
      estimatedCostUsdCents: session.estimatedCostUsdCents
    }
  };
}

/** Re-export para tests. */
export const __internals = {
  parseStoredMessages,
  parseExtractedAnswers,
  sanitizeExtractedAnswers,
  hasAllRequired,
  normalizeCountryCode,
  isExpired
};

/** Helper para tests: forzar un IntakeChatProvider concreto vía la factory. */
export function __ensureProviderInitialized(): IntakeChatProvider {
  return getIntakeChatProvider();
}
