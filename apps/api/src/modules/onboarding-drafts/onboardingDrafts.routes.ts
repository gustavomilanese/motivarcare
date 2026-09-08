import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { sendApiError } from "../../lib/http.js";
import {
  OnboardingDraftError,
  discardDraft,
  getDraft,
  isOnboardingDraftKind,
  saveDraft,
  type OnboardingDraftKind
} from "./onboardingDrafts.service.js";

export const onboardingDraftsRouter = Router();

const saveDraftSchema = z.object({
  step: z.number().int().min(0).max(200),
  data: z.record(z.unknown())
});

/**
 * El `kind` viene por path. Se valida contra la lista blanca para no dejar que el cliente
 * invente tipos y use la tabla como almacenamiento libre.
 */
function resolveRequest(
  req: AuthenticatedRequest,
  res: Parameters<typeof sendApiError>[0]["res"]
): { userId: string; kind: OnboardingDraftKind } | null {
  if (!req.auth) {
    sendApiError({ res, status: 401, code: "UNAUTHORIZED", message: "Unauthorized" });
    return null;
  }

  const kind = req.params.kind ?? "";
  if (!isOnboardingDraftKind(kind)) {
    sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Tipo de borrador desconocido" });
    return null;
  }

  return { userId: req.auth.userId, kind };
}

function handleDraftError(res: Parameters<typeof sendApiError>[0]["res"], error: unknown): void {
  if (error instanceof OnboardingDraftError && error.code === "DRAFT_TOO_LARGE") {
    return void sendApiError({
      res,
      status: 413,
      code: "DRAFT_TOO_LARGE",
      message: "El borrador es demasiado grande",
      details: error.details
    });
  }

  console.error("onboarding draft request failed", error);
  sendApiError({ res, status: 500, code: "INTERNAL_ERROR", message: "No se pudo guardar el progreso" });
}

/** GET /api/onboarding-drafts/:kind — borrador vigente, o `draft: null` si no hay o venció. */
onboardingDraftsRouter.get("/:kind", requireAuth, async (req: AuthenticatedRequest, res) => {
  const ctx = resolveRequest(req, res);
  if (!ctx) return;

  try {
    const draft = await getDraft(ctx.userId, ctx.kind);
    return res.status(200).json({ draft });
  } catch (error) {
    return handleDraftError(res, error);
  }
});

/** PUT /api/onboarding-drafts/:kind — autoguardado; pisa el borrador anterior. */
onboardingDraftsRouter.put("/:kind", requireAuth, async (req: AuthenticatedRequest, res) => {
  const ctx = resolveRequest(req, res);
  if (!ctx) return;

  const parsed = saveDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Borrador inválido",
      details: parsed.error.flatten()
    });
  }

  try {
    const draft = await saveDraft({
      userId: ctx.userId,
      kind: ctx.kind,
      step: parsed.data.step,
      data: parsed.data.data as Record<string, unknown>
    });
    return res.status(200).json({ draft });
  } catch (error) {
    return handleDraftError(res, error);
  }
});

/** DELETE /api/onboarding-drafts/:kind — al completar el flujo o al empezar de cero. */
onboardingDraftsRouter.delete("/:kind", requireAuth, async (req: AuthenticatedRequest, res) => {
  const ctx = resolveRequest(req, res);
  if (!ctx) return;

  try {
    await discardDraft(ctx.userId, ctx.kind);
    // 200 con cuerpo y no 204: los clientes comparten un fetch que siempre parsea JSON.
    return res.status(200).json({ ok: true });
  } catch (error) {
    return handleDraftError(res, error);
  }
});
