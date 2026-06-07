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
  bookingMode?: "credit" | "trial";
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
  bookingMode?: "credit" | "trial";
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
    bookingMode: booking.bookingMode === "trial" ? "trial" : "credit"
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

export function sortBookingsByStartsAtAsc<T extends { startsAt: string }>(bookings: T[]): T[] {
  return [...bookings].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

/** Reservas creadas solo en el navegador sin persistir en API (demo / fallback). */
export function isEphemeralClientBookingId(bookingId: string): boolean {
  return bookingId.startsWith("booking-") || bookingId.startsWith("local-");
}

function bookingSlotKey(booking: Pick<BookingRecord, "professionalId" | "startsAt" | "endsAt">): string {
  return `${booking.professionalId}::${booking.startsAt}::${booking.endsAt}`;
}

/** Combina reservas del API con reservas locales/demo hasta que el servidor las refleje. */
export function mergeRemoteWithLocalPatientBookings(
  remoteBookings: BookingRecord[],
  localBookings: BookingRecord[]
): BookingRecord[] {
  const remoteSlotKeys = new Set(remoteBookings.map(bookingSlotKey));
  const mergedById = new Map<string, BookingRecord>();

  for (const remote of remoteBookings) {
    mergedById.set(remote.id, remote);
  }

  for (const local of localBookings) {
    if (local.status !== "confirmed") {
      continue;
    }
    if (mergedById.has(local.id)) {
      continue;
    }
    if (remoteSlotKeys.has(bookingSlotKey(local))) {
      continue;
    }
    mergedById.set(local.id, local);
  }

  return sortBookingsByStartsAtAsc(Array.from(mergedById.values()));
}
