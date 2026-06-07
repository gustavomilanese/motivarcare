/** Catálogo mínimo compartido entre web, mobile browser y apps nativas. */
export type SessionPackagePlan = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: string;
  discountPercent: number;
};
