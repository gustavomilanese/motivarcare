import type {
  DlocalPayoutAccountType,
  ProfessionalPayoutAdminData,
  ProfessionalPayoutBankTransferType,
  ProfessionalPayoutProvider
} from "@therapy/types";
import { dlocalPayoutBankCodes, isDlocalPayoutCountry } from "@therapy/types";
import { inferPayoutProviderFromResidencyCountry } from "./inferPayoutProvider";
import {
  legalNameLooksLikeBank,
  normalizeBankAccountValue,
  payoutFormToDlocalProfile,
  type PayoutFormFields
} from "./professionalPayoutValidation";

export function adminToPayoutFormFields(admin: ProfessionalPayoutAdminData): PayoutFormFields {
  const bank = admin.payoutBankAccount;
  const holder = bank?.accountHolderName?.trim() ?? "";
  const legal = admin.legalName?.trim() ?? "";
  const source = [holder, legal].sort((a, b) => b.split(/\s+/).filter(Boolean).length - a.split(/\s+/).filter(Boolean).length)[0] ?? "";
  const nameParts = source.split(/\s+/).filter(Boolean);
  const firstFromSource = nameParts[0] ?? "";
  const lastFromSource = nameParts.slice(1).join(" ");
  const savedFirst = (bank?.beneficiaryFirstName ?? "").trim();
  const savedLast = (bank?.beneficiaryLastName ?? "").trim();
  return {
    legalName: legal || source,
    taxId: bank?.document ?? admin.taxId ?? "",
    accountHolderName: holder || source,
    bankTransferType: bank?.transferType ?? "cbu",
    bankAccountValue: bank?.accountValue ?? admin.payoutAccount ?? "",
    bankName: bank?.bankName ?? "",
    payoutTermsAccepted: true,
    payoutCountry: bank?.payoutCountry ?? "",
    beneficiaryFirstName: savedFirst || firstFromSource,
    beneficiaryLastName: savedLast || lastFromSource,
    documentType: bank?.documentType ?? "",
    bankCode: bank?.bankCode ?? "",
    bankBranch: bank?.bankBranch ?? "",
    accountType: (bank?.accountType ?? "") as "" | DlocalPayoutAccountType
  };
}

/**
 * Construye el `ProfessionalPayoutAdminData` que se envía a `/api/professional/admin` a partir
 * de los campos del formulario de cobro. Compartido por el onboarding web y mobile para que
 * ambos persistan exactamente los mismos datos dLocal (país de cobro, banco, cuenta, etc.).
 */
export function buildPayoutAdminFromFormFields(
  provider: ProfessionalPayoutProvider,
  fields: PayoutFormFields
): ProfessionalPayoutAdminData {
  if (provider === "dlocal" && isDlocalPayoutCountry(fields.payoutCountry)) {
    const dlocal = payoutFormToDlocalProfile(fields);
    const fullName = `${dlocal.beneficiaryFirstName} ${dlocal.beneficiaryLastName}`.trim();
    return {
      taxId: dlocal.document,
      legalName: fullName,
      payoutMethod: "dlocal",
      payoutStatus: "pending_review",
      payoutSubmittedAt: new Date().toISOString(),
      payoutBankAccount: {
        transferType: fields.bankTransferType,
        accountValue: dlocal.bankAccount,
        accountHolderName: fields.accountHolderName.trim() || fullName,
        bankName: fields.bankName.trim() || null,
        payoutCountry: dlocal.payoutCountry,
        beneficiaryFirstName: dlocal.beneficiaryFirstName,
        beneficiaryLastName: dlocal.beneficiaryLastName,
        documentType: dlocal.documentType,
        document: dlocal.document,
        bankCode: dlocal.bankCode,
        bankBranch: dlocal.bankBranch ?? null,
        accountType: dlocal.accountType ?? null
      }
    };
  }

  return {
    taxId: fields.taxId.trim() || undefined,
    legalName: fields.legalName.trim(),
    payoutMethod: provider,
    payoutStatus: "pending_review",
    payoutSubmittedAt: new Date().toISOString(),
    payoutBankAccount: {
      transferType: fields.bankTransferType as ProfessionalPayoutBankTransferType,
      accountValue: normalizeBankAccountValue(fields.bankTransferType, fields.bankAccountValue),
      accountHolderName: fields.accountHolderName.trim(),
      bankName: fields.bankName.trim() || null
    }
  };
}

