/** Valor persistido = etiqueta en español (canónico). */
export const WEB_PROFESSIONAL_TITLE_OPTIONS_ES = [
  "Psicólogo",
  "Psiquiatra",
  "Sexólogo",
  "Coach",
  "Nutricionista"
] as const;

export type WebProfessionalTitleEs = (typeof WEB_PROFESSIONAL_TITLE_OPTIONS_ES)[number];
