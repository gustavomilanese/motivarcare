/**
 * Nombre mostrado en el directorio / matching: primer nombre + inicial del apellido (privacidad).
 */
export function professionalListingDisplayName(fullName: string): string {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }
  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return parts[0];
  }
  const last = parts[parts.length - 1];
  const initial = last.charAt(0).toLocaleUpperCase();
  return `${parts[0]} ${initial}.`;
}

export function yearsExperienceFromGraduationYear(graduationYear: number): number {
  const y = new Date().getFullYear() - graduationYear;
  return Math.max(0, Math.min(80, y));
}
