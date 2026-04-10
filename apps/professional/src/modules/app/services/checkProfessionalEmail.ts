import { API_BASE } from "./api";

/** `true` si el email puede usarse para un registro nuevo (no existe usuario con ese email). */
export async function checkProfessionalEmailAvailable(email: string): Promise<boolean> {
  const base = API_BASE.replace(/\/$/, "");
  const qs = new URLSearchParams({ email: email.trim().toLowerCase() });
  const path = `/api/public/check-email?${qs.toString()}`;
  const url = base ? `${base}${path}` : path;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error("check failed");
  }
  const data = (await response.json()) as { available: boolean };
  return data.available === true;
}
