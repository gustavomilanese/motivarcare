import { env } from "../config/env.js";
import { describeGoogleCalendarOauthRuntime } from "./googleCalendarOAuthRedirect.js";

/** Una línea al levantar el API: no imprime secretos; el Client ID es público (va en la URL de Google). */
export function logGoogleCalendarOauthStartupHints(): void {
  if (env.NODE_ENV === "test") {
    return;
  }

  const runtime = describeGoogleCalendarOauthRuntime({
    nodeEnv: env.NODE_ENV,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    explicitRedirectUri: env.GOOGLE_REDIRECT_URI,
    baseUrl: env.BASE_URL.trim() || env.BACKEND_URL.trim() || env.API_PUBLIC_URL.trim() || "http://localhost:4000"
  });

  if (!runtime.clientId || !runtime.clientSecretConfigured) {
    console.warn(
      "[Google Calendar OAuth] Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en Railway: el connect de pro/paciente fallará."
    );
    return;
  }

  console.log(
    `[Google Calendar OAuth] redirectUri=${runtime.redirectUri} clientId=${runtime.clientId} secretConfigured=yes`
  );
}
