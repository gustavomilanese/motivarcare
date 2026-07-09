export class TreatmentChatError extends Error {
  constructor(
    public readonly code:
      | "FEATURE_DISABLED"
      | "NOT_ELIGIBLE"
      | "CHAT_NOT_FOUND"
      | "CHAT_ARCHIVED"
      | "DAILY_LIMIT_REACHED"
      | "SESSION_TIME_LIMIT_REACHED"
      | "MESSAGE_INVALID"
      | "PROVIDER_ERROR",
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TreatmentChatError";
  }
}
