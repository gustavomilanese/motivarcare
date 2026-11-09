import { apiRequest } from "../../app/services/api";

/** Abre el hilo con el profesional y deja el texto en ese chat. */
export async function postPatientProfessionalMessage(
  authToken: string,
  professionalId: string,
  body: string
): Promise<void> {
  const text = body.trim();
  if (!text) return;
  const opened = await apiRequest<{ threadId: string }>(
    `/api/chat/threads/by-professional/${professionalId}`,
    { method: "POST" },
    authToken
  );
  await apiRequest(
    `/api/chat/threads/${opened.threadId}/messages`,
    { method: "POST", body: JSON.stringify({ body: text }) },
    authToken
  );
}
