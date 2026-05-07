import { Router, type Request } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { sendApiError } from "../../lib/http.js";
import { landingMacaPerIpLimiter } from "../../lib/rateLimiter.js";
import {
  LANDING_MACA_PROVIDER_ERROR_MESSAGE,
  LANDING_MACA_CAP_REACHED_MESSAGE
} from "./landingChat.prompts.js";
import { LandingChatError, sendLandingMessage } from "./landingChat.service.js";

export const landingChatRouter = Router();

const messageSchema = z.object({
  /**
   * Generado por el cliente con `crypto.randomUUID()` al cargar la página y
   * persistido en memoria del browser. Sirve al server para llevar el contador
   * por sesión (cap duro) más allá de lo que el cliente ya muestre.
   */
  sessionId: z
    .string()
    .trim()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9_\-]+$/u, "sessionId con caracteres inválidos"),
  /** Mensaje del visitante, recortado en el cliente y validado acá. */
  message: z.string().trim().min(1).max(4000),
  /**
   * Historia que el cliente recuerda. Se recorta server-side al `LANDING_MACA_CONTEXT_WINDOW`
   * y a `LANDING_MACA_MAX_INPUT_CHARS` por mensaje, así el cliente puede mandar de más sin riesgo.
   */
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000)
      })
    )
    .max(40)
    .optional()
});

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function handleError(res: Parameters<typeof sendApiError>[0]["res"], error: unknown): void {
  if (error instanceof LandingChatError) {
    switch (error.code) {
      case "FEATURE_DISABLED":
        return void sendApiError({
          res,
          status: 503,
          code: "SERVICE_UNAVAILABLE",
          message: "Maca pública no está disponible"
        });
      case "MESSAGE_INVALID":
        return void sendApiError({
          res,
          status: 400,
          code: "BAD_REQUEST",
          message: error.message,
          details: error.details
        });
      case "SESSION_CAP_REACHED":
        return void sendApiError({
          res,
          status: 429,
          code: "TOO_MANY_REQUESTS",
          message: LANDING_MACA_CAP_REACHED_MESSAGE,
          details: { capReached: true }
        });
      case "PROVIDER_ERROR":
      default:
        return void sendApiError({
          res,
          status: 503,
          code: "SERVICE_UNAVAILABLE",
          message: LANDING_MACA_PROVIDER_ERROR_MESSAGE
        });
    }
  }
  console.error("[landing-chat] unexpected error", error);
  return void sendApiError({
    res,
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Error inesperado del servidor"
  });
}

/** GET /api/landing-chat/status — feature flag para que el cliente decida si mostrar el FAB. */
landingChatRouter.get("/status", (_req, res) => {
  return res.json({
    enabled: env.LANDING_MACA_ENABLED,
    maxTurnsPerSession: env.LANDING_MACA_MAX_TURNS_PER_SESSION,
    maxInputChars: env.LANDING_MACA_MAX_INPUT_CHARS
  });
});

/** POST /api/landing-chat/maca — turno conversacional anónimo. */
landingChatRouter.post("/maca", async (req, res) => {
  if (!env.LANDING_MACA_ENABLED) {
    return sendApiError({
      res,
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Maca pública no está disponible"
    });
  }

  const ipLimit = await landingMacaPerIpLimiter.consume(`ip:${getClientIp(req)}`);
  if (!ipLimit.allowed) {
    res.setHeader("Retry-After", String(ipLimit.retryAfterSeconds));
    return sendApiError({
      res,
      status: 429,
      code: "TOO_MANY_REQUESTS",
      message: "Estás escribiendo muy rápido. Probá de nuevo en unos segundos."
    });
  }

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Body inválido",
      details: parsed.error.flatten()
    });
  }

  try {
    const result = await sendLandingMessage({
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
      history: parsed.data.history ?? []
    });
    return res.status(200).json({
      assistantMessage: result.assistantMessage,
      remainingTurns: result.remainingTurns,
      capReached: result.capReached
    });
  } catch (error) {
    return handleError(res, error);
  }
});
