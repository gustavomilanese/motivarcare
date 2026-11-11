import type { SessionPackagePlan } from "./sessionPackagePlan.js";

/** Cómo se presenta la UI (web desktop, web mobile, app nativa). */
export type AcquireSessionsPresentation = "desktop" | "mobile" | "native";

export type AcquireSessionsContext = {
  hasAssignedProfessional: boolean;
  /** Catálogo con precios reales del profesional asignado (no planes display-only). */
  pricingReady: boolean;
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
  _presentation: AcquireSessionsPresentation,
  ctx: AcquireSessionsContext
): AcquireSessionsIntent {
  // Solo pedir profesional si no hay uno de referencia.
  // pricingReady=false (catálogo cargando / sin tarifa) no implica “elegí profesional”.
  if (!ctx.hasAssignedProfessional) {
    return { type: "navigate_assign_professional" };
  }

  switch (trigger) {
    case "choose_packages":
      return { type: "open_checkout", planId: null };
    case "choose_individual":
      return { type: "open_individual_checkout" };
    case "buy_cta":
      // Sin modal intermedio: el catálogo de paquetes ya incluye paquete e individual.
      return { type: "open_checkout", planId: null };
    case "book_without_credits":
      if (ctx.creditsRemaining > 0) {
        return { type: "open_new_booking_panel" };
      }
      // Sin saldo: ir a comprar (Reservar queda deshabilitado en UI; esto es fallback).
      return { type: "open_checkout", planId: null };
    default: {
      const exhaustive: never = trigger;
      return exhaustive;
    }
  }
}
