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

export type SlotAvailabilityRef = Pick<MatchTimeSlot, "id" | "startsAt" | "endsAt">;

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

/**
 * Último chequeo antes de pagar/confirmar: lista fresca desde el API.
 * Si el fetch falla, devuelve `true` (el POST sigue siendo la fuente de verdad).
 */
export async function isSlotStillListedAfterFreshFetch(
  professionalId: string,
  slot: SlotAvailabilityRef,
  token?: string | null
): Promise<boolean> {
  try {
    const fresh = await fetchProfessionalAvailability(professionalId, token);
    return fresh.some(
      (row) => row.id === slot.id && row.startsAt === slot.startsAt && row.endsAt === slot.endsAt
    );
  } catch {
    return true;
  }
}
