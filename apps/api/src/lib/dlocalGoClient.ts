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

function dlocalApiKey(): string {
  return env.DLOCALGO_API_KEY;
}

function dlocalApiSecret(): string {
  return env.DLOCALGO_API_SECRET;
}

export function isDlocalGoConfigured(): boolean {
  return Boolean(dlocalApiKey() && dlocalApiSecret());
}

function authorizationHeader(): string {
  const key = dlocalApiKey();
  const secret = dlocalApiSecret();
  if (!key || !secret) {
    throw new Error("dLocal Go not configured");
  }
  // Reject values that would make fetch() throw and leak the header into patient UI.
  if (!/^[\x20-\x7E]+$/.test(key) || !/^[\x20-\x7E]+$/.test(secret)) {
    throw new Error("dLocal Go credentials contain invalid characters. Re-paste API key/secret without quotes or line breaks.");
  }
  return `Bearer ${key}:${secret}`;
}

function apiBaseUrl(): string {
  return env.DLOCALGO_API_URL.replace(/\/+$/, "");
}

function normalizeDlocalProviderMessage(raw: string): string {
  const message = raw.trim();
  if (!message) {
    return message;
  }
  // dLocal Go is a Java/Hibernate stack; their 5xx sometimes leak SQLGrammarException
  // when the merchant credentials or environment (sandbox vs live) are wrong.
  if (
    /SQLGrammarException/i.test(message)
    || /could not extract ResultSet/i.test(message)
    || /org\.hibernate\./i.test(message)
    || /nested exception is org\.hibernate/i.test(message)
  ) {
    return "dLocal Go merchant/API credentials or environment look invalid (provider database error). Re-check DLOCALGO_API_URL (sandbox vs live) and re-paste Key/Secret from the matching dashboard.";
  }
  return message;
}

function extractDlocalGoErrorMessage(body: unknown, status: number): string {
  if (typeof body === "string" && body.trim().length > 0) {
    return normalizeDlocalProviderMessage(body);
  }
  if (typeof body === "object" && body != null) {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim().length > 0) {
      return normalizeDlocalProviderMessage(record.message);
    }
    if (typeof record.error === "string" && record.error.trim().length > 0) {
      return normalizeDlocalProviderMessage(record.error);
    }
    const payload = record.payload;
    if (typeof payload === "object" && payload != null) {
      const payloadRecord = payload as Record<string, unknown>;
      if (typeof payloadRecord.message === "string" && payloadRecord.message.trim().length > 0) {
        return normalizeDlocalProviderMessage(payloadRecord.message);
      }
    }
  }
  return `dLocal Go API error (${status})`;
}

function sanitizeOutboundDlocalError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("dLocal Go request failed");
  }
  const message = error.message;
  if (
    /Headers\.append/i.test(message)
    || /invalid header value/i.test(message)
    || /Bearer\s+\S+:\S+/i.test(message)
    || /DLOCALGO_API_/i.test(message)
  ) {
    return new Error(
      "dLocal Go credentials are invalid or contain hidden characters. Re-paste DLOCALGO_API_KEY and DLOCALGO_API_SECRET in Railway (no quotes or line breaks)."
    );
  }
  return error;
}

/**
 * Timeout máximo por request a dLocal Go. El sandbox suele responder en 1-3s, pero
 * si se cuelga no queremos que el request del paciente (p. ej. el sync post-pago)
 * quede bloqueado indefinidamente: cortamos y dejamos que reintente / caiga al webhook.
 */
const DLOCALGO_REQUEST_TIMEOUT_MS = 8000;

/**
 * Request de bajo nivel a la API de dLocal Go (auth + parseo + manejo de errores).
 * Reutilizado por payments y payouts para no duplicar la infraestructura HTTP.
 */
export async function dlocalGoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DLOCALGO_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: authorizationHeader(),
        ...(init?.headers ?? {})
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`dLocal Go API timeout after ${DLOCALGO_REQUEST_TIMEOUT_MS}ms`);
    }
    throw sanitizeOutboundDlocalError(error);
  } finally {
    clearTimeout(timeout);
  }

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
    throw new Error(extractDlocalGoErrorMessage(body, response.status));
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
  const message = `${dlocalApiKey()}${params.rawBody}`;
  const computed = createHmac("sha256", dlocalApiSecret()).update(message, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(expectedHex, "utf8"));
  } catch {
    return false;
  }
}
