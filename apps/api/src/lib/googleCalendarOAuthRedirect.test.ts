import { describe, expect, it } from "vitest";
import {
  PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN,
  pickPublicApiOriginForGoogleOAuth,
  resolveGoogleCalendarOauthRedirectUri,
  resolveGoogleCalendarOAuthFailureReason
} from "./googleCalendarOAuthRedirect.js";

describe("googleCalendarOAuthRedirect", () => {
  it("maps frontend app hosts to api.motivarcare.com in production", () => {
    expect(
      pickPublicApiOriginForGoogleOAuth({
        nodeEnv: "production",
        baseUrl: "https://app.motivarcare.com"
      })
    ).toBe(PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN);

    expect(
      pickPublicApiOriginForGoogleOAuth({
        nodeEnv: "production",
        baseUrl: "https://pro.motivarcare.com"
      })
    ).toBe(PRODUCTION_GOOGLE_CALENDAR_CALLBACK_ORIGIN);
  });

  it("rewrites explicit GOOGLE_REDIRECT_URI away from SPA hosts", () => {
    expect(
      resolveGoogleCalendarOauthRedirectUri({
        nodeEnv: "production",
        explicitRedirectUri: "https://app.motivarcare.com/api/auth/google/calendar/callback",
        baseUrl: "https://app.motivarcare.com"
      })
    ).toBe("https://api.motivarcare.com/api/auth/google/calendar/callback");
  });

  it("keeps localhost redirect in development", () => {
    expect(
      resolveGoogleCalendarOauthRedirectUri({
        nodeEnv: "development",
        explicitRedirectUri: "",
        baseUrl: "http://localhost:4000"
      })
    ).toBe("http://localhost:4000/api/auth/google/calendar/callback");
  });

  it("classifies Google OAuth exchange errors", () => {
    expect(
      resolveGoogleCalendarOAuthFailureReason({
        response: { data: { error: "redirect_uri_mismatch" } }
      })
    ).toBe("redirect_uri_mismatch");
    expect(resolveGoogleCalendarOAuthFailureReason(new Error("boom"))).toBe("oauth_exchange_failed");
  });
});
