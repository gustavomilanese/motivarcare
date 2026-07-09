import {
  getDlocalPayoutCountryConfig,
  isDlocalPayoutCountry,
  normalizeDlocalField,
  normalizeDlocalAccountValue,
  validateDlocalPayoutProfile,
  type DlocalPayoutAccountType,
  type DlocalPayoutProfileInput,
  type ProfessionalPayoutBankTransferType,
  type ProfessionalPayoutProvider
} from "@therapy/types";

export type PayoutFormFields = {
  legalName: string;
  taxId: string;
  accountHolderName: string;
  bankTransferType: ProfessionalPayoutBankTransferType;
  bankAccountValue: string;
  bankName: string;
  payoutTermsAccepted: boolean;
  /**
   * Campos del payout dLocal dinámico por país de cobro (`transfer_country`).
   * Sólo se usan cuando el provider es `dlocal`. Ver `@therapy/types → dlocalPayouts.ts`.
   */
  payoutCountry: string;
  beneficiaryFirstName: string;
  beneficiaryLastName: string;
  documentType: string;
  bankCode: string;
  bankBranch: string;
  accountType: "" | DlocalPayoutAccountType;
};

const CUIT_DIGITS = /^\d{11}$/;
const CBU_CVU_DIGITS = /^\d{22}$/;
const ALIAS_PATTERN = /^[a-zA-Z0-9.]{6,20}$/;

export function normalizeTaxIdDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normaliza el identificador fiscal conservando letras y números (mayúsculas).
 * Muchos países usan documentos alfanuméricos (RFC en MX, RUT con dígito "K" en CL,
 * NIT en CO/GT, etc.), por eso no lo reducimos solo a dígitos.
 */
export function normalizeTaxId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
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

/**
 * Validación genérica multi-país: el documento fiscal debe ser alfanumérico y tener
 * un largo razonable. No imponemos el formato exacto de cada país (lo valida el
 * proveedor de pagos al hacer el payout), así soportamos muchos países sin fricción.
 */
export function isValidTaxId(_provider: ProfessionalPayoutProvider, taxId: string): boolean {
  const normalized = normalizeTaxId(taxId);
  return normalized.length >= 5 && normalized.length <= 30;
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

/** El nombre del banco es obligatorio salvo cuando se cobra por alias (que ya identifica al banco). */
export function isBankNameRequired(transferType: ProfessionalPayoutBankTransferType): boolean {
  return transferType !== "alias";
}

export function isValidBankName(transferType: ProfessionalPayoutBankTransferType, bankName: string): boolean {
  if (!isBankNameRequired(transferType)) {
    return true;
  }
  return bankName.trim().length >= 2;
}

/**
 * Convierte los campos del formulario a la forma que valida/envía dLocal. El `document`
 * del payout dLocal es el mismo identificador fiscal que se ingresa en "Datos fiscales"
 * (`taxId`); la cuenta bancaria es `bankAccountValue`. Los valores se normalizan según el
 * tipo de campo del país para que coincidan con lo que se manda a la API.
 */
export function payoutFormToDlocalProfile(fields: PayoutFormFields): DlocalPayoutProfileInput {
  const config = getDlocalPayoutCountryConfig(fields.payoutCountry);
  const document = config
    ? normalizeDlocalField(fields.taxId, config.documentRule.kind)
    : fields.taxId.trim();
  const bankAccount = config
    ? normalizeDlocalAccountValue(fields.bankAccountValue, config)
    : fields.bankAccountValue.trim();
  return {
    payoutCountry: fields.payoutCountry.trim().toUpperCase(),
    beneficiaryFirstName: fields.beneficiaryFirstName.trim(),
    beneficiaryLastName: fields.beneficiaryLastName.trim(),
    documentType: fields.documentType.trim().toUpperCase(),
    document,
    bankCode: fields.bankCode.trim(),
    bankAccount,
    bankBranch: fields.bankBranch.trim() || null,
    accountType: fields.accountType || null
  };
}

/** ¿Está completo el payout dLocal (datos por país + documento + términos)? */
export function isDlocalPayoutFormComplete(fields: PayoutFormFields, hasIdentityDocument: boolean): boolean {
  return (
    isDlocalPayoutCountry(fields.payoutCountry)
    && validateDlocalPayoutProfile(payoutFormToDlocalProfile(fields)) == null
    && hasIdentityDocument
    && fields.payoutTermsAccepted
  );
}

export function isPayoutFormComplete(
  provider: ProfessionalPayoutProvider,
  fields: PayoutFormFields,
  hasIdentityDocument: boolean
): boolean {
  if (provider === "dlocal") {
    return isDlocalPayoutFormComplete(fields, hasIdentityDocument);
  }
  return (
    fields.legalName.trim().length >= 3
    && fields.accountHolderName.trim().length >= 3
    && isValidTaxId(provider, fields.taxId)
    && isValidBankAccount(provider, fields.bankTransferType, fields.bankAccountValue)
    && isValidBankName(fields.bankTransferType, fields.bankName)
    && hasIdentityDocument
    && fields.payoutTermsAccepted
  );
}

export function payoutValidationMessage(
  provider: ProfessionalPayoutProvider,
  fields: PayoutFormFields,
  language: "es" | "en" | "pt"
): string | null {
  if (provider === "dlocal") {
    if (!isDlocalPayoutCountry(fields.payoutCountry)) {
      return language === "es"
        ? "Elegí el país donde tenés la cuenta bancaria para cobrar."
        : language === "pt"
          ? "Escolha o país onde você tem a conta bancária para receber."
          : "Choose the country where your bank account is.";
    }
    const error = validateDlocalPayoutProfile(payoutFormToDlocalProfile(fields));
    if (error) {
      // Los mensajes de la spec compartida están en español; para en/pt damos uno genérico.
      if (language === "es") {
        return error.message;
      }
      return language === "pt"
        ? "Revise os dados bancários para o país selecionado."
        : "Check your bank details for the selected country.";
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
  if (fields.legalName.trim().length < 3) {
    return language === "es"
      ? "Ingresá tu nombre legal completo."
      : language === "pt"
        ? "Informe seu nome legal completo."
        : "Enter your full legal name.";
  }
  if (!isValidTaxId(provider, fields.taxId)) {
    return language === "es"
      ? "Ingresá tu documento o identificación fiscal."
      : language === "pt"
        ? "Informe seu documento ou identificação fiscal."
        : "Enter your tax ID or national document.";
  }
  if (fields.accountHolderName.trim().length < 3) {
    return language === "es"
      ? "Ingresá el titular de la cuenta."
      : language === "pt"
        ? "Informe o titular da conta."
        : "Enter the account holder name.";
  }
  if (!isValidBankAccount(provider, fields.bankTransferType, fields.bankAccountValue)) {
    return language === "es"
      ? "Revisá los datos de tu cuenta bancaria internacional."
      : language === "pt"
        ? "Revise os dados da sua conta bancaria internacional."
        : "Check your international bank account details.";
  }
  if (!isValidBankName(fields.bankTransferType, fields.bankName)) {
    return language === "es"
      ? "Ingresá el nombre de tu banco."
      : language === "pt"
        ? "Informe o nome do seu banco."
        : "Enter your bank name.";
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
