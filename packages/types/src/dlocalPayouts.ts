/**
 * Spec de **payouts** (pagos a profesionales) vía dLocal Go — `POST /v1/payouts`.
 *
 * Fuente: dLocal Go → "Payouts Integration" + "Country requirements" + "Purpose codes".
 *
 * Conceptos clave (no mezclar):
 * - `residencyCountry`: dónde vive el profesional → moneda en pantalla, matching, perfil.
 * - `payoutCountry` (= `transfer_country` en la API): país de la **cuenta bancaria** donde
 *   quiere cobrar. Un profesional que reside en Colombia (sin payout dLocal) podría cobrar
 *   en Argentina si tiene CUIT + CBU allí. Por eso el formulario de cobro se arma por
 *   `payoutCountry`, no por residencia.
 *
 * El flujo de MotivarCare es siempre **B2C** (empresa → persona) y el `purpose` para pago de
 * sesiones de terapia es `OTHER_SERVICES` ("Purchase sale of services").
 */

/** Países donde dLocal Go puede depositar payouts (confirmado en la doc). Sin CO ni CL. */
export const DLOCAL_PAYOUT_COUNTRY_CODES = ["AR", "BR", "EC", "MX", "PE", "PY", "UY"] as const;

export type DlocalPayoutCountry = (typeof DLOCAL_PAYOUT_COUNTRY_CODES)[number];

export type DlocalPayoutFlowType = "B2C" | "B2B";

/** CHECKING (corriente) / SAVINGS (caja de ahorro). */
export type DlocalPayoutAccountType = "CHECKING" | "SAVINGS";

/**
 * `purpose` obligatorio en cada payout. Para pago de sesiones de terapia usamos
 * `OTHER_SERVICES`. La API acepta muchos más; sólo tipamos los que usamos.
 */
export const DLOCAL_PAYOUT_PURPOSE = "OTHER_SERVICES" as const;
export type DlocalPayoutPurpose = typeof DLOCAL_PAYOUT_PURPOSE;

/** Moneda de depósito (`currency_to_pay`) por país. */
export const DLOCAL_PAYOUT_CURRENCY: Record<DlocalPayoutCountry, string> = {
  AR: "ARS",
  BR: "BRL",
  EC: "USD",
  MX: "MXN",
  PE: "PEN",
  PY: "PYG",
  UY: "UYU"
};

type LocalizedText = { es: string; en: string; pt: string };

export type DlocalDocumentTypeOption = {
  /** Valor exacto para `beneficiary_document_type`. */
  value: string;
  label: string;
};

/** Regla simple de validación de un campo (largo + tipo de caracteres). */
export type DlocalFieldKind = "numeric" | "alphanumeric" | "any";
export type DlocalFieldRule = {
  kind: DlocalFieldKind;
  minLength?: number;
  maxLength?: number;
};

export type DlocalPayoutCountryConfig = {
  country: DlocalPayoutCountry;
  countryName: LocalizedText;
  /** `currency_to_pay`. */
  currency: string;
  /** Tipos de documento aceptados (`beneficiary_document_type`). */
  documentTypes: DlocalDocumentTypeOption[];
  documentRule: DlocalFieldRule;
  /** Etiqueta de la cuenta bancaria (CBU/CVU, CLABE, CCI, etc.). */
  accountLabel: LocalizedText;
  accountHint: LocalizedText;
  accountRule: DlocalFieldRule;
  /** Reglas alternativas válidas para la cuenta (ej. AR: CBU/CVU **o** Alias). */
  accountRuleAlternatives?: DlocalFieldRule[];
  /** ¿Se pide `bank_branch` (sucursal/agencia)? */
  requiresBranch: boolean;
  /** ¿Se pide `bank_account_type` (CHECKING/SAVINGS)? */
  requiresAccountType: boolean;
  /** `list` = selector de banco cargado; `manual` = se ingresa el `bank_code` a mano. */
  bankCodeMode: "list" | "manual";
};

const AR: DlocalPayoutCountryConfig = {
  country: "AR",
  countryName: { es: "Argentina", en: "Argentina", pt: "Argentina" },
  currency: "ARS",
  documentTypes: [
    { value: "CUIT", label: "CUIT" },
    { value: "CUIL", label: "CUIL" }
  ],
  documentRule: { kind: "numeric", minLength: 11, maxLength: 11 },
  accountLabel: { es: "CBU / CVU o Alias", en: "CBU / CVU or Alias", pt: "CBU / CVU ou Alias" },
  accountHint: {
    es: "CBU o CVU de 22 dígitos, o tu alias (6 a 20 caracteres).",
    en: "22-digit CBU or CVU, or your alias (6 to 20 characters).",
    pt: "CBU ou CVU de 22 dígitos, ou seu alias (6 a 20 caracteres)."
  },
  // CBU/CVU: 22 numéricos.
  accountRule: { kind: "numeric", minLength: 22, maxLength: 22 },
  // Alias: 6 a 20 alfanumérico (puede incluir . o -).
  accountRuleAlternatives: [{ kind: "alphanumeric", minLength: 6, maxLength: 20 }],
  requiresBranch: false,
  requiresAccountType: false,
  bankCodeMode: "list"
};

