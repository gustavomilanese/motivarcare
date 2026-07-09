import { describe, expect, it } from "vitest";
import {
  DLOCAL_PAYOUT_COUNTRY_CODES,
  dlocalPayoutCurrencyForCountry,
  getDlocalPayoutCountryConfig,
  isDlocalPayoutCountry,
  normalizePayoutCountry,
  validateDlocalPayoutProfile
} from "./dlocalPayouts.js";
import { dlocalPayoutBankCodeMode, isKnownDlocalBankCode } from "./dlocalPayoutBankCodes.js";

describe("dlocalPayouts country coverage", () => {
  it("enables exactly the confirmed payout countries", () => {
    expect([...DLOCAL_PAYOUT_COUNTRY_CODES].sort()).toEqual(["AR", "BR", "EC", "MX", "PE", "PY", "UY"]);
  });

  it("does not enable payouts for Colombia or Chile", () => {
    expect(isDlocalPayoutCountry("CO")).toBe(false);
    expect(isDlocalPayoutCountry("CL")).toBe(false);
  });

  it("normalizes lower/mixed case", () => {
    expect(normalizePayoutCountry("ar")).toBe("AR");
    expect(normalizePayoutCountry(" Mx ")).toBe("MX");
    expect(normalizePayoutCountry("xx")).toBeNull();
  });

  it("maps each country to its payout currency", () => {
    expect(dlocalPayoutCurrencyForCountry("AR")).toBe("ARS");
    expect(dlocalPayoutCurrencyForCountry("BR")).toBe("BRL");
    expect(dlocalPayoutCurrencyForCountry("EC")).toBe("USD");
    expect(dlocalPayoutCurrencyForCountry("MX")).toBe("MXN");
    expect(dlocalPayoutCurrencyForCountry("PE")).toBe("PEN");
    expect(dlocalPayoutCurrencyForCountry("PY")).toBe("PYG");
    expect(dlocalPayoutCurrencyForCountry("UY")).toBe("UYU");
  });
});

describe("bank code source", () => {
  it("uses a list for Argentina and validates against it", () => {
    expect(dlocalPayoutBankCodeMode("AR")).toBe("list");
    expect(isKnownDlocalBankCode("AR", "072")).toBe(true); // Banco Santander
    expect(isKnownDlocalBankCode("AR", "999")).toBe(false);
  });

  it("has an official bank list for every enabled payout country", () => {
    for (const code of DLOCAL_PAYOUT_COUNTRY_CODES) {
      expect(dlocalPayoutBankCodeMode(code)).toBe("list");
    }
  });

  it("validates known codes for other countries too", () => {
    expect(isKnownDlocalBankCode("BR", "341")).toBe(true); // Itaú Unibanco
    expect(isKnownDlocalBankCode("MX", "12")).toBe(true); // BBVA Bancomer
    expect(isKnownDlocalBankCode("PE", "002")).toBe(true); // BCP
    expect(isKnownDlocalBankCode("MX", "99999")).toBe(false);
  });
});

describe("validateDlocalPayoutProfile", () => {
  const validAr = {
    payoutCountry: "AR",
    beneficiaryFirstName: "Ana",
    beneficiaryLastName: "García",
    documentType: "CUIT",
    document: "20123456783",
    bankCode: "072",
    bankAccount: "0000000000000000000000" // 22 digits
  };

  it("accepts a complete Argentine CBU profile", () => {
    expect(validateDlocalPayoutProfile(validAr)).toBeNull();
  });

  it("accepts an Argentine alias account", () => {
    expect(
      validateDlocalPayoutProfile({ ...validAr, bankAccount: "ana.garcia.mp" })
    ).toBeNull();
  });

  it("rejects an unsupported payout country", () => {
    const error = validateDlocalPayoutProfile({ ...validAr, payoutCountry: "CO" });
    expect(error?.field).toBe("payoutCountry");
  });

  it("rejects a wrong document type for the country", () => {
    const error = validateDlocalPayoutProfile({ ...validAr, documentType: "CPF" });
    expect(error?.field).toBe("documentType");
  });

  it("accepts a CUIT written with dashes (normalized to digits)", () => {
    const error = validateDlocalPayoutProfile({ ...validAr, document: "20-12345678-3" });
    expect(error).toBeNull();
  });

  it("rejects a document with wrong length", () => {
    const error = validateDlocalPayoutProfile({ ...validAr, document: "123" });
    expect(error?.field).toBe("document");
  });

  it("rejects an invalid CBU length", () => {
    const error = validateDlocalPayoutProfile({ ...validAr, bankAccount: "12345" });
    expect(error?.field).toBe("bankAccount");
  });

  it("requires branch and account type for Brazil", () => {
    const base = {
      payoutCountry: "BR",
      beneficiaryFirstName: "Maria",
      beneficiaryLastName: "Silva",
      documentType: "CPF",
      document: "11144477735",
      bankCode: "341",
      bankAccount: "123456"
    };
    expect(validateDlocalPayoutProfile(base)?.field).toBe("bankBranch");
    expect(validateDlocalPayoutProfile({ ...base, bankBranch: "0001" })?.field).toBe("accountType");
    expect(
      validateDlocalPayoutProfile({ ...base, bankBranch: "0001", accountType: "CHECKING" })
    ).toBeNull();
  });

  it("validates the 18-digit CLABE for Mexico", () => {
    const base = {
      payoutCountry: "MX",
      beneficiaryFirstName: "Juan",
      beneficiaryLastName: "Pérez",
      documentType: "RFC",
      document: "XAXX010101000",
      bankCode: "012",
      bankAccount: "012180012345678901" // 18 digits
    };
    expect(validateDlocalPayoutProfile(base)).toBeNull();
    expect(validateDlocalPayoutProfile({ ...base, bankAccount: "123" })?.field).toBe("bankAccount");
  });

  it("exposes a config for every enabled country", () => {
    for (const code of DLOCAL_PAYOUT_COUNTRY_CODES) {
      const config = getDlocalPayoutCountryConfig(code);
      expect(config).not.toBeNull();
      expect(config?.documentTypes.length).toBeGreaterThan(0);
    }
  });
});
