import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = 4000;

function trimTrailingSlash(u: string): string {
  return u.replace(/\/$/, "");
}

/** Parsea host desde hostUri / debuggerHost (ej. 192.168.0.12:8190 o exp://192.168.0.12:8081). */
function hostFromPackagerUri(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    if (s.includes("://")) {
      const hostname = new URL(s).hostname;
      return hostname || null;
    }
    const idx = s.lastIndexOf(":");
    if (idx > 0 && /^\d+$/.test(s.slice(idx + 1))) {
      return s.slice(0, idx);
    }
    return s;
  } catch {
    return null;
  }
}

function expoPackagerSource(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return hostUri;
  const go = Constants.expoGoConfig as { debuggerHost?: string } | null;
  if (go?.debuggerHost) return go.debuggerHost;
  const legacy = Constants.manifest as { debuggerHost?: string } | null;
  return legacy?.debuggerHost ?? null;
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/** URL base del API. Respeta EXPO_PUBLIC_API_URL; en dev en nativo, infiere la máquina desde Metro. */
export function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return trimTrailingSlash(fromEnv);
  }

  if (Platform.OS === "web") {
    return `http://localhost:${API_PORT}`;
  }

  if (!__DEV__) {
    return `http://localhost:${API_PORT}`;
  }

  const raw = expoPackagerSource();
  const host = raw ? hostFromPackagerUri(raw) : null;

  if (host && !isLoopbackHost(host)) {
    return `http://${host}:${API_PORT}`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

export const apiBaseUrl = resolveApiBaseUrl();