const BR: DlocalPayoutCountryConfig = {
  country: "BR",
  countryName: { es: "Brasil", en: "Brazil", pt: "Brasil" },
  currency: "BRL",
  documentTypes: [
    { value: "CPF", label: "CPF" },
    { value: "CNPJ", label: "CNPJ" }
  ],
  documentRule: { kind: "numeric", minLength: 11, maxLength: 14 },
  accountLabel: { es: "Número de cuenta", en: "Account number", pt: "Número da conta" },
  accountHint: {
    es: "Número de cuenta bancaria (sin la agencia).",
    en: "Bank account number (without the branch).",
    pt: "Número da conta bancária (sem a agência)."
  },
  accountRule: { kind: "any", minLength: 1, maxLength: 20 },
  requiresBranch: true,
  requiresAccountType: true,
  bankCodeMode: "list"
};

const EC: DlocalPayoutCountryConfig = {
  country: "EC",
  countryName: { es: "Ecuador", en: "Ecuador", pt: "Equador" },
  currency: "USD",
  documentTypes: [
    { value: "CI", label: "Cédula (CI)" },
    { value: "RUC", label: "RUC" },
    { value: "PASSPORT", label: "Pasaporte" }
  ],
  documentRule: { kind: "any", minLength: 5, maxLength: 20 },
  accountLabel: { es: "Número de cuenta", en: "Account number", pt: "Número da conta" },
  accountHint: {
    es: "Número de cuenta bancaria.",
    en: "Bank account number.",
    pt: "Número da conta bancária."
  },
  accountRule: { kind: "any", minLength: 5, maxLength: 20 },
  requiresBranch: false,
  requiresAccountType: true,
  bankCodeMode: "list"
};

const MX: DlocalPayoutCountryConfig = {
  country: "MX",
  countryName: { es: "México", en: "Mexico", pt: "México" },
  currency: "MXN",
  documentTypes: [
    { value: "CURP", label: "CURP" },
    { value: "RFC", label: "RFC" }
  ],
  documentRule: { kind: "alphanumeric", minLength: 10, maxLength: 18 },
  accountLabel: { es: "CLABE", en: "CLABE", pt: "CLABE" },
  accountHint: {
    es: "CLABE interbancaria de 18 dígitos.",
    en: "18-digit interbank CLABE.",
    pt: "CLABE interbancária de 18 dígitos."
  },
  accountRule: { kind: "numeric", minLength: 18, maxLength: 18 },
  requiresBranch: false,
  requiresAccountType: false,
  bankCodeMode: "list"
};

const PE: DlocalPayoutCountryConfig = {
  country: "PE",
  countryName: { es: "Perú", en: "Peru", pt: "Peru" },
  currency: "PEN",
  documentTypes: [
    { value: "DNI", label: "DNI" },
    { value: "RUC", label: "RUC" },
    { value: "CE", label: "Carné de extranjería (CE)" }
  ],
  documentRule: { kind: "alphanumeric", minLength: 8, maxLength: 12 },
  accountLabel: { es: "CCI", en: "CCI", pt: "CCI" },
  accountHint: {
    es: "Código de cuenta interbancario (CCI) de 20 dígitos.",
    en: "20-digit interbank account code (CCI).",
    pt: "Código de conta interbancária (CCI) de 20 dígitos."
  },
  accountRule: { kind: "numeric", minLength: 20, maxLength: 20 },
  requiresBranch: false,
  requiresAccountType: false,
  bankCodeMode: "list"
};

const PY: DlocalPayoutCountryConfig = {
  country: "PY",
  countryName: { es: "Paraguay", en: "Paraguay", pt: "Paraguai" },
  currency: "PYG",
  documentTypes: [
    { value: "CI", label: "Cédula (CI)" },
    { value: "RUC", label: "RUC" }
  ],
  documentRule: { kind: "any", minLength: 5, maxLength: 20 },
  accountLabel: { es: "Número de cuenta (SIPAP)", en: "Account number (SIPAP)", pt: "Número da conta (SIPAP)" },
  accountHint: {
    es: "Número de cuenta SIPAP.",
    en: "SIPAP account number.",
    pt: "Número da conta SIPAP."
  },
  accountRule: { kind: "numeric", minLength: 6, maxLength: 20 },
  requiresBranch: false,
  requiresAccountType: true,
  bankCodeMode: "list"
};

