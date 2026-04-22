import { joinFirstLastToFullName } from "@therapy/types";

export function professionalDisplayNameLines(professional: {
  firstName?: string;
  lastName?: string;
  fullName: string;
}): { line1: string; line2: string | null } {
  const fn = (professional.firstName ?? "").trim();
  const ln = (professional.lastName ?? "").trim();
  if (fn && ln) {
    return { line1: fn, line2: ln };
  }
  if (fn || ln) {
    return { line1: fn || ln, line2: null };
  }
  return { line1: professional.fullName, line2: null };
}

export function professionalAccessibleName(professional: {
  firstName?: string;
  lastName?: string;
  fullName: string;
}): string {
  const joined = joinFirstLastToFullName(professional.firstName ?? "", professional.lastName ?? "").trim();
  return joined || professional.fullName;
}
