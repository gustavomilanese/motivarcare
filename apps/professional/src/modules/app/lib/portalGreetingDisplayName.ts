import { joinFirstLastToFullName } from "@therapy/types";

function emailLocalPartLower(email: string): string {
  return email.trim().split("@")[0]?.trim().toLowerCase() ?? "";
}

/** Local-part “técnico” (cuenta de prueba, etc.): no confundir con nombre = email tipo maria@. */
function looksLikeTechnicalEmailLocal(localLower: string): boolean {
  return (
    localLower.includes(".") ||
    localLower.includes("+") ||
    localLower.includes("_") ||
    /\d/.test(localLower) ||
    localLower.length >= 18
  );
}

/**
 * True si `name` coincide con la parte local del mail **y** esa parte parece técnica (p. ej. motivarcare.test.pro).
 * Si alguien se llama como su local simple ("maria" / "maria@..."), no lo tratamos como placeholder.
 */
function looksLikeEmailLocalPlaceholderName(email: string, name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n || n.includes("@")) {
    return true;
  }
  const local = emailLocalPartLower(email);
  if (n !== local) {
    return false;
  }
  return looksLikeTechnicalEmailLocal(local);
}

/**
 * Nombre para saludos del portal (header). Evita mostrar la parte local del email como si fuera nombre.
 */
export function professionalPortalGreetingDisplayName(user: {
  email: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const fromParts = joinFirstLastToFullName(user.firstName ?? "", user.lastName ?? "").trim();
  if (fromParts.length >= 2 && !looksLikeEmailLocalPlaceholderName(user.email, fromParts)) {
    return fromParts;
  }
  const fn = user.fullName.trim();
  if (fn.length >= 2 && !looksLikeEmailLocalPlaceholderName(user.email, fn)) {
    return fn;
  }
  return "";
}
