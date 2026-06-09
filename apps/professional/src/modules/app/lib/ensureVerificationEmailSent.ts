import { apiRequest } from "../services/api";

/** Reintenta el envío cuando el registro no pudo entregar el mail (p. ej. Resend caído). */
export async function resendVerificationEmail(token: string): Promise<{ ok: true; message: string } | { ok: false; raw: string }> {
  try {
    const response = await apiRequest<{ message: string }>("/api/auth/email-verification/resend", token, {
      method: "POST"
    });
    return { ok: true, message: response.message };
  } catch (requestError) {
    const raw = requestError instanceof Error ? requestError.message : "";
    return { ok: false, raw };
  }
}
