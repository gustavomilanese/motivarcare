import type { AppLanguage } from "@therapy/i18n-config";
import { describePackagePlan as describePackagePlanCore } from "@therapy/patient-core";
import { isMarket, type Market, type TherapyModality } from "@therapy/types";
import type { PackagePlan, PublicSessionPackagesResponse } from "../types";
import { API_BASE } from "../services/api";

export function describePackagePlan(credits: number, t: (values: { es: string; en: string; pt: string }) => string): string {
  return describePackagePlanCore(credits, t);
}

export function packageRhythmLabel(credits: number, t: (values: { es: string; en: string; pt: string }) => string): string {
  if (credits >= 12) {
    return t({
      es: "Ritmo intensivo",
      en: "Intensive pace",
      pt: "Ritmo intensivo"
    });
  }
  if (credits >= 8) {
    return t({
      es: "Ritmo recomendado",
      en: "Recommended pace",
      pt: "Ritmo recomendado"
    });
  }
  return t({
    es: "Ritmo de inicio",
    en: "Starter pace",
    pt: "Ritmo inicial"
  });
}

export function packageBenefitLines(credits: number, t: (values: { es: string; en: string; pt: string }) => string): string[] {
  if (credits >= 12) {
    return [
      t({
        es: "Mayor continuidad semanal para avanzar más rápido.",
        en: "More weekly continuity to progress faster.",
        pt: "Maior continuidade semanal para avancar mais rapido."
      }),
      t({
        es: "Prioridad para ajustar horarios con tu profesional.",
        en: "Priority to adjust schedules with your professional.",
        pt: "Prioridade para ajustar horarios com seu profissional."
      }),
      t({
        es: "Mejor valor por sesión para procesos intensivos.",
        en: "Best per-session value for intensive processes.",
        pt: "Melhor valor por sessao para processos intensivos."
      })
    ];
  }
  if (credits >= 8) {
    return [
      t({
        es: "Cadencia mensual sostenida y sin pausas largas.",
        en: "Sustained monthly cadence without long pauses.",
        pt: "Cadencia mensal sustentada sem pausas longas."
      }),
      t({
        es: "Balance ideal entre frecuencia y presupuesto.",
        en: "Ideal balance between frequency and budget.",
        pt: "Equilibrio ideal entre frequencia e orcamento."
      }),
      t({
        es: "Reserva anticipada para mantener continuidad.",
        en: "Advance booking to maintain continuity.",
        pt: "Reserva antecipada para manter continuidade."
      })
    ];
  }
  return [
    t({
      es: "Entrada gradual para iniciar tu proceso con claridad.",
      en: "Gradual entry to start your process with clarity.",
      pt: "Entrada gradual para iniciar seu processo com clareza."
    }),
    t({
      es: "Flexibilidad para validar tu ritmo de trabajo.",
      en: "Flexibility to validate your working pace.",
      pt: "Flexibilidade para validar seu ritmo de trabalho."
    }),
    t({
      es: "Base solida para dar el siguiente paso terapéutico.",
      en: "Solid base for your next therapy step.",
      pt: "Base solida para dar o proximo passo terapeutico."
    })
  ];
}

type PublicPackageCatalog = { plans: PackagePlan[]; featuredPackageId: string | null; fromApi: boolean };

/** IDs del fallback local (constants.ts); no existen en la DB — no se puede simular compra con ellos. */
export function isClientFallbackPackagePlanId(id: string): boolean {
  return id === "starter" || id === "growth" || id === "intensive";
}

const publicPackageCatalogInflight = new Map<string, Promise<PublicPackageCatalog>>();

function resolveCatalogMarket(market: Market | undefined | null): Market {
  return isMarket(market) ? market : "AR";
}

function publicPackageCatalogKey(
  language: AppLanguage,
  professionalId: string | undefined,
  market: Market,
  modality: TherapyModality
): string {
  return `${language}\0${professionalId ?? ""}\0${market}\0${modality}`;
}

