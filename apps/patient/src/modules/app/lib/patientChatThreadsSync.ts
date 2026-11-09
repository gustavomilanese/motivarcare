/**
 * Chat y el badge de Mensajes comparten `/api/chat/threads`.
 * Tras marcar leído hay que forzar un refresh fresco (sin reusar la promesa en vuelo).
 */
export const PATIENT_CHAT_THREADS_CHANGED_EVENT = "mc-patient-chat-threads-changed";

export function notifyPatientChatThreadsChanged(): void {
  try {
    window.dispatchEvent(new Event(PATIENT_CHAT_THREADS_CHANGED_EVENT));
  } catch {
    // ignore
  }
}
