import type { Market } from "@prisma/client";

export type DlocalPackageOrderContext = {
  kind: "package";
  paymentId?: string;
  patientId: string;
  packageId: string;
  market: Market;
  professionalIdSnapshot: string | null;
  pricing: {
    listPriceCents: number;
    priceCents: number;
    discountPercent: number;
  };
  chargeAmountMajor: number;
  chargeCurrency: string;
};

export type DlocalTrialOrderContext = {
  kind: "trial";
  paymentId?: string;
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  market: Market;
  pricing: {
    listPriceCents: number;
    priceCents: number;
  };
  chargeAmountMajor: number;
  chargeCurrency: string;
};

export type DlocalIndividualOrderContext = {
  kind: "individual";
  paymentId?: string;
  patientId: string;
  packageId: string;
  sessionCount: number;
  displayName: string;
  market: Market;
  professionalIdSnapshot: string | null;
  pricing: {
    listPriceCents: number;
    priceCents: number;
    discountPercent: number;
  };
  chargeAmountMajor: number;
  chargeCurrency: string;
};

export type DlocalOrderContext =
  | DlocalPackageOrderContext
  | DlocalTrialOrderContext
  | DlocalIndividualOrderContext;