const UY: DlocalPayoutCountryConfig = {
  country: "UY",
  countryName: { es: "Uruguay", en: "Uruguay", pt: "Uruguai" },
  currency: "UYU",
  documentTypes: [
    { value: "CI", label: "Cédula (CI)" },
    { value: "RUT", label: "RUT" }
  ],
  documentRule: { kind: "any", minLength: 6, maxLength: 20 },
  accountLabel: { es: "Número de cuenta", en: "Account number", pt: "Número da conta" },
  accountHint: {
    es: "Número de cuenta según tu banco.",
    en: "Account number as provided by your bank.",
    pt: "Número da conta conforme seu banco."
  },
  accountRule: { kind: "any", minLength: 4, maxLength: 20 },
  requiresBranch: true,
  requiresAccountType: true,
  bankCodeMode: "list"
};

const CONFIG_BY_COUNTRY: Record<DlocalPayoutCountry, DlocalPayoutCountryConfig> = {
  AR,
  BR,
  EC,
  MX,
  PE,
  PY,
  UY
};

export function normalizePayoutCountry(code: string | null | undefined): DlocalPayoutCountry | null {
  const normalized = (code ?? "").trim().toUpperCase();
  return (DLOCAL_PAYOUT_COUNTRY_CODES as readonly string[]).includes(normalized)
    ? (normalized as DlocalPayoutCountry)
    : null;
}

export function isDlocalPayoutCountry(code: string | null | undefined): code is DlocalPayoutCountry {
  return normalizePayoutCountry(code) != null;
}

export function getDlocalPayoutCountryConfig(
  code: string | null | undefined
): DlocalPayoutCountryConfig | null {
  const country = normalizePayoutCountry(code);
  return country ? CONFIG_BY_COUNTRY[country] : null;
}

export function dlocalPayoutCurrencyForCountry(code: string | null | undefined): string | null {
  const country = normalizePayoutCountry(code);
  return country ? DLOCAL_PAYOUT_CURRENCY[country] : null;
}

/** Lista de países de cobro para poblar el selector del onboarding. */
export function dlocalPayoutCountryOptions(
  language: "es" | "en" | "pt" = "es"
): { code: DlocalPayoutCountry; label: string }[] {
  return DLOCAL_PAYOUT_COUNTRY_CODES.map((code) => ({
    code,
    label: CONFIG_BY_COUNTRY[code].countryName[language]
  }));
}

/* -------------------------------------------------------------------------- */
/* Perfil de payout + validación (compartida front/back)                       */
/* -------------------------------------------------------------------------- */

/** Datos que recopila el onboarding y que alimentan `POST /v1/payouts`. */
export type DlocalPayoutProfileInput = {
  payoutCountry: string;
  beneficiaryFirstName: string;
  beneficiaryLastName: string;
  documentType: string;
  document: string;
  bankCode: string;
  bankAccount: string;
  bankBranch?: string | null;
  accountType?: DlocalPayoutAccountType | null;
};

export type DlocalPayoutValidationError = {
  field:
    | "payoutCountry"
    | "beneficiaryFirstName"
    | "beneficiaryLastName"
    | "documentType"
    | "document"
    | "bankCode"
    | "bankAccount"
    | "bankBranch"
    | "accountType";
  code: string;
  message: string;
};

/**
 * Normaliza un valor según el tipo de campo, dejándolo listo para enviar a dLocal:
 * - `numeric`: sólo dígitos (descarta guiones/puntos/espacios de CUIT, CLABE, CCI, etc.).
 * - `alphanumeric`: sin espacios, conservando `.` y `-` (alias AR).
 * - `any`: sin espacios de los extremos.
 *
 * El onboarding debe guardar los valores YA normalizados para que el payload del payout
 * coincida con lo validado.
 */
export function normalizeDlocalField(value: string | null | undefined, kind: DlocalFieldKind): string {
  const raw = (value ?? "").trim();
  if (kind === "numeric") {
    return raw.replace(/\D/g, "");
  }
  if (kind === "alphanumeric") {
    return raw.replace(/\s+/g, "");
  }
  return raw;
}

/**
 * Elige la regla de cuenta que efectivamente matchea el valor ingresado. Para AR
 * la cuenta puede ser CBU/CVU (numérico) **o** Alias (alfanumérico); si sólo se
 * normalizara con la regla primaria (numérica), un alias perdería sus letras y
 * quedaría inválido. Esto permite aceptar cualquiera de las alternativas.
 */
