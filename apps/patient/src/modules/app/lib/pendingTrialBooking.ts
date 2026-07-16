/** Slot + hold guardados antes de redirigir a dLocal para la sesión de prueba. */
export const ONBOARDING_TRIAL_BOOKING_STORAGE_KEY = "mc:onboarding-trial-booking";

export type PendingTrialBooking = {
  professionalId: string;
  slot: {
    id: string;
    startsAt: string;
    endsAt: string;
  };
  paymentId: string;
  holdId?: string;
};

export function readPendingTrialBooking(): PendingTrialBooking | null {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_TRIAL_BOOKING_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PendingTrialBooking;
  } catch {
    return null;
  }
}

export function clearPendingTrialBooking(): void {
  try {
    sessionStorage.removeItem(ONBOARDING_TRIAL_BOOKING_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function writePendingTrialBooking(pending: PendingTrialBooking): void {
  sessionStorage.setItem(ONBOARDING_TRIAL_BOOKING_STORAGE_KEY, JSON.stringify(pending));
}
