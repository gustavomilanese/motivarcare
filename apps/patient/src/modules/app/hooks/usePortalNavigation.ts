import type { PatientAppState } from "../types";

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
      params.onStateChange((current) => ({
        ...current,
        therapistSelectionCompleted: true,
        selectedProfessionalId: professionalId
      }));
      params.navigate(withReturnToQuery("/sessions?focus=new-booking", options?.returnTo));
    },
    handleGoToReservations: () => {
      params.navigate("/sessions?focus=reservations");
    },
    handleRescheduleBookingFromAnywhere: (bookingId: string, options?: { returnTo?: string }) => {
      params.navigate(
        withReturnToQuery(`/sessions?reschedule=${encodeURIComponent(bookingId)}`, options?.returnTo)
      );
    },
    handleGoToProfessional: (professionalId: string) => {
      params.onStateChange((current) => ({
        ...current,
        selectedProfessionalId: professionalId
      }));
      params.navigate("/sessions");
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
