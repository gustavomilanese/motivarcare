/**
 * Convención: nombre(s) en `firstName`, apellido(s) en `lastName`.
 * `fullName` en BD es el join para búsquedas y compatibilidad.
 *
 * Listado público (directorio / matching): primer token del nombre + inicial del último token del apellido — p. ej. "María L." para "María" + "García López".
 */

export function splitFullNameToFirstLast(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) {
    return { firstName: trimmed, lastName: "" };
  }
  return {
    firstName: trimmed.slice(0, spaceIdx).trim(),
    lastName: trimmed.slice(spaceIdx + 1).trim()
  };
}

/**
 * Usa `firstName`/`lastName` persistidos; si ambos vacíos, deriva desde `fullName` (compat. con cuentas viejas).
 */
export function resolvedFirstLastFromUserRecord(params: {
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
}): { firstName: string; lastName: string } {
  const fn = (params.firstName ?? "").trim();
  const ln = (params.lastName ?? "").trim();
  if (fn || ln) {
    return { firstName: fn, lastName: ln };
  }
  return splitFullNameToFirstLast(params.fullName ?? "");
}

export function joinFirstLastToFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(" ").trim();
}

/** Deriva nombre + apellido desde un solo string y normaliza `fullName`. */
export function userNamePartsFromFullNameString(fullName: string): {
  fullName: string;
  firstName: string;
  lastName: string;
} {
  const { firstName, lastName } = splitFullNameToFirstLast(fullName.trim());
  return {
    firstName,
    lastName,
    fullName: joinFirstLastToFullName(firstName, lastName)
  };
}

/**
 * Texto del directorio / tarjetas de matching ("Juan P.").
 * Si hay `firstName`/`lastName` estructurados, usa eso; si no, parsea `fullNameLegacy`.
 */
export function professionalPublicListingLabel(params: {
  firstName?: string | null;
  lastName?: string | null;
  fullNameLegacy?: string | null;
}): string {
  const fn = (params.firstName ?? "").trim();
  const ln = (params.lastName ?? "").trim().replace(/\s+/g, " ");
  if (fn || ln) {
    return listingFromFirstLastTokens(fn, ln);
  }
  return professionalListingFromFullNameOnly((params.fullNameLegacy ?? "").trim());
}

function listingFromFirstLastTokens(firstName: string, lastName: string): string {
  const fRaw = firstName.replace(/\s+/g, " ").trim();
  const lRaw = lastName.replace(/\s+/g, " ").trim();
  if (!fRaw && !lRaw) {
    return "";
  }
  if (!lRaw) {
    const tok = fRaw.split(" ")[0] ?? fRaw;
    return tok;
  }
  const firstToken = (fRaw.split(" ")[0] ?? "").trim();
  const lastParts = lRaw.split(" ").filter(Boolean);
  const lastToken = lastParts[lastParts.length - 1] ?? "";
  const initial = lastToken.charAt(0).toLocaleUpperCase();
  if (!firstToken) {
    return initial ? `${initial}.` : lRaw;
  }
  return `${firstToken} ${initial}.`;
}

/** Compatibilidad: mismo algoritmo que antes sobre un solo string. */
export function professionalListingFromFullNameOnly(fullName: string): string {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }
  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return parts[0] ?? "";
  }
  const last = parts[parts.length - 1] ?? "";
  const initial = last.charAt(0).toLocaleUpperCase();
  return `${parts[0]} ${initial}.`;
}

/**
 * Iniciales para avatar: primer carácter del primer token del nombre + primer carácter del último token del apellido.
 */
export function avatarInitialsFromNameParts(
  firstName: string,
  lastName: string,
  fullNameFallback: string
): string {
  const f = firstName.trim();
  const l = lastName.trim();
  if (f || l) {
    const firstTok = (f.split(/\s+/)[0] ?? "")[0];
    const lastSeg = l.split(/\s+/).filter(Boolean).pop() ?? "";
    const a = (firstTok ?? "?").toUpperCase();
    const b = (lastSeg[0] ?? "").toUpperCase();
    return b ? `${a}${b}` : a;
  }
  const parts = fullNameFallback.trim().split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "?").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  return b ? `${a}${b}` : a;
}
