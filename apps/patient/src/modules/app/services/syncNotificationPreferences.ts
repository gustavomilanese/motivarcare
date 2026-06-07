import { apiRequest } from "../services/api";

export async function syncPatientNotificationPreferences(params: {
  token: string;
  notificationsEmail: boolean;
  notificationsReminder: boolean;
}): Promise<void> {
  await apiRequest(
    "/api/profiles/me/notification-preferences",
    {
      method: "PATCH",
      body: JSON.stringify({
        notificationsEmail: params.notificationsEmail,
        notificationsReminder: params.notificationsReminder
      })
    },
    params.token
  );
}
