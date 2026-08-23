import { apiBaseUrl } from "../api/apiBase";

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
