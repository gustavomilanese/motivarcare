/** Sesiones listas para reservar: créditos de paquete + prueba pagada reagendable. */
export function countAvailablePatientSessions(params: {
  creditsRemaining: number;
  trialRebookAvailable?: boolean;
}): number {
  const packageCredits = Math.max(0, Number(params.creditsRemaining) || 0);
  const trialCredit = params.trialRebookAvailable ? 1 : 0;
  return packageCredits + trialCredit;
}
