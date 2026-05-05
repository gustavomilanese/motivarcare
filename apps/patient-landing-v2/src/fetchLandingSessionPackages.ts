export type LandingSlotQuery = "patient_main" | "patient_v2";

export interface LandingSessionPackageRow {
  id: string;
  name: string;
  credits: number;
  discountPercent: number;
  priceCents: number;
  currency: string;
}

declare global {
  interface Window {
    __THERAPY_API_BASE__?: string;
  }
}

/**
 * Base URL del API para fetch desde la landing.
 * - En dev: vacío → mismo origen + proxy Vite a `:PORT` (ver repo root `PORT`).
 * - En prod: obligatorio en build — `VITE_API_URL` o `API_PUBLIC_URL` en Vercel (inyectado como `window.__THERAPY_API_BASE__`).
 */
export function publicApiBase(): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  const fromEnv = env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  if (import.meta.env.DEV) {
    return "";
  }
  if (typeof window !== "undefined") {
    const injected = window.__THERAPY_API_BASE__?.trim();
    if (injected) {
      return injected.replace(/\/+$/, "");
    }
  }
  if (import.meta.env.PROD && typeof window !== "undefined") {
    console.warn(
      "[MotivarCare landing] Sin URL del API: definí VITE_API_URL (o API_PUBLIC_URL) en el build de Vercel apuntando al API público (Railway)."
    );
  }
  return "";
}

export async function fetchLandingSessionPackages(params: {
  apiBase: string;
  landingSlot: LandingSlotQuery;
  market: "AR" | "US" | "BR" | "ES";
}): Promise<{ featuredPackageId: string | null; sessionPackages: LandingSessionPackageRow[] }> {
  const q = new URLSearchParams({
    channel: "landing",
    landingSlot: params.landingSlot,
    market: params.market
  });
  const res = await fetch(`${params.apiBase}/api/public/session-packages?${q.toString()}`);
  if (!res.ok) {
    throw new Error("session-packages");
  }
  return res.json() as Promise<{ featuredPackageId: string | null; sessionPackages: LandingSessionPackageRow[] }>;
}

export function formatPackageMoney(priceCents: number, currency: string): string {
  const code = currency.trim().toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(priceCents / 100);
  } catch {
    return `${(priceCents / 100).toFixed(0)} ${code}`;
  }
}
