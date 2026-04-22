/**
 * Contrato JSON de visibilidad de paquetes (SystemConfig `session-packages-visibility`
 * y respuesta de `GET/PUT` admin session-packages).
 * **Cualquier cambio** implica API (Zod + rutas), backfill si hay datos viejos, y clientes que consumen el endpoint.
 */
export interface SessionPackagesVisibilityPayload {
  landing: string[];
  /** Legacy: mismos ids que portal AR cuando no había split por mercado. */
  patient: string[];
  patientByMarket: { AR: string[]; US: string[]; BR: string[]; ES: string[] };
  featuredLanding: string | null;
  featuredPatient: string | null;
  featuredPatientByMarket: { AR: string | null; US: string | null; BR: string | null; ES: string | null };
}
