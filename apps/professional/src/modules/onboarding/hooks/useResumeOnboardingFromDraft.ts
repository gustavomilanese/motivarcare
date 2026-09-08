import { useEffect } from "react";

import { fetchOnboardingDraft } from "../../app/services/onboardingDraftApi";
import type { AuthUser } from "../../app/types";
import { savePendingWebOnboardingAuth, setResumeWebOnboardingStep } from "../webOnboardingResumeStorage.js";

/** Ruta que activa la reanudación del wizard en `AppRoot`. */
export const RESUME_WEB_ONBOARDING_ROUTE = "/?resumeWebOnboarding=1";

/**
 * Volver a entrar con el onboarding a medias (otra computadora, o después de limpiar
 * el navegador).
 *
 * La cuenta existe desde el primer paso con estado `PENDING`, así que sin esto el
 * profesional cae en la pantalla de "esperando aprobación" y no tiene forma de
 * terminar de cargar su perfil. Si hay progreso guardado en el servidor, se reconstruye
 * la sesión de reanudación y se lo manda al wizard donde lo dejó.
 */
export function useResumeOnboardingFromDraft(input: {
  token: string;
  user: AuthUser | null;
  ready: boolean;
  /** `true` cuando ya se está reanudando: evita volver a disparar. */
  alreadyResuming: boolean;
  navigate: (to: string, options: { replace: boolean }) => void;
}): void {
  const { token, user, ready, alreadyResuming, navigate } = input;

  useEffect(() => {
    if (!token || !user || !ready || alreadyResuming) {
      return;
    }
    if (!user.emailVerified || user.registrationApproval !== "PENDING") {
      return;
    }

    let cancelled = false;
    void (async () => {
      let draft: { step: number } | null = null;
      try {
        draft = await fetchOnboardingDraft(token, "professional_onboarding");
      } catch {
        // Sin borrador accesible se sigue con el flujo normal (pantalla de aprobación).
        return;
      }
      if (cancelled || !draft) {
        return;
      }

      savePendingWebOnboardingAuth({
        token,
        emailVerificationRequired: false,
        // La contraseña no se guarda en el borrador: acá ya hay sesión y el wizard no la necesita.
        password: "",
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          emailVerified: true,
          professionalProfileId: user.professionalProfileId,
          avatarUrl: user.avatarUrl ?? null
        }
      });
      setResumeWebOnboardingStep(draft.step);
      navigate(RESUME_WEB_ONBOARDING_ROUTE, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user, ready, alreadyResuming, navigate]);
}
