import { z } from "zod";

const immediateEventSchema = z.object({
  enabled: z.boolean(),
  trigger: z.literal("immediate")
});

const reminderHoursSchema = z.object({
  enabled: z.boolean(),
  trigger: z.literal("scheduled"),
  leadTimeHours: z.number().min(1).max(168),
  windowMinutes: z.number().min(5).max(360)
});

const reminderMinutesSchema = z.object({
  enabled: z.boolean(),
  trigger: z.literal("scheduled"),
  leadTimeMinutes: z.number().min(5).max(1440),
  windowMinutes: z.number().min(5).max(120)
});

export const patientEmailPlatformSettingsSchema = z.object({
  masterEnabled: z.boolean(),
  cronPollMinutes: z.number().min(1).max(60),
  events: z.object({
    booking_confirmed: immediateEventSchema,
    booking_reminder_24h: reminderHoursSchema,
    booking_reminder_1h: reminderMinutesSchema,
    booking_cancelled: immediateEventSchema,
    booking_rescheduled: immediateEventSchema,
    purchase_confirmed: immediateEventSchema,
    payment_failed: immediateEventSchema,
    professional_assigned: immediateEventSchema
  })
});

export type PatientEmailPlatformSettings = z.infer<typeof patientEmailPlatformSettingsSchema>;

export const patientEmailPlatformSettingsPatchSchema = patientEmailPlatformSettingsSchema.partial({
  masterEnabled: true,
  cronPollMinutes: true,
  events: true
});
