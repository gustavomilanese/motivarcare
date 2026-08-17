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

export type PayoutFieldErrorKey =
  | "legalName"
  | "payoutCountry"
  | "beneficiaryFirstName"
  | "beneficiaryLastName"
  | "documentType"
  | "taxId"
  | "bankCode"
  | "bankAccountValue"
  | "bankName"
  | "accountHolderName"
  | "bankBranch"
  | "accountType";

function copy(
  language: "es" | "en" | "pt",
  values: { es: string; en: string; pt: string }
): string {
  return values[language];
}

export function legalNameLooksLikeBank(legalName: string): boolean {
  const n = legalName.trim().toLowerCase();
  if (n.length < 3) {
    return false;
  }
  return /mercado\s*pago|^banco\b|brubank|uala|naranja|galicia|santander|macro|cvu account/.test(n);
}

function arAccountFieldError(value: string, language: "es" | "en" | "pt"): string {
  const hasLetters = /[a-zA-Z]/.test(value);
  const digits = value.replace(/\D/g, "");
  if (hasLetters) {
    return copy(language, {
      es: "Si es un alias, usá 6 a 20 caracteres (letras, números y puntos), como gus.fer.milan.",
      en: "If this is an alias, use 6 to 20 characters (letters, numbers, and dots), like gus.fer.milan.",
      pt: "Se for um alias, use 6 a 20 caracteres (letras, números e pontos), como gus.fer.milan."
    });
  }
  if (digits.length > 0 && digits.length !== 22) {
    return copy(language, {
      es: "El CBU o CVU tiene 22 números. Si cobrás con Mercado Pago, pegá el CVU de 22 dígitos o el alias.",
      en: "CBU/CVU has 22 digits. For Mercado Pago, paste the 22-digit CVU or the alias.",
      pt: "O CBU/CVU tem 22 números. No Mercado Pago, cole o CVU de 22 dígitos ou o alias."
    });
  }
  return copy(language, {
    es: "Revisá el CBU/CVU (22 dígitos) o el alias (6 a 20 caracteres).",
    en: "Check the 22-digit CBU/CVU or the alias (6 to 20 characters).",
    pt: "Revise o CBU/CVU (22 dígitos) ou o alias (6 a 20 caracteres)."
  });
}

/** Errores por campo para el popup de datos bancarios. Vacío = formulario válido. */
export function collectPayoutFieldErrors(
  provider: ProfessionalPayoutProvider,
  fields: PayoutFormFields,
  language: "es" | "en" | "pt"
): Partial<Record<PayoutFieldErrorKey, string>> {
  const errors: Partial<Record<PayoutFieldErrorKey, string>> = {};

  if (provider === "dlocal") {
    if (fields.beneficiaryFirstName.trim().length < 2) {
      errors.beneficiaryFirstName = copy(language, {
        es: "Ingresá tu nombre, como en el DNI.",
        en: "Enter your first name, as on your ID.",
        pt: "Informe seu nome, como no documento."
      });
    }
    if (fields.beneficiaryLastName.trim().length < 2) {
      errors.beneficiaryLastName = copy(language, {
        es: "Ingresá tu apellido, como en el DNI.",
        en: "Enter your last name, as on your ID.",
        pt: "Informe seu sobrenome, como no documento."
      });
    }
    if (!isDlocalPayoutCountry(fields.payoutCountry)) {
      errors.payoutCountry = copy(language, {
        es: "Elegí el país donde tenés la cuenta para cobrar.",
        en: "Choose the country of the account we should pay.",
        pt: "Escolha o país da conta para receber."
      });
      return errors;
    }
    const profile = payoutFormToDlocalProfile(fields);
    const config = getDlocalPayoutCountryConfig(fields.payoutCountry);
    if (!config?.documentTypes.some((option) => option.value === profile.documentType)) {
      errors.documentType = copy(language, {
        es: "Elegí CUIT o CUIL (u otro documento del país).",
        en: "Choose CUIT, CUIL, or the document type for that country.",
        pt: "Escolha o tipo de documento do país."
      });
    }
    if (!config || !profile.document) {
      errors.taxId = copy(language, {
        es: "Ingresá el número de CUIT/CUIL, sin olvidar ningún dígito.",
        en: "Enter the full tax ID number.",
        pt: "Informe o número completo do documento."
      });
    }
    const dlocalError = validateDlocalPayoutProfile(profile);
    if ((dlocalError?.field === "document" || (fields.payoutCountry.toUpperCase() === "AR" && profile.document.replace(/\D/g, "").length !== 11)) && !errors.taxId) {
      errors.taxId = copy(language, {
        es: "El CUIT/CUIL de Argentina tiene 11 números.",
        en: "An Argentine CUIT/CUIL has 11 digits.",
        pt: "O CUIT/CUIL da Argentina tem 11 números."
      });
    }
    if (!profile.bankCode) {
      errors.bankCode = copy(language, {
        es: "Elegí el banco de la lista. Mercado Pago en Argentina es «Mercado Pago / CVU».",
        en: "Choose the bank from the list. Mercado Pago in Argentina is “Mercado Pago / CVU”.",
        pt: "Escolha o banco da lista. Mercado Pago na Argentina é “Mercado Pago / CVU”."
      });
    }
    const accountLooksInvalid =
      dlocalError?.field === "bankAccount"
      || !profile.bankAccount
      || (fields.payoutCountry.toUpperCase() === "AR"
        && !/^\d{22}$/.test(profile.bankAccount)
        && !/^[a-zA-Z0-9.]{6,20}$/.test(fields.bankAccountValue.trim()));
    if (accountLooksInvalid) {
      errors.bankAccountValue =
        fields.payoutCountry.toUpperCase() === "AR"
          ? arAccountFieldError(fields.bankAccountValue, language)
          : copy(language, {
              es: profile.bankAccount ? "Revisá el número de cuenta." : "Ingresá el número de cuenta.",
              en: profile.bankAccount ? "Check the account number." : "Enter the account number.",
              pt: profile.bankAccount ? "Revise o número da conta." : "Informe o número da conta."
            });
    }
    if (dlocalError?.field === "bankBranch") {
      errors.bankBranch = dlocalError.message;
    }
    if (dlocalError?.field === "accountType") {
      errors.accountType = dlocalError.message;
    }
    return errors;
  }

  if (fields.legalName.trim().length < 3) {
    errors.legalName = copy(language, {
      es: "Ingresá tu nombre y apellido como figuran en el DNI o CUIT.",
      en: "Enter your first and last name as they appear on your ID.",
      pt: "Informe nome e sobrenome como no documento."
    });
  } else if (legalNameLooksLikeBank(fields.legalName)) {
    errors.legalName = copy(language, {
      es: "Acá va tu nombre, no el banco. El banco se elige más abajo.",
      en: "This is your name, not the bank. Choose the bank below.",
      pt: "Aqui vai o seu nome, nao o banco. O banco se escolhe abaixo."
    });
  }
  if (!isValidTaxId(provider, fields.taxId)) {
    errors.taxId = copy(language, {
      es: "Ingresá tu documento o identificación fiscal.",
      en: "Enter your tax ID or national document.",
      pt: "Informe seu documento ou identificação fiscal."
    });
  }
  if (fields.accountHolderName.trim().length < 3) {
    errors.accountHolderName = copy(language, {
      es: "Ingresá el titular de la cuenta bancaria.",
      en: "Enter the bank account holder.",
      pt: "Informe o titular da conta."
    });
  }
  if (!isValidBankAccount(provider, fields.bankTransferType, fields.bankAccountValue)) {
    errors.bankAccountValue =
      fields.bankTransferType === "cbu" || fields.bankTransferType === "cvu" || fields.bankTransferType === "alias"
        ? arAccountFieldError(fields.bankAccountValue, language)
        : copy(language, {
            es: "Revisá IBAN o número de cuenta.",
            en: "Check the IBAN or account number.",
            pt: "Revise o IBAN ou número da conta."
          });
  }
  if (!isValidBankName(fields.bankTransferType, fields.bankName)) {
    errors.bankName = copy(language, {
      es: "Ingresá o elegí el banco.",
      en: "Enter or choose the bank.",
      pt: "Informe ou escolha o banco."
    });
  }
  return errors;
}

