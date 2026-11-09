import { apiRequest } from "../services/api";

/** Reintenta el envío cuando el registro no pudo entregar el mail (p. ej. Resend caído). */
/** Solo existe en el API con NODE_ENV=development. El botón que lo llama se muestra en el dev server. */
export async function devSkipEmailVerification(token: string): Promise<{ ok: true } | { ok: false; raw: string }> {
  try {
    await apiRequest("/api/auth/email-verification/dev-verify", token, { method: "POST" });
    return { ok: true };
  } catch (requestError) {
    const raw = requestError instanceof Error ? requestError.message : "";
    return { ok: false, raw };
  }
}

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
