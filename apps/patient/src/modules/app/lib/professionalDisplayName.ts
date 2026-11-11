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

const TITLE_TOKEN = /^(dr|dra|lic|licda|psic|mr|mrs|ms|sr|sra)\.?$/i;

/** Nombre de pila para cards compactas (evita dos líneas / apellido). */
export function professionalFirstName(professional: {
  firstName?: string;
  lastName?: string;
  fullName: string;
}): string {
  const fn = (professional.firstName ?? "").trim();
  if (fn) {
    return fn;
  }
  const full = (professional.fullName ?? "").trim();
  if (!full) {
    return "";
  }
  return full.split(/\s+/)[0] ?? full;
}

/** Nombre de pila sin título (Dr./Lic.) para copy de UI. */
export function professionalGivenName(professional: {
  firstName?: string;
  lastName?: string;
  fullName: string;
}): string {
  const first = professionalFirstName(professional).trim();
  if (first && !TITLE_TOKEN.test(first)) {
    return first;
  }
  const parts = professionalAccessibleName(professional)
    .split(/\s+/)
    .filter((token) => token.length > 0 && !TITLE_TOKEN.test(token));
  return parts[0] || first || professionalAccessibleName(professional);
}

export function professionalAccessibleName(professional: {
  firstName?: string;
  lastName?: string;
  fullName: string;
}): string {
  const joined = joinFirstLastToFullName(professional.firstName ?? "", professional.lastName ?? "").trim();
  return joined || professional.fullName;
}
