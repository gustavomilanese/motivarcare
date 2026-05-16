/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Solo staging reviewer: `en` por defecto (ver `GOOGLE_REVIEWER_STAGING_HOSTS`). */
  readonly VITE_DEFAULT_APP_LANGUAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
