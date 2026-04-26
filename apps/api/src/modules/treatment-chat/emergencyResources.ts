/**
 * Recursos de emergencia por país (PR-T5).
 *
 * Cuando el clasificador de seguridad detecta crisis aguda, el chat IA derivamos
 * al paciente a recursos locales en lugar de líneas internacionales que pueden
 * no aplicar. Esto se construye sobre `residencyCountry` (ISO-2) ya inyectado
 * por `loadPatientContext`.
 *
 * Política:
 * - Solo listamos números/recursos PUBLICOS, gratuitos y oficialmente reconocidos.
 *   Nada de "líneas privadas" o servicios pagos.
 * - Si no tenemos info para un país, devolvemos un fallback con orientación
 *   genérica (el LLM no inventa números — el sistema tampoco).
 * - Mantener este módulo CHICO: agregamos países a medida que el producto se
 *   expande. Hoy: AR, US, BR, ES, MX, CO, CL, UY, PE.
 */

export interface EmergencyResource {
  /** Texto descriptivo de la línea (nombre, idioma, horario si aplica). */
  label: string;
  /** Cómo contactarlo: número telefónico, URL de chat, etc. (string para flexibilidad). */
  contact: string;
}

export interface CountryEmergencyResources {
  countryCode: string;
  /** Nombre del país en español (para incluir en el mensaje). */
  countryName: string;
  resources: EmergencyResource[];
}

/**
 * Mapa estático de recursos. Datos verificados al 2026-04 desde fuentes públicas
 * (gobiernos / OMS / IASP). Documentar la fecha y revisitar 1 vez al año.
 */
const RESOURCES_BY_COUNTRY: Record<string, CountryEmergencyResources> = {
  AR: {
    countryCode: "AR",
    countryName: "Argentina",
    resources: [
      { label: "Centro de Asistencia al Suicida (24h, ES)", contact: "(011) 5275-1135 / 135" },
      { label: "Emergencias médicas", contact: "107 (SAME) / 911" }
    ]
  },
  US: {
    countryCode: "US",
    countryName: "Estados Unidos",
    resources: [
      { label: "988 Suicide & Crisis Lifeline (24h, EN/ES)", contact: "988" },
      { label: "Crisis Text Line", contact: "Text HOME to 741741" },
      { label: "Emergencias", contact: "911" }
    ]
  },
  BR: {
    countryCode: "BR",
    countryName: "Brasil",
    resources: [
      { label: "CVV - Centro de Valorização da Vida (24h, PT)", contact: "188 / chat em cvv.org.br" },
      { label: "Emergências médicas (SAMU)", contact: "192" }
    ]
  },
  ES: {
    countryCode: "ES",
    countryName: "España",
    resources: [
      { label: "Línea de Atención a la Conducta Suicida (24h, ES)", contact: "024" },
      { label: "Teléfono de la Esperanza", contact: "717 003 717" },
      { label: "Emergencias", contact: "112" }
    ]
  },
  MX: {
    countryCode: "MX",
    countryName: "México",
    resources: [
      { label: "SAPTEL - Línea de Crisis (24h, ES)", contact: "55 5259 8121" },
      { label: "Emergencias", contact: "911" }
    ]
  },
  CO: {
    countryCode: "CO",
    countryName: "Colombia",
    resources: [
      { label: "Línea 106 (Bogotá, ES)", contact: "106" },
      { label: "Emergencias", contact: "123" }
    ]
  },
  CL: {
    countryCode: "CL",
    countryName: "Chile",
    resources: [
      { label: "Salud Responde - Línea Prevención del Suicidio (24h, ES)", contact: "*4141 / 600 360 7777" },
      { label: "Emergencias", contact: "131" }
    ]
  },
  UY: {
    countryCode: "UY",
    countryName: "Uruguay",
    resources: [
      { label: "Línea Vida (24h, ES)", contact: "0800 0767 / 098 240 040" },
      { label: "Emergencias médicas", contact: "911 / 105" }
    ]
  },
  PE: {
    countryCode: "PE",
    countryName: "Perú",
    resources: [
      { label: "Línea 113 - Salud Mental (MINSA, ES)", contact: "113 (opción 5)" },
      { label: "Emergencias", contact: "105 / 106" }
    ]
  }
};

/**
 * Devuelve los recursos del país solicitado o `null` si no tenemos data.
 * El caller debe degradar a un mensaje genérico cuando esto sea null.
 */
export function getEmergencyResources(countryCode: string | null | undefined): CountryEmergencyResources | null {
  if (!countryCode) return null;
  const upper = countryCode.toUpperCase();
  return RESOURCES_BY_COUNTRY[upper] ?? null;
}

/**
 * Render del bloque de recursos como texto plano para anexar al mensaje del
 * safety alert. Mantenemos formato sin markdown para que se vea bien en el
 * chat bubble del paciente.
 */
export function renderEmergencyResourcesText(resources: CountryEmergencyResources): string {
  const lines = resources.resources.map((r) => `- ${r.label}: ${r.contact}`);
  return [`Recursos de emergencia en ${resources.countryName}:`, ...lines].join("\n");
}

/** Solo para tests. */
export const __internals = {
  RESOURCES_BY_COUNTRY
};
