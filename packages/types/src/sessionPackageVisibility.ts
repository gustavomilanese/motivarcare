/**
 * Contrato JSON de visibilidad de paquetes (SystemConfig `session-packages-visibility`
 * y respuesta de `GET/PUT` admin session-packages).
 * **Cualquier cambio** implica API (Zod + rutas), backfill si hay datos viejos, y clientes que consumen el endpoint.
 *
 * `landing` conserva el nombre histórico: **landing paciente principal** (v1 / sitio clásico).
 * Las otras listas son slots independientes (máx. 3 ids cada una, orden = orden del array).
 */
export type LandingPackagesSlotId = "patient_main" | "patient_v2" | "professional";

export interface SessionPackagesVisibilityPayload {
  /** Landing paciente principal (legacy; mismo significado que el único `landing` antes de slots). */
  landing: string[];
  /** Paquetes visibles en la landing paciente v2 (p. ej. `patient-landing-v2`). */
  landingPatientV2: string[];
  /** Landing de profesionales: en producción suele quedar vacío (no vender packs ahí). */
  landingProfessional: string[];
  /** Legacy: mismos ids que portal AR cuando no había split por mercado. */
  patient: string[];
  patientByMarket: { AR: string[]; US: string[]; BR: string[]; ES: string[] };
  featuredLanding: string | null;
  featuredLandingPatientV2: string | null;
  featuredLandingProfessional: string | null;
  featuredPatient: string | null;
  featuredPatientByMarket: { AR: string | null; US: string | null; BR: string | null; ES: string | null };
}
