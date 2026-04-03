import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import { env } from "../../config/env.js";

type MeetParticipant = {
  email: string;
  displayName?: string;
};

type CalendarAuthConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
};

function getPlatformCalendarAuthConfig(): CalendarAuthConfig | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN || !env.GOOGLE_CALENDAR_ID) {
    return null;
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken: env.GOOGLE_REFRESH_TOKEN,
    calendarId: env.GOOGLE_CALENDAR_ID
  };
}

function createCalendarClient(authConfig: CalendarAuthConfig) {
  const oauth2Client = new google.auth.OAuth2(authConfig.clientId, authConfig.clientSecret);
  oauth2Client.setCredentials({ refresh_token: authConfig.refreshToken });
  return {
    calendarId: authConfig.calendarId,
    calendar: google.calendar({ version: "v3", auth: oauth2Client })
  };
}

function resolveMeetJoinUrl(event: any): string | null {
  const hangoutLink = typeof event?.hangoutLink === "string" ? event.hangoutLink : null;
  if (hangoutLink) {
    return hangoutLink;
  }
  const entryPoints = Array.isArray(event?.conferenceData?.entryPoints) ? event.conferenceData.entryPoints : [];
  const videoEntry = entryPoints.find((entry: any) => entry?.entryPointType === "video" && typeof entry?.uri === "string");
  return videoEntry?.uri ?? null;
}

function toGoogleAttendees(participants: MeetParticipant[]) {
  return participants
    .map((participant) => ({
      email: participant.email?.trim(),
      displayName: participant.displayName?.trim() || undefined
    }))
    .filter((participant) => Boolean(participant.email));
}

async function createGoogleMeetEvent(params: {
  authConfig: CalendarAuthConfig;
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  professionalName: string;
  patientName: string;
  participants: MeetParticipant[];
}): Promise<{ eventId: string; joinUrl: string }> {
  const { calendar, calendarId } = createCalendarClient(params.authConfig);
  const attendees = toGoogleAttendees(params.participants);

  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: `Sesion MotivarCare: ${params.patientName} con ${params.professionalName}`,
      description: "Sesion generada automaticamente por MotivarCare.",
      start: {
        dateTime: params.startsAt.toISOString(),
        timeZone: "UTC"
      },
      end: {
        dateTime: params.endsAt.toISOString(),
        timeZone: "UTC"
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `${params.bookingId}-${randomUUID()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      }
    }
  });

  const eventId = response.data.id;
  const joinUrl = resolveMeetJoinUrl(response.data);

  if (!eventId || !joinUrl) {
    throw new Error("GOOGLE_MEET_CREATE_FAILED");
  }

  return { eventId, joinUrl };
}

export function isPlatformGoogleMeetEnabled(): boolean {
  return Boolean(getPlatformCalendarAuthConfig());
}

export async function createGoogleMeetForPlatformCalendar(params: {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  professionalName: string;
  patientName: string;
  participants: MeetParticipant[];
}): Promise<{ eventId: string; joinUrl: string }> {
  const authConfig = getPlatformCalendarAuthConfig();
  if (!authConfig) {
    throw new Error("GOOGLE_MEET_PLATFORM_NOT_CONFIGURED");
  }
  return createGoogleMeetEvent({
    ...params,
    authConfig
  });
}

export async function createGoogleMeetForUserCalendar(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  professionalName: string;
  patientName: string;
  participants: MeetParticipant[];
}): Promise<{ eventId: string; joinUrl: string }> {
  return createGoogleMeetEvent({
    authConfig: {
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      refreshToken: params.refreshToken,
      calendarId: params.calendarId
    },
    bookingId: params.bookingId,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    professionalName: params.professionalName,
    patientName: params.patientName,
    participants: params.participants
  });
}

export async function createLinkedCalendarEventForUserCalendar(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
  startsAt: Date;
  endsAt: Date;
  professionalName: string;
  patientName: string;
  joinUrl: string;
}): Promise<{ eventId: string }> {
  const { calendar, calendarId } = createCalendarClient({
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    refreshToken: params.refreshToken,
    calendarId: params.calendarId
  });

  const response = await calendar.events.insert({
    calendarId,
    sendUpdates: "none",
    requestBody: {
      summary: `Sesion MotivarCare: ${params.patientName} con ${params.professionalName}`,
      description: `Sesion generada automaticamente por MotivarCare.\nGoogle Meet: ${params.joinUrl}`,
      location: params.joinUrl,
      start: {
        dateTime: params.startsAt.toISOString(),
        timeZone: "UTC"
      },
      end: {
        dateTime: params.endsAt.toISOString(),
        timeZone: "UTC"
      }
    }
  });

  const eventId = response.data.id;
  if (!eventId) {
    throw new Error("GOOGLE_CALENDAR_EVENT_CREATE_FAILED");
  }

  return { eventId };
}

async function patchGoogleCalendarEvent(params: {
  authConfig: CalendarAuthConfig;
  eventId: string;
  startsAt?: Date;
  endsAt?: Date;
  status?: "cancelled";
}) {
  const { calendar, calendarId } = createCalendarClient(params.authConfig);
  await calendar.events.patch({
    calendarId,
    eventId: params.eventId,
    sendUpdates: "all",
    requestBody: {
      ...(params.startsAt && params.endsAt
        ? {
            start: {
              dateTime: params.startsAt.toISOString(),
              timeZone: "UTC"
            },
            end: {
              dateTime: params.endsAt.toISOString(),
              timeZone: "UTC"
            }
          }
        : {}),
      ...(params.status ? { status: params.status } : {})
    }
  });
}

export async function rescheduleGoogleMeetEventForUserCalendar(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
  eventId: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<void> {
  await patchGoogleCalendarEvent({
    authConfig: {
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      refreshToken: params.refreshToken,
      calendarId: params.calendarId
    },
    eventId: params.eventId,
    startsAt: params.startsAt,
    endsAt: params.endsAt
  });
}

export async function rescheduleGoogleMeetEventForPlatformCalendar(params: {
  eventId: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<void> {
  const authConfig = getPlatformCalendarAuthConfig();
  if (!authConfig) {
    throw new Error("GOOGLE_MEET_PLATFORM_NOT_CONFIGURED");
  }
  await patchGoogleCalendarEvent({
    authConfig,
    eventId: params.eventId,
    startsAt: params.startsAt,
    endsAt: params.endsAt
  });
}

export async function cancelGoogleMeetEventForUserCalendar(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
  eventId: string;
}): Promise<void> {
  await patchGoogleCalendarEvent({
    authConfig: {
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      refreshToken: params.refreshToken,
      calendarId: params.calendarId
    },
    eventId: params.eventId,
    status: "cancelled"
  });
}

export async function cancelGoogleMeetEventForPlatformCalendar(params: {
  eventId: string;
}): Promise<void> {
  const authConfig = getPlatformCalendarAuthConfig();
  if (!authConfig) {
    throw new Error("GOOGLE_MEET_PLATFORM_NOT_CONFIGURED");
  }
  await patchGoogleCalendarEvent({
    authConfig,
    eventId: params.eventId,
    status: "cancelled"
  });
}
