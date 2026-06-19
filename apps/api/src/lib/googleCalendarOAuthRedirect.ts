export const PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN = "https://api.motivarcare.com";

const FRONTEND_APP_HOSTS = new Set([
  "app.motivarcare.com",
  "pro.motivarcare.com",
  "admin.motivarcare.com",
  "www.motivarcare.com",
  "motivarcare.com"
]);

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function pickPublicApiOriginForGoogleOAuth(params: {
  nodeEnv: string;
  baseUrl: string;
}): string {
  const base = trimTrailingSlash(params.baseUrl.trim() || "http://localhost:4000");

  if (params.nodeEnv !== "production") {
    return base;
  }

  try {
    const host = new URL(base).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith("railway.app")) {
      return PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN;
    }
    if (FRONTEND_APP_HOSTS.has(host)) {
      return PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN;
    }
  } catch {
    return PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN;
  }

  return base;
}

function rewriteFrontendHostToApiOrigin(nodeEnv: string, uri: string): string {
  if (nodeEnv !== "production") {
    return uri;
  }

  try {
    const url = new URL(uri);
    if (FRONTEND_APP_HOSTS.has(url.hostname) || url.hostname.endsWith("railway.app")) {
      const apiOrigin = new URL(PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN);
      url.protocol = apiOrigin.protocol;
      url.host = apiOrigin.host;
      return url.toString();
    }
  } catch {
    // ignore malformed URI
  }

  return uri;
}

export function resolveGoogleCalendarOauthRedirectUri(params: {
  nodeEnv: string;
  explicitRedirectUri: string;
  baseUrl: string;
}): string {
  const explicit = params.explicitRedirectUri.trim();
  if (explicit.length > 0) {
    return rewriteFrontendHostToApiOrigin(params.nodeEnv, explicit);
  }

  return `${pickPublicApiOriginForGoogleOAuth({
    nodeEnv: params.nodeEnv,
    baseUrl: params.baseUrl
  })}/api/auth/google/calendar/callback`;
}

export function resolveGoogleCalendarOAuthFailureReason(error: unknown): string {
  const code = extractGoogleOAuthErrorCode(error);
  if (code) {
    return code;
  }

  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/redirect_uri_mismatch/i.test(message)) {
    return "redirect_uri_mismatch";
  }
  if (/invalid_client/i.test(message)) {
    return "invalid_client";
  }
  if (/invalid_grant/i.test(message)) {
    return "invalid_grant";
  }
  if (/unauthorized_client/i.test(message)) {
    return "unauthorized_client";
  }

  return "oauth_exchange_failed";
}

function extractGoogleOAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const err = error as {
    response?: { data?: unknown };
    message?: string;
  };

  const data = err.response?.data;
  if (data && typeof data === "object" && "error" in data) {
    const oauthCode = (data as { error?: unknown }).error;
    if (typeof oauthCode === "string" && oauthCode.trim().length > 0) {
      return oauthCode.trim();
    }
  }

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as { error?: string };
      if (typeof parsed.error === "string" && parsed.error.trim().length > 0) {
        return parsed.error.trim();
      }
    } catch {
      // ignore
    }
  }

  const message = err.message ?? "";
  for (const known of [
    "redirect_uri_mismatch",
    "invalid_client",
    "invalid_grant",
    "unauthorized_client"
  ]) {
    if (message.includes(known)) {
      return known;
    }
  }

  return null;
}
