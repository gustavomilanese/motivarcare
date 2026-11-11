import type { PatientAppState } from "../types";
import {
  clearPersistedBookingReturnTo,
  persistBookingReturnTo,
  safeInternalReturnPath
} from "../lib/bookingReturnTo";

function withReturnToQuery(path: string, returnTo?: string): string {
  const trimmed = typeof returnTo === "string" ? returnTo.trim() : "";
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}returnTo=${encodeURIComponent(trimmed)}`;
}

export function usePortalNavigation(params: {
  navigate: (path: string) => void;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
}) {
  return {
    handleReserveFromAnywhere: (professionalId: string, options?: { returnTo?: string }) => {
      const requested = professionalId.trim();
      params.onStateChange((current) => {
        const assigned = current.assignedProfessionalId?.trim() ?? "";
        // Si ya hay profesional elegido, la reserva/compra es de ese (no del click en otro del matching).
        const binding = assigned || requested;
        return {
          ...current,
          therapistSelectionCompleted: true,
          selectedProfessionalId: binding,
          ...(assigned ? {} : requested ? { assignedProfessionalId: requested } : {})
        };
      });
      const returnTo = safeInternalReturnPath(options?.returnTo ?? null);
      if (returnTo) {
        persistBookingReturnTo(returnTo);
      } else {
        clearPersistedBookingReturnTo();
      }
      params.navigate(withReturnToQuery("/sessions?focus=new-booking", returnTo ?? undefined));
    },
    handleGoToReservations: () => {
      clearPersistedBookingReturnTo();
      params.navigate("/sessions?focus=reservations");
    },
    handleRescheduleBookingFromAnywhere: (bookingId: string, options?: { returnTo?: string }) => {
      const returnTo = safeInternalReturnPath(options?.returnTo ?? null);
      if (returnTo) {
        persistBookingReturnTo(returnTo);
      } else {
        clearPersistedBookingReturnTo();
      }
      params.navigate(
        withReturnToQuery(`/sessions?reschedule=${encodeURIComponent(bookingId)}`, returnTo ?? undefined)
      );
    },
    handleGoToProfessional: (professionalId: string) => {
      const requested = professionalId.trim();
      params.onStateChange((current) => {
        const assigned = current.assignedProfessionalId?.trim() ?? "";
        // Perfil del vínculo: siempre el assigned si existe.
        const binding = assigned || requested;
        return {
          ...current,
          selectedProfessionalId: binding
        };
      });
      params.navigate("/mi-profesional");
    },
    handleChatFromAnywhere: (professionalId: string) => {
      params.onStateChange((current) => ({
        ...current,
        therapistSelectionCompleted: true,
        activeChatProfessionalId: professionalId
      }));
      params.navigate("/chat");
    }
  };
}
