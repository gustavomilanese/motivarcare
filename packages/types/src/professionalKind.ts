/**
 * Tipo de profesional (canónico en español, persistido en `professionalTitle`).
 * Ampliar aquí cuando sumemos roles (sociólogo, etc.).
 */
export const PROFESSIONAL_KIND_OPTIONS_ES = [
  "Psicólogo",
  "Psiquiatra",
  "Sexólogo",
  "Sociólogo",
  "Coach",
  "Nutricionista"
] as const;

export type ProfessionalKindEs = (typeof PROFESSIONAL_KIND_OPTIONS_ES)[number];

export const DEFAULT_PROFESSIONAL_KIND_ES: ProfessionalKindEs = "Psicólogo";

export function isKnownProfessionalKind(value: string): value is ProfessionalKindEs {
  return (PROFESSIONAL_KIND_OPTIONS_ES as readonly string[]).includes(value);
}

/** Etiqueta de tipo para listados/admin; vacío → Psicólogo (default actual). */
export function resolveProfessionalKindLabel(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return DEFAULT_PROFESSIONAL_KIND_ES;
  }
  return trimmed;
}
