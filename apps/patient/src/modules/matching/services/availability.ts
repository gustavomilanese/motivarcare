import { apiRequest } from "../../app/services/api";
import type { MatchTimeSlot } from "../types";

interface AvailabilityApiResponse {
  professionalId: string;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
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

  const now = Date.now();
  return (response.slots ?? [])
    .filter((slot) => new Date(slot.startsAt).getTime() > now)
    .map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt
    }));
}
