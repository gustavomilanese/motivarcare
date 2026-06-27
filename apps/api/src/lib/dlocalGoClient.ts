import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export type DlocalGoPaymentStatus = "PENDING" | "PAID" | "COMPLETED" | "REJECTED" | "CANCELLED" | string;

export type DlocalGoPayment = {
  id: string;
  amount: number;
  currency: string;
  country?: string | null;
  status: DlocalGoPaymentStatus;
  order_id?: string | null;
  redirect_url?: string | null;
  merchant_checkout_token?: string | null;
  description?: string | null;
};

export function isDlocalGoConfigured(): boolean {
  return Boolean(env.DLOCALGO_API_KEY.trim() && env.DLOCALGO_API_SECRET.trim());
}

function authorizationHeader(): string {
  return `Bearer ${env.DLOCALGO_API_KEY}:${env.DLOCALGO_API_SECRET}`;
}

function apiBaseUrl(): string {
  return env.DLOCALGO_API_URL.replace(/\/+$/, "");
}

async function dlocalGoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authorizationHeader(),
      ...(init?.headers ?? {})
    }
  });

  const text = await response.text();
  let body: unknown = null;
  if (text.trim().length > 0) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === "object" && body != null && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `dLocal Go API error (${response.status})`;
    throw new Error(message);
  }

  return body as T;
}

export async function createDlocalGoPayment(params: {
  amount: number;
  currency: string;
  country: string;
  orderId: string;
  description: string;
  notificationUrl: string;
  successUrl: string;
  backUrl: string;
  payer?: {
    name?: string | null;
    email?: string | null;
  };
}): Promise<DlocalGoPayment> {
  return dlocalGoRequest<DlocalGoPayment>("/v1/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      country: params.country,
      order_id: params.orderId,
      description: params.description.slice(0, 100),
      notification_url: params.notificationUrl,
      success_url: params.successUrl,
      back_url: params.backUrl,
      payer: params.payer?.email || params.payer?.name
        ? {
            name: params.payer.name ?? undefined,
            email: params.payer.email ?? undefined
          }
        : undefined
    })
  });
}

export async function getDlocalGoPayment(paymentId: string): Promise<DlocalGoPayment> {
  return dlocalGoRequest<DlocalGoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
}

export function isDlocalGoPaymentPaid(status: DlocalGoPaymentStatus): boolean {
  const normalized = String(status).trim().toUpperCase();
  return normalized === "PAID" || normalized === "COMPLETED" || normalized === "APPROVED";
}

export function verifyDlocalGoNotificationSignature(params: {
  authorizationHeader: string | null | undefined;
  rawBody: string;
}): boolean {
  const header = params.authorizationHeader?.trim() ?? "";
  const match = /^V2-HMAC-SHA256,\s*Signature:\s*([a-f0-9]+)$/i.exec(header);
  if (!match) {
    return false;
  }

  const expectedHex = match[1].toLowerCase();
  const message = `${env.DLOCALGO_API_KEY}${params.rawBody}`;
  const computed = createHmac("sha256", env.DLOCALGO_API_SECRET).update(message, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(expectedHex, "utf8"));
  } catch {
    return false;
  }
}
