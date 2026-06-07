import type { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { financeRepository } from "../finance/finance.repository.js";
import type { PatientEmailEventType } from "./patientEmailTypes.js";
import {
  patientEmailPlatformSettingsSchema,
  type PatientEmailPlatformSettings
} from "./patientEmailPlatformSettings.schemas.js";

export const PATIENT_EMAIL_PLATFORM_SETTINGS_KEY = "patient-email-platform-settings";

export const DEFAULT_PATIENT_EMAIL_PLATFORM_SETTINGS: PatientEmailPlatformSettings = {
  masterEnabled: true,
  cronPollMinutes: 5,
  events: {
    booking_confirmed: { enabled: true, trigger: "immediate" },
    booking_reminder_24h: {
      enabled: true,
      trigger: "scheduled",
      leadTimeHours: 24,
      windowMinutes: 120
    },
    booking_reminder_1h: {
      enabled: true,
      trigger: "scheduled",
      leadTimeMinutes: 60,
      windowMinutes: 20
    },
    booking_cancelled: { enabled: true, trigger: "immediate" },
    booking_rescheduled: { enabled: true, trigger: "immediate" },
    purchase_confirmed: { enabled: true, trigger: "immediate" },
    payment_failed: { enabled: true, trigger: "immediate" },
    professional_assigned: { enabled: true, trigger: "immediate" }
  }
};

let cachedSettings: PatientEmailPlatformSettings | null = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 30_000;

function mergeSettings(partial: unknown): PatientEmailPlatformSettings {
  const base = DEFAULT_PATIENT_EMAIL_PLATFORM_SETTINGS;
  if (!partial || typeof partial !== "object") {
    return base;
  }
  const parsed = partial as Partial<PatientEmailPlatformSettings>;
  return patientEmailPlatformSettingsSchema.parse({
    masterEnabled: parsed.masterEnabled ?? base.masterEnabled,
    cronPollMinutes: parsed.cronPollMinutes ?? base.cronPollMinutes,
    events: {
      ...base.events,
      ...(parsed.events ?? {})
    }
  });
}

export async function getPatientEmailPlatformSettings(options?: {
  bypassCache?: boolean;
}): Promise<PatientEmailPlatformSettings> {
  const now = Date.now();
  if (!options?.bypassCache && cachedSettings && now - cachedAtMs < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const config = await financeRepository.findConfigByKey(PATIENT_EMAIL_PLATFORM_SETTINGS_KEY);
  const merged = mergeSettings(config?.value);
  cachedSettings = merged;
  cachedAtMs = now;
  return merged;
}

export async function savePatientEmailPlatformSettings(
  input: Partial<PatientEmailPlatformSettings>
): Promise<PatientEmailPlatformSettings> {
  const current = await getPatientEmailPlatformSettings({ bypassCache: true });
  const next = patientEmailPlatformSettingsSchema.parse({
    masterEnabled: input.masterEnabled ?? current.masterEnabled,
    cronPollMinutes: input.cronPollMinutes ?? current.cronPollMinutes,
    events: {
      ...current.events,
      ...(input.events ?? {})
    }
  });

  await financeRepository.upsertConfigByKey(
    PATIENT_EMAIL_PLATFORM_SETTINGS_KEY,
    next as unknown as Prisma.InputJsonValue
  );

  cachedSettings = next;
  cachedAtMs = Date.now();
  return next;
}

export function platformEmailEventEnabled(
  settings: PatientEmailPlatformSettings,
  eventType: PatientEmailEventType
): boolean {
  if (!settings.masterEnabled) {
    return false;
  }
  const event = settings.events[eventType];
  return Boolean(event?.enabled);
}

export function reminderWindowMs(settings: PatientEmailPlatformSettings): {
  reminder24h: { minMs: number; maxMs: number } | null;
  reminder1h: { minMs: number; maxMs: number } | null;
} {
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;

  const cfg24 = settings.events.booking_reminder_24h;
  const cfg1 = settings.events.booking_reminder_1h;

  const reminder24h =
    cfg24.enabled && cfg24.trigger === "scheduled"
      ? {
          minMs: cfg24.leadTimeHours * hourMs - (cfg24.windowMinutes * minuteMs) / 2,
          maxMs: cfg24.leadTimeHours * hourMs + (cfg24.windowMinutes * minuteMs) / 2
        }
      : null;

  const reminder1h =
    cfg1.enabled && cfg1.trigger === "scheduled"
      ? {
          minMs: cfg1.leadTimeMinutes * minuteMs - (cfg1.windowMinutes * minuteMs) / 2,
          maxMs: cfg1.leadTimeMinutes * minuteMs + (cfg1.windowMinutes * minuteMs) / 2
        }
      : null;

  return { reminder24h, reminder1h };
}

export function getEffectiveCronPollMs(settings: PatientEmailPlatformSettings): number {
  return Math.max(60_000, settings.cronPollMinutes * 60 * 1000);
}

export function getPatientEmailPlatformMeta() {
  return {
    resendConfigured: Boolean(env.RESEND_API_KEY?.trim()),
    emailFrom: env.EMAIL_FROM,
    envPollFallbackMinutes: Math.round(env.NOTIFICATION_POLL_MS / 60_000)
  };
}
