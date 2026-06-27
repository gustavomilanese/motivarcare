import type { Market } from "@prisma/client";
import { prisma } from "./prisma.js";

const COUPLES_BUNDLE_SPECS = [
  { credits: 1, stripePriceId: "motivar-auto-catalog-couples-1", name: "Sesión de pareja", discountPercent: 0 },
  { credits: 4, stripePriceId: "motivar-auto-catalog-couples-4", name: "Pareja — 4 sesiones", discountPercent: 30 },
  { credits: 8, stripePriceId: "motivar-auto-catalog-couples-8", name: "Pareja — 8 sesiones", discountPercent: 36 },
  { credits: 12, stripePriceId: "motivar-auto-catalog-couples-12", name: "Pareja — 12 sesiones", discountPercent: 40 }
] as const;

const DEFAULT_COUPLES_SESSION_USD_CENTS = 9_000;

/**
 * Garantiza paquetes globales de terapia de pareja (4/8/12) por mercado.
 * Idempotente vía `market + stripePriceId`.
 */
export async function ensureGlobalCouplesSessionPackages(market: Market): Promise<void> {
  const paymentProvider = market === "AR" ? "MERCADOPAGO" : "STRIPE";

  for (const spec of COUPLES_BUNDLE_SPECS) {
    await prisma.sessionPackage.upsert({
      where: {
        market_stripePriceId: {
          market,
          stripePriceId: spec.stripePriceId
        }
      },
      create: {
        market,
        paymentProvider,
        stripePriceId: spec.stripePriceId,
        name: spec.name,
        credits: spec.credits,
        priceCents: DEFAULT_COUPLES_SESSION_USD_CENTS * spec.credits,
        discountPercent: spec.discountPercent,
        currency: "usd",
        active: true,
        modality: "COUPLES"
      },
      update: {
        active: true,
        modality: "COUPLES",
        name: spec.name
      }
    });
  }
}
