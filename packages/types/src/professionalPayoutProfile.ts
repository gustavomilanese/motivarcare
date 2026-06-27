export type ProfessionalPayoutProvider = "dlocal" | "stripe";

export type ProfessionalPayoutBankTransferType = "cbu" | "cvu" | "alias" | "iban" | "ach";

export type ProfessionalPayoutStatus = "draft" | "pending_review" | "active" | "rejected";

export type ProfessionalPayoutBankAccount = {
  transferType: ProfessionalPayoutBankTransferType;
  accountValue: string;
  accountHolderName: string;
  bankName?: string | null;
};

export type ProfessionalPayoutAdminData = {
  taxId?: string;
  legalName?: string;
  payoutMethod?: ProfessionalPayoutProvider;
  /** @deprecated Use payoutBankAccount.accountValue */
  payoutAccount?: string;
  payoutStatus?: ProfessionalPayoutStatus;
  payoutBankAccount?: ProfessionalPayoutBankAccount | null;
  payoutSubmittedAt?: string | null;
  legalAcceptedAt?: string | null;
  acceptedDocuments?: string[];
  notes?: string;
};
