import { type SyntheticEvent } from "react";
import { formatDateWithLocale, type AppLanguage } from "@therapy/i18n-config";
import { BookingActionModal } from "../../app/components/booking/BookingActionModal";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Booking, Professional, TimeSlot } from "../../app/types";
import { useHomeBooking } from "./useHomeBooking";

function formatDateTime(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  });
}

/** Reserva desde el Inicio: el modal vive acá y al cerrar o confirmar no cambia de sección. */
export function HomeBookingDialog(props: {
  open: boolean;
  language: AppLanguage;
  timeZone: string;
  authToken: string | null;
  professional: Professional | null;
  photoUrl: string | null;
  creditsRemaining: number;
  bookings: Booking[];
  onClose: () => void;
  onConfirm: (
    professionalId: string,
    slot: TimeSlot,
    useTrialSession: boolean,
    holdId?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const booking = useHomeBooking({
    open: props.open,
    authToken: props.authToken,
    professionalId: props.professional?.id ?? null,
    language: props.language,
    bookings: props.bookings,
    onConfirm: props.onConfirm
  });

  return (
    <BookingActionModal
      panelMode={props.open && props.professional ? "new" : null}
      modalProfessional={{
        fullName: props.professional?.fullName ?? "",
        firstName: props.professional?.firstName,
        lastName: props.professional?.lastName,
        title: props.professional?.title ?? ""
      }}
      modalProfessionalPhoto={professionalPhotoSrc(props.photoUrl)}
      onImageFallback={props.onImageFallback}
      selectedSlotId={booking.selectedSlotId}
      availableSlots={booking.slots}
      slotsLoading={booking.slotsLoading}
      pendingSessions={props.creditsRemaining}
      bookingActionError={booking.error}
      canConfirmBooking={booking.canConfirm}
      slotHoldLoading={booking.holdLoading}
      bookingSubmitting={booking.submitting}
      holdExpiresAt={booking.holdExpiresAt || undefined}
      language={props.language}
      sessionTimezone={props.timeZone}
      onSelectSlot={(slotId) => {
        void booking.selectSlot(slotId);
      }}
      onClose={props.onClose}
      onConfirm={() => {
        void booking.confirm().then((saved) => {
          if (saved) props.onClose();
        });
      }}
      formatDateTime={formatDateTime}
    />
  );
}
