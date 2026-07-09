import { Turnstile } from "@marsidev/react-turnstile";
import { useEffect, useMemo, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { compressImageDataUrl, fileToDataUrl, mediaPreviewFromFile, readVideoFileForUpload } from "../../app/utils/mediaPreview";
import { RESIDENCY_COUNTRY_OPTIONS } from "@therapy/types";
import { LATIN_AMERICA_COUNTRY_OPTIONS } from "../constants/latinAmericaCountries";
import { ProfessionalFocusAreasPicker } from "./ProfessionalFocusAreasPicker";
import {
  ProfessionalIdentityStepProgress,
  type IdentityStepSegment
} from "./ProfessionalIdentityStepProgress";
import { ProfessionalPayoutSetupPanel } from "./ProfessionalPayoutSetupPanel";
import {
  PROFESSIONAL_VIDEO_MAX_DURATION_SEC
} from "../constants/professionalProfileGuidanceCopy";
import { PROFESSIONAL_THERAPY_MODALITY_ROWS } from "../constants/professionalTherapyModalityOptions";
import { WEB_PROFESSIONAL_TITLE_OPTIONS_ES } from "../constants/webProfessionalTitleOptions";
import type { ProfessionalWebOnboardingFinishMeta, ProfessionalWebOnboardingPayload } from "../types";
import {
  type WebInterstitialContent,
  type WebOnboardingSessionState,
  useProfessionalWebOnboardingWizard
} from "../hooks/useProfessionalWebOnboardingWizard";
import type { PendingWebOnboardingAuth } from "../webOnboardingResumeStorage.js";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalWebOnboardingWizard(props: {
  language: AppLanguage;
  onBack: () => void;
  onFinish: (payload: ProfessionalWebOnboardingPayload, meta: ProfessionalWebOnboardingFinishMeta) => void;
  initialWizardStep?: number;
  initialWebSession?: WebOnboardingSessionState | null;
  credentialsSeed?: { email: string; password: string; fullName: string } | null;
  onAfterRegisterPendingAuth?: (data: PendingWebOnboardingAuth) => void;
}) {
  const wizard = useProfessionalWebOnboardingWizard({
    language: props.language,
    onFinish: props.onFinish,
    initialWizardStep: props.initialWizardStep,
    initialWebSession: props.initialWebSession ?? null,
    credentialsSeed: props.credentialsSeed ?? null,
    onAfterRegisterPendingAuth: props.onAfterRegisterPendingAuth
  });

  const interstitialByStep = wizard.interstitialByStep;
  const [mediaStepError, setMediaStepError] = useState("");
  const [identityTherapyUnlocked, setIdentityTherapyUnlocked] = useState(false);
  const therapySectionRef = useRef<HTMLDivElement | null>(null);
  const focusAreasSectionRef = useRef<HTMLDivElement | null>(null);
  const languagesSectionRef = useRef<HTMLDivElement | null>(null);
  const focusAreasWereVisibleRef = useRef(false);

  const {
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
    discountedPriceLabelUsd,
    discountedPriceLabelLocal,
    proDisplayCurrency,
    sessionPriceLocalLabel,
    usdArsRateError,
    canContinue,
    handleContinue,
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
    continueFromInterstitial,
    showCompletionCelebration,
    setShowCompletionCelebration,
    finishWebOnboarding
  } = wizard;

  const identityReveal = useMemo(() => {
    const hasNames = Boolean(form.firstName.trim() && form.lastName.trim());
    const hasTitle = Boolean(form.professionalTitle.trim());
    const hasCareerBasics = Boolean(form.experienceBand && form.practiceBand && form.gender);
    const hasResidency = form.residencyCountry.trim().length === 2;

    return {
      showCareer: hasNames && hasTitle,
      showLocation: hasNames && hasTitle && hasCareerBasics,
      showLanguages: hasResidency,
      showFocusAreas: hasResidency && form.languages.length > 0,
      showTherapyModalities: hasResidency && form.focusAreas.length > 0 && identityTherapyUnlocked
    };
  }, [form, identityTherapyUnlocked]);

  const identitySegments = useMemo(() => {
    const hasNames = Boolean(form.firstName.trim() && form.lastName.trim());
    const hasTitle = Boolean(form.professionalTitle.trim());
    const hasCareerBasics = Boolean(form.experienceBand && form.practiceBand && form.gender);
    const hasResidency = form.residencyCountry.trim().length === 2;

    let reached: IdentityStepSegment = "basic";
    if (hasNames && hasTitle && hasCareerBasics && hasResidency && form.languages.length > 0) {
      reached = identityTherapyUnlocked ? "therapy" : "focus";
    } else if (hasNames && hasTitle && hasCareerBasics && hasResidency) {
      reached = "languages";
    } else if (hasNames && hasTitle && hasCareerBasics) {
      reached = "location";
    } else if (hasNames && hasTitle) {
      reached = "basic";
    }

    let active: IdentityStepSegment = "basic";
    if (identityReveal.showFocusAreas && !identityTherapyUnlocked) {
      active = "focus";
    } else if (identityTherapyUnlocked) {
      active = "therapy";
    } else if (identityReveal.showLanguages) {
      active = "languages";
    } else if (identityReveal.showLocation) {
      active = "location";
    } else if (identityReveal.showCareer) {
      active = "location";
    } else if (hasNames && hasTitle) {
      active = "basic";
    }

    return { active, reached };
  }, [form, identityReveal, identityTherapyUnlocked]);

  const identityFooterAdvance = useMemo((): {
    canAdvance: boolean;
    action: "scroll-languages" | "unlock-therapy" | "next-wizard-step" | null;
  } => {
    const hasNames = Boolean(form.firstName.trim() && form.lastName.trim());
    const hasTitle = Boolean(form.professionalTitle.trim());
    const hasCareerBasics = Boolean(form.experienceBand && form.practiceBand && form.gender);
    const hasBirthCountry = Boolean(form.birthCountry);
    const hasResidency = form.residencyCountry.trim().length === 2;

    if (!hasNames || !hasTitle || !hasCareerBasics) {
      return { canAdvance: false, action: null };
    }
    if (!hasBirthCountry || !hasResidency) {
      return { canAdvance: hasBirthCountry && hasResidency, action: "scroll-languages" };
    }
    if (form.languages.length === 0) {
      return { canAdvance: false, action: null };
    }
    if (form.focusAreas.length === 0) {
      return { canAdvance: false, action: null };
    }
    if (!identityTherapyUnlocked) {
      return { canAdvance: true, action: "unlock-therapy" };
    }
    if (form.therapyModalities.length === 0) {
      return { canAdvance: false, action: null };
    }
    return { canAdvance: true, action: "next-wizard-step" };
  }, [form, identityTherapyUnlocked]);

  const scrollIdentitySection = (ref: { current: HTMLElement | null }) => {
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const unlockIdentityTherapySection = () => {
    if (form.focusAreas.length === 0) {
      return;
    }
    setIdentityTherapyUnlocked(true);
    scrollIdentitySection(therapySectionRef);
  };

  const tryAdvanceFromFooter = () => {
    if (step === 2) {
      const { canAdvance, action } = identityFooterAdvance;
      if (!canAdvance || !action) {
        return;
      }
      if (action === "scroll-languages") {
        scrollIdentitySection(languagesSectionRef);
        return;
      }
      if (action === "unlock-therapy") {
        unlockIdentityTherapySection();
        return;
      }
      void handleContinue();
      return;
    }
    void handleContinue();
  };

  useEffect(() => {
    if (step !== 2) {
      setIdentityTherapyUnlocked(false);
    }
  }, [step]);

  useEffect(() => {
    if (form.focusAreas.length === 0) {
      setIdentityTherapyUnlocked(false);
    }
  }, [form.focusAreas.length]);

  useEffect(() => {
    if (identityReveal.showFocusAreas && !focusAreasWereVisibleRef.current) {
      window.requestAnimationFrame(() => {
        focusAreasSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    focusAreasWereVisibleRef.current = identityReveal.showFocusAreas;
  }, [identityReveal.showFocusAreas]);

  const genderWebOptions = useMemo(
    () =>
      [
        { value: "Hombre", label: t(props.language, { es: "Hombre", en: "Man", pt: "Homem" }) },
        { value: "Mujer", label: t(props.language, { es: "Mujer", en: "Woman", pt: "Mulher" }) },
        {
          value: "Persona no binaria",
          label: t(props.language, { es: "Persona no binaria", en: "Non-binary", pt: "Pessoa nao binaria" })
        },
        {
          value: "Mujer trans",
          label: t(props.language, { es: "Mujer trans", en: "Trans woman", pt: "Mulher trans" })
        },
        {
          value: "Hombre trans",
          label: t(props.language, { es: "Hombre trans", en: "Trans man", pt: "Homem trans" })
        },
        {
          value: "Otra identidad LGBTQ+",
          label: t(props.language, {
            es: "Otra identidad LGBTQ+",
            en: "Another LGBTQ+ identity",
            pt: "Outra identidade LGBTQIA+"
          })
        },
        {
          value: "Prefiero no decirlo",
          label: t(props.language, {
            es: "Prefiero no decirlo",
            en: "Prefer not to say",
            pt: "Prefiro nao dizer"
          })
        }
      ] as const,
    [props.language]
  );

  const renderWebInterstitialVisual = (content: WebInterstitialContent) => {
    if (content.visual === "earnings") {
      return (
        <div className="pro-web-interstitial-visual pro-web-interstitial-visual-phone" aria-hidden="true">
          <div className="pro-web-phone-shell">
            <span className="pro-web-phone-notch" />
            <strong>{content.metric}</strong>
            <small>{content.metricCaption}</small>
            <ul>
              <li><span>Ana</span><em>USD 125</em></li>
              <li><span>Lucas</span><em>USD 95</em></li>
              <li><span>Maria</span><em>USD 160</em></li>
            </ul>
          </div>
        </div>
      );
    }
    if (content.visual === "reservations") {
      return (
        <div className="pro-web-interstitial-visual pro-web-interstitial-visual-phone" aria-hidden="true">
          <div className="pro-web-phone-shell pro-web-phone-shell--dark">
            <span className="pro-web-phone-notch" />
            <strong>12:00</strong>
            <small>viernes</small>
            <div className="pro-web-phone-notice">
              <b>Ana reservó</b>
              <span>hace 2 min</span>
            </div>
            <div className="pro-web-phone-notice">
              <b>Nahuel reservó</b>
              <span>hace 3 min</span>
            </div>
          </div>
        </div>
      );
    }
    if (content.visual === "growth") {
      return (
        <div className="pro-web-interstitial-visual pro-web-interstitial-visual-chart" aria-hidden="true">
          <div className="pro-web-growth-chart">
            <span className="pro-web-growth-line pro-web-growth-line--main" />
            <span className="pro-web-growth-line pro-web-growth-line--base" />
            <div className="pro-web-growth-markers">
              <strong>{content.metric}</strong>
              <small>{content.metricCaption}</small>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="pro-web-interstitial-visual pro-web-interstitial-visual-bars" aria-hidden="true">
        <div className="pro-web-trust-bars">
          <span style={{ height: "28%" }} />
          <span style={{ height: "42%" }} />
          <span style={{ height: "54%" }} />
          <span style={{ height: "66%" }} />
          <span style={{ height: "82%" }} />
        </div>
        <div className="pro-web-trust-metric">
          <strong>{content.metric}</strong>
          <small>{content.metricCaption}</small>
        </div>
      </div>
    );
  };

  return (
    <div className="pro-web-onboarding-shell">
      <section className="pro-web-onboarding">
        <aside className="pro-web-steps">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">←</button>
          <h2>{t(props.language, { es: "Onboarding profesional", en: "Professional onboarding", pt: "Onboarding profissional" })}</h2>
          <ol>
            {labels.map((label, index) => (
              <li
                key={label}
                className={index === step ? "active" : index <= maxReachedStep ? "done" : ""}
              >
                <button
                  type="button"
                  className="pro-web-step-trigger"
                  disabled={index > maxReachedStep}
                  onClick={() => setStep(index)}
                >
                  <span>{index + 1}</span>
                  <p>{label}</p>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div
          className="pro-web-panel"
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
              return;
            }
            // Solo desde inputs de texto/número; textarea (Enter = salto de línea),
            // botones, selects y links conservan su comportamiento nativo.
            const target = event.target as HTMLElement;
            if (target.tagName !== "INPUT") {
              return;
            }
            const advanceDisabled =
              (step === 2 ? !identityFooterAdvance.canAdvance : !canContinue)
              || credentialsChecking
              || registerInFlight;
            if (advanceDisabled) {
              return;
            }
            event.preventDefault();
            tryAdvanceFromFooter();
          }}
        >
          <header className="pro-web-panel-head">
            <div className="pro-web-head-meta">
              <span className="pro-web-step-kicker">
                {t(props.language, { es: "Paso", en: "Step", pt: "Etapa" })} {step + 1}
              </span>
              <small className="pro-web-step-counter">
                {step + 1}/{labels.length}
              </small>
            </div>
            <h1>{labels[step]}</h1>
            {stepSubtitles[step] ? <p>{stepSubtitles[step]}</p> : null}
          </header>

          {step === 0 ? (
            <div className="pro-web-fields pro-web-fields--single">
              <label>
                <span>{t(props.language, { es: "Correo electrónico", en: "Email", pt: "E-mail" })}</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => update({ email: event.target.value, turnstileToken: "" })}
                  placeholder={t(props.language, {
                    es: "nombre@ejemplo.com",
                    en: "name@example.com",
                    pt: "nome@exemplo.com"
                  })}
                />
              </label>
              <label>
                <span>
                  {t(props.language, {
                    es: "Repetir correo electrónico",
                    en: "Confirm email",
                    pt: "Confirmar e-mail"
                  })}
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={form.emailConfirm}
                  onChange={(event) => update({ emailConfirm: event.target.value, turnstileToken: "" })}
                  placeholder={t(props.language, {
                    es: "Igual que el correo anterior",
                    en: "Same as above",
                    pt: "Igual ao e-mail acima"
                  })}
                />
              </label>
              <label>
                <span>{t(props.language, { es: "Contraseña", en: "Password", pt: "Senha" })}</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => update({ password: event.target.value })}
                  placeholder={t(props.language, {
                    es: "Mínimo 8 caracteres",
                    en: "At least 8 characters",
                    pt: "Minimo 8 caracteres"
                  })}
                />
              </label>
              <label>
                <span>{t(props.language, { es: "Repetir contraseña", en: "Repeat password", pt: "Repetir senha" })}</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.passwordConfirm}
                  onChange={(event) => update({ passwordConfirm: event.target.value })}
                  placeholder={t(props.language, {
                    es: "Igual que la anterior",
                    en: "Same as above",
                    pt: "Igual à anterior"
                  })}
                />
              </label>
              {requiresTurnstileWidget && turnstileSiteKey ? (
                <div className="pro-web-turnstile-wrap">
                  <span className="pro-web-field-label-like">
                    {t(props.language, {
                      es: "Verificación de seguridad",
                      en: "Security check",
                      pt: "Verificacao de seguranca"
                    })}
                  </span>
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={turnstileSiteKey}
                    rerenderOnCallbackChange
                    onSuccess={onTurnstileSuccess}
                    onExpire={onTurnstileExpire}
                  />
                </div>
              ) : import.meta.env.DEV ? (
                <p className="pro-web-price-bounds-hint">
                  {t(props.language, {
                    es: "Dev: opcional — definí VITE_TURNSTILE_SITE_KEY (front) y TURNSTILE_SECRET_KEY (API) para exigir captcha en registro.",
                    en: "Dev: optional — set VITE_TURNSTILE_SITE_KEY and API TURNSTILE_SECRET_KEY to require captcha on signup.",
                    pt: "Dev: opcional — defina VITE_TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY na API para exigir captcha."
                  })}
                </p>
              ) : null}
              {credentialsStepError ? <p className="pro-web-field-error">{credentialsStepError}</p> : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="pro-web-fields pro-web-fields--email-sent">
              {!webOnboardingSession ? (
                <p className="pro-web-price-bounds-hint">
                  {t(props.language, {
                    es: "Volvé al paso anterior para crear tu cuenta con correo y contraseña.",
                    en: "Go back one step to create your account with email and password.",
                    pt: "Volte uma etapa para criar sua conta com e-mail e senha."
                  })}
                </p>
              ) : webOnboardingSession.emailVerificationRequired && !webOnboardingSession.user.emailVerified ? (
                <div className="pro-web-email-sent-card">
                  <p className="pro-web-email-sent-lead">
                    {t(props.language, {
                      es: `Te enviamos un enlace a ${webOnboardingSession.user.email}. Abrilo para validar tu correo.`,
                      en: `We sent a link to ${webOnboardingSession.user.email}. Open it to verify your email.`,
                      pt: `Enviamos um link para ${webOnboardingSession.user.email}. Abra para validar seu e-mail.`
                    })}
                  </p>
                  <p className="pro-web-price-bounds-hint">
                    {t(props.language, {
                      es: "Cuando confirmes, esta pantalla avanzará sola. También podés reenviar el correo si no lo encontrás.",
                      en: "When you confirm, this screen will advance on its own. You can also resend the email if you cannot find it.",
                      pt: "Ao confirmar, esta tela avanca sozinha. Voce tambem pode reenviar o e-mail se nao achar."
                    })}
                  </p>
                  <div className="pro-web-verify-pending-actions">
                    <button
                      type="button"
                      className="pro-secondary"
                      disabled={resendVerificationLoading}
                      onClick={() => void resendVerificationEmail()}
                    >
                      {resendVerificationLoading
                        ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
                        : t(props.language, { es: "Reenviar correo", en: "Resend email", pt: "Reenviar e-mail" })}
                    </button>
                    {import.meta.env.DEV ? (
                      <button
                        type="button"
                        className="pro-secondary"
                        disabled={devVerifyLoading}
                        onClick={() => void devVerifyEmailInLocalDevelopment()}
                        title="Llama a POST /api/auth/email-verification/dev-verify (solo si el API corre en NODE_ENV=development)"
                      >
                        {devVerifyLoading
                          ? t(props.language, { es: "Marcando…", en: "Marking…", pt: "Marcando…" })
                          : t(props.language, {
                              es: "Solo dev: marcar correo verificado",
                              en: "Dev only: mark email verified",
                              pt: "So dev: marcar e-mail verificado"
                            })}
                      </button>
                    ) : null}
                  </div>
                  {devVerifyError ? <p className="pro-web-field-error">{devVerifyError}</p> : null}
                  {resendVerificationMessage ? (
                    <p className="pro-web-price-bounds-hint" style={{ color: "#15803d" }}>
                      {resendVerificationMessage}
                    </p>
                  ) : null}
                  {resendVerificationError ? <p className="pro-web-field-error">{resendVerificationError}</p> : null}
                  {credentialsStepError ? <p className="pro-web-field-error">{credentialsStepError}</p> : null}
                </div>
              ) : (
                <div className="pro-web-email-sent-card pro-web-email-sent-card--ok">
                  <p className="pro-web-email-sent-lead">
                    {t(props.language, {
                      es: "Tu correo ya está validado (o no era necesario en este entorno). Podés seguir con tu identidad profesional.",
                      en: "Your email is verified (or verification was not required). You can continue with your professional identity.",
                      pt: "Seu e-mail ja esta validado (ou nao era necessario neste ambiente). Pode seguir com sua identidade profissional."
                    })}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="pro-web-fields pro-web-fields--identity">
              <ProfessionalIdentityStepProgress
                language={props.language}
                active={identitySegments.active}
                reached={identitySegments.reached}
              />
              <div className="pro-web-grid-2">
                <label>
                  <span>{t(props.language, { es: "Nombre", en: "First name", pt: "Nome" })}</span>
                  <input value={form.firstName} onChange={(event) => update({ firstName: event.target.value })} />
                </label>
                <label>
                  <span>{t(props.language, { es: "Apellido", en: "Last name", pt: "Sobrenome" })}</span>
                  <input value={form.lastName} onChange={(event) => update({ lastName: event.target.value })} />
                </label>
              </div>
              <label>
                <span>{t(props.language, { es: "Título profesional", en: "Professional title", pt: "Titulo profissional" })}</span>
                <select
                  className="pro-web-select-full"
                  value={form.professionalTitle}
                  onChange={(event) => update({ professionalTitle: event.target.value })}
                >
                  <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                  {WEB_PROFESSIONAL_TITLE_OPTIONS_ES.map((title) => (
                    <option key={title} value={title}>
                      {title === "Psicólogo"
                        ? t(props.language, { es: "Psicólogo", en: "Psychologist", pt: "Psicologo" })
                        : title === "Psiquiatra"
                          ? t(props.language, { es: "Psiquiatra", en: "Psychiatrist", pt: "Psiquiatra" })
                          : title === "Sexólogo"
                            ? t(props.language, { es: "Sexólogo", en: "Sexologist", pt: "Sexologo" })
                            : title === "Coach"
                              ? t(props.language, { es: "Coach", en: "Coach", pt: "Coach" })
                              : t(props.language, { es: "Nutricionista", en: "Nutritionist", pt: "Nutricionista" })}
                    </option>
                  ))}
                </select>
              </label>
              {identityReveal.showCareer ? (
                <div className="pro-web-identity-section">
                  <div className="pro-web-grid-3">
                    <label>
                      <span>{t(props.language, { es: "Experiencia (rango)", en: "Experience (range)", pt: "Experiencia (faixa)" })}</span>
                      <select value={form.experienceBand} onChange={(event) => update({ experienceBand: event.target.value })}>
                        <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                        <option value="Menos de 1 ano">{t(props.language, { es: "Menos de 1 año", en: "Less than 1 year", pt: "Menos de 1 ano" })}</option>
                        <option value="1-3 anos">{t(props.language, { es: "1-3 años", en: "1-3 years", pt: "1-3 anos" })}</option>
                        <option value="3-6 anos">{t(props.language, { es: "3-6 años", en: "3-6 years", pt: "3-6 anos" })}</option>
                        <option value="6-10 anos">{t(props.language, { es: "6-10 años", en: "6-10 years", pt: "6-10 anos" })}</option>
                        <option value="10-15 anos">{t(props.language, { es: "10-15 años", en: "10-15 years", pt: "10-15 anos" })}</option>
                        <option value="15-20 anos">{t(props.language, { es: "15-20 años", en: "15-20 years", pt: "15-20 anos" })}</option>
                        <option value="Mas de 20 anos">{t(props.language, { es: "Más de 20 años", en: "More than 20 years", pt: "Mais de 20 anos" })}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t(props.language, { es: "Horas de práctica", en: "Practice hours", pt: "Horas de pratica" })}</span>
                      <select value={form.practiceBand} onChange={(event) => update({ practiceBand: event.target.value })}>
                        <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                        <option value="Menos de 500 horas">{t(props.language, { es: "Menos de 500 horas", en: "Less than 500 hours", pt: "Menos de 500 horas" })}</option>
                        <option value="500-1000 horas">{t(props.language, { es: "500-1000 horas", en: "500-1000 hours", pt: "500-1000 horas" })}</option>
                        <option value="1000-3000 horas">{t(props.language, { es: "1000-3000 horas", en: "1000-3000 hours", pt: "1000-3000 horas" })}</option>
                        <option value="3000-5000 horas">{t(props.language, { es: "3000-5000 horas", en: "3000-5000 hours", pt: "3000-5000 horas" })}</option>
                        <option value="Mas de 5000 horas">{t(props.language, { es: "Más de 5000 horas", en: "More than 5000 hours", pt: "Mais de 5000 horas" })}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t(props.language, { es: "Género", en: "Gender", pt: "Genero" })}</span>
                      <select value={form.gender} onChange={(event) => update({ gender: event.target.value })}>
                        <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                        {genderWebOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {identityReveal.showLocation ? (
                    <div className="pro-web-identity-subfields">
                      <label>
                        <span>{t(props.language, { es: "País de nacimiento", en: "Country of birth", pt: "Pais de nascimento" })}</span>
                        <select value={form.birthCountry} onChange={(event) => update({ birthCountry: event.target.value })}>
                          <option value="">{t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}</option>
                          {LATIN_AMERICA_COUNTRY_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>
                          {t(props.language, {
                            es: "País de residencia habitual",
                            en: "Country of residence",
                            pt: "Pais de residencia habitual"
                          })}
                        </span>
                        <select
                          value={form.residencyCountry}
                          onChange={(event) => update({ residencyCountry: event.target.value })}
                        >
                          <option value="">
                            {t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}
                          </option>
                          {RESIDENCY_COUNTRY_OPTIONS.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.names[props.language]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {identityReveal.showLanguages ? (
                <div className="pro-web-identity-section" ref={languagesSectionRef}>
                  <h3 className="pro-web-identity-section-label">
                    {t(props.language, {
                      es: "Idiomas de atención",
                      en: "Session languages",
                      pt: "Idiomas de atendimento"
                    })}
                  </h3>
                  <div className="pro-web-lang-chips" role="group" aria-label={t(props.language, { es: "Idiomas de atención", en: "Session languages", pt: "Idiomas de atendimento" })}>
                    {[
                      { value: "Espanol", label: t(props.language, { es: "Español", en: "Spanish", pt: "Espanhol" }) },
                      { value: "Ingles", label: t(props.language, { es: "Inglés", en: "English", pt: "Ingles" }) },
                      { value: "Portugues", label: t(props.language, { es: "Portugués", en: "Portuguese", pt: "Portugues" }) }
                    ].map((lang) => {
                      const active = form.languages.includes(lang.value);
                      return (
                        <button
                          key={lang.value}
                          type="button"
                          className={`pro-web-lang-chip${active ? " active" : ""}`}
                          aria-pressed={active}
                          onClick={() => toggleLanguage(lang.value)}
                        >
                          {active ? <span className="pro-web-lang-chip-check" aria-hidden="true">✓</span> : null}
                          <span>{lang.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {identityReveal.showFocusAreas ? (
                <div className="pro-web-identity-section pro-web-focus-areas" ref={focusAreasSectionRef}>
                  <h3 className="pro-web-identity-section-label">
                    {t(props.language, {
                      es: "Ámbitos de atención",
                      en: "Focus areas",
                      pt: "Ambitos de atuacao"
                    })}
                  </h3>
                  <ProfessionalFocusAreasPicker
                    language={props.language}
                    selected={form.focusAreas}
                    onToggle={toggleFocusArea}
                    isCurrentStep={identitySegments.active === "focus"}
                    onContinueToTherapy={unlockIdentityTherapySection}
                  />
                </div>
              ) : null}
              {identityReveal.showTherapyModalities ? (
                <div className="pro-web-identity-section pro-web-therapy-block" ref={therapySectionRef}>
                  <div className="pro-web-therapy-grid" role="group">
                    {PROFESSIONAL_THERAPY_MODALITY_ROWS.map((row) => {
                      const selected = form.therapyModalities.includes(row.valueEs);
                      return (
                        <button
                          key={row.valueEs}
                          type="button"
                          className={`pro-web-therapy-card ${selected ? "active" : ""}`}
                          aria-pressed={selected}
                          onClick={() => toggleTherapyModality(row.valueEs)}
                        >
                          <span className="pro-web-therapy-card-title">{t(props.language, row.title)}</span>
                          <span className="pro-web-therapy-card-sub">{t(props.language, row.subtext)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="pro-web-fields">
              <label>
                <span>Acerca de mí</span>
                <textarea
                  autoComplete="off"
                  value={form.about}
                  onChange={(event) => update({ about: event.target.value })}
                />
              </label>
              <label>
                <span>Cómo trabajo</span>
                <textarea
                  autoComplete="off"
                  value={form.methodology}
                  onChange={(event) => update({ methodology: event.target.value })}
                />
              </label>
              <label>
                <span>Descripción corta (250)</span>
                <input
                  autoComplete="off"
                  value={form.shortDescription}
                  onChange={(event) => update({ shortDescription: event.target.value.slice(0, 250) })}
                />
              </label>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="pro-web-fields">
              <p className="pro-web-price-bounds-hint">
                {t(props.language, {
                  es: "Definí el valor de tu sesión en dólares. Este valor se usará para mostrar tu oferta a los pacientes y también como base para terapia de pareja. Luego podrás aplicar descuentos por paquetes.",
                  en: "Set your session price in US dollars. This value will be used to show your offer to patients and as the basis for couples therapy. You can then apply package discounts.",
                  pt: "Defina o valor da sua sessao em dolares. Este valor sera usado para mostrar sua oferta aos pacientes e tambem como base para terapia de casal. Depois podera aplicar descontos por pacotes."
                })}
              </p>
              {usdArsRateError ? (
                <p className="pro-web-field-error" role="status">
                  {t(props.language, {
                    es: "No pudimos obtener el tipo de cambio en este momento. Podés seguir; al guardar el perfil volveremos a intentarlo.",
                    en: "We couldn’t load the exchange rate right now. You can continue; we’ll try again when saving your profile.",
                    pt: "Nao foi possivel obter a cotacao agora. Voce pode continuar; ao salvar o perfil tentaremos de novo."
                  })}
                </p>
              ) : null}
              {pricingStepError ? <p className="pro-web-field-error">{pricingStepError}</p> : null}
              <label>
                <span>
                  {t(props.language, {
                    es: "Precio de referencia por sesión (USD)",
                    en: "Reference price per session (USD)",
                    pt: "Preco de referencia por sessao (USD)"
                  })}
                </span>
                <input
                  inputMode="numeric"
                  value={form.sessionPriceUsd}
                  onChange={(event) => update({ sessionPriceUsd: event.target.value.replace(/\D/g, "") })}
                />
              </label>
              {sessionPriceLocalLabel ? (
                <p className="pro-web-price-ars-preview">
                  {proDisplayCurrency === "ARS"
                    ? t(props.language, {
                        es: `Equivalente orientativo: ${sessionPriceLocalLabel} por sesión (tipo de cambio oficial, redondeado al múltiplo de 2.000 más cercano).`,
                        en: `Indicative equivalent: ${sessionPriceLocalLabel} per session (official rate, rounded to the nearest ARS 2,000).`,
                        pt: `Equivalente indicativo: ${sessionPriceLocalLabel} por sessao (cotacao oficial, arredondado ao multiplo de 2.000 mais proximo).`
                      })
                    : t(props.language, {
                        es: `Equivalente orientativo en tu moneda: ${sessionPriceLocalLabel} por sesión (referencia según tipo de cambio; el cobro base es en USD).`,
                        en: `Indicative equivalent in your currency: ${sessionPriceLocalLabel} per session (reference at current FX; base charge is in USD).`,
                        pt: `Equivalente indicativo na sua moeda: ${sessionPriceLocalLabel} por sessao (referencia pela cotacao; a cobranca base e em USD).`
                      })}
                </p>
              ) : null}
              <div className="pro-web-discount-packages">
                <article className="pro-web-discount-card">
                  <strong>{t(props.language, { es: "4 sesiones", en: "4 sessions", pt: "4 sessoes" })}</strong>
                  <small className="pro-web-discount-cap">
                    {t(props.language, { es: "Máx. 5%", en: "Max 5%", pt: "Max. 5%" })}
                  </small>
                  <label className="pro-web-percent-input">
                    <input
                      value={form.discount4}
                      onChange={(event) => update({ discount4: clampDiscountInput(event.target.value, 5) })}
                    />
                    <em>%</em>
                  </label>
                  <small className="pro-web-discount-total">
                    {[discountedPriceLabelLocal(form.discount4), discountedPriceLabelUsd(form.discount4)]
                      .filter(Boolean)
                      .join(" · ") || "\u00A0"}
                  </small>
                </article>
                <article className="pro-web-discount-card">
                  <strong>{t(props.language, { es: "8 sesiones", en: "8 sessions", pt: "8 sessoes" })}</strong>
                  <small className="pro-web-discount-cap">
                    {t(props.language, { es: "Máx. 10%", en: "Max 10%", pt: "Max. 10%" })}
                  </small>
                  <label className="pro-web-percent-input">
                    <input
                      value={form.discount8}
                      onChange={(event) => update({ discount8: clampDiscountInput(event.target.value, 10) })}
                    />
                    <em>%</em>
                  </label>
                  <small className="pro-web-discount-total">
                    {[discountedPriceLabelLocal(form.discount8), discountedPriceLabelUsd(form.discount8)]
                      .filter(Boolean)
                      .join(" · ") || "\u00A0"}
                  </small>
                </article>
                <article className="pro-web-discount-card">
                  <strong>{t(props.language, { es: "12 sesiones", en: "12 sessions", pt: "12 sessoes" })}</strong>
                  <small className="pro-web-discount-cap">
                    {t(props.language, { es: "Máx. 15%", en: "Max 15%", pt: "Max. 15%" })}
                  </small>
                  <label className="pro-web-percent-input">
                    <input
                      value={form.discount12}
                      onChange={(event) => update({ discount12: clampDiscountInput(event.target.value, 15) })}
                    />
                    <em>%</em>
                  </label>
                  <small className="pro-web-discount-total">
                    {[discountedPriceLabelLocal(form.discount12), discountedPriceLabelUsd(form.discount12)]
                      .filter(Boolean)
                      .join(" · ") || "\u00A0"}
                  </small>
                </article>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="pro-web-fields pro-web-fields--media">
              {mediaStepError ? <p className="pro-web-field-error" role="alert">{mediaStepError}</p> : null}
              <input
                ref={webPhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) {
                    return;
                  }
                  try {
                    setMediaStepError("");
                    const raw = await fileToDataUrl(file);
                    const preview = await compressImageDataUrl(raw, 1600, 0.82);
                    update({ profilePhotoReady: true, profilePhotoPreview: preview });
                  } catch {
                    setMediaStepError(
                      t(props.language, {
                        es: "No pudimos cargar la foto. Probá con otra imagen.",
                        en: "We could not load the photo. Try another image.",
                        pt: "Nao foi possivel carregar a foto. Tente outra imagem."
                      })
                    );
                  }
                }}
              />
              <input
                ref={webVideoInputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) {
                    return;
                  }
                  try {
                    setMediaStepError("");
                    const uploaded = await readVideoFileForUpload(file, {
                      maxDurationSec: PROFESSIONAL_VIDEO_MAX_DURATION_SEC
                    });
                    update({
                      videoReady: true,
                      videoFileUrl: uploaded.dataUrl,
                      videoPreview: uploaded.previewDataUrl
                    });
                  } catch {
                    setMediaStepError(
                      t(props.language, {
                        es: `El video debe ser MP4/MOV/WebM, hasta 30 MB y máximo ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC} segundos.`,
                        en: `Video must be MP4/MOV/WebM, up to 30 MB and at most ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC} seconds.`,
                        pt: `O video deve ser MP4/MOV/WebM, ate 30 MB e no maximo ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC} segundos.`
                      })
                    );
                  }
                }}
              />
              <div className="pro-web-media-field">
                <span>{t(props.language, { es: "Foto de perfil", en: "Profile photo", pt: "Foto de perfil" })}</span>
                <div className="pro-web-media-upload">
                  {form.profilePhotoPreview ? (
                    <span className="pro-web-media-preview" aria-hidden="true">
                      <img src={form.profilePhotoPreview} alt="" />
                    </span>
                  ) : null}
                  <button type="button" className={form.profilePhotoReady ? "done" : ""} onClick={() => webPhotoInputRef.current?.click()}>
                    {form.profilePhotoReady
                      ? t(props.language, { es: "Cambiar foto", en: "Change photo", pt: "Alterar foto" })
                      : t(props.language, { es: "Cargar foto", en: "Upload photo", pt: "Enviar foto" })}
                  </button>
                </div>
              </div>
              <div className="pro-web-media-field">
                <span>{t(props.language, { es: "Video de presentación", en: "Intro video", pt: "Video de apresentacao" })}</span>
                <div className="pro-web-media-upload">
                  {form.videoPreview ? (
                    <span className="pro-web-media-preview" aria-hidden="true">
                      <img src={form.videoPreview} alt="" />
                    </span>
                  ) : null}
                  <button type="button" className={form.videoReady ? "done" : ""} onClick={() => webVideoInputRef.current?.click()}>
                    {form.videoReady
                      ? t(props.language, { es: "Cambiar video", en: "Change video", pt: "Alterar video" })
                      : t(props.language, { es: "Cargar video", en: "Upload video", pt: "Enviar video" })}
                  </button>
                </div>
                <small className="pro-web-field-hint">
                  {t(props.language, {
                    es: `Hasta ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC} s · MP4, MOV o WebM`,
                    en: `Up to ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC}s · MP4, MOV, or WebM`,
                    pt: `Ate ${PROFESSIONAL_VIDEO_MAX_DURATION_SEC} s · MP4, MOV ou WebM`
                  })}
                </small>
              </div>
              <details className="pro-web-video-script-details">
                <summary>
                  {t(props.language, {
                    es: "Ver guion sugerido",
                    en: "View suggested script",
                    pt: "Ver roteiro sugerido"
                  })}
                </summary>
                <p>
                  {t(props.language, {
                    es: "«Hola, soy [Nombre], psicólogo/a y especialista de Motivar Care. Trabajo acompañando a personas en [área principal]. Mi enfoque principal es [breve mención]. Podés agendar una sesión conmigo a través de la plataforma cuando lo necesites.»",
                    en: "“Hello, I’m [Name], a psychologist and Motivar Care specialist. I support people with [main area]. My main approach is [brief mention]. You can book a session with me on the platform whenever you need.”",
                    pt: "“Ola, sou [Nome], psicologo/a e especialista da Motivar Care. Acompanho pessoas em [area principal]. Meu enfoque principal e [breve mencao]. Voce pode agendar uma sessao comigo pela plataforma quando precisar.”"
                  })}
                </p>
              </details>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="pro-web-fields">
              <input
                ref={webDiplomaInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file || activeDiplomaUploadIndex === null) {
                    return;
                  }
                  const preview = await mediaPreviewFromFile(file);
                  updateDiploma(activeDiplomaUploadIndex, { diplomaUploaded: true, diplomaPreview: preview ?? "" });
                  setActiveDiplomaUploadIndex(null);
                }}
              />
              <div className="pro-web-education-copy">
                <h3>{t(props.language, { es: "Añadí tus diplomas", en: "Add your diplomas", pt: "Adicione seus diplomas" })}</h3>
                <p>
                  {t(props.language, {
                    es: "El 97% de nuestros clientes revisa la formación del especialista antes de reservar una sesión. Podés cargar más de un diploma.",
                    en: "97% of our clients review specialist education before booking. Your education and courses shape your profile value.",
                    pt: "97% dos clientes revisam a formacao antes de reservar. Sua educacao e cursos definem o valor do seu perfil."
                  })}
                </p>
              </div>
              {form.diplomas.map((diploma, index) => (
                <div className="pro-web-diploma-card" key={`web-diploma-${index}`}>
                  <h4>{t(props.language, { es: `Diploma #${index + 1}`, en: `Diploma #${index + 1}`, pt: `Diploma #${index + 1}` })}</h4>
                  <label><span>Institución</span><input value={diploma.institution} onChange={(event) => updateDiploma(index, { institution: event.target.value })} /></label>
                  <label><span>Título / Especialidad</span><input value={diploma.degree} onChange={(event) => updateDiploma(index, { degree: event.target.value })} /></label>
                  <div className="pro-web-grid-2">
                    <label><span>Año inicio</span><select value={diploma.startYear} onChange={(event) => updateDiploma(index, { startYear: event.target.value })}><option value="">Seleccionar</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
                    <label><span>Año graduación</span><select value={diploma.graduationYear} onChange={(event) => updateDiploma(index, { graduationYear: event.target.value })}><option value="">Seleccionar</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
                  </div>
                  <button
                    type="button"
                    className={`pro-web-diploma-upload ${diploma.diplomaUploaded ? "done" : ""}`}
                    onClick={() => {
                      setActiveDiplomaUploadIndex(index);
                      webDiplomaInputRef.current?.click();
                    }}
                  >
                    {diploma.diplomaUploaded
                      ? t(props.language, { es: "Cambiar diploma", en: "Change diploma", pt: "Alterar diploma" })
                      : t(props.language, { es: "Subí una foto del diploma", en: "Upload diploma photo", pt: "Enviar foto do diploma" })}
                  </button>
                  {diploma.diplomaUploaded ? (
                    <div className="pro-web-diploma-preview" aria-hidden="true">
                      {diploma.diplomaPreview ? <img src={diploma.diplomaPreview} alt="" /> : <span>↻</span>}
                    </div>
                  ) : null}
                </div>
              ))}
              <button type="button" className="pro-web-add-diploma" onClick={addDiploma}>
                {t(props.language, { es: "Agregar otro diploma", en: "Add another diploma", pt: "Adicionar outro diploma" })}
              </button>
            </div>
          ) : null}

          {step === 7 ? (
            <div className="pro-web-fields pro-web-fields--payout">
              <ProfessionalPayoutSetupPanel
                language={props.language}
                provider={form.payoutProvider}
                providerLocked
                residencyCountry={form.residencyCountry}
                form={{
                  legalName: form.payoutLegalName,
                  taxId: form.taxId,
                  accountHolderName: form.payoutAccountHolderName,
                  bankTransferType: form.payoutBankTransferType,
                  bankAccountValue: form.payoutBankAccountValue,
                  bankName: form.payoutBankName,
                  payoutTermsAccepted: form.payoutTermsAccepted,
                  payoutCountry: form.payoutCountry,
                  beneficiaryFirstName: form.payoutBeneficiaryFirstName,
                  beneficiaryLastName: form.payoutBeneficiaryLastName,
                  documentType: form.payoutDocumentType,
                  bankCode: form.payoutBankCode,
                  bankBranch: form.payoutBankBranch,
                  accountType: form.payoutAccountType
                }}
                onFormChange={(patch) => {
                  update({
                    ...(patch.legalName !== undefined ? { payoutLegalName: patch.legalName } : {}),
                    ...(patch.taxId !== undefined ? { taxId: patch.taxId } : {}),
                    ...(patch.accountHolderName !== undefined
                      ? { payoutAccountHolderName: patch.accountHolderName }
                      : {}),
                    ...(patch.bankTransferType !== undefined
                      ? { payoutBankTransferType: patch.bankTransferType }
                      : {}),
                    ...(patch.bankAccountValue !== undefined
                      ? { payoutBankAccountValue: patch.bankAccountValue }
                      : {}),
                    ...(patch.bankName !== undefined ? { payoutBankName: patch.bankName } : {}),
                    ...(patch.payoutTermsAccepted !== undefined
                      ? { payoutTermsAccepted: patch.payoutTermsAccepted }
                      : {}),
                    ...(patch.payoutCountry !== undefined ? { payoutCountry: patch.payoutCountry } : {}),
                    ...(patch.beneficiaryFirstName !== undefined
                      ? { payoutBeneficiaryFirstName: patch.beneficiaryFirstName }
                      : {}),
                    ...(patch.beneficiaryLastName !== undefined
                      ? { payoutBeneficiaryLastName: patch.beneficiaryLastName }
                      : {}),
                    ...(patch.documentType !== undefined ? { payoutDocumentType: patch.documentType } : {}),
                    ...(patch.bankCode !== undefined ? { payoutBankCode: patch.bankCode } : {}),
                    ...(patch.bankBranch !== undefined ? { payoutBankBranch: patch.bankBranch } : {}),
                    ...(patch.accountType !== undefined ? { payoutAccountType: patch.accountType } : {})
                  });
                }}
                docPreview={form.stripeDocPreview}
                docInputRef={webStripeDocInputRef}
                onDocSelected={async (file) => {
                  const preview = await mediaPreviewFromFile(file);
                  update({ stripeDocPreview: preview ?? "" });
                }}
                payoutStatus="draft"
              />
            </div>
          ) : null}

          <div className="pro-web-miscellany" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <footer className="pro-web-actions">
            <button
              type="button"
              className="pro-secondary"
              disabled={step === 0}
              onClick={() => {
                if (step === 1) {
                  resetWebOnboardingSession();
                }
                setStep((current) => Math.max(0, current - 1));
              }}
            >
              {t(props.language, { es: "Anterior", en: "Back", pt: "Anterior" })}
            </button>
            <button
              type="button"
              className="pro-primary"
              disabled={
                (step === 2 ? !identityFooterAdvance.canAdvance : !canContinue)
                || credentialsChecking
                || registerInFlight
              }
              onClick={() => tryAdvanceFromFooter()}
            >
              {registerInFlight && step === 0
                ? t(props.language, { es: "Creando cuenta…", en: "Creating account…", pt: "Criando conta…" })
                : credentialsChecking && step === 0
                  ? t(props.language, { es: "Verificando correo…", en: "Checking email…", pt: "Verificando e-mail…" })
                  : step === labels.length - 1
                    ? t(props.language, { es: "Continuar al alta", en: "Continue to sign up", pt: "Continuar para cadastro" })
                    : t(props.language, { es: "Siguiente paso", en: "Next step", pt: "Proximo passo" })}
            </button>
          </footer>
        </div>
      </section>

      {activeInterstitialStep !== null && interstitialByStep[activeInterstitialStep] ? (
        <div className="pro-web-interstitial" role="dialog" aria-modal="true">
          <article className={`pro-web-interstitial-card pro-web-interstitial-card--${interstitialByStep[activeInterstitialStep]?.visual}`}>
            <div className="pro-web-interstitial-copy">
              <span className="pro-web-interstitial-kicker">{interstitialByStep[activeInterstitialStep]?.kicker}</span>
              <h3>{interstitialByStep[activeInterstitialStep]?.title}</h3>
              <p>{interstitialByStep[activeInterstitialStep]?.body}</p>
              <button type="button" className="pro-primary" onClick={continueFromInterstitial}>
                {interstitialByStep[activeInterstitialStep]?.cta}
              </button>
            </div>
            {interstitialByStep[activeInterstitialStep] ? renderWebInterstitialVisual(interstitialByStep[activeInterstitialStep] as WebInterstitialContent) : null}
          </article>
        </div>
      ) : null}

      {showCompletionCelebration ? (
        <div className="pro-web-interstitial" role="dialog" aria-modal="true">
          <article className="pro-web-interstitial-card pro-web-interstitial-card--celebration">
            <div className="pro-web-interstitial-copy">
              <span className="pro-web-interstitial-kicker">
                {t(props.language, { es: "Onboarding finalizado", en: "Onboarding complete", pt: "Onboarding finalizado" })}
              </span>
              <h3>{t(props.language, { es: "Tu perfil profesional ya esta listo", en: "Your professional profile is ready", pt: "Seu perfil profissional esta pronto" })}</h3>
              <p>
                {t(props.language, {
                  es: "Recibimos tus datos de cobro. Los revisamos en 1–2 días hábiles; mientras tanto podés seguir con el alta y conectar tu agenda.",
                  en: "We received your payout details. We'll review them within 1–2 business days; meanwhile you can finish sign-up and connect your calendar.",
                  pt: "Recebemos seus dados de recebimento. Revisamos em 1–2 dias uteis; enquanto isso voce pode concluir o cadastro e conectar a agenda."
                })}
              </p>
              <div className="pro-web-celebration-actions">
                <button type="button" className="pro-secondary" onClick={() => setShowCompletionCelebration(false)}>
                  {t(props.language, { es: "Seguir editando", en: "Keep editing", pt: "Continuar editando" })}
                </button>
                <button type="button" className="pro-primary" onClick={finishWebOnboarding}>
                  {t(props.language, { es: "Acceder a mi cuenta", en: "Access my account", pt: "Acessar minha conta" })}
                </button>
              </div>
            </div>
            <div className="pro-web-interstitial-visual pro-web-interstitial-visual-celebration" aria-hidden="true">
              <div className="pro-web-celebration-orbit" />
              <div className="pro-web-celebration-core" />
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}
