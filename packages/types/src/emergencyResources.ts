export interface EmergencyResource {
  label: string;
  contact: string;
}

export interface CountryEmergencyResources {
  countryCode: string;
  countryName: string;
  resources: EmergencyResource[];
}

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

export function getEmergencyResources(countryCode: string | null | undefined): CountryEmergencyResources | null {
  if (!countryCode) {
    return null;
  }
  const upper = countryCode.toUpperCase();
  return RESOURCES_BY_COUNTRY[upper] ?? null;
}

export function renderEmergencyResourcesText(resources: CountryEmergencyResources): string {
  const lines = resources.resources.map((resource) => `- ${resource.label}: ${resource.contact}`);
  return [`Recursos de emergencia en ${resources.countryName}:`, ...lines].join("\n");
}

/** Solo para tests. */
export const __emergencyResourcesInternals = {
  RESOURCES_BY_COUNTRY
};
