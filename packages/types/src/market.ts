export const MARKETS = ["AR", "US"] as const;
export type Market = (typeof MARKETS)[number];

export function isMarket(value: unknown): value is Market {
  return value === "AR" || value === "US";
}
