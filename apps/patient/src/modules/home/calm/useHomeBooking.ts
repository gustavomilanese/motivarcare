import { useEffect, useRef, useState } from "react";
import { friendlyBookingFailureMessage } from "../../app/lib/friendlyPatientMessages";
import { fetchSharedPatientAvailabilitySlots } from "../../app/lib/fetchPatientAvailabilitySlotsShared";
import { acquireBookingSlotHold, releaseBookingSlotHold } from "../../matching/services/slotHold";
import type { AppLanguage } from "@therapy/i18n-config";
import type { Booking, TimeSlot } from "../../app/types";

function overlaps(slot: TimeSlot, booking: Booking): boolean {
  return new Date(slot.startsAt).getTime() < new Date(booking.endsAt).getTime()
    && new Date(slot.endsAt).getTime() > new Date(booking.startsAt).getTime();
}

export function useHomeBooking(params: {
  open: boolean;
  authToken: string | null;
  professionalId: string | null;
  language: AppLanguage;
  bookings: Booking[];
  onConfirm: (
    professionalId: string,
    slot: TimeSlot,
    useTrialSession: boolean,
    holdId?: string
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsSettled, setSlotsSettled] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [holdId, setHoldId] = useState("");
  const [holdExpiresAt, setHoldExpiresAt] = useState("");
  const [holdLoading, setHoldLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const holdIdRef = useRef("");
  const bookingsRef = useRef(params.bookings);
  holdIdRef.current = holdId;
  bookingsRef.current = params.bookings;

  useEffect(() => {
    if (!params.open) {
      return;
    }
    if (!params.authToken || !params.professionalId) {
      setSlots([]);
      setSlotsSettled(true);
      return;
    }
    let cancelled = false;
    setSlotsSettled(false);
    setError("");
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 45);
    const professionalId = params.professionalId;
    const token = params.authToken;
    void fetchSharedPatientAvailabilitySlots({ token, professionalId, from, to })
      .then((response) => {
        if (cancelled) return;
        const now = Date.now();
        const bookings = bookingsRef.current;
        setSlots(
          (response.slots ?? [])
            .map((slot) => ({ id: slot.id, startsAt: slot.startsAt, endsAt: slot.endsAt }))
            .filter((slot) => new Date(slot.startsAt).getTime() > now)
            .filter((slot) => !bookings.some((booking) => booking.status === "confirmed" && overlaps(slot, booking)))
        );
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [params.open, params.authToken, params.professionalId]);

  useEffect(() => {
    if (params.open) return;
    const token = params.authToken;
    const currentHold = holdIdRef.current;
    if (token && currentHold) {
      void releaseBookingSlotHold(currentHold, token).catch(() => undefined);
    }
    setSelectedSlotId("");
    setHoldId("");
    setHoldExpiresAt("");
    setError("");
    setHoldLoading(false);
    setSubmitting(false);
  }, [params.open, params.authToken]);

  async function selectSlot(slotId: string) {
    setError("");
    if (!slotId || !params.authToken || !params.professionalId) {
      if (holdId && params.authToken) {
        void releaseBookingSlotHold(holdId, params.authToken).catch(() => undefined);
      }
      setSelectedSlotId("");
      setHoldId("");
      setHoldExpiresAt("");
      return;
    }
    const slot = slots.find((item) => item.id === slotId);
    if (!slot) return;
    setSelectedSlotId(slotId);
    setHoldLoading(true);
    try {
      if (holdId) {
        await releaseBookingSlotHold(holdId, params.authToken).catch(() => undefined);
      }
      const hold = await acquireBookingSlotHold(params.professionalId, slot, params.authToken);
      setHoldId(hold.holdId);
      setHoldExpiresAt(hold.expiresAt);
    } catch (requestError) {
      setSelectedSlotId("");
      setHoldId("");
      setHoldExpiresAt("");
      setError(
        friendlyBookingFailureMessage(
          requestError instanceof Error ? requestError.message : "",
          params.language
        )
      );
    } finally {
      setHoldLoading(false);
    }
  }

  async function confirm() {
    const slot = slots.find((item) => item.id === selectedSlotId);
    if (!slot || !params.professionalId || !holdId || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await params.onConfirm(params.professionalId, slot, false, holdId);
      if (!result.ok) {
        setError(result.error ?? "");
        return;
      }
      setHoldId("");
      return true;
    } finally {
      setSubmitting(false);
    }
  }

  const openEdgeRef = useRef(params.open);
  if (params.open !== openEdgeRef.current) {
    openEdgeRef.current = params.open;
    if (params.open && slotsSettled) {
      setSlotsSettled(false);
    }
  }

  return {
    slots,
    slotsLoading: params.open && !slotsSettled,
    selectedSlotId,
    holdExpiresAt,
    holdLoading,
    submitting,
    error,
    canConfirm: Boolean(selectedSlotId && holdId && !holdLoading && !submitting),
    selectSlot,
    confirm
  };
}
