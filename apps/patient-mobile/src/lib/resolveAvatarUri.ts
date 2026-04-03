import { apiBaseUrl } from "../api/apiBase";

/**
 * El seed puede guardar rutas bajo el API (`/api/public/...`) para que la imagen salga del mismo
 * host/puerto que ya alcanza el dispositivo (LAN). Las URLs `https://...` se dejan igual.
 */
export function resolveAvatarUri(uri: string | null | undefined): string | null {
  const s = (uri ?? "").trim();
  if (!s) {
    return null;
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  const base = apiBaseUrl.replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
}
