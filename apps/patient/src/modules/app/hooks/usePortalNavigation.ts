import type { PatientAppState } from "../types";

export function usePortalNavigation(params: {
  navigate: (path: string) => void;
  onStateChange: (updater: (current: PatientAppState) => PatientAppState) => void;
}) {
  return {
    handleReserveFromAnywhere: (professionalId: string) => {
      params.onStateChange((current) => ({
        ...current,
        therapistSelectionCompleted: true,
        selectedProfessionalId: professionalId
      }));
      params.navigate("/sessions");
    },
    handleGoToReservations: () => {
      params.navigate("/sessions?focus=reservations");
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
