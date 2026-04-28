import type { AuthResponse, AuthUser } from "../app/types";
import {
  EMAIL_VERIFICATION_REQUIRED_KEY,
  TOKEN_KEY,
  USER_KEY
} from "../app/services/api";

/** Respuesta GET `/api/auth/verify-email` (JWT + usuario como login). */
export type VerifyEmailApiResponse = AuthResponse & {
  message: string;
  userId?: string;
};

/**
 * Reanudar onboarding web tras verificar el mail en otra pestaña.
 * Usa `localStorage` (mismo origen, compartido entre pestañas) y se limpia al terminar / abandonar / logout.
 */
export const WEB_ONBOARDING_PENDING_AUTH_STORAGE_KEY = "therapy_pro_web_onboarding_pending_auth";
const RESUME_STEP_KEY = "therapy_pro_web_onboarding_resume_step";
/** UI y navegación post-verify: seguir onboarding web (no solo login). */
const POST_VERIFY_CONTINUE_WEB_ONBOARDING_KEY = "therapy_pro_post_verify_continue_web_onboarding";
/** Nombre real del profesional capturado en onboarding; sobrevive refresh hasta que PATCH /api/auth/me confirme. */
const PENDING_DISPLAY_FULL_NAME_KEY = "therapy_pro_onboarding_pending_display_full_name";

/** Avisar a la pestaña del wizard que el mail ya fue verificado (Gmail suele abrir otra pestaña). */
export const WEB_ONBOARDING_BROADCAST_CHANNEL = "motivarcare-pro-web-onboarding";

/** 0-based wizard step: Identidad profesional (después de Correo + Revisá tu correo). */
export const WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY = 2;

export type PendingWebOnboardingAuth = {
  token: string;
  emailVerificationRequired: boolean;
  password: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    emailVerified: boolean;
    professionalProfileId: string;
    avatarUrl: string | null;
  };
};

export function notifyOtherTabsWebOnboardingEmailVerified(): void {
  try {
    const bc = new BroadcastChannel(WEB_ONBOARDING_BROADCAST_CHANNEL);
    bc.postMessage({ type: "email_verified" });
    bc.close();
  } catch {
    // ignore
  }
}

export function savePendingWebOnboardingAuth(data: PendingWebOnboardingAuth): void {
  try {
    window.localStorage.setItem(WEB_ONBOARDING_PENDING_AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function readPendingWebOnboardingAuth(): PendingWebOnboardingAuth | null {
  try {
    const raw = window.localStorage.getItem(WEB_ONBOARDING_PENDING_AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingWebOnboardingAuth;
    if (
      !parsed?.token
      || typeof parsed.password !== "string"
      || !parsed.user?.id
      || !parsed.user.email
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingWebOnboardingAuth(): void {
  try {
    window.localStorage.removeItem(WEB_ONBOARDING_PENDING_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(POST_VERIFY_CONTINUE_WEB_ONBOARDING_KEY);
  } catch {
    // ignore
  }
}

export function setResumeWebOnboardingStep(stepIndex: number): void {
  try {
    window.localStorage.setItem(RESUME_STEP_KEY, String(stepIndex));
  } catch {
    // ignore
  }
}

export function readResumeWebOnboardingStep(): number | null {
  try {
    const raw = window.localStorage.getItem(RESUME_STEP_KEY);
    if (raw === null || raw === "") {
      return null;
    }
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

export function clearResumeWebOnboardingStep(): void {
  try {
    window.localStorage.removeItem(RESUME_STEP_KEY);
    window.localStorage.removeItem(POST_VERIFY_CONTINUE_WEB_ONBOARDING_KEY);
  } catch {
    // ignore
  }
}

export function readContinueWebOnboardingAfterEmailVerify(): boolean {
  try {
    return window.localStorage.getItem(POST_VERIFY_CONTINUE_WEB_ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

/** Guarda el nombre real del onboarding para reintentar PATCH /api/auth/me si el sync inicial falla. */
export function savePendingOnboardingDisplayFullName(value: string): void {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return;
  }
  try {
    window.localStorage.setItem(PENDING_DISPLAY_FULL_NAME_KEY, trimmed);
  } catch {
    // ignore quota / private mode
  }
}

export function readPendingOnboardingDisplayFullName(): string | null {
  try {
    const raw = window.localStorage.getItem(PENDING_DISPLAY_FULL_NAME_KEY);
    if (!raw) {
      return null;
    }
    const trimmed = raw.trim();
    return trimmed.length >= 2 ? trimmed : null;
  } catch {
    return null;
  }
}

export function clearPendingOnboardingDisplayFullName(): void {
  try {
    window.localStorage.removeItem(PENDING_DISPLAY_FULL_NAME_KEY);
  } catch {
    // ignore
  }
}

/**
 * Cuando no hay `pending` web (enlace abierto sin registro en curso en este navegador): igual que login.
 * Sin esto el usuario vuelve al login tras verificar aunque el backend devolvió sesión.
 */
export function persistProfessionalSessionFromVerifyEmailApi(data: VerifyEmailApiResponse): AuthUser | null {
  if (!data.token || data.user.role !== "PROFESSIONAL" || !data.user.professionalProfileId) {
    return null;
  }
  const authUser: AuthUser = {
    id: data.user.id,
    fullName: data.user.fullName,
    firstName: data.user.firstName,
    lastName: data.user.lastName,
    email: data.user.email,
    emailVerified: true,
    role: "PROFESSIONAL",
    professionalProfileId: data.user.professionalProfileId,
    avatarUrl: data.user.avatarUrl ?? null
  };
  try {
    window.localStorage.setItem(TOKEN_KEY, data.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    if (data.emailVerificationRequired) {
      window.localStorage.setItem(EMAIL_VERIFICATION_REQUIRED_KEY, "1");
    } else {
      window.localStorage.removeItem(EMAIL_VERIFICATION_REQUIRED_KEY);
    }
  } catch {
    return null;
  }
  return authUser;
}

function persistProfessionalSessionToLocalStorage(pending: PendingWebOnboardingAuth): void {
  const user: AuthUser = {
    id: pending.user.id,
    fullName: pending.user.fullName,
    email: pending.user.email,
    emailVerified: true,
    role: "PROFESSIONAL",
    professionalProfileId: pending.user.professionalProfileId,
    avatarUrl: pending.user.avatarUrl ?? null
  };
  try {
    window.localStorage.setItem(TOKEN_KEY, pending.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (pending.emailVerificationRequired) {
      window.localStorage.setItem(EMAIL_VERIFICATION_REQUIRED_KEY, "1");
    } else {
      window.localStorage.removeItem(EMAIL_VERIFICATION_REQUIRED_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** Tras GET /verify-email OK: guarda sesión en localStorage, pending actualizado y marca paso del wizard a reanudar. */
export function finalizeWebOnboardingAfterEmailLink(pending: PendingWebOnboardingAuth): void {
  const verified: PendingWebOnboardingAuth = {
    ...pending,
    user: { ...pending.user, emailVerified: true }
  };
  savePendingWebOnboardingAuth(verified);
  persistProfessionalSessionToLocalStorage(verified);
  setResumeWebOnboardingStep(WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY);
  try {
    window.localStorage.setItem(POST_VERIFY_CONTINUE_WEB_ONBOARDING_KEY, "1");
  } catch {
    // ignore
  }
  notifyOtherTabsWebOnboardingEmailVerified();
}