export function firstPayoutFieldError(
  errors: Partial<Record<PayoutFieldErrorKey, string>>
): string | null {
  return Object.values(errors)[0] ?? null;
}

/** Traduce errores crudos de la API a un mensaje (y campo, si se puede) para el popup. */
export function mapPayoutApiError(
  raw: string,
  language: "es" | "en" | "pt"
): { field?: PayoutFieldErrorKey; message: string } {
  const n = raw.trim();
  if (/International payouts require IBAN/i.test(n)) {
    return {
      field: "bankAccountValue",
      message: copy(language, {
        es: "Estos datos son para cobros en Argentina u otro país dLocal. Elegí el país, el banco, y un CBU/CVU de 22 dígitos o un alias. No uses IBAN acá.",
        en: "These details are for Argentina or another dLocal country. Choose the country, bank, and a 22-digit CBU/CVU or an alias — not an IBAN.",
        pt: "Estes dados são para a Argentina ou outro país dLocal. Escolha o país, o banco e um CBU/CVU de 22 dígitos ou um alias — não IBAN."
      })
    };
  }
  if (/Invalid CBU|Invalid bank alias|bank_account_invalid/i.test(n)) {
    return {
      field: "bankAccountValue",
      message: copy(language, {
        es: "Revisá el CBU/CVU (22 dígitos) o el alias (6 a 20 caracteres, letras, números y puntos).",
        en: "Check the 22-digit CBU/CVU or the alias (6 to 20 characters).",
        pt: "Revise o CBU/CVU (22 dígitos) ou o alias (6 a 20 caracteres)."
      })
    };
  }
  if (/Invalid tax identifier/i.test(n)) {
    return {
      field: "taxId",
      message: copy(language, {
        es: "Revisá el CUIT/CUIL (11 números) u otro documento fiscal.",
        en: "Check the tax ID (11 digits in Argentina).",
        pt: "Revise o CUIT/CUIL (11 números) ou o documento fiscal."
      })
    };
  }
  if (/Invalid payload/i.test(n)) {
    return {
      message: copy(language, {
        es: "Faltan datos o hay un formato inválido. Revisá los campos marcados en rojo.",
        en: "Some fields are missing or invalid. Check the ones marked in red.",
        pt: "Faltam dados ou o formato é inválido. Confira os campos em vermelho."
      })
    };
  }
  if (n && !/^HTTP\s/i.test(n) && n !== "Unauthorized") {
    return { message: n };
  }
  return {
    message: copy(language, {
      es: "Los cambios no se guardaron. Revisá los campos marcados y tocá guardar otra vez.",
      en: "Changes didn’t save. Check the marked fields and save again.",
      pt: "As alterações não foram salvas. Confira os campos e salve de novo."
    })
  };
}
