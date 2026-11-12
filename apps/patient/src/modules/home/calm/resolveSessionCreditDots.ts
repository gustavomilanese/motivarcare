/** Estados de círculo del DS (créditos): tomada · reservada · disponible. */
export type SessionCreditDot = "taken" | "reserved" | "free";

/**
 * Misma lectura que el HTML del DS:
 * - tomada (`usada`): crédito ya consumido en sesión pasada
 * - reservada (salvia sólida): crédito gastado en una próxima reserva
 * - disponible (`libre`): crédito aún libre para reservar
 */
export function resolveSessionCreditDots(input: {
  available: number;
  packageSize: number;
  reserved: number;
}): SessionCreditDot[] {
  const free = Math.max(0, Math.floor(input.available));
  const pack = Math.max(0, Math.floor(input.packageSize));
  const total = Math.max(pack, free);
  if (total <= 0) return [];

  const spent = Math.max(0, total - free);
  const reserved = Math.min(Math.max(0, Math.floor(input.reserved)), spent);
  const taken = spent - reserved;

  return [
    ...Array.from({ length: taken }, () => "taken" as const),
    ...Array.from({ length: reserved }, () => "reserved" as const),
    ...Array.from({ length: free }, () => "free" as const)
  ];
}
