/** Persists where to go after booking/reschedule when the flow started from another page (e.g. Inicio). */

export const PATIENT_BOOKING_RETURN_STORAGE_KEY = "mc:patient-booking-return-to";

export function safeInternalReturnPath(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded).trim();
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("://")) {
    return null;
  }
  return decoded;
}

export function persistBookingReturnTo(path: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (path) {
      window.sessionStorage.setItem(PATIENT_BOOKING_RETURN_STORAGE_KEY, path);
    } else {
      window.sessionStorage.removeItem(PATIENT_BOOKING_RETURN_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function readPersistedBookingReturnTo(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return safeInternalReturnPath(window.sessionStorage.getItem(PATIENT_BOOKING_RETURN_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearPersistedBookingReturnTo(): void {
  persistBookingReturnTo(null);
}
