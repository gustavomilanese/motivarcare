import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { detectBrowserTimezone } from "@therapy/auth";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  professionalAuthSurfaceMessage,
  professionalSurfaceMessage
} from "../../app/lib/friendlyProfessionalSurfaceMessages";
import type { AuthResponse } from "../../app/types";
import { apiRequest } from "../../app/services/api";
import { checkProfessionalEmailAvailable } from "../../app/services/checkProfessionalEmail";
import {
  FALLBACK_SESSION_PRICE_MAX_ARS,
  FALLBACK_SESSION_PRICE_MAX_USD,
  FALLBACK_SESSION_PRICE_MIN_ARS,
  FALLBACK_SESSION_PRICE_MIN_USD,
  fetchSessionPriceBoundsDual,
  type SessionPriceBoundsDual
} from "../../app/services/sessionPriceBounds";
import {
  fetchPublicUsdArsRate,
  roundSessionPriceArsFromUsd
} from "../../app/services/usdArsPublicRate";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { PROFESSIONAL_THERAPY_MODALITY_EXCLUSIVE_ES } from "../constants/professionalTherapyModalityOptions";
import type { ProfessionalWebOnboardingFinishMeta, ProfessionalWebOnboardingPayload } from "../types";
import type { PendingWebOnboardingAuth } from "../webOnboardingResumeStorage.js";
import {
  WEB_ONBOARDING_BROADCAST_CHANNEL,
  WEB_ONBOARDING_PENDING_AUTH_STORAGE_KEY,
  WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY
} from "../webOnboardingResumeStorage.js";

/** Aproximación de años de práctica para matching cuando no hay año de egreso en onboarding web. */
function yearsExperienceApproxFromExperienceBand(band: string): number | null {
  const map: Record<string, number> = {
    "Menos de 1 ano": 0,
    "1-3 anos": 2,
    "3-6 anos": 5,
    "6-10 anos": 8,
    "10-15 anos": 12,
    "15-20 anos": 18,
    "Mas de 20 anos": 25
  };
  const v = map[band.trim()];
  return v === undefined ? null : v;
}

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function looksLikeEmail(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v.includes("@") && v.length >= 5 && !v.startsWith("@") && !v.endsWith("@");
}

/** No usar la parte local del email como nombre en User.fullName (saludos lo confunden con el mail). */
function placeholderFullNameFromEmail(_email: string): string {
  return "Profesional";
}

function joinWebOnboardingFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(" ").trim();
}

/** Fusiona checklist de modalidades con el texto «Cómo trabajo» para `ProfessionalProfile.therapeuticApproach`. */
function combineTherapeuticApproach(modalities: string[], methodology: string): string {
  const header = modalities.map((m) => m.trim()).filter(Boolean).join("; ");
  const body = methodology.trim();
  if (header && body) {
    return `${header}\n\n${body}`;
  }
  return header || body;
}

export type WebOnboardingSessionState = {
  token: string;
  emailVerificationRequired: boolean;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    fullName: string;
    professionalProfileId: string;
    avatarUrl?: string | null;
  };
};

export type WebInterstitialVisual = "earnings" | "reservations" | "growth" | "trust";

export type WebInterstitialContent = {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  visual: WebInterstitialVisual;
  metric: string;
  metricCaption: string;
};

