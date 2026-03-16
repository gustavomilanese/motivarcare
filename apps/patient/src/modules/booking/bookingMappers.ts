export interface BookingRecord {
  id: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled";
  joinUrl: string;
  createdAt: string;
  patientTimezoneAtBooking?: string;
  professionalTimezoneAtBooking?: string;
  bookingMode?: "credit" | "trial";
}

export interface BookingMineApiItem {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  professionalId?: string;
  joinUrl?: string | null;
  patientTimezoneAtBooking?: string;
  professionalTimezoneAtBooking?: string;
  createdAt: string;
}

export interface BookingMutationApiItem {
  id: string;
  startsAt: string;
  endsAt: string;
  joinUrlPatient?: string;
  patientTimezoneAtBooking?: string;
  professionalTimezoneAtBooking?: string;
}

export function mapBookingFromMineApi(booking: BookingMineApiItem): BookingRecord | null {
  if (!booking.professionalId || booking.professionalId.length === 0) {
    return null;
  }

  return {
    id: booking.id,
    professionalId: booking.professionalId,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    status: booking.status === "cancelled" ? "cancelled" : "confirmed",
    joinUrl: booking.joinUrl ?? "",
    createdAt: booking.createdAt,
    patientTimezoneAtBooking: booking.patientTimezoneAtBooking,
    professionalTimezoneAtBooking: booking.professionalTimezoneAtBooking,
    bookingMode: "credit"
  };
}

export function mergeRescheduledBooking(current: BookingRecord, updated: BookingMutationApiItem): BookingRecord {
  return {
    ...current,
    id: updated.id,
    startsAt: updated.startsAt,
    endsAt: updated.endsAt,
    joinUrl: updated.joinUrlPatient ?? current.joinUrl,
    patientTimezoneAtBooking: updated.patientTimezoneAtBooking ?? current.patientTimezoneAtBooking,
    professionalTimezoneAtBooking: updated.professionalTimezoneAtBooking ?? current.professionalTimezoneAtBooking
  };
}
