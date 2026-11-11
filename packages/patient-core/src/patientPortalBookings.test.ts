import { describe, expect, it } from "vitest";
import { filterUpcomingPatientBookings, pickNextPatientBooking } from "./patientPortalBookings.js";

const now = Date.parse("2026-11-11T12:00:00.000Z");

function booking(partial: {
  id: string;
  professionalId: string;
  startsAt: string;
  endsAt?: string;
  status?: string;
}) {
  return {
    id: partial.id,
    professionalId: partial.professionalId,
    startsAt: partial.startsAt,
    endsAt: partial.endsAt ?? new Date(Date.parse(partial.startsAt) + 50 * 60_000).toISOString(),
    status: partial.status ?? "confirmed"
  };
}

describe("filterUpcomingPatientBookings assigned scope", () => {
  it("hides upcoming bookings for a different professional when assigned", () => {
    const rows = filterUpcomingPatientBookings(
      [
        booking({
          id: "giuliano",
          professionalId: "pro-giuliano",
          startsAt: "2026-11-17T18:00:00.000Z"
        }),
        booking({
          id: "siro",
          professionalId: "pro-siro",
          startsAt: "2026-11-18T18:00:00.000Z"
        })
      ],
      now,
      { assignedProfessionalId: "pro-siro" }
    );
    expect(rows.map((row) => row.id)).toEqual(["siro"]);
  });

  it("pickNext ignores orphan bookings from another professional", () => {
    const next = pickNextPatientBooking(
      [
        booking({
          id: "orphan",
          professionalId: "pro-other",
          startsAt: "2026-11-12T15:00:00.000Z"
        })
      ],
      now,
      { assignedProfessionalId: "pro-siro" }
    );
    expect(next).toBeNull();
  });
});
