import { apiRequest } from "../../app/services/api";
import type { MatchTimeSlot } from "../types";

interface AvailabilityApiResponse {
  professionalId: string;
  minimumBookingNoticeHours?: number;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
}

function mapSlotsResponse(response: AvailabilityApiResponse): MatchTimeSlot[] {
  const minHours = Number.isFinite(Number(response.minimumBookingNoticeHours))
    ? Number(response.minimumBookingNoticeHours)
    : 24;
  const earliestBookableMs = Date.now() + minHours * 60 * 60 * 1000;

  return (response.slots ?? [])
    .filter((slot) => new Date(slot.startsAt).getTime() >= earliestBookableMs)
    .map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt
    }));
}

export async function fetchProfessionalAvailability(
  professionalId: string,
  token?: string | null
): Promise<MatchTimeSlot[]> {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 45);

  const response = await apiRequest<AvailabilityApiResponse>(
    `/api/availability/${professionalId}/slots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    {},
    token ?? undefined
  );

  return mapSlotsResponse(response);
}
