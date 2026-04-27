/**
 * Orígenes de navegador que siempre tratamos como confiables para CORS y para
 * devolver OAuth de Google Calendar al mismo SPA (clientOrigin).
 *
 * Mantener alineado con dominios MotivarCare en prod; previews Vercel siguen entrando por CORS_ORIGINS / *_APP_URL.
 */
export const DEFAULT_TRUSTED_BROWSER_ORIGINS: readonly string[] = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://motivarcare-patient.vercel.app",
  "https://app.motivarcare.com",
  "https://pro.motivarcare.com"
];