async function fetchPublicPackageCatalog(params: {
  market: Market;
  professionalId?: string;
  modality: TherapyModality;
}): Promise<PublicSessionPackagesResponse> {
  const query = new URLSearchParams({
    channel: "patient",
    market: params.market,
    modality: params.modality
  });
  const professionalId = params.professionalId?.trim();
  if (professionalId) {
    query.set("professionalId", professionalId);
  }
  const response = await fetch(`${API_BASE}/api/public/session-packages?${query.toString()}`);
  if (!response.ok) {
    throw new Error("request_failed");
  }
  return (await response.json()) as PublicSessionPackagesResponse;
}

function mapPublicSessionPackagesToPlans(params: {
  data: PublicSessionPackagesResponse;
  t: (values: { es: string; en: string; pt: string }) => string;
}): PublicPackageCatalog {
  if (!Array.isArray(params.data.sessionPackages) || params.data.sessionPackages.length === 0) {
    throw new Error("empty_catalog");
  }
  /** El portal solo muestra paquetes multi-sesión; el de 1 crédito es catálogo interno para cobrar sueltas. */
  const bundlesOnly = params.data.sessionPackages.filter((item) => item.credits > 1);
  const topBundles = bundlesOnly.slice(0, 3);
  if (topBundles.length === 0) {
    throw new Error("empty_catalog");
  }
  const featured =
    params.data.featuredPackageId && topBundles.some((p) => p.id === params.data.featuredPackageId)
      ? params.data.featuredPackageId
      : topBundles[0]?.id ?? null;
  return {
    featuredPackageId: featured,
    fromApi: true,
    plans: topBundles.map((item) => ({
      id: item.id,
      name: item.name,
      credits: item.credits,
      priceCents: item.priceCents,
      currency: item.currency,
      discountPercent: item.discountPercent,
      description: describePackagePlan(item.credits, params.t),
      professionalId: item.professionalId,
      professionalName: item.professionalName,
      stripePriceId: item.stripePriceId
    }))
  };
}

async function loadPublicPackagePlansOnce(params: {
  language: AppLanguage;
  professionalId?: string;
  market: Market;
  modality: TherapyModality;
  t: (values: { es: string; en: string; pt: string }) => string;
  fallbackPlans?: PackagePlan[];
}): Promise<PublicPackageCatalog> {
  const market = resolveCatalogMarket(params.market);
  const professionalId = params.professionalId?.trim() || undefined;
  const modality = params.modality;

  try {
    let data = await fetchPublicPackageCatalog({ market, professionalId, modality });
    try {
      return mapPublicSessionPackagesToPlans({ data, t: params.t });
    } catch (error) {
      if (market === "AR") {
        throw error;
      }
      /** Mercados sin bundles publicados reutilizan plantillas AR (IDs reales de compra). */
      data = await fetchPublicPackageCatalog({ market: "AR", professionalId, modality });
      return mapPublicSessionPackagesToPlans({ data, t: params.t });
    }
  } catch {
    return {
      featuredPackageId: null,
      fromApi: false,
      plans: []
    };
  }
}

/**
 * Misma clave (idioma + profesional) puede dispararse desde varios efectos seguidos;
 * compartir la promesa en vuelo evita tormentas a `/api/public/session-packages`.
 */
export function loadPublicPackagePlans(params: {
  language: AppLanguage;
  professionalId?: string;
  market: Market;
  modality?: TherapyModality;
  t: (values: { es: string; en: string; pt: string }) => string;
  fallbackPlans?: PackagePlan[];
}): Promise<PublicPackageCatalog> {
  const market = resolveCatalogMarket(params.market);
  const modality = params.modality ?? "INDIVIDUAL";
  const key = publicPackageCatalogKey(params.language, params.professionalId, market, modality);
  const existing = publicPackageCatalogInflight.get(key);
  if (existing) {
    return existing;
  }
  const pending = loadPublicPackagePlansOnce({ ...params, modality }).finally(() => {
    publicPackageCatalogInflight.delete(key);
  });
  publicPackageCatalogInflight.set(key, pending);
  return pending;
}
