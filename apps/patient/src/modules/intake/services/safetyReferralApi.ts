import type { AppLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../../app/services/api";

export type SafetyReferralResource = {
  label: string;
  contact: string;
};

export type SafetyReferralResources = {
  countryCode: string;
  countryName: string;
  resources: SafetyReferralResource[];
};

export async function requestPatientSafetyReferral(
  authToken: string,
  payload: { residencyCountry?: string; language?: AppLanguage }
): Promise<{ emailDelivered: boolean; resources: SafetyReferralResources | null }> {
  return apiRequest<{ emailDelivered: boolean; resources: SafetyReferralResources | null }>(
    "/api/profiles/me/safety-referral",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    authToken
  );
}
