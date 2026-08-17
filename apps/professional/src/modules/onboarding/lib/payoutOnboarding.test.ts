import { describe, expect, it } from "vitest";
import { buildPayoutAdminFromFormFields, adminToPayoutFormFields } from "./buildPayoutAdminFromFormFields";
import { fiscalIdHintForCountry } from "./fiscalIdByCountry";
import { inferPayoutProviderFromResidencyCountry } from "./inferPayoutProvider";
import {
  defaultBankTransferType,
  isPayoutFormComplete,
  isValidBankAccount,
  isValidTaxId,
  normalizeBankAccountValue,
  normalizeTaxId,
  payoutValidationMessage,
  type PayoutFormFields
} from "./professionalPayoutValidation";

const stripeFields = (overrides: Partial<PayoutFormFields> = {}): PayoutFormFields => ({
  legalName: "Ana Perez",
  taxId: "AB1234567",
  accountHolderName: "Ana Perez",
  bankTransferType: "iban",
  bankAccountValue: "DE89370400440532013000",
  bankName: "Deutsche Bank",
  payoutTermsAccepted: true,
  payoutCountry: "",
  beneficiaryFirstName: "",
  beneficiaryLastName: "",
  documentType: "",
  bankCode: "",
  bankBranch: "",
  accountType: "",
  ...overrides
});

describe("inferPayoutProviderFromResidencyCountry", () => {
  it("routes LatAm to dLocal and the rest to Stripe", () => {
    expect(inferPayoutProviderFromResidencyCountry("AR")).toBe("dlocal");
    expect(inferPayoutProviderFromResidencyCountry("uy")).toBe("dlocal");
    expect(inferPayoutProviderFromResidencyCountry("US")).toBe("stripe");
    expect(inferPayoutProviderFromResidencyCountry("ES")).toBe("stripe");
  });
});

describe("fiscalIdHintForCountry", () => {
  it("returns local document names for known countries", () => {
    expect(fiscalIdHintForCountry("AR", "es").label).toContain("CUIT");
    expect(fiscalIdHintForCountry("MX", "es").label).toContain("RFC");
    expect(fiscalIdHintForCountry("ZZ", "es").label).toContain("identificación fiscal");
  });
});

describe("professionalPayoutValidation", () => {
  it("normalizes tax ids and bank values", () => {
    expect(normalizeTaxId("20-12345678-9")).toBe("20123456789");
    expect(normalizeBankAccountValue("cbu", "123 456")).toBe("123456");
    expect(normalizeBankAccountValue("alias", "Mi.Alias")).toBe("mi.alias");
    expect(defaultBankTransferType("dlocal")).toBe("cbu");
    expect(defaultBankTransferType("stripe")).toBe("iban");
  });

  it("accepts a complete Stripe payout form", () => {
    expect(isValidTaxId("stripe", "AB1234567")).toBe(true);
    expect(isValidBankAccount("stripe", "iban", "DE89370400440532013000")).toBe(true);
    expect(isPayoutFormComplete("stripe", stripeFields(), true)).toBe(true);
    expect(payoutValidationMessage("stripe", stripeFields(), "es")).toBeNull();
  });

  it("rejects incomplete Stripe payout data", () => {
    expect(isPayoutFormComplete("stripe", stripeFields({ legalName: "A" }), true)).toBe(false);
    expect(payoutValidationMessage("stripe", stripeFields({ legalName: "A" }), "es")).toContain("nombre legal");
    expect(isPayoutFormComplete("stripe", stripeFields(), false)).toBe(false);
  });

  it("requires a dLocal payout country before completeness", () => {
    expect(isPayoutFormComplete("dlocal", stripeFields({ payoutCountry: "" }), true)).toBe(false);
    expect(payoutValidationMessage("dlocal", stripeFields({ payoutCountry: "" }), "es")).toContain("país");
  });
});

describe("buildPayoutAdminFromFormFields", () => {
  it("maps Stripe fields to pending_review admin payload", () => {
    const admin = buildPayoutAdminFromFormFields("stripe", stripeFields());
    expect(admin.payoutMethod).toBe("stripe");
    expect(admin.payoutStatus).toBe("pending_review");
    expect(admin.payoutBankAccount?.accountValue).toBe("DE89370400440532013000");
    expect(adminToPayoutFormFields(admin).legalName).toBe("Ana Perez");
  });
});
