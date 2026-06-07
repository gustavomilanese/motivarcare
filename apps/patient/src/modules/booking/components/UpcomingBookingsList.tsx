import { type SyntheticEvent } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import { bookingJoinUrl } from "@therapy/i18n-config";
import type { Booking, Professional } from "../../app/types";
import { upcomingBookingsTableHeadLabels } from "../lib/upcomingBookingLabels";
import { UpcomingBookingItem, type UpcomingBookingLayout } from "./UpcomingBookingItem";

export type UpcomingBookingsSurface = "booking" | "dashboard";

type UpcomingBookingsListProps = {
  bookings: Booking[];
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  timezone: string;
  language: AppLanguage;
  layout: UpcomingBookingLayout;
  surface: UpcomingBookingsSurface;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenBookingDetail: (bookingId: string) => void;
  onReschedule: (booking: Booking) => void;
  editingBookingId?: string | null;
  firstMeetBookingId?: string | null;
  joinTourPulse?: boolean;
};

function listClassName(layout: UpcomingBookingLayout, surface: UpcomingBookingsSurface): string {
  if (layout === "table") {
    return surface === "dashboard"
      ? "sessions-confirmed-list sessions-confirmed-list--dashboard-desktop"
      : "sessions-confirmed-list sessions-confirmed-list--desktop";
  }

  return surface === "dashboard"
    ? "sessions-confirmed-list sessions-confirmed-list--dashboard-mobile"
    : "sessions-confirmed-list sessions-confirmed-list--mobile";
}

export function UpcomingBookingsList(props: UpcomingBookingsListProps) {
  const headLabels = upcomingBookingsTableHeadLabels(props.language);

  return (
    <div className={listClassName(props.layout, props.surface)}>
      {props.layout === "table" ? (
        <div className="sessions-reservations-table-head" aria-hidden="true">
          <span>{headLabels.date}</span>
          <span>{headLabels.time}</span>
          <span>{headLabels.professional}</span>
          <span>{headLabels.status}</span>
          <span>{headLabels.actions}</span>
        </div>
      ) : null}
      {props.bookings.map((booking, index) => {
        const joinUrl = bookingJoinUrl(booking);
        const joinTourTarget = Boolean(props.firstMeetBookingId && props.firstMeetBookingId === booking.id && joinUrl);

        return (
          <UpcomingBookingItem
            key={booking.id}
            booking={booking}
            professionals={props.professionals}
            professionalPhotoMap={props.professionalPhotoMap}
            timezone={props.timezone}
            language={props.language}
            layout={props.layout}
            onImageFallback={props.onImageFallback}
            onOpenDetail={() => props.onOpenBookingDetail(booking.id)}
            onReschedule={() => props.onReschedule(booking)}
            isEditing={props.editingBookingId === booking.id}
            isNextInList={props.layout === "card" && index === 0}
            joinTourTarget={joinTourTarget}
            joinTourPulse={joinTourTarget && props.joinTourPulse}
          />
        );
      })}
    </div>
  );
}
