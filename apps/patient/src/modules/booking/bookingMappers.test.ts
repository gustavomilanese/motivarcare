import { describe, expect, it } from "vitest";
import {
  mapBookingFromMineApi,
  mergeRescheduledBooking,
  type BookingMutationApiItem,
  type BookingRecord
} from "./bookingMappers";

describe("bookingMappers", () => {
  it("descarta booking sin professionalId", () => {
    const mapped = mapBookingFromMineApi({
      id: "b1",
      startsAt: "2026-03-14T10:00:00.000Z",
      endsAt: "2026-03-14T10:50:00.000Z",
      status: "confirmed",
      createdAt: "2026-03-14T09:00:00.000Z"
    });

    expect(mapped).toBeNull();
  });

  it("mapea booking valido con estado confirmado", () => {
    const mapped = mapBookingFromMineApi({
      id: "b2",
      professionalId: "pro-1",
      startsAt: "2026-03-14T10:00:00.000Z",
      endsAt: "2026-03-14T10:50:00.000Z",
      status: "requested",
      joinUrl: "https://meet.example/session",
      createdAt: "2026-03-14T09:00:00.000Z",
      patientTimezoneAtBooking: "America/Argentina/Buenos_Aires",
      professionalTimezoneAtBooking: "America/Sao_Paulo"
    });

    expect(mapped).toEqual({
      id: "b2",
      professionalId: "pro-1",
      startsAt: "2026-03-14T10:00:00.000Z",
      endsAt: "2026-03-14T10:50:00.000Z",
      status: "confirmed",
      joinUrl: "https://meet.example/session",
      createdAt: "2026-03-14T09:00:00.000Z",
      patientTimezoneAtBooking: "America/Argentina/Buenos_Aires",
      professionalTimezoneAtBooking: "America/Sao_Paulo",
      bookingMode: "credit"
    });
  });

  it("fusiona reprogramacion preservando datos existentes", () => {
    const current: BookingRecord = {
      id: "b3",
      professionalId: "pro-2",
      startsAt: "2026-03-14T12:00:00.000Z",
      endsAt: "2026-03-14T12:50:00.000Z",
      status: "confirmed",
      joinUrl: "https://old.example/session",
      createdAt: "2026-03-14T09:00:00.000Z",
      patientTimezoneAtBooking: "America/Argentina/Buenos_Aires",
      professionalTimezoneAtBooking: "America/Sao_Paulo",
      bookingMode: "credit"
    };

    const updated: BookingMutationApiItem = {
      id: "b3",
      startsAt: "2026-03-15T13:00:00.000Z",
      endsAt: "2026-03-15T13:50:00.000Z"
    };

    const merged = mergeRescheduledBooking(current, updated);

    expect(merged.startsAt).toBe("2026-03-15T13:00:00.000Z");
    expect(merged.endsAt).toBe("2026-03-15T13:50:00.000Z");
    expect(merged.joinUrl).toBe("https://old.example/session");
    expect(merged.patientTimezoneAtBooking).toBe("America/Argentina/Buenos_Aires");
  });
});
