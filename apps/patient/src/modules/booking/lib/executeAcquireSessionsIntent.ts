import type { AcquireSessionsIntent } from "@therapy/patient-core";

export type AcquireSessionsHandlers = {
  onAssignProfessional: () => void;
  onShowChoiceModal: () => void;
  onOpenCheckout: (planId?: string | null) => void;
  onOpenIndividualCheckout: () => void;
  onShowNoCreditsAlert: () => void;
  onOpenNewBookingPanel: () => void;
};

export function executeAcquireSessionsIntent(
  intent: AcquireSessionsIntent,
  handlers: AcquireSessionsHandlers
): void {
  switch (intent.type) {
    case "navigate_assign_professional":
      handlers.onAssignProfessional();
      return;
    case "show_purchase_choice_modal":
      handlers.onShowChoiceModal();
      return;
    case "open_checkout":
      handlers.onOpenCheckout(intent.planId);
      return;
    case "open_individual_checkout":
      handlers.onOpenIndividualCheckout();
      return;
    case "show_no_credits_alert":
      handlers.onShowNoCreditsAlert();
      return;
    case "open_new_booking_panel":
      handlers.onOpenNewBookingPanel();
      return;
    default: {
      const exhaustive: never = intent;
      return exhaustive;
    }
  }
}