export function resolvePayoutEditorProvider(
  admin: ProfessionalPayoutAdminData,
  residencyCountry?: string | null
): ProfessionalPayoutProvider {
  if (admin.payoutMethod === "dlocal") {
    return "dlocal";
  }
  const transfer = admin.payoutBankAccount?.transferType;
  if (transfer === "cbu" || transfer === "cvu" || transfer === "alias") {
    return "dlocal";
  }
  if (isDlocalPayoutCountry(admin.payoutBankAccount?.payoutCountry)) {
    return "dlocal";
  }
  return inferPayoutProviderFromResidencyCountry(residencyCountry ?? "");
}

function matchBankCode(country: string, bankName: string, currentCode: string): { code: string; name: string } | null {
  if (currentCode.trim()) {
    return null;
  }
  const list = isDlocalPayoutCountry(country) ? dlocalPayoutBankCodes(country) : null;
  if (!list) {
    return null;
  }
  const n = bankName.trim().toLowerCase();
  if (!n) {
    return null;
  }
  if (country === "AR" && /mercado\s*pago|cvu/.test(n)) {
    const cvu = list.find((bank) => bank.code === "000");
    return cvu ? { code: cvu.code, name: cvu.name } : null;
  }
  const exact = list.find((bank) => bank.name.toLowerCase() === n);
  return exact ? { code: exact.code, name: exact.name } : null;
}

/** Abre el editor con país/banco dLocal ya encaminados (AR + Mercado Pago/CVU). */
export function preparePayoutBankEditorDraft(
  admin: ProfessionalPayoutAdminData,
  residencyCountry?: string | null
): ProfessionalPayoutAdminData {
  const provider = resolvePayoutEditorProvider(admin, residencyCountry);
  if (provider !== "dlocal") {
    return admin;
  }
  const fields = adminToPayoutFormFields(admin);
  if (!isDlocalPayoutCountry(fields.payoutCountry)) {
    fields.payoutCountry = isDlocalPayoutCountry(residencyCountry) ? residencyCountry : "AR";
  }
  const matched = matchBankCode(fields.payoutCountry, fields.bankName, fields.bankCode);
  if (matched) {
    fields.bankCode = matched.code;
    fields.bankName = matched.name;
  }
  if (!fields.documentType && fields.payoutCountry === "AR") {
    fields.documentType = "CUIT";
  }
  const holder = fields.accountHolderName.trim();
  if ((!fields.legalName.trim() || legalNameLooksLikeBank(fields.legalName)) && holder.length >= 3) {
    fields.legalName = holder;
  }
  const account = fields.bankAccountValue.trim();
  if (/[a-zA-Z]/.test(account) && /^[a-zA-Z0-9.]{6,20}$/.test(account)) {
    fields.bankTransferType = "alias";
  } else if (account.replace(/\D/g, "").length === 22 && fields.bankCode === "000") {
    fields.bankTransferType = "cvu";
  }
  const built = buildPayoutAdminFromFormFields("dlocal", { ...fields, payoutTermsAccepted: true });
  return {
    ...admin,
    ...built,
    payoutStatus: admin.payoutStatus,
    payoutSubmittedAt: admin.payoutSubmittedAt,
    legalAcceptedAt: admin.legalAcceptedAt,
    acceptedDocuments: admin.acceptedDocuments,
    notes: admin.notes
  };
}
