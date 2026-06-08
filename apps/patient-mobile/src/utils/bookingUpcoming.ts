import { isPatientBookingUpcoming } from "@therapy/i18n-config";
import {
  compareUpcomingPatientBookings,
  filterUpcomingPatientBookings
} from "@therapy/patient-core";
import type { BookingItem } from "../api/types";

export { compareUpcomingPatientBookings as compareUpcomingBookings, filterUpcomingPatientBookings };

export function isBookingUpcoming(item: BookingItem): boolean {
  return isPatientBookingUpcoming({
    startsAt: item.startsAt,
    endsAt: item.endsAt
  });
}
