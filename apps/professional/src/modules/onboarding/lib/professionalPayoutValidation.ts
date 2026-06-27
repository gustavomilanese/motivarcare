import type {
  ProfessionalPayoutBankTransferType,
  ProfessionalPayoutProvider
} from "@therapy/types";

export type PayoutFormFields = {
  legalName: string;
  taxId: string;
  accountHolderName: string;
  bankTransferType: ProfessionalPayoutBankTransferType;
  bankAccountValue: string;
  bankName: string;
  payoutTermsAccepted: boolean;
};

const CUIT_DIGITS = /^\d{11}$/;
const CBU_CVU_DIGITS = /^\d{22}$/;
const ALIAS_PATTERN = /^[a-zA-Z0-9.]{6,20}$/;

export function normalizeTaxIdDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeBankAccountValue(transferType: ProfessionalPayoutBankTransferType, value: string): string {
  const trimmed = value.trim();
  if (transferType === "cbu" || transferType === "cvu") {
    return trimmed.replace(/\D/g, "");
  }
  if (transferType === "alias") {
    return trimmed.toLowerCase();
  }
  return trimmed.replace(/\s+/g, "");
}

export function defaultBankTransferType(provider: ProfessionalPayoutProvider): ProfessionalPayoutBankTransferType {
  return provider === "dlocal" ? "cbu" : "iban";
}

export function isValidTaxId(provider: ProfessionalPayoutProvider, taxId: string): boolean {
  const digits = normalizeTaxIdDigits(taxId);
  if (provider === "dlocal") {
    return digits.length === 11 || (digits.length >= 7 && digits.length <= 8);
  }
  return digits.length >= 6;
}

export function isValidBankAccount(
  provider: ProfessionalPayoutProvider,
  transferType: ProfessionalPayoutBankTransferType,
  accountValue: string
): boolean {
  const normalized = normalizeBankAccountValue(transferType, accountValue);
  if (provider === "dlocal") {
    if (transferType === "cbu" || transferType === "cvu") {
      return CBU_CVU_DIGITS.test(normalized);
    }
    if (transferType === "alias") {
      return ALIAS_PATTERN.test(normalized);
    }
    return false;
  }

  if (transferType === "iban") {
    return normalized.length >= 15 && normalized.length <= 34;
  }
  if (transferType === "ach") {
    return normalized.length >= 4 && normalized.length <= 34;
  }
  return false;
}

export function isPayoutFormComplete(
  provider: ProfessionalPayoutProvider,
  fields: PayoutFormFields,
  hasIdentityDocument: boolean
): boolean {
  return (
    fields.legalName.trim().length >= 3
    && fields.accountHolderName.trim().length >= 3
    && isValidTaxId(provider, fields.taxId)
    && isValidBankAccount(provider, fields.bankTransferType, fields.bankAccountValue)
    && hasIdentityDocument
    && fields.payoutTermsAccepted
  );
}

export function payoutValidationMessage(
  provider: ProfessionalPayoutProvider,
  fields: PayoutFormFields,
  language: "es" | "en" | "pt"
): string | null {
  if (fields.legalName.trim().length < 3) {
    return language === "es"
      ? "Ingresá tu nombre legal completo."
      : language === "pt"
        ? "Informe seu nome legal completo."
        : "Enter your full legal name.";
  }
  if (!isValidTaxId(provider, fields.taxId)) {
    return provider === "dlocal"
      ? language === "es"
        ? "Ingresá un CUIT/CUIL válido (11 dígitos) o DNI."
        : language === "pt"
          ? "Informe um CUIT/CUIL valido (11 digitos) ou documento."
          : "Enter a valid CUIT/CUIL (11 digits) or national ID."
      : language === "es"
        ? "Ingresá tu identificador fiscal."
        : language === "pt"
          ? "Informe seu identificador fiscal."
          : "Enter your tax identifier.";
  }
  if (fields.accountHolderName.trim().length < 3) {
    return language === "es"
      ? "Ingresá el titular de la cuenta."
      : language === "pt"
        ? "Informe o titular da conta."
        : "Enter the account holder name.";
  }
  if (!isValidBankAccount(provider, fields.bankTransferType, fields.bankAccountValue)) {
    if (provider === "dlocal") {
      if (fields.bankTransferType === "alias") {
        return language === "es"
          ? "El alias debe tener entre 6 y 20 caracteres (letras, números o puntos)."
          : language === "pt"
            ? "O alias deve ter entre 6 e 20 caracteres."
            : "Alias must be 6–20 characters (letters, numbers, or dots).";
      }
      return language === "es"
        ? "El CBU/CVU debe tener 22 dígitos."
        : language === "pt"
          ? "O CBU/CVU deve ter 22 digitos."
          : "CBU/CVU must be 22 digits.";
    }
    return language === "es"
      ? "Revisá los datos de tu cuenta bancaria internacional."
      : language === "pt"
        ? "Revise os dados da sua conta bancaria internacional."
        : "Check your international bank account details.";
  }
  if (!fields.payoutTermsAccepted) {
    return language === "es"
      ? "Confirmá que los datos son correctos para poder recibir pagos."
      : language === "pt"
        ? "Confirme que os dados estao corretos para receber pagamentos."
        : "Confirm that your details are correct to receive payouts.";
  }
  return null;
}
