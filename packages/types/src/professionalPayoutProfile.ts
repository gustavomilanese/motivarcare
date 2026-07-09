import type { DlocalPayoutAccountType } from "./dlocalPayouts.js";

export type ProfessionalPayoutProvider = "dlocal" | "stripe";

export type ProfessionalPayoutBankTransferType = "cbu" | "cvu" | "alias" | "iban" | "ach";

export type ProfessionalPayoutStatus = "draft" | "pending_review" | "active" | "rejected";

export type ProfessionalPayoutBankAccount = {
  transferType: ProfessionalPayoutBankTransferType;
  accountValue: string;
  accountHolderName: string;
  bankName?: string | null;

  /**
   * Campos requeridos por dLocal Go payouts (`POST /v1/payouts`). Se completan según el
   * país de cobro (`payoutCountry`). Ver `dlocalPayouts.ts` para el detalle por país.
   */
  /** `transfer_country` — país de la cuenta bancaria (puede diferir de la residencia). */
  payoutCountry?: string | null;
  /** `beneficiary_first_name`. */
  beneficiaryFirstName?: string | null;
  /** `beneficiary_last_name`. */
  beneficiaryLastName?: string | null;
  /** `beneficiary_document_type` (CUIT, CPF, RFC, etc.). */
  documentType?: string | null;
  /** `beneficiary_document`. */
  document?: string | null;
  /** `bank_code` (código de la tabla dLocal, no texto libre). */
  bankCode?: string | null;
  /** `bank_branch` (sucursal / agencia; sólo algunos países). */
  bankBranch?: string | null;
  /** `bank_account_type` (CHECKING / SAVINGS; sólo algunos países). */
  accountType?: DlocalPayoutAccountType | null;
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
