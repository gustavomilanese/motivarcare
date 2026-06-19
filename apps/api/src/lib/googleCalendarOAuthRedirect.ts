import { google } from "googleapis";

export const PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN = "https://api.motivarcare.com";

const GOOGLE_OAUTH_CREDENTIAL_PROBE_CODE = "motivarcare-invalid-probe-code";

/** Railway a veces pega el secret con comillas o saltos de línea; Google rechaza con invalid_client. */
export function normalizeGoogleOAuthClientId(raw: string): string {
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

export function normalizeGoogleOAuthClientSecret(raw: string): string {
  return raw.trim().replace(/^['"]|['"]$/g, "").replace(/\r?\n/g, "");
}

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
  if (params.nodeEnv === "production") {
    return `${PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN}/api/auth/google/calendar/callback`;
  }

  const explicit = params.explicitRedirectUri.trim();
  if (explicit.length > 0) {
    return rewriteFrontendHostToApiOrigin(params.nodeEnv, explicit);
  }

  return `${pickPublicApiOriginForGoogleOAuth({
    nodeEnv: params.nodeEnv,
    baseUrl: params.baseUrl
  })}/api/auth/google/calendar/callback`;
}

export function describeGoogleCalendarOauthRuntime(params: {
  nodeEnv: string;
  clientId: string;
  clientSecret: string;
  explicitRedirectUri: string;
  baseUrl: string;
}): {
  redirectUri: string;
  clientId: string;
  clientSecretConfigured: boolean;
} {
  return {
    redirectUri: resolveGoogleCalendarOauthRedirectUri({
      nodeEnv: params.nodeEnv,
      explicitRedirectUri: params.explicitRedirectUri,
      baseUrl: params.baseUrl
    }),
    clientId: normalizeGoogleOAuthClientId(params.clientId),
    clientSecretConfigured: normalizeGoogleOAuthClientSecret(params.clientSecret).length > 0
  };
}

export function createGoogleCalendarOAuth2Client(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  return new google.auth.OAuth2(
    normalizeGoogleOAuthClientId(params.clientId),
    normalizeGoogleOAuthClientSecret(params.clientSecret),
    params.redirectUri
  );
}

export type GoogleOAuthCredentialProbeResult =
  | { ok: true }
  | { ok: false; reason: string; description?: string };

export type GoogleOAuthExchangedTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readTransportErrorSignals(error: unknown): { message: string; code: string } {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  let message = "";
  let code = "";

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (typeof current === "string") {
      message += ` ${current}`;
      continue;
    }
    if (!(current instanceof Error) && (typeof current !== "object" || current === null)) {
      continue;
    }

    const record = current as { message?: unknown; code?: unknown; cause?: unknown; error?: unknown };
    if (typeof record.message === "string") {
      message += ` ${record.message}`;
    }
    if (typeof record.code === "string" || typeof record.code === "number") {
      code += ` ${String(record.code)}`;
    }
    if (record.cause) {
      queue.push(record.cause);
    }
    if (record.error) {
      queue.push(record.error);
    }
  }

  return { message: message.trim(), code: code.trim() };
}

/** Gaxios/node-fetch a veces corta la respuesta gzip desde Railway → `Premature close`. */
export function isTransientGoogleOAuthTransportError(error: unknown): boolean {
  const { message, code } = readTransportErrorSignals(error);
  const haystack = `${message} ${code}`.toLowerCase();
  return (
    haystack.includes("premature close")
    || haystack.includes("err_stream_premature_close")
    || haystack.includes("econnreset")
    || haystack.includes("etimedout")
    || haystack.includes("socket hang up")
    || haystack.includes("network")
  );
}

function buildGoogleOAuthTransportError(error: unknown): Error {
  const wrapped = new Error("Google OAuth token endpoint closed the connection before completing the response");
  (wrapped as { cause?: unknown }).cause = error;
  (wrapped as { code?: string }).code = "ERR_STREAM_PREMATURE_CLOSE";
  return wrapped;
}

function throwGoogleOAuthTokenHttpError(status: number, payload: Record<string, unknown>): never {
  const err = new Error(
    typeof payload.error_description === "string"
      ? payload.error_description
      : typeof payload.error === "string"
        ? payload.error
        : `Google token exchange failed (${status})`
  );
  (err as { response?: { data?: unknown } }).response = { data: payload };
  throw err;
}

async function exchangeGoogleAuthorizationCodeOnce(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<GoogleOAuthExchangedTokens> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code"
  });

  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        /** Evita gzip: origen habitual del `Premature close` con gaxios en Railway. */
        "Accept-Encoding": "identity"
      },
      body: body.toString()
    });
  } catch (fetchError) {
    throw fetchError;
  }

  const raw = await response.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Google token endpoint returned non-JSON (${response.status}): ${raw.slice(0, 200)}`);
  }

  if (!response.ok) {
    throwGoogleOAuthTokenHttpError(response.status, parsed);
  }

  const expiresInRaw = parsed.expires_in;
  const expiresIn =
    typeof expiresInRaw === "number"
      ? expiresInRaw
      : typeof expiresInRaw === "string"
        ? Number.parseInt(expiresInRaw, 10)
        : Number.NaN;

  return {
    access_token: typeof parsed.access_token === "string" ? parsed.access_token : null,
    refresh_token: typeof parsed.refresh_token === "string" ? parsed.refresh_token : null,
    scope: typeof parsed.scope === "string" ? parsed.scope : null,
    token_type: typeof parsed.token_type === "string" ? parsed.token_type : null,
    expiry_date: Number.isFinite(expiresIn) ? Date.now() + expiresIn * 1000 : null
  };
}

/** Canje robusto del authorization code (fetch nativo + reintentos ante cortes de red). */
export async function exchangeGoogleAuthorizationCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  maxAttempts?: number;
}): Promise<GoogleOAuthExchangedTokens> {
  const clientId = normalizeGoogleOAuthClientId(params.clientId);
  const clientSecret = normalizeGoogleOAuthClientSecret(params.clientSecret);
  const maxAttempts = params.maxAttempts ?? 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await exchangeGoogleAuthorizationCodeOnce({
        clientId,
        clientSecret,
        code: params.code,
        redirectUri: params.redirectUri
      });
    } catch (error) {
      lastError = error;
      if (!isTransientGoogleOAuthTransportError(error) || attempt === maxAttempts) {
        throw error;
      }
      await delay(300 * attempt);
    }
  }

  throw lastError ?? buildGoogleOAuthTransportError(new Error("Google OAuth token exchange failed"));
}

/**
 * Canjea un código inválido a propósito: si las credenciales son válidas Google responde
 * `invalid_grant`; si el secret/ID están mal, `invalid_client`.
 */
export async function probeGoogleOAuthClientCredentials(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleOAuthCredentialProbeResult> {
  const clientId = normalizeGoogleOAuthClientId(params.clientId);
  const clientSecret = normalizeGoogleOAuthClientSecret(params.clientSecret);
  if (!clientId || !clientSecret) {
    return { ok: false, reason: "missing_credentials" };
  }

  try {
    await exchangeGoogleAuthorizationCode({
      clientId,
      clientSecret,
      code: GOOGLE_OAUTH_CREDENTIAL_PROBE_CODE,
      redirectUri: params.redirectUri,
      maxAttempts: 2
    });
    return { ok: true };
  } catch (error) {
    const reason = resolveGoogleCalendarOAuthFailureReason(error);
    const description = extractGoogleOAuthErrorDescription(error);
    if (reason === "invalid_grant") {
      return { ok: true };
    }
    return { ok: false, reason, description };
  }
}

export function extractGoogleOAuthErrorDescription(error: unknown): string | undefined {
  const data = readGoogleOAuthErrorPayload(error);
  if (!data) {
    return undefined;
  }
  const description = data.error_description;
  return typeof description === "string" && description.trim().length > 0 ? description.trim() : undefined;
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
  if (isTransientGoogleOAuthTransportError(error)) {
    return "google_token_network_error";
  }

  return "oauth_exchange_failed";
}

function readGoogleOAuthErrorPayload(error: unknown): { error?: unknown; error_description?: unknown } | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const err = error as {
    response?: { data?: unknown };
    message?: string;
    code?: unknown;
  };

  const data = err.response?.data;
  if (data && typeof data === "object") {
    return data as { error?: unknown; error_description?: unknown };
  }

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as { error?: unknown; error_description?: unknown };
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  if (typeof err.code === "string") {
    for (const known of [
      "redirect_uri_mismatch",
      "invalid_client",
      "invalid_grant",
      "unauthorized_client"
    ]) {
      if (err.code.includes(known)) {
        return { error: known };
      }
    }
  }

  return null;
}

function extractGoogleOAuthErrorCode(error: unknown): string | null {
  const payload = readGoogleOAuthErrorPayload(error);
  if (payload) {
    const oauthCode = payload.error;
    if (typeof oauthCode === "string" && oauthCode.trim().length > 0) {
      return oauthCode.trim();
    }
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : typeof error === "string"
          ? error
          : "";

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
