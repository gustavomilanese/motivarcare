import { Router } from "express";
import { requireAuth, requireRole } from "../../lib/auth.js";
import { sendApiError } from "../../lib/http.js";
import {
  getPatientEmailPlatformMeta,
  getPatientEmailPlatformSettings,
  savePatientEmailPlatformSettings
} from "../notifications/patientEmailPlatformSettings.service.js";
import { patientEmailPlatformSettingsPatchSchema } from "../notifications/patientEmailPlatformSettings.schemas.js";

export const patientEmailSettingsRouter = Router();

patientEmailSettingsRouter.use(requireAuth, requireRole(["ADMIN"]));

patientEmailSettingsRouter.get("/email", async (_req, res) => {
  const settings = await getPatientEmailPlatformSettings({ bypassCache: true });
  return res.json({
    settings,
    meta: getPatientEmailPlatformMeta()
  });
});

patientEmailSettingsRouter.patch("/email", async (req, res) => {
  const parsed = patientEmailPlatformSettingsPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Invalid payload",
      details: parsed.error.flatten()
    });
  }

  const settings = await savePatientEmailPlatformSettings(parsed.data);
  return res.json({
    settings,
    meta: getPatientEmailPlatformMeta(),
    message: "Email notification settings updated"
  });
});
