import { env } from "../config/env.js";

const RESEND_API_URL = "https://api.resend.com/emails";

export type ResendTag = { name: string; value: string };

export type SendResendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: ResendTag[];
};

/**
 * Envío transaccional vía Resend (un solo lugar para URL, headers y manejo de error).
 * Requiere `RESEND_API_KEY` y `EMAIL_FROM` en env.
 */
export async function sendResendEmail(params: SendResendEmailParams): Promise<void> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const body: Record<string, unknown> = {
    from: env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html
  };
  if (params.text) {
    body.text = params.text;
  }
  if (params.tags && params.tags.length > 0) {
    body.tags = params.tags;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Resend HTTP ${response.status}`);
  }
}
