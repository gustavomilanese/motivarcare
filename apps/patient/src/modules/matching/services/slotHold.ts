import { apiRequest } from "../../app/services/api";
import type { MatchTimeSlot } from "../types";

export type BookingSlotHoldResponse = {
  holdId: string;
  expiresAt: string;
  ttlSeconds: number;
};

export async function acquireBookingSlotHold(
  professionalId: string,
  slot: MatchTimeSlot,
  authToken: string
): Promise<BookingSlotHoldResponse> {
  return apiRequest<BookingSlotHoldResponse>(
    "/api/bookings/slot-holds",
    {
      method: "POST",
      body: JSON.stringify({
        professionalId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt
      })
    },
    authToken
  );
}

export async function releaseBookingSlotHold(holdId: string, authToken: string): Promise<void> {
  await apiRequest<void>(
    `/api/bookings/slot-holds/${encodeURIComponent(holdId)}`,
    { method: "DELETE" },
    authToken
  );
}