export function useProfessionalWebOnboardingWizard(input: {
  language: AppLanguage;
  onFinish: (payload: ProfessionalWebOnboardingPayload, meta: ProfessionalWebOnboardingFinishMeta) => void;
  /** Reanudar tras verificar email (mismo navegador). */
  initialWizardStep?: number;
  initialWebSession?: WebOnboardingSessionState | null;
  credentialsSeed?: { email: string; password: string; fullName: string } | null;
  onAfterRegisterPendingAuth?: (data: PendingWebOnboardingAuth) => void;
}) {
  const initialStep = input.initialWizardStep ?? 0;
  const [step, setStep] = useState(() => initialStep);
  const [maxReachedStep, setMaxReachedStep] = useState(() => initialStep);
  const [activeInterstitialStep, setActiveInterstitialStep] = useState<number | null>(null);
  const [seenInterstitials, setSeenInterstitials] = useState<Record<number, true>>({});
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [sessionPriceBounds, setSessionPriceBounds] = useState<SessionPriceBoundsDual | null>(null);
  const [usdArsRate, setUsdArsRate] = useState<number | null>(null);
  const [usdArsRateError, setUsdArsRateError] = useState(false);
  const [pricingStepError, setPricingStepError] = useState("");
  const [credentialsStepError, setCredentialsStepError] = useState("");
  const [credentialsChecking, setCredentialsChecking] = useState(false);
  const [registerInFlight, setRegisterInFlight] = useState(false);
  const [webOnboardingSession, setWebOnboardingSession] = useState<WebOnboardingSessionState | null>(
    () => input.initialWebSession ?? null
  );
  const [resendVerificationMessage, setResendVerificationMessage] = useState("");
  const [resendVerificationError, setResendVerificationError] = useState("");
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
  const [devVerifyLoading, setDevVerifyLoading] = useState(false);
  const [devVerifyError, setDevVerifyError] = useState("");

  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const webPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const webVideoInputRef = useRef<HTMLInputElement | null>(null);
  const webDiplomaInputRef = useRef<HTMLInputElement | null>(null);
  const webStripeDocInputRef = useRef<HTMLInputElement | null>(null);

  const [activeDiplomaUploadIndex, setActiveDiplomaUploadIndex] = useState<number | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    professionalTitle: "",
    experienceBand: "",
    practiceBand: "",
    gender: "",
    birthCountry: "",
    residencyCountry: "",
    focusAreas: [] as string[],
    therapyModalities: [] as string[],
    languages: [] as string[],
    about: "",
    methodology: "",
    shortDescription: "",
    sessionPriceArs: "",
    sessionPriceUsd: "",
    discount4: "",
    discount8: "",
    discount12: "",
    profilePhotoReady: false,
    profilePhotoPreview: "",
    videoReady: false,
    videoPreview: "",
    diplomas: [
      {
        institution: "",
        degree: "",
        startYear: "",
        graduationYear: "",
        diplomaUploaded: false,
        diplomaPreview: ""
      }
    ],
    stripeVerified: false,
    stripeDocPreview: "",
    stripeVerificationStarted: false,
    email: "",
    emailConfirm: "",
    password: "",
    passwordConfirm: "",
    turnstileToken: ""
  });

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1969 }, (_, index) => String(currentYear - index));
  }, []);

  const computedSessionPriceArs = useMemo(() => {
    const usd = Number(form.sessionPriceUsd || "0");
    if (!usd || usdArsRate === null || !Number.isFinite(usdArsRate)) {
      return null;
    }
    return roundSessionPriceArsFromUsd(usd, usdArsRate);
  }, [form.sessionPriceUsd, usdArsRate]);

  const labels = [
    t(input.language, { es: "Correo y contraseña", en: "Email and password", pt: "E-mail e senha" }),
    t(input.language, { es: "Revisá tu correo", en: "Check your email", pt: "Verifique seu e-mail" }),
    t(input.language, { es: "Identidad profesional", en: "Professional identity", pt: "Identidade profissional" }),
    t(input.language, { es: "Perfil público", en: "Public profile", pt: "Perfil publico" }),
    t(input.language, { es: "Servicios y precios", en: "Services and pricing", pt: "Servicos e precos" }),
    t(input.language, { es: "Multimedia", en: "Media", pt: "Midia" }),
    t(input.language, { es: "Formación", en: "Education", pt: "Formacao" }),
    t(input.language, { es: "Stripe y verificación", en: "Stripe and verification", pt: "Stripe e verificacao" })
  ];

  const stepSubtitles = [
    null,
    null,
    t(input.language, {
      es: "Complete sus datos principales para definir como se mostrara su perfil profesional.",
      en: "Complete your core data to define how your professional profile will appear.",
      pt: "Preencha seus dados principais para definir como seu perfil profissional sera exibido."
    }),
    null,
    t(input.language, {
      es: "Precio por sesión y descuentos por paquetes de 4, 8 y 12 sesiones.",
      en: "Per-session price and discounts for 4, 8, and 12 session bundles.",
      pt: "Preco por sessao e descontos para pacotes de 4, 8 e 12 sessoes."
    }),
    t(input.language, {
      es: "Cargue los recursos visuales que refuerzan confianza en su perfil.",
      en: "Upload visual assets that reinforce trust in your profile.",
      pt: "Envie os recursos visuais que reforcam a confianca no seu perfil."
    }),
    null,
    t(input.language, {
      es: "Conecte Stripe para validar documentos y activar cobros.",
      en: "Connect Stripe to validate documents and activate payouts.",
      pt: "Conecte o Stripe para validar documentos e ativar pagamentos."
    })
  ] as const;

  const interstitialByStep: Partial<Record<number, WebInterstitialContent>> = {
    2: {
      kicker: t(input.language, { es: "Proyección real", en: "Real projection", pt: "Projecao real" }),
      title: t(input.language, { es: "Calculemos tus ganancias potenciales", en: "Let's estimate your potential revenue", pt: "Vamos calcular seu potencial de receita" }),
      body: t(input.language, {
        es: "Con un perfil completo y claro, tu agenda mensual puede empezar a crecer desde la primera semana.",
        en: "With a complete profile, your monthly agenda can grow from week one.",
        pt: "Com um perfil completo, sua agenda mensal pode crescer desde a primeira semana."
      }),
      cta: t(input.language, { es: "Vamos", en: "Let's go", pt: "Vamos" }),
      visual: "earnings",
      metric: t(input.language, {
        es: "USD 5.173,75",
        en: "USD 5,173.75",
        pt: "USD 5.173,75"
      }),
      metricCaption: t(input.language, { es: "ganancia proyectada", en: "projected earnings", pt: "ganho projetado" })
    },
    3: {
      kicker: t(input.language, { es: "Primeras reservas", en: "First bookings", pt: "Primeiras reservas" }),
      title: t(input.language, {
        es: "Recibí tus pacientes en forma inmediata",
        en: "Receive patients right away",
        pt: "Receba seus pacientes na hora"
      }),
      body: t(input.language, {
        es: "Un perfil claro acelera la confianza y mejora la conversión en las primeras horas.",
        en: "A clear profile speeds up trust and improves conversion in the first hours.",
        pt: "Um perfil claro acelera a confianca e melhora a conversao nas primeiras horas."
      }),
      cta: t(input.language, { es: "Seguimos", en: "Continue", pt: "Seguimos" }),
      visual: "reservations",
      metric: "2 horas",
      metricCaption: t(input.language, { es: "tiempo promedio hasta la primera reserva", en: "average time to first booking", pt: "tempo medio para a primeira reserva" })
    },
    4: {
      kicker: t(input.language, { es: "Escalamiento", en: "Growth curve", pt: "Curva de crescimento" }),
      title: t(input.language, { es: "Con descuentos inteligentes aumenta la continuidad", en: "Smart discounts increase continuity", pt: "Descontos inteligentes aumentam a continuidade" }),
      body: t(input.language, {
        es: "Los paquetes con descuento ayudan a sostener procesos largos y estabilizar ingresos.",
        en: "Discounted packages support longer treatments and stabilize revenue.",
        pt: "Pacotes com desconto sustentam tratamentos longos e estabilizam sua receita."
      }),
      cta: t(input.language, { es: "Continuar", en: "Continue", pt: "Continuar" }),
      visual: "growth",
      metric: "30 clientes",
      metricCaption: t(input.language, { es: "promedio en el primer mes", en: "average in the first month", pt: "media no primeiro mes" })
    },
    5: {
      kicker: t(input.language, { es: "Confianza", en: "Trust signal", pt: "Sinal de confianca" }),
      title: t(input.language, { es: "Tu formación validada eleva el valor de tu perfil", en: "Verified education raises your profile value", pt: "Formacao validada aumenta o valor do perfil" }),
      body: t(input.language, {
        es: "La mayoría de los pacientes compara credenciales antes de reservar su primera sesión.",
        en: "Most patients compare credentials before booking their first session.",
        pt: "A maioria dos pacientes compara credenciais antes de reservar a primeira sessao."
      }),
      cta: t(input.language, { es: "Casi listo", en: "Almost done", pt: "Quase pronto" }),
      visual: "trust",
      metric: "97%",
      metricCaption: t(input.language, { es: "revisa la formación antes de reservar", en: "reviews education before booking", pt: "revisa formacao antes de reservar" })
    }
  };

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  /** Referencias estables para Turnstile; ver `rerenderOnCallbackChange` en @marsidev/react-turnstile. */
  const onTurnstileSuccess = useCallback((token: string) => {
    setForm((current) => ({ ...current, turnstileToken: token }));
  }, []);
  const onTurnstileExpire = useCallback(() => {
    setForm((current) => ({ ...current, turnstileToken: "" }));
  }, []);

  const resetWebOnboardingSession = () => {
    setWebOnboardingSession(null);
    setResendVerificationMessage("");
    setResendVerificationError("");
  };

  useEffect(() => {
    void fetchSessionPriceBoundsDual().then(setSessionPriceBounds);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicUsdArsRate()
      .then((rate) => {
        if (!cancelled) {
          setUsdArsRate(rate);
          setUsdArsRateError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsdArsRate(null);
          setUsdArsRateError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const seed = input.credentialsSeed;
    if (!seed) {
      return;
    }
    setForm((current) => ({
      ...current,
      email: seed.email,
      emailConfirm: seed.email,
      password: seed.password,
      passwordConfirm: seed.password
    }));
  }, [input.credentialsSeed?.email, input.credentialsSeed?.password]);

  useEffect(() => {
    setPricingStepError("");
  }, [form.sessionPriceUsd, step]);

  useEffect(() => {
    setCredentialsStepError("");
  }, [form.email, form.emailConfirm, form.password, form.passwordConfirm, form.turnstileToken]);

  const turnstileSiteKey =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_TURNSTILE_SITE_KEY
      ? String(import.meta.env.VITE_TURNSTILE_SITE_KEY).trim()
      : "";
  const requiresTurnstileWidget = turnstileSiteKey.length > 0;

  const updateDiploma = (
    index: number,
    patch: Partial<{
      institution: string;
      degree: string;
      startYear: string;
      graduationYear: string;
      diplomaUploaded: boolean;
      diplomaPreview: string;
    }>
  ) => {
    setForm((current) => ({
      ...current,
      diplomas: current.diplomas.map((diploma, diplomaIndex) =>
        diplomaIndex === index ? { ...diploma, ...patch } : diploma
      )
    }));
  };

  const addDiploma = () => {
    setForm((current) => ({
      ...current,
      diplomas: [
        ...current.diplomas,
        {
          institution: "",
          degree: "",
          startYear: "",
          graduationYear: "",
          diplomaUploaded: false,
          diplomaPreview: ""
        }
      ]
    }));
  };

  const toggleLanguage = (value: string) => {
    const next = form.languages.includes(value)
      ? form.languages.filter((item) => item !== value)
      : [...form.languages, value];
    update({ languages: next });
  };

  const toggleFocusArea = (value: string) => {
    const next = form.focusAreas.includes(value)
      ? form.focusAreas.filter((item) => item !== value)
      : [...form.focusAreas, value];
    update({ focusAreas: next });
  };

  const toggleTherapyModality = (value: string) => {
    setForm((current) => {
      const exclusive = PROFESSIONAL_THERAPY_MODALITY_EXCLUSIVE_ES;
      let next = [...current.therapyModalities];
      if (value === exclusive) {
        const only = next.includes(exclusive) ? [] : [exclusive];
        return { ...current, therapyModalities: only };
      }
      next = next.filter((item) => item !== exclusive);
      if (next.includes(value)) {
        next = next.filter((item) => item !== value);
      } else {
        next.push(value);
      }
      return { ...current, therapyModalities: next };
    });
  };

  const clampDiscountInput = (raw: string, max: number) => {
    const numeric = raw.replace(/\D/g, "");
    if (!numeric) {
      return "";
    }
    return String(Math.min(max, Math.max(0, Number(numeric))));
  };

  const discountedPriceLabelArs = (discount: string) => {
    const sessionPrice = computedSessionPriceArs ?? 0;
    if (!sessionPrice) {
      return null;
    }
    const percent = Number(discount || "0");
    if (!percent) {
      return null;
    }
    const value = Math.max(0, Math.round(sessionPrice * (1 - percent / 100)));
    return `${value} ARS ${t(input.language, { es: "por sesión", en: "per session", pt: "por sessao" })}`;
  };

  const discountedPriceLabelUsd = (discount: string) => {
    const sessionPrice = Number(form.sessionPriceUsd || "0");
    if (!sessionPrice) {
      return null;
    }
    const percent = Number(discount || "0");
    if (!percent) {
      return null;
    }
    const value = Math.max(0, Math.round(sessionPrice * (1 - percent / 100)));
    return `${value} USD ${t(input.language, { es: "por sesión", en: "per session", pt: "por sessao" })}`;
  };

  /** Turnstile: no exigimos token en estado para habilitar el botón; se lee con la ref al enviar (getResponse). */
  const stepValidations = [
    Boolean(
      looksLikeEmail(form.email)
      && looksLikeEmail(form.emailConfirm)
      && form.email.trim().toLowerCase() === form.emailConfirm.trim().toLowerCase()
      && form.password.trim().length >= 8
      && form.password === form.passwordConfirm
    ),
    Boolean(
      webOnboardingSession
      && (!webOnboardingSession.emailVerificationRequired || webOnboardingSession.user.emailVerified)
    ),
    Boolean(
      form.firstName.trim()
      && form.lastName.trim()
      && form.professionalTitle.trim()
      && form.experienceBand
      && form.practiceBand
      && form.gender
      && form.birthCountry
      && form.residencyCountry.trim().length === 2
      && form.focusAreas.length
      && form.therapyModalities.length
      && form.languages.length
    ),
    Boolean(form.about.trim() && form.methodology.trim() && form.shortDescription.trim()),
    Boolean(
      (() => {
        const usd = Number(form.sessionPriceUsd || "0");
        if (usd <= 0) {
          return false;
        }
        const usdMin = sessionPriceBounds?.usd.min ?? FALLBACK_SESSION_PRICE_MIN_USD;
        const usdMax = sessionPriceBounds?.usd.max ?? FALLBACK_SESSION_PRICE_MAX_USD;
        const usdOk = Number.isInteger(usd) && usd >= usdMin && usd <= usdMax;
        if (!usdOk) {
          return false;
        }
        const arMin = sessionPriceBounds?.ars.min ?? FALLBACK_SESSION_PRICE_MIN_ARS;
        const arMax = sessionPriceBounds?.ars.max ?? FALLBACK_SESSION_PRICE_MAX_ARS;
        if (computedSessionPriceArs !== null) {
          return computedSessionPriceArs >= arMin && computedSessionPriceArs <= arMax;
        }
        return true;
      })()
    ),
    true,
    Boolean(
      form.diplomas.length
      && form.diplomas.every((diploma) =>
        diploma.institution.trim()
        && diploma.degree.trim()
        && diploma.startYear
        && diploma.graduationYear
      )
    ),
    true
  ];

  const canContinue = stepValidations[step];

  const pollMeForVerified = useCallback(
    async (token: string): Promise<boolean> => {
      try {
        const me = await apiRequest<{
          user: { emailVerified: boolean };
        }>("/api/auth/me", token);
        return Boolean(me.user.emailVerified);
      } catch {
        return false;
      }
    },
    []
  );

  const handleContinue = async () => {
    if (!canContinue) {
      return;
    }
    if (step === 0) {
      setCredentialsStepError("");
      setResendVerificationMessage("");
      setResendVerificationError("");

      let resolvedTurnstileToken = "";
      if (requiresTurnstileWidget) {
        resolvedTurnstileToken =
          turnstileRef.current?.getResponse()?.trim() ?? form.turnstileToken.trim();
        if (!resolvedTurnstileToken && turnstileRef.current) {
          try {
            resolvedTurnstileToken = (await turnstileRef.current.getResponsePromise(8000)).trim();
          } catch {
            resolvedTurnstileToken = "";
          }
        }
        if (!resolvedTurnstileToken) {
          setCredentialsStepError(
            t(input.language, {
              es: "No pudimos leer la verificación de seguridad. Actualizá la página o intentá de nuevo.",
              en: "We could not read the security check. Refresh the page or try again.",
              pt: "Nao foi possivel ler a verificacao de seguranca. Atualize a pagina ou tente de novo."
            })
          );
          return;
        }
      }

      setCredentialsChecking(true);
        try {
          const available = await checkProfessionalEmailAvailable(form.email);
          if (!available) {
            setCredentialsStepError(
              t(input.language, {
                es: "Este correo ya está registrado. Iniciá sesión o usá otro email.",
                en: "This email is already registered. Sign in or use another email.",
                pt: "Este e-mail ja esta cadastrado. Faca login ou use outro endereco."
              })
            );
            return;
          }
        } catch {
          setCredentialsStepError(
            t(input.language, {
              es: "No pudimos verificar el correo. Revisá tu conexión e intentá de nuevo.",
              en: "We couldn't verify the email. Check your connection and try again.",
              pt: "Nao foi possivel verificar o e-mail. Verifique a conexao e tente de novo."
            })
          );
          return;
        } finally {
          setCredentialsChecking(false);
        }

        setRegisterInFlight(true);
        try {
          const email = form.email.trim().toLowerCase();
          const response = await apiRequest<AuthResponse>("/api/auth/register", undefined, {
            method: "POST",
            body: JSON.stringify({
              email,
              password: form.password,
              fullName: placeholderFullNameFromEmail(email),
              role: "PROFESSIONAL",
              timezone: detectBrowserTimezone(),
              ...(requiresTurnstileWidget && resolvedTurnstileToken
                ? { turnstileToken: resolvedTurnstileToken }
                : {})
            })
          });

          if (response.user.role !== "PROFESSIONAL" || !response.user.professionalProfileId) {
            setCredentialsStepError(
              t(input.language, {
                es: "No pudimos crear la cuenta profesional. Probá de nuevo o contactá soporte.",
                en: "We could not create your professional account. Try again or contact support.",
                pt: "Nao foi possivel criar a conta profissional. Tente de novo ou fale com o suporte."
              })
            );
            return;
          }

          const session: WebOnboardingSessionState = {
            token: response.token,
            emailVerificationRequired: response.emailVerificationRequired,
            user: {
              id: response.user.id,
              email: response.user.email,
              emailVerified: response.user.emailVerified,
              fullName: response.user.fullName,
              professionalProfileId: response.user.professionalProfileId,
              avatarUrl: response.user.avatarUrl ?? null
            }
          };
          setWebOnboardingSession(session);
          if (response.emailVerificationRequired && !response.user.emailVerified) {
            input.onAfterRegisterPendingAuth?.({
              token: session.token,
              emailVerificationRequired: session.emailVerificationRequired,
              password: form.password,
              user: {
                id: session.user.id,
                fullName: session.user.fullName,
                email: session.user.email,
                emailVerified: session.user.emailVerified,
                professionalProfileId: session.user.professionalProfileId,
                avatarUrl: session.user.avatarUrl ?? null
              }
            });
          }
        } catch (requestError) {
          const raw = requestError instanceof Error ? requestError.message : "";
          setCredentialsStepError(professionalAuthSurfaceMessage(raw || " ", input.language));
          return;
        } finally {
          setRegisterInFlight(false);
        }
    }
    if (step === 1) {
      setCredentialsStepError("");
      if (!webOnboardingSession) {
        return;
      }
      if (webOnboardingSession.emailVerificationRequired && !webOnboardingSession.user.emailVerified) {
        const ok = await pollMeForVerified(webOnboardingSession.token);
        if (ok) {
          setWebOnboardingSession((prev) =>
            prev ? { ...prev, user: { ...prev.user, emailVerified: true } } : prev
          );
        } else {
          setCredentialsStepError(
            t(input.language, {
              es: "Todavía no detectamos el correo validado. Abrí el enlace del mail y volvé a intentar.",
              en: "We still do not see your email as verified. Open the link in the email and try again.",
              pt: "Ainda nao detectamos o e-mail validado. Abra o link do e-mail e tente de novo."
            })
          );
          return;
        }
      }
    }
    if (step === 4) {
      const usd = Number(form.sessionPriceUsd || "0");
      const arMin = sessionPriceBounds?.ars.min ?? FALLBACK_SESSION_PRICE_MIN_ARS;
      const arMax = sessionPriceBounds?.ars.max ?? FALLBACK_SESSION_PRICE_MAX_ARS;
      const usdMin = sessionPriceBounds?.usd.min ?? FALLBACK_SESSION_PRICE_MIN_USD;
      const usdMax = sessionPriceBounds?.usd.max ?? FALLBACK_SESSION_PRICE_MAX_USD;
      if (usd <= 0) {
        setPricingStepError(
          t(input.language, {
            es: "Indicá el precio de referencia en USD (moneda de la plataforma).",
            en: "Enter your reference price in USD (the platform currency).",
            pt: "Informe o preco de referencia em USD (moeda da plataforma)."
          })
        );
        return;
      }
      if (!Number.isInteger(usd) || usd < usdMin || usd > usdMax) {
        setPricingStepError(
          t(input.language, {
            es: `Precio USD: entero entre ${usdMin} y ${usdMax}.`,
            en: `USD price: whole dollars between ${usdMin} and ${usdMax}.`,
            pt: `Preco USD: inteiro entre ${usdMin} e ${usdMax}.`
          })
        );
        return;
      }
      if (computedSessionPriceArs !== null && (computedSessionPriceArs < arMin || computedSessionPriceArs > arMax)) {
        setPricingStepError(
          t(input.language, {
            es: `Con el tipo de cambio actual, el precio en pesos quedaría fuera del rango permitido (${arMin}–${arMax} ARS). Ajustá el monto en USD.`,
            en: `At the current exchange rate, the peso price would fall outside the allowed range (${arMin}–${arMax} ARS). Adjust your USD amount.`,
            pt: `Com a cotacao atual, o preco em pesos ficaria fora do intervalo (${arMin}–${arMax} ARS). Ajuste o valor em USD.`
          })
        );
        return;
      }
      setPricingStepError("");
    }
    if (step < labels.length - 1) {
      setMaxReachedStep((current) => Math.max(current, step + 1));
      setStep((current) => current + 1);
      return;
    }
    setShowCompletionCelebration(true);
  };

  const resendVerificationEmail = useCallback(async () => {
    if (!webOnboardingSession) {
      return;
    }
    setResendVerificationLoading(true);
    setResendVerificationError("");
    setResendVerificationMessage("");
    try {
      const response = await apiRequest<{ message: string }>(
        "/api/auth/email-verification/resend",
        webOnboardingSession.token,
        { method: "POST" }
      );
      setResendVerificationMessage(response.message);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setResendVerificationError(professionalSurfaceMessage("verify-resend", input.language, raw));
    } finally {
      setResendVerificationLoading(false);
    }
  }, [webOnboardingSession, input.language]);

  /** Solo API con `NODE_ENV=development` (ver `POST /api/auth/email-verification/dev-verify`). */
  const devVerifyEmailInLocalDevelopment = useCallback(async () => {
    if (!webOnboardingSession?.token) {
      return;
    }
    setDevVerifyLoading(true);
    setDevVerifyError("");
    try {
      await apiRequest("/api/auth/email-verification/dev-verify", webOnboardingSession.token, {
        method: "POST"
      });
      setWebOnboardingSession((prev) =>
        prev ? { ...prev, user: { ...prev.user, emailVerified: true } } : prev
      );
      setMaxReachedStep((current) => Math.max(current, WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY));
      setStep(WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setDevVerifyError(professionalAuthSurfaceMessage(raw || " ", input.language));
    } finally {
      setDevVerifyLoading(false);
    }
  }, [webOnboardingSession]);

  useEffect(() => {
    if (step !== 1 || !webOnboardingSession) {
      return;
    }
    if (!webOnboardingSession.emailVerificationRequired || webOnboardingSession.user.emailVerified) {
      return;
    }

    let cancelled = false;
    const tick = async () => {
      const ok = await pollMeForVerified(webOnboardingSession.token);
      if (cancelled || !ok) {
        return;
      }
      setWebOnboardingSession((prev) => (prev ? { ...prev, user: { ...prev.user, emailVerified: true } } : prev));
      setMaxReachedStep((current) => Math.max(current, WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY));
      setStep(WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY);
    };

    const intervalId = window.setInterval(() => {
      void tick();
    }, 2800);
    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [step, webOnboardingSession, pollMeForVerified]);

  /** Otra pestaña verificó el mail (Gmail abre enlace en pestaña nueva): avanzar acá también. */
  useEffect(() => {
    if (step !== 1 || !webOnboardingSession) {
      return;
    }
    if (!webOnboardingSession.emailVerificationRequired || webOnboardingSession.user.emailVerified) {
      return;
    }

    const token = webOnboardingSession.token;

    const advanceAfterVerifiedElsewhere = () => {
      setWebOnboardingSession((prev) =>
        prev ? { ...prev, user: { ...prev.user, emailVerified: true } } : prev
      );
      setMaxReachedStep((current) => Math.max(current, WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY));
      setStep(WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY);
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(WEB_ONBOARDING_BROADCAST_CHANNEL);
    } catch {
      bc = null;
    }

    const onBroadcast = (event: MessageEvent) => {
      if (event?.data?.type === "email_verified") {
        advanceAfterVerifiedElsewhere();
      }
    };

    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== WEB_ONBOARDING_PENDING_AUTH_STORAGE_KEY || !ev.newValue) {
        return;
      }
      try {
        const next = JSON.parse(ev.newValue) as PendingWebOnboardingAuth;
        if (next.user?.emailVerified && next.token === token) {
          advanceAfterVerifiedElsewhere();
        }
      } catch {
        // ignore
      }
    };

    bc?.addEventListener("message", onBroadcast);
    window.addEventListener("storage", onStorage);

    return () => {
      bc?.removeEventListener("message", onBroadcast);
      bc?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [step, webOnboardingSession]);

  const continueFromInterstitial = () => {
    if (activeInterstitialStep === null) {
      return;
    }
    setSeenInterstitials((current) => ({ ...current, [activeInterstitialStep]: true }));
    setActiveInterstitialStep(null);
  };

  useEffect(() => {
    if (activeInterstitialStep !== null) {
      return;
    }
    if (interstitialByStep[step] && !seenInterstitials[step]) {
      setActiveInterstitialStep(step);
    }
  }, [step, seenInterstitials, activeInterstitialStep, interstitialByStep]);

  const finishWebOnboarding = () => {
    if (!webOnboardingSession) {
      console.error("finishWebOnboarding: missing webOnboardingSession");
      return;
    }
    const yearsExperience = yearsExperienceApproxFromExperienceBand(form.experienceBand);
    const resolvedFullName =
      joinWebOnboardingFullName(form.firstName, form.lastName) || webOnboardingSession.user.fullName;

    const payload: ProfessionalWebOnboardingPayload = {
      fullName: resolvedFullName,
      email: form.email.trim().toLowerCase(),
      password: form.password,
      professionalTitle: form.professionalTitle,
      specialization: "",
      experienceBand: form.experienceBand,
      practiceBand: form.practiceBand,
      gender: form.gender,
      birthCountry: form.birthCountry,
      residencyCountry: form.residencyCountry.trim().toUpperCase(),
      focusAreas: form.focusAreas,
      therapyModalities: form.therapyModalities,
      languages: form.languages,
      graduationYear: null,
      yearsExperience,
      bio: form.about,
      shortDescription: form.shortDescription,
      therapeuticApproach: combineTherapeuticApproach(form.therapyModalities, form.methodology),
      sessionPriceArs: computedSessionPriceArs,
      sessionPriceUsd: form.sessionPriceUsd.trim() ? Number(form.sessionPriceUsd) : null,
      discount4: form.discount4.trim() ? Number(form.discount4) : null,
      discount8: form.discount8.trim() ? Number(form.discount8) : null,
      discount12: form.discount12.trim() ? Number(form.discount12) : null,
      photoUrl: form.profilePhotoPreview || null,
      videoUrl: form.videoPreview || null,
      videoCoverUrl: null,
      stripeDocUrl: form.stripeDocPreview || null,
      stripeVerified: form.stripeVerified,
      stripeVerificationStarted: form.stripeVerificationStarted,
      diplomas: form.diplomas
        .filter((diploma) => diploma.institution.trim() && diploma.degree.trim() && diploma.startYear && diploma.graduationYear)
        .map((diploma) => ({
          institution: diploma.institution.trim(),
          degree: diploma.degree.trim(),
          startYear: Number(diploma.startYear),
          graduationYear: Number(diploma.graduationYear),
          documentUrl: diploma.diplomaPreview || null
        }))
    };

    const meta: ProfessionalWebOnboardingFinishMeta = {
      token: webOnboardingSession.token,
      emailVerificationRequired: webOnboardingSession.emailVerificationRequired,
      user: {
        id: webOnboardingSession.user.id,
        fullName: resolvedFullName,
        email: webOnboardingSession.user.email,
        emailVerified: webOnboardingSession.user.emailVerified,
        professionalProfileId: webOnboardingSession.user.professionalProfileId,
        avatarUrl: webOnboardingSession.user.avatarUrl ?? null
      }
    };

    input.onFinish(payload, meta);
  };

  useEffect(() => {
    if (activeInterstitialStep === null && !showCompletionCelebration) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (showCompletionCelebration) {
        setShowCompletionCelebration(false);
        return;
      }

      if (activeInterstitialStep !== null) {
        continueFromInterstitial();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeInterstitialStep, showCompletionCelebration]);

  return {
    step,
    setStep,
    maxReachedStep,
    labels,
    stepSubtitles,
    form,
    years,
    requiresTurnstileWidget,
    turnstileSiteKey,
    turnstileRef,
    webPhotoInputRef,
    webVideoInputRef,
    webDiplomaInputRef,
    webStripeDocInputRef,
    activeDiplomaUploadIndex,
    setActiveDiplomaUploadIndex,
    update,
    updateDiploma,
    addDiploma,
    toggleLanguage,
    toggleFocusArea,
    toggleTherapyModality,
    clampDiscountInput,
    discountedPriceLabelArs,
    discountedPriceLabelUsd,
    computedSessionPriceArs,
    usdArsRate,
    usdArsRateError,
    canContinue,
    handleContinue,
    sessionPriceBounds,
    pricingStepError,
    credentialsStepError,
    credentialsChecking,
    registerInFlight,
    onTurnstileSuccess,
    onTurnstileExpire,
    webOnboardingSession,
    resetWebOnboardingSession,
    resendVerificationEmail,
    resendVerificationLoading,
    resendVerificationMessage,
    resendVerificationError,
    devVerifyEmailInLocalDevelopment,
    devVerifyLoading,
    devVerifyError,
    activeInterstitialStep,
    interstitialByStep,
    continueFromInterstitial,
    showCompletionCelebration,
    setShowCompletionCelebration,
    finishWebOnboarding
  };
}
