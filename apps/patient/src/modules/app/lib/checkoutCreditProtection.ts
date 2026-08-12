/**
 * Evita que un portal-sync en vuelo (profiles/me pre-fulfill) pise a 0 los créditos
 * recién acreditados al volver de dLocal. Ventana corta post-compra.
 */
let protectCreditsUntilMs = 0;

export function armCheckoutCreditProtection(durationMs = 20_000): void {
  protectCreditsUntilMs = Math.max(protectCreditsUntilMs, Date.now() + durationMs);
}

export function isCheckoutCreditProtectionActive(): boolean {
  return Date.now() < protectCreditsUntilMs;
}

/** Solo tests / reset explícito. */
export function clearCheckoutCreditProtection(): void {
  protectCreditsUntilMs = 0;
}
