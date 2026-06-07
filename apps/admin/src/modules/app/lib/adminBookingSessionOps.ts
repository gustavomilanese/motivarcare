import { ADMIN_TRIAL_BOOKING_CANCEL_PHRASE } from "../constants";
import { apiRequest } from "../services/api";
import type { AdminBookingOps } from "../types";

export type AdminBookingDraft = {
  status: AdminBookingOps["status"];
  startsAt: string;
  endsAt: string;
  professionalId: string;
};

export function isAdminTrialBooking(
  booking: Pick<AdminBookingOps, "consumedPurchaseId" | "consumedCredits">
): boolean {
  return booking.consumedPurchaseId == null || booking.consumedCredits === 0;
}

export function isFutureAdminBooking(draft: Pick<AdminBookingDraft, "endsAt">): boolean {
  const endsAtMs = new Date(draft.endsAt).getTime();
  return Number.isFinite(endsAtMs) ? endsAtMs >= Date.now() : false;
}

export function canAdminCancelPackageBooking(
  draft: AdminBookingDraft,
  booking: AdminBookingOps
): boolean {
  if (draft.status === "CANCELLED") {
    return false;
  }
  const isTrial = isAdminTrialBooking(booking);
  const isFuture = isFutureAdminBooking(draft);
  return !isTrial || !isFuture;
}

export function canAdminForceCancelTrialBooking(
  draft: AdminBookingDraft,
  booking: AdminBookingOps
): boolean {
  return (
    draft.status !== "CANCELLED" &&
    isAdminTrialBooking(booking) &&
    isFutureAdminBooking(draft)
  );
}

export function canAdminReactivateTrialBooking(
  draft: AdminBookingDraft,
  booking: AdminBookingOps
): boolean {
  return (
    draft.status === "CANCELLED" &&
    isAdminTrialBooking(booking) &&
    isFutureAdminBooking(draft)
  );
}

export function trialCancelPhraseMatches(phrase: string): boolean {
  return phrase.trim() === ADMIN_TRIAL_BOOKING_CANCEL_PHRASE;
}

export async function patchAdminBooking(
  token: string,
  bookingId: string,
  body: Record<string, unknown>
): Promise<AdminBookingOps> {
  const response = await apiRequest<{ booking: AdminBookingOps }>(
    `/api/admin/bookings/${bookingId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body)
    },
    token
  );
  return response.booking;
}

export async function cancelAdminBookingSession(params: {
  token: string;
  bookingId: string;
  draft: AdminBookingDraft;
  cancellationReason?: string;
  adminTrialCancelConfirmation?: string;
}): Promise<AdminBookingOps> {
  return patchAdminBooking(params.token, params.bookingId, {
    status: "CANCELLED",
    startsAt: new Date(params.draft.startsAt).toISOString(),
    endsAt: new Date(params.draft.endsAt).toISOString(),
    professionalId: params.draft.professionalId,
    cancellationReason: params.cancellationReason ?? "Admin: sesión cancelada",
    ...(params.adminTrialCancelConfirmation
      ? { adminTrialCancelConfirmation: params.adminTrialCancelConfirmation.trim() }
      : {})
  });
}

export async function reactivateAdminBookingSession(params: {
  token: string;
  bookingId: string;
  draft: AdminBookingDraft;
}): Promise<AdminBookingOps> {
  return patchAdminBooking(params.token, params.bookingId, {
    status: "CONFIRMED",
    startsAt: new Date(params.draft.startsAt).toISOString(),
    endsAt: new Date(params.draft.endsAt).toISOString(),
    professionalId: params.draft.professionalId,
    cancellationReason: null
  });
}