export function resolveDlocalAccountRule(
  value: string | null | undefined,
  config: DlocalPayoutCountryConfig
): DlocalFieldRule {
  const raw = (value ?? "").trim();
  if (matchesRule(raw, config.accountRule)) {
    return config.accountRule;
  }
  const alternative = (config.accountRuleAlternatives ?? []).find((rule) => matchesRule(raw, rule));
  return alternative ?? config.accountRule;
}

/** Normaliza el valor de la cuenta usando la regla (primaria o alternativa) que matchea. */
export function normalizeDlocalAccountValue(
  value: string | null | undefined,
  config: DlocalPayoutCountryConfig
): string {
  return normalizeDlocalField(value, resolveDlocalAccountRule(value, config).kind);
}

function matchesRule(value: string, rule: DlocalFieldRule): boolean {
  const raw = normalizeDlocalField(value, rule.kind);
  if (rule.minLength != null && raw.length < rule.minLength) {
    return false;
  }
  if (rule.maxLength != null && raw.length > rule.maxLength) {
    return false;
  }
  if (rule.kind === "numeric") {
    return /^[0-9]+$/.test(raw);
  }
  if (rule.kind === "alphanumeric") {
    // Alfanumérico permitiendo . y - (alias AR, etc.).
    return /^[a-zA-Z0-9.\-]+$/.test(raw);
  }
  return raw.length > 0;
}

function accountMatchesAnyRule(value: string, config: DlocalPayoutCountryConfig): boolean {
  if (matchesRule(value, config.accountRule)) {
    return true;
  }
  return (config.accountRuleAlternatives ?? []).some((rule) => matchesRule(value, rule));
}

/**
 * Valida un perfil de payout contra los requisitos del país. Devuelve el primer error
 * encontrado (o `null` si está completo). Reutilizable en el frontend (deshabilitar submit)
 * y en el backend (rechazar payloads inválidos). dLocal hace la validación final del lado
 * del proveedor; esto evita viajes innecesarios y feedback tardío.
 */
export function validateDlocalPayoutProfile(
  input: Partial<DlocalPayoutProfileInput> | null | undefined
): DlocalPayoutValidationError | null {
  const country = normalizePayoutCountry(input?.payoutCountry);
  if (!country) {
    return {
      field: "payoutCountry",
      code: "payout_country_unsupported",
      message: "Elegí un país de cobro habilitado."
    };
  }
  const config = CONFIG_BY_COUNTRY[country];

  const firstName = (input?.beneficiaryFirstName ?? "").trim();
  if (firstName.length < 2) {
    return {
      field: "beneficiaryFirstName",
      code: "first_name_required",
      message: "Ingresá el nombre del titular de la cuenta."
    };
  }

  const lastName = (input?.beneficiaryLastName ?? "").trim();
  if (lastName.length < 2) {
    return {
      field: "beneficiaryLastName",
      code: "last_name_required",
      message: "Ingresá el apellido del titular de la cuenta."
    };
  }

  const documentType = (input?.documentType ?? "").trim().toUpperCase();
  if (!config.documentTypes.some((option) => option.value === documentType)) {
    return {
      field: "documentType",
      code: "document_type_invalid",
      message: "Elegí un tipo de documento válido para el país."
    };
  }

  const document = (input?.document ?? "").trim();
  if (!matchesRule(document, config.documentRule)) {
    return {
      field: "document",
      code: "document_invalid",
      message: "Revisá el número de documento fiscal."
    };
  }

  const bankCode = (input?.bankCode ?? "").trim();
  if (bankCode.length < 1) {
    return {
      field: "bankCode",
      code: "bank_code_required",
      message: "Seleccioná o ingresá el banco."
    };
  }

  const bankAccount = (input?.bankAccount ?? "").trim();
  if (!accountMatchesAnyRule(bankAccount, config)) {
    return {
      field: "bankAccount",
      code: "bank_account_invalid",
      message: "Revisá el número de cuenta bancaria."
    };
  }

  if (config.requiresBranch && (input?.bankBranch ?? "").trim().length < 1) {
    return {
      field: "bankBranch",
      code: "bank_branch_required",
      message: "Ingresá la sucursal / agencia de tu cuenta."
    };
  }

  if (config.requiresAccountType) {
    const accountType = input?.accountType;
    if (accountType !== "CHECKING" && accountType !== "SAVINGS") {
      return {
        field: "accountType",
        code: "account_type_required",
        message: "Elegí el tipo de cuenta (corriente o caja de ahorro)."
      };
    }
  }

  return null;
}

export function isDlocalPayoutProfileComplete(
  input: Partial<DlocalPayoutProfileInput> | null | undefined
): boolean {
  return validateDlocalPayoutProfile(input) == null;
}
