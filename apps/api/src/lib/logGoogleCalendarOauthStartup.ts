import { env } from "../config/env.js";
import {
  describeGoogleCalendarOauthRuntime,
  probeGoogleOAuthClientCredentials
} from "./googleCalendarOAuthRedirect.js";

/** Al levantar el API: no imprime secretos; el Client ID es público (va en la URL de Google). */
export async function logGoogleCalendarOauthStartupHints(): Promise<void> {
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

  try {
    const probe = await probeGoogleOAuthClientCredentials({
      clientId: runtime.clientId,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: runtime.redirectUri
    });
    if (probe.ok) {
      console.log("[Google Calendar OAuth] credentialProbe=ok (Google aceptó client_id+secret)");
      return;
    }
    console.error(
      `[Google Calendar OAuth] credentialProbe=FAILED reason=${probe.reason}${
        probe.description ? ` description=${probe.description}` : ""
      }`
    );
  } catch (probeError) {
    console.error("[Google Calendar OAuth] credentialProbe=error", probeError);
  }
}
