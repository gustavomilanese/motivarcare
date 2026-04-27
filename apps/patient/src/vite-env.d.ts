/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly API_PUBLIC_URL?: string;
  readonly VITE_CANONICAL_PATIENT_ORIGIN?: string;
  readonly VITE_LEGACY_PATIENT_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
