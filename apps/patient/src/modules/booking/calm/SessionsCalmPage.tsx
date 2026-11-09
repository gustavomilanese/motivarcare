import { type SyntheticEvent } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import type { Booking, Professional } from "../../app/types";
import { SessionsCalmHead } from "./SessionsCalmHead";
import { SessionsCalmList } from "./SessionsCalmList";
import { SessionsCalmNext } from "./SessionsCalmNext";
import { SessionsCalmWeek } from "./SessionsCalmWeek";

export function SessionsCalmPage(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  weekBookings: Booking[];
  upcoming: Booking[];
  professionals: Professional[];
  photoMap: Record<string, string>;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenDetail: (bookingId: string) => void;
  onReschedule: (booking: Booking) => void;
}) {
  const next = props.upcoming[0] ?? null;
  const later = props.upcoming.slice(1);

  return (
    <div className="sessions-calm">
      <SessionsCalmHead language={props.language} timeZone={props.timeZone} now={props.now} />
      {next ? (
        <SessionsCalmNext
          booking={next}
          language={props.language}
          timeZone={props.timeZone}
          now={props.now}
          professionals={props.professionals}
          photoUrl={props.photoMap[next.professionalId] ?? null}
          onImageFallback={props.onImageFallback}
          onOpenDetail={props.onOpenDetail}
          onReschedule={props.onReschedule}
        />
      ) : null}
      <SessionsCalmList
        language={props.language}
        timeZone={props.timeZone}
        now={props.now}
        bookings={next ? later : props.upcoming}
        titled={next ? "later" : "upcoming"}
        professionals={props.professionals}
        photoMap={props.photoMap}
        onImageFallback={props.onImageFallback}
        onOpenDetail={props.onOpenDetail}
        onReschedule={props.onReschedule}
      />
      <SessionsCalmWeek
        language={props.language}
        timeZone={props.timeZone}
        now={props.now}
        bookings={props.weekBookings}
        professionals={props.professionals}
        onOpenDetail={props.onOpenDetail}
        quiet
      />
    </div>
  );
}
