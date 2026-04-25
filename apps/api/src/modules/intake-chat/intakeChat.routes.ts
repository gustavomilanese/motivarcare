import { Router } from "express";
import { z } from "zod";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { sendApiError } from "../../lib/http.js";
import {
  IntakeChatError,
  getActiveSession,
  sendMessage,
  startOrResumeChat,
  submitSession
} from "./intakeChat.service.js";

export const intakeChatRouter = Router();

const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000)
});

const submitSchema = z
  .object({
    /**
     * "full" (default): exige todas las preguntas required.
     * "early": el paciente quiere ver profesionales ya — el backend rellena defaults
     * para los campos no respondidos (mínimo: mainReason + país).
     */
    mode: z.enum(["full", "early"]).optional()
  })
  .optional();

/**
 * Mapper genérico de errores del dominio del intake-chat a respuestas HTTP.
 * Centralizado para que los handlers queden cortos y consistentes.
 */
function handleIntakeChatError(res: Parameters<typeof sendApiError>[0]["res"], error: unknown): void {
  if (error instanceof IntakeChatError) {
    switch (error.code) {
      case "FEATURE_DISABLED":
        return void sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Intake chat no disponible" });
      case "ALREADY_HAS_INTAKE":
        return void sendApiError({ res, status: 409, code: "CONFLICT", message: "Ya completaste el intake" });
      case "SESSION_NOT_FOUND":
        return void sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Sesión de chat no encontrada" });
      case "SESSION_NOT_ACTIVE":
        return void sendApiError({
          res,
          status: 409,
          code: "CONFLICT",
          message: "La sesión ya no está activa",
          details: error.details
        });
      case "TURN_LIMIT_REACHED":
      case "COST_LIMIT_REACHED":
        return void sendApiError({
          res,
          status: 429,
          code: "TOO_MANY_REQUESTS",
          message: error.message
        });
      case "INCOMPLETE_ANSWERS":
      case "MISSING_RESIDENCY":
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
  console.error("[intake-chat] unexpected error", error);
  return void sendApiError({
    res,
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Error inesperado del servidor"
  });
}

/** Guard común: usuario autenticado con rol PATIENT y patientProfileId resuelto. */
async function resolvePatientId(req: AuthenticatedRequest): Promise<string | null> {
  if (!req.auth) return null;
  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return null;
  }
  return actor.patientProfileId;
}

/** POST /api/intake-chat/sessions — start or resume. */
intakeChatRouter.post("/sessions", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden iniciar el chat" });
  }
  try {
    const dto = await startOrResumeChat(patientId);
    return res.status(200).json({ session: dto });
  } catch (error) {
    return handleIntakeChatError(res, error);
  }
});

/** GET /api/intake-chat/sessions/active — devuelve la sesión activa actual o 404. */
intakeChatRouter.get("/sessions/active", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al chat" });
  }
  try {
    const dto = await getActiveSession(patientId);
    if (!dto) {
      return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "No hay sesión activa" });
    }
    return res.status(200).json({ session: dto });
  } catch (error) {
    return handleIntakeChatError(res, error);
  }
});

/** POST /api/intake-chat/sessions/:id/messages — enviar mensaje del usuario. */
intakeChatRouter.post("/sessions/:id/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
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
  try {
    const result = await sendMessage({
      patientId,
      sessionId: req.params.id,
      userMessage: parsed.data.message
    });
    return res.status(200).json({ session: result });
  } catch (error) {
    return handleIntakeChatError(res, error);
  }
});

/** POST /api/intake-chat/sessions/:id/submit — finaliza el chat y crea PatientIntake. */
intakeChatRouter.post("/sessions/:id/submit", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden enviar el intake" });
  }
  const parsedBody = submitSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Body inválido",
      details: parsedBody.error.flatten()
    });
  }
  const mode = parsedBody.data?.mode ?? "full";
  try {
    const result = await submitSession({ patientId, sessionId: req.params.id, mode });
    /**
     * Shape alineado con `POST /api/profiles/me/intake` (`SubmitIntakeApiResponse`)
     * para que el cliente pueda reusar el mismo handler post-intake (riskLevel,
     * trial flow, post-intake photo, etc.) entre el wizard clásico y el chat.
     */
    return res.status(201).json({
      intake: {
        id: result.intakeId,
        riskLevel: result.riskLevel,
        completedAt: result.completedAt
      },
      market: result.market,
      residencyCountry: result.residencyCountry
    });
  } catch (error) {
    return handleIntakeChatError(res, error);
  }
});
