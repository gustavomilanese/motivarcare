import { Router, type Request } from "express";
import { z } from "zod";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { sendApiError } from "../../lib/http.js";
import {
  treatmentChatPerIpLimiter,
  treatmentChatPerUserLimiter
} from "../../lib/rateLimiter.js";
import { setProfessionalShareConsent } from "./professionalReports.service.js";
import {
  TreatmentChatError,
  getOrCreateChat,
  sendMessage
} from "./treatmentChat.service.js";

export const treatmentChatRouter = Router();

const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000)
});

const consentSchema = z.object({
  consent: z.boolean()
});

function handleTreatmentChatError(res: Parameters<typeof sendApiError>[0]["res"], error: unknown): void {
  if (error instanceof TreatmentChatError) {
    switch (error.code) {
      case "FEATURE_DISABLED":
        return void sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Chat no disponible" });
      case "CHAT_NOT_FOUND":
        return void sendApiError({ res, status: 404, code: "NOT_FOUND", message: error.message });
      case "CHAT_ARCHIVED":
        return void sendApiError({
          res,
          status: 409,
          code: "CONFLICT",
          message: error.message
        });
      case "DAILY_LIMIT_REACHED":
        return void sendApiError({
          res,
          status: 429,
          code: "TOO_MANY_REQUESTS",
          message: error.message
        });
      case "MESSAGE_INVALID":
        return void sendApiError({
          res,
          status: 400,
          code: "BAD_REQUEST",
          message: error.message,
          details: error.details
        });
      case "PROVIDER_ERROR":
      default:
        return void sendApiError({
          res,
          status: 503,
          code: "SERVICE_UNAVAILABLE",
          message: error.message,
          details: error.details
        });
    }
  }
  console.error("[treatment-chat] unexpected error", error);
  return void sendApiError({
    res,
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Error inesperado del servidor"
  });
}

async function resolvePatientId(req: AuthenticatedRequest): Promise<string | null> {
  if (!req.auth) return null;
  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return null;
  }
  return actor.patientProfileId;
}

/** IP del cliente con fallback razonable; misma forma que en `app.ts` y `auth.routes.ts`. */
function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

/** GET /api/treatment-chat/conversation — devuelve (o crea) el chat del paciente. */
treatmentChatRouter.get("/conversation", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al chat" });
  }
  try {
    const dto = await getOrCreateChat(patientId);
    return res.status(200).json({ chat: dto });
  } catch (error) {
    return handleTreatmentChatError(res, error);
  }
});

/**
 * POST /api/treatment-chat/consent — toggle de consentimiento del paciente
 * para compartir el resumen del chat con su profesional. Idempotente.
 */
treatmentChatRouter.post("/consent", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden manejar el consentimiento" });
  }
  const parsed = consentSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Payload inválido",
      details: parsed.error.flatten()
    });
  }
  try {
    const result = await setProfessionalShareConsent(patientId, parsed.data.consent);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[treatment-chat] consent toggle failed", error);
    return sendApiError({ res, status: 500, code: "INTERNAL_ERROR", message: "No pudimos actualizar el consentimiento." });
  }
});

/** POST /api/treatment-chat/messages — manda un mensaje al asistente. */
treatmentChatRouter.post("/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden enviar mensajes" });
  }
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Mensaje inválido",
      details: parsed.error.flatten()
    });
  }

  /**
   * Rate-limit ANTES de tocar la DB / el LLM. Aplicamos dos limiters en paralelo:
   * uno por IP (para frenar abuso desde una origen) y otro por userId (para evitar
   * que un mismo paciente nos haga ráfagas, aunque su quota diaria todavía permita).
   * Si cualquiera bloquea, devolvemos 429 con Retry-After. Esta es la red de seguridad
   * "operacional" complementaria al cap diario que vive en el chat.
   */
  const clientIp = getClientIp(req);
  const [ipLimit, userLimit] = await Promise.all([
    treatmentChatPerIpLimiter.consume(`ip:${clientIp}`),
    treatmentChatPerUserLimiter.consume(`pid:${patientId}`)
  ]);
  if (!ipLimit.allowed || !userLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds, userLimit.retryAfterSeconds);
    res.setHeader("Retry-After", String(retryAfter));
    return sendApiError({
      res,
      status: 429,
      code: "TOO_MANY_REQUESTS",
      message: "Estás escribiendo muy rápido. Probá de nuevo en unos segundos."
    });
  }

  try {
    const result = await sendMessage({
      patientId,
      userMessage: parsed.data.message
    });
    return res.status(200).json({ chat: result });
  } catch (error) {
    return handleTreatmentChatError(res, error);
  }
});
