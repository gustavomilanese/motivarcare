export type PatientEmailEventType =
  | "booking_confirmed"
  | "booking_reminder_24h"
  | "booking_reminder_1h"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "purchase_confirmed"
  | "payment_failed"
  | "professional_assigned";

export function patientEmailPrefGate(
  eventType: PatientEmailEventType,
  prefs: { notificationsEmail: boolean; notificationsReminder: boolean }
): boolean {
  switch (eventType) {
    case "booking_cancelled":
    case "booking_rescheduled":
      return true;
    case "booking_reminder_24h":
    case "booking_reminder_1h":
      return prefs.notificationsReminder;
    default:
      return prefs.notificationsEmail;
  }
}
