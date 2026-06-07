import { pickDefaultPurchasePlan } from "./packageCatalog.js";
import type { SessionPackagePlan } from "./sessionPackagePlan.js";

/** Cómo se presenta la UI (web desktop, web mobile, app nativa). */
export type AcquireSessionsPresentation = "desktop" | "mobile" | "native";

export type AcquireSessionsContext = {
  hasAssignedProfessional: boolean;
  creditsRemaining: number;
  plans: SessionPackagePlan[];
  featuredPackageId: string | null;
};

export type AcquireSessionsTrigger =
  | "buy_cta"
  | "book_without_credits"
  | "choose_packages"
  | "choose_individual";

export type AcquireSessionsIntent =
  | { type: "navigate_assign_professional" }
  | { type: "show_purchase_choice_modal" }
  | { type: "open_checkout"; planId?: string | null }
  | { type: "open_individual_checkout" }
  | { type: "show_no_credits_alert" }
  | { type: "open_new_booking_panel" };

/**
 * Resuelve la intención de compra/reserva. Sin React ni navegación —
 * cada plataforma ejecuta el intent con su propia UI (modal, scroll, sheet, navigate).
 */
export function resolveAcquireSessionsIntent(
  trigger: AcquireSessionsTrigger,
  presentation: AcquireSessionsPresentation,
  ctx: AcquireSessionsContext
): AcquireSessionsIntent {
  if (!ctx.hasAssignedProfessional) {
    return { type: "navigate_assign_professional" };
  }

  switch (trigger) {
    case "choose_packages":
      return { type: "open_checkout", planId: null };
    case "choose_individual":
      return { type: "open_individual_checkout" };
    case "buy_cta":
      if (presentation === "desktop") {
        return { type: "show_purchase_choice_modal" };
      }
      return resolveMobileQuickCheckout(ctx);
    case "book_without_credits":
      if (ctx.creditsRemaining > 0) {
        return { type: "open_new_booking_panel" };
      }
      if (presentation === "desktop") {
        return { type: "show_no_credits_alert" };
      }
      return { type: "open_checkout", planId: null };
    default: {
      const exhaustive: never = trigger;
      return exhaustive;
    }
  }
}

function resolveMobileQuickCheckout(ctx: AcquireSessionsContext): AcquireSessionsIntent {
  const plan = pickDefaultPurchasePlan(ctx.plans, ctx.featuredPackageId);
  if (plan) {
    return { type: "open_checkout", planId: plan.id };
  }
  return { type: "open_checkout", planId: null };
}
