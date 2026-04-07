import { env } from "../config/env.js";

function trimTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function parseConfigBase(): URL | null {
  const raw = trimTrailingSlashes(env.API_PUBLIC_URL.trim());
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

/**
 * URL que el navegador puede cargar (p. ej. desde Vercel) para archivos servidos por este API.
 * Usa `API_PUBLIC_URL` en Railway/producción — si sigue en localhost, las imágenes seguirán rotas en prod.
 */
export function absolutePublicAssetUrl(stored: string | null | undefined): string | null {
  const s = typeof stored === "string" ? stored.trim() : "";
  if (!s) {
    return null;
  }
  if (s.startsWith("data:")) {
    return s;
  }

  const baseParsed = parseConfigBase();
  if (!baseParsed) {
    return s;
  }

  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const u = new URL(s);
      if (!isLoopbackHostname(u.hostname)) {
        return s;
      }
      if (isLoopbackHostname(baseParsed.hostname)) {
        return s;
      }
      return `${baseParsed.origin}${u.pathname}${u.search}${u.hash}`;
    } catch {
      return s;
    }
  }

  const path = s.startsWith("/") ? s : `/${s}`;
  return `${baseParsed.origin}${path}`;
}
