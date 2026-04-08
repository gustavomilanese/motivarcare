import type { AppLanguage } from "@therapy/i18n-config";
import type { PackagePlan, PublicSessionPackagesResponse } from "../types";
import { API_BASE } from "../services/api";

export function describePackagePlan(credits: number, t: (values: { es: string; en: string; pt: string }) => string): string {
  if (credits >= 12) {
    return t({
      es: "Mayor frecuencia para procesos de alta demanda.",
      en: "Higher frequency for high-demand processes.",
      pt: "Maior frequencia para processos de alta demanda."
    });
  }
  if (credits >= 8) {
    return t({
      es: "Plan recomendado para trabajo mensual sostenido.",
      en: "Recommended plan for sustained monthly work.",
      pt: "Plano recomendado para trabalho mensal sustentado."
    });
  }
  return t({
    es: "Ideal para una primera etapa de trabajo terapéutico.",
    en: "Ideal for an initial therapy stage.",
    pt: "Ideal para uma primeira etapa de trabalho terapeutico."
  });
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

export async function loadPublicPackagePlans(params: {
  language: AppLanguage;
  professionalId?: string;
  t: (values: { es: string; en: string; pt: string }) => string;
  fallbackPlans?: PackagePlan[];
}): Promise<{ plans: PackagePlan[]; featuredPackageId: string | null }> {
  try {
    const query = new URLSearchParams({ channel: "patient" });
    if (params.professionalId) {
      query.set("professionalId", params.professionalId);
    }
    const response = await fetch(`${API_BASE}/api/public/session-packages?${query.toString()}`);
    if (!response.ok) {
      throw new Error("request_failed");
    }
    const data = (await response.json()) as PublicSessionPackagesResponse;
    if (!Array.isArray(data.sessionPackages) || data.sessionPackages.length === 0) {
      throw new Error("empty_catalog");
    }
    /** El portal solo muestra paquetes multi-sesión; el de 1 crédito es catálogo interno para cobrar sueltas. */
    const bundlesOnly = data.sessionPackages.filter((item) => item.credits > 1);
    const topBundles = bundlesOnly.slice(0, 3);
    if (topBundles.length === 0) {
      throw new Error("empty_catalog");
    }
    const featured =
      data.featuredPackageId && topBundles.some((p) => p.id === data.featuredPackageId)
        ? data.featuredPackageId
        : topBundles[0]?.id ?? null;
    return {
      featuredPackageId: featured,
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
  } catch {
    const raw = params.fallbackPlans ?? [];
    const bundles = raw.filter((plan) => plan.credits > 1);
    const top = bundles.slice(0, 3);
    return {
      featuredPackageId: top[0]?.id ?? null,
      plans: top
    };
  }
}
