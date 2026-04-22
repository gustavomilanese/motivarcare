export type LandingSlotQuery = "patient_main" | "patient_v2";

export interface LandingSessionPackageRow {
  id: string;
  name: string;
  credits: number;
  discountPercent: number;
  priceCents: number;
  currency: string;
}

export function publicApiBase(): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  const u = env.VITE_API_URL?.trim();
  if (u) {
    return u.replace(/\/+$/, "");
  }
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:4000";
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
