import type { AppLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../services/api";

export async function requestProfessionalChange(
  authToken: string,
  payload: { reason?: string; language?: AppLanguage }
): Promise<{ emailDelivered: boolean; supportEmail: string }> {
  return apiRequest<{ emailDelivered: boolean; supportEmail: string }>(
    "/api/profiles/me/support-requests/professional-change",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    authToken
  );
}
