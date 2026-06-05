import { Router } from "express";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { sendApiError } from "../../lib/http.js";
import {
  createEntrySchema,
  listEntriesQuerySchema,
  patchEntrySchema,
  patchSettingsSchema
} from "./emotionalDiary.schemas.js";
import {
  EmotionalDiaryError,
  createEntry,
  getEntry,
  getOrCreateSettings,
  getSessionSummary,
  getStats,
  listEntries,
  patchEntry,
  updateSettings
} from "./emotionalDiary.service.js";

export const emotionalDiaryRouter = Router();

async function resolvePatientId(req: AuthenticatedRequest): Promise<string | null> {
  if (!req.auth) return null;
  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return null;
  }
  return actor.patientProfileId;
}

function handleEmotionalDiaryError(res: Parameters<typeof sendApiError>[0]["res"], error: unknown): void {
  if (error instanceof EmotionalDiaryError) {
    if (error.code === "NOT_FOUND") {
      return void sendApiError({ res, status: 404, code: "NOT_FOUND", message: error.message });
    }
    return void sendApiError({ res, status: 403, code: "FORBIDDEN", message: error.message });
  }
  console.error("[emotional-diary] unexpected error", error);
  return void sendApiError({
    res,
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Error inesperado del servidor"
  });
}

emotionalDiaryRouter.get("/settings", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al diario" });
  }
  try {
    const settings = await getOrCreateSettings(patientId);
    return res.status(200).json({ settings });
  } catch (error) {
    return handleEmotionalDiaryError(res, error);
  }
});

emotionalDiaryRouter.patch("/settings", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al diario" });
  }
  const parsed = patchSettingsSchema.safeParse(req.body);
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
    const settings = await updateSettings(patientId, parsed.data);
    return res.status(200).json({ settings });
  } catch (error) {
    return handleEmotionalDiaryError(res, error);
  }
});

emotionalDiaryRouter.get("/entries", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al diario" });
  }
  const parsed = listEntriesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Query inválida",
      details: parsed.error.flatten()
    });
  }
  try {
    const entries = await listEntries(patientId, parsed.data.status);
    return res.status(200).json({ entries });
  } catch (error) {
    return handleEmotionalDiaryError(res, error);
  }
});

emotionalDiaryRouter.get("/entries/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al diario" });
  }
  try {
    const entry = await getEntry(patientId, req.params.id);
    return res.status(200).json({ entry });
  } catch (error) {
    return handleEmotionalDiaryError(res, error);
  }
});

emotionalDiaryRouter.post("/entries", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al diario" });
  }
  const parsed = createEntrySchema.safeParse(req.body);
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
    const entry = await createEntry(patientId, parsed.data);
    return res.status(201).json({ entry });
  } catch (error) {
    return handleEmotionalDiaryError(res, error);
  }
});

emotionalDiaryRouter.patch("/entries/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al diario" });
  }
  const parsed = patchEntrySchema.safeParse(req.body);
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
    const entry = await patchEntry(patientId, req.params.id, parsed.data);
    return res.status(200).json({ entry });
  } catch (error) {
    return handleEmotionalDiaryError(res, error);
  }
});

emotionalDiaryRouter.get("/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al diario" });
  }
  try {
    const stats = await getStats(patientId);
    return res.status(200).json({ stats });
  } catch (error) {
    return handleEmotionalDiaryError(res, error);
  }
});

emotionalDiaryRouter.get("/session-summary", requireAuth, async (req: AuthenticatedRequest, res) => {
  const patientId = await resolvePatientId(req);
  if (!patientId) {
    return sendApiError({ res, status: 403, code: "FORBIDDEN", message: "Solo pacientes pueden acceder al diario" });
  }
  try {
    const result = await getSessionSummary(patientId);
    return res.status(200).json(result);
  } catch (error) {
    return handleEmotionalDiaryError(res, error);
  }
});
