import { describe, expect, it } from "vitest";
import {
  buildDlocalGoPayoutBody,
  extractDlocalPayoutNotificationId,
  isDlocalGoPayoutFailed,
  isDlocalGoPayoutSettled
} from "./dlocalGoPayouts.js";

const baseRequest = {
  transferAmount: 40500.5,
  transferCountry: "AR",
  currencyToPay: "ARS",
  beneficiaryFirstName: "Ana",
  beneficiaryLastName: "Perez",
  beneficiaryDocument: "20123456789",
  beneficiaryDocumentType: "CUIT",
  bankCode: "007",
  bankAccount: "0000003100010000000001",
  notificationUrl: "https://api.motivarcare.com/api/payouts/dlocal/webhook"
};

describe("buildDlocalGoPayoutBody", () => {
  it("sends bank data and notification_url in the same JSON", () => {
    const body = buildDlocalGoPayoutBody(baseRequest);

    expect(body.transfer_amount).toBe(40500.5);
    expect(body.transfer_country).toBe("AR");
    expect(body.currency_to_pay).toBe("ARS");
    expect(body.beneficiary_first_name).toBe("Ana");
    expect(body.bank_account).toBe("0000003100010000000001");
    expect(body.notification_url).toBe("https://api.motivarcare.com/api/payouts/dlocal/webhook");
    expect(body.purpose).toBe("OTHER_SERVICES");
    expect(body.flow_type).toBe("B2C");
  });

  it("always sends bank_account_type and bank_branch so dLocal does not return must not be null", () => {
    const cbuBody = buildDlocalGoPayoutBody(baseRequest);
    expect(cbuBody.bank_account_type).toBe("CBU");
    expect(cbuBody.bank_branch).toBe("0003");

    const aliasBody = buildDlocalGoPayoutBody({
      ...baseRequest,
      bankAccount: "giuliano.mp"
    });
    expect(aliasBody.bank_account_type).toBe("ALIAS");
    expect(aliasBody.bank_branch).toBe("0000");

    const mexicoBody = buildDlocalGoPayoutBody({
      ...baseRequest,
      transferCountry: "MX",
      currencyToPay: "MXN",
      bankAccount: "032180000118359719"
    });
    expect(mexicoBody.bank_account_type).toBe("CHECKING");
    expect(mexicoBody.bank_branch).toBe("0000");
  });

  it("keeps a stored branch and CHECKING/SAVINGS type for countries that collect them", () => {
    const body = buildDlocalGoPayoutBody({
      ...baseRequest,
      transferCountry: "BR",
      currencyToPay: "BRL",
      bankAccount: "123456",
      bankBranch: "0001",
      bankAccountType: "SAVINGS"
    });
    expect(body.bank_account_type).toBe("SAVINGS");
    expect(body.bank_branch).toBe("0001");
  });

  it("rejects a payout without notification_url", () => {
    expect(() =>
      buildDlocalGoPayoutBody({
        ...baseRequest,
        notificationUrl: "   "
      })
    ).toThrow(/notification_url/);
  });
});

describe("extractDlocalPayoutNotificationId", () => {
  it("reads payout_id from the notification JSON", () => {
    expect(extractDlocalPayoutNotificationId('{"payout_id":"PO-1"}')).toBe("PO-1");
  });

  it("reads id from a full payout notification", () => {
    expect(extractDlocalPayoutNotificationId('{"id":"PO-4-abc","status":"DELIVERED"}')).toBe("PO-4-abc");
  });

  it("reads a nested payout object", () => {
    expect(extractDlocalPayoutNotificationId('{"payout":{"payout_id":"PO-2"}}')).toBe("PO-2");
  });

  it("returns null for invalid JSON", () => {
    expect(extractDlocalPayoutNotificationId("not-json")).toBeNull();
  });
});

describe("dLocal payout status mapping", () => {
  it("treats DELIVERED and COMPLETED as paid", () => {
    expect(isDlocalGoPayoutSettled("DELIVERED")).toBe(true);
    expect(isDlocalGoPayoutSettled("COMPLETED")).toBe(true);
    expect(isDlocalGoPayoutSettled("PENDING")).toBe(false);
  });

  it("treats CANCELLED REJECTED FAILED as failed", () => {
    expect(isDlocalGoPayoutFailed("REJECTED")).toBe(true);
    expect(isDlocalGoPayoutFailed("PROCESSING")).toBe(false);
  });
});
