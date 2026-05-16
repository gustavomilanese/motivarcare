/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly API_PUBLIC_URL?: string;
  readonly VITE_CANONICAL_PATIENT_ORIGIN?: string;
  readonly VITE_LEGACY_PATIENT_HOSTS?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Staging / reviewer: `en` por defecto si no hay `?lang=` ni preferencia (ver `patientPortalDefaultLanguage`). */
  readonly VITE_DEFAULT_APP_LANGUAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
