import { apiRequest } from "./api";
import type {
  PatientEmailPlatformSettings,
  PatientEmailPlatformSettingsResponse
} from "../types/patientEmailSettings.types";

export async function fetchPatientEmailPlatformSettings(
  token: string
): Promise<PatientEmailPlatformSettingsResponse> {
  return apiRequest<PatientEmailPlatformSettingsResponse>(
    "/api/admin/notification-settings/email",
    {},
    token
  );
}

export async function patchPatientEmailPlatformSettings(
  token: string,
  settings: Partial<PatientEmailPlatformSettings>
): Promise<PatientEmailPlatformSettingsResponse> {
  return apiRequest<PatientEmailPlatformSettingsResponse>(
    "/api/admin/notification-settings/email",
    {
      method: "PATCH",
      body: JSON.stringify(settings)
    },
    token
  );
}
