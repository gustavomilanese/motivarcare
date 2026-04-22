export const MARKETS = ["AR", "US", "BR", "ES"] as const;
export type Market = (typeof MARKETS)[number];

export function isMarket(value: unknown): value is Market {
  return value === "AR" || value === "US" || value === "BR" || value === "ES";
}
