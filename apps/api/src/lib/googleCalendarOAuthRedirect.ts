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
  const payload = error as {
    response?: { data?: { error?: string } };
    message?: string;
  };
  const code = payload.response?.data?.error?.trim();
  if (code === "redirect_uri_mismatch" || code === "invalid_client" || code === "invalid_grant") {
    return code;
  }

  const message = payload.message ?? "";
  if (/redirect_uri_mismatch/i.test(message)) {
    return "redirect_uri_mismatch";
  }
  if (/invalid_client/i.test(message)) {
    return "invalid_client";
  }
  if (/invalid_grant/i.test(message)) {
    return "invalid_grant";
  }

  return "oauth_exchange_failed";
}
