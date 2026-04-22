/**
 * Re-exporta lógica compartida (@therapy/types) para el listado de profesionales.
 */
export {
  professionalListingFromFullNameOnly as professionalListingDisplayName,
  professionalPublicListingLabel,
  resolvedFirstLastFromUserRecord
} from "@therapy/types";

export function yearsExperienceFromGraduationYear(graduationYear: number): number {
  const y = new Date().getFullYear() - graduationYear;
  return Math.max(0, Math.min(80, y));
}
