export type PatientEmailImmediateEventConfig = {
  enabled: boolean;
  trigger: "immediate";
};

export type PatientEmailReminderHoursConfig = {
  enabled: boolean;
  trigger: "scheduled";
  leadTimeHours: number;
  windowMinutes: number;
};

export type PatientEmailReminderMinutesConfig = {
  enabled: boolean;
  trigger: "scheduled";
  leadTimeMinutes: number;
  windowMinutes: number;
};

export type PatientEmailPlatformSettings = {
  masterEnabled: boolean;
  cronPollMinutes: number;
  events: {
    booking_confirmed: PatientEmailImmediateEventConfig;
    booking_reminder_24h: PatientEmailReminderHoursConfig;
    booking_reminder_1h: PatientEmailReminderMinutesConfig;
    booking_cancelled: PatientEmailImmediateEventConfig;
    booking_rescheduled: PatientEmailImmediateEventConfig;
    purchase_confirmed: PatientEmailImmediateEventConfig;
    payment_failed: PatientEmailImmediateEventConfig;
    professional_assigned: PatientEmailImmediateEventConfig;
  };
};

export type PatientEmailPlatformSettingsResponse = {
  settings: PatientEmailPlatformSettings;
  meta: {
    resendConfigured: boolean;
    emailFrom: string;
    envPollFallbackMinutes: number;
  };
};
