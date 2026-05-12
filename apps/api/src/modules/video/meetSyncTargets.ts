/**
 * Encoding/decoding del `VideoSession.externalRoomId` cuando el provider es
 * `google_meet_user`: necesitamos guardar qué `userId` es dueño del evento
 * primario en Google (para reschedule/cancel) y, opcionalmente, qué `userId`
 * tiene un evento espejo en su propio calendario.
 *
 * Antes vivía suelto en `bookings.routes.ts`; ahora vive acá para poder
 * reusarlo desde el callback de OAuth (backfill al conectar Calendar) sin
 * importar el router entero.
 *
 * Formato:
 *   - Legacy (1 owner): `${ownerUserId}|${eventId}`
 *   - v2 (primary + mirror opcional): `v2:${base64url(JSON.stringify(targets))}`
 */

export type GoogleMeetOwnerTarget = {
  ownerUserId: string;
  eventId: string;
};

export type GoogleMeetSyncTargets = {
  primary: GoogleMeetOwnerTarget;
  mirror?: GoogleMeetOwnerTarget;
};

function encodeLegacy(ownerUserId: string, eventId: string): string {
  return `${ownerUserId}|${eventId}`;
}

function decodeLegacy(value: string): GoogleMeetOwnerTarget | null {
  const separatorIndex = value.indexOf("|");
  if (separatorIndex <= 0 || separatorIndex >= value.length - 1) {
    return null;
  }
  return {
    ownerUserId: value.slice(0, separatorIndex),
    eventId: value.slice(separatorIndex + 1)
  };
}

export function encodeGoogleMeetSyncTargets(targets: GoogleMeetSyncTargets): string {
  if (!targets.mirror) {
    return encodeLegacy(targets.primary.ownerUserId, targets.primary.eventId);
  }

  const payload = Buffer.from(JSON.stringify(targets), "utf8").toString("base64url");
  return `v2:${payload}`;
}

export function decodeGoogleMeetSyncTargets(value: string): GoogleMeetSyncTargets | null {
  if (value.startsWith("v2:")) {
    const payload = value.slice(3);
    if (!payload) {
      return null;
    }

    try {
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      const primary = (parsed as { primary?: GoogleMeetOwnerTarget }).primary;
      const mirror = (parsed as { mirror?: GoogleMeetOwnerTarget }).mirror;

      if (!primary || typeof primary.ownerUserId !== "string" || typeof primary.eventId !== "string") {
        return null;
      }

      if (!mirror) {
        return { primary };
      }

      if (typeof mirror.ownerUserId !== "string" || typeof mirror.eventId !== "string") {
        return { primary };
      }

      return { primary, mirror };
    } catch {
      return null;
    }
  }

  const legacy = decodeLegacy(value);
  if (!legacy) {
    return null;
  }

  return { primary: legacy };
}

export function listGoogleMeetSyncTargets(value: string): GoogleMeetOwnerTarget[] {
  const decoded = decodeGoogleMeetSyncTargets(value);
  if (!decoded) {
    return [];
  }

  const targets = [decoded.primary];
  if (decoded.mirror) {
    targets.push(decoded.mirror);
  }

  const deduped = new Map<string, GoogleMeetOwnerTarget>();
  for (const target of targets) {
    deduped.set(`${target.ownerUserId}|${target.eventId}`, target);
  }
  return Array.from(deduped.values());
}
