import { fetchOnboardingDraft } from "../../app/services/onboardingDraftApi";
import type { AuthUser } from "../../app/types";
import { savePendingWebOnboardingAuth, setResumeWebOnboardingStep } from "../webOnboardingResumeStorage.js";

/** Ruta que activa la reanudación del wizard en `AppRoot`. */
export const RESUME_WEB_ONBOARDING_ROUTE = "/?resumeWebOnboarding=1";

/**
 * Reanuda el wizard web desde el borrador del servidor (abandono / otra computadora).
 * Se dispara con CTA explícito "Continuar registro", no en automatico al login.
 */
export async function resumeOnboardingFromDraft(input: {
  token: string;
  user: AuthUser;
}): Promise<{ ok: true; step: number } | { ok: false; reason: "no_draft" | "error" }> {
  const saveSession = (step: number) => {
    savePendingWebOnboardingAuth({
      token: input.token,
      emailVerificationRequired: false,
      password: "",
      user: {
        id: input.user.id,
        fullName: input.user.fullName,
        email: input.user.email,
        emailVerified: true,
        professionalProfileId: input.user.professionalProfileId,
        avatarUrl: input.user.avatarUrl ?? null
      }
    });
    setResumeWebOnboardingStep(step);
  };

  try {
    const draft = await fetchOnboardingDraft(input.token, "professional_onboarding");
    const step = draft?.step ?? 0;
    saveSession(step);
    return draft ? { ok: true, step } : { ok: false, reason: "no_draft" };
  } catch {
    saveSession(0);
    return { ok: false, reason: "error" };
  }
}
