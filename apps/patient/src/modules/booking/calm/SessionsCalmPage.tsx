import { type SyntheticEvent } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import type { Booking, Professional } from "../../app/types";
import { SessionsCalmBalance } from "./SessionsCalmBalance";
import { SessionsCalmHead } from "./SessionsCalmHead";
import { SessionsCalmList } from "./SessionsCalmList";
import { SessionsCalmNext } from "./SessionsCalmNext";

export function SessionsCalmPage(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  upcoming: Booking[];
  professionals: Professional[];
  photoMap: Record<string, string>;
  available: number;
  packageName: string;
  packageSize: number;
  reserved?: number;
  bookingOpen: boolean;
  canBuy: boolean;
  bookPrimary: boolean;
  onBook: () => void;
  onBuy: () => void;
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
          onReschedule={props.onReschedule}
        />
      ) : null}
      <div className="sessions-calm-balance-mobile">
        <SessionsCalmBalance
          language={props.language}
          available={props.available}
          packageName={props.packageName}
          packageSize={props.packageSize}
          reserved={props.reserved}
          bookingOpen={props.bookingOpen}
          canBuy={props.canBuy}
          bookPrimary={props.bookPrimary}
          onBook={props.onBook}
          onBuy={props.onBuy}
        />
      </div>
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
    </div>
  );
}
