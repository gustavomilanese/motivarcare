import { Turnstile } from "@marsidev/react-turnstile";
import { useMemo } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { mediaPreviewFromFile } from "../../app/utils/mediaPreview";
import { RESIDENCY_COUNTRY_OPTIONS } from "@therapy/types";
import { ATTENTION_AREA_OPTIONS_ES, LATIN_AMERICA_COUNTRY_OPTIONS } from "../constants/latinAmericaCountries";
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
  onSwitchToMobile: () => void;
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
    discountedPriceLabelArs,
    discountedPriceLabelUsd,
    computedSessionPriceArs,
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
          <button type="button" className="pro-web-mobile-switch" onClick={props.onSwitchToMobile}>
            {t(props.language, { es: "Probar version mobile", en: "Try mobile version", pt: "Testar versao mobile" })}
          </button>
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

        <div className="pro-web-panel">
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
            <div className="pro-web-fields">
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
              <div className="pro-web-identity-rest">
                  <div className="pro-web-grid-3">
                    <label>
                      <span>Experiencia (rango)</span>
                      <select value={form.experienceBand} onChange={(event) => update({ experienceBand: event.target.value })}>
                        <option value="">Seleccionar</option>
                        <option value="Menos de 1 ano">Menos de 1 año</option>
                        <option value="1-3 anos">1-3 años</option>
                        <option value="3-6 anos">3-6 años</option>
                        <option value="6-10 anos">6-10 años</option>
                        <option value="10-15 anos">10-15 años</option>
                        <option value="15-20 anos">15-20 años</option>
                        <option value="Mas de 20 anos">Más de 20 años</option>
                      </select>
                    </label>
                    <label>
                      <span>Horas de práctica</span>
                      <select value={form.practiceBand} onChange={(event) => update({ practiceBand: event.target.value })}>
                        <option value="">Seleccionar</option>
                        <option value="Menos de 500 horas">Menos de 500 horas</option>
                        <option value="500-1000 horas">500-1000 horas</option>
                        <option value="1000-3000 horas">1000-3000 horas</option>
                        <option value="3000-5000 horas">3000-5000 horas</option>
                        <option value="Mas de 5000 horas">Más de 5000 horas</option>
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
                  <label>
                    <span>País de nacimiento</span>
                    <select value={form.birthCountry} onChange={(event) => update({ birthCountry: event.target.value })}>
                      <option value="">Seleccionar</option>
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
                  <div>
                    <span>Idiomas</span>
                    <div className="pro-web-checks">
                      {["Espanol", "Ingles", "Portugues"].map((lang) => (
                        <button key={lang} type="button" className={form.languages.includes(lang) ? "active" : ""} onClick={() => toggleLanguage(lang)}>
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pro-web-focus-areas">
                    <span>{t(props.language, { es: "Áreas de atención", en: "Areas of focus", pt: "Areas de atencao" })}</span>
                    <div className="pro-web-checks">
                      {ATTENTION_AREA_OPTIONS_ES.map((area) => (
                        <button
                          key={area}
                          type="button"
                          className={form.focusAreas.includes(area) ? "active" : ""}
                          onClick={() => toggleFocusArea(area)}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pro-web-therapy-block">
                    <span>
                      {t(props.language, {
                        es: "Tipo de terapia",
                        en: "Type of therapy",
                        pt: "Tipo de terapia"
                      })}
                    </span>
                    <p className="pro-web-therapy-hint">
                      {t(props.language, {
                        es: "Marcá una o varias. Coincide con los enfoques que ofrecés en tu práctica.",
                        en: "Select one or more approaches you offer in your practice.",
                        pt: "Marque uma ou mais abordagens que voce oferece na sua pratica."
                      })}
                    </p>
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
              </div>
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
                  es: "Acá deberás definir el valor de tu sesión de referencia en dólares. Será usada para mostrar tu oferta a los pacientes. Luego podrás definir descuentos por paquetes de sesiones.",
                  en: "Here you’ll set your reference session price in US dollars. It will be used to show your offer to patients. You can then define discounts for session packages.",
                  pt: "Aqui voce define o valor de referencia da sessao em dolares. Sera usado para mostrar sua oferta aos pacientes. Depois podera definir descontos em pacotes de sessoes."
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
              {computedSessionPriceArs !== null ? (
                <p className="pro-web-price-ars-preview">
                  {t(props.language, {
                    es: `Equivalente orientativo en pesos: ${computedSessionPriceArs.toLocaleString("es-AR")} ARS (tipo de cambio oficial, redondeado a 1.000 ARS).`,
                    en: `Indicative ARS equivalent: ${computedSessionPriceArs.toLocaleString("en-US")} ARS (official rate, rounded up to ARS 1,000).`,
                    pt: `Equivalente indicativo em pesos: ${computedSessionPriceArs.toLocaleString("pt-BR")} ARS (cotacao oficial, arredondado a 1.000 ARS).`
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
                    {[discountedPriceLabelArs(form.discount4), discountedPriceLabelUsd(form.discount4)]
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
                    {[discountedPriceLabelArs(form.discount8), discountedPriceLabelUsd(form.discount8)]
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
                    {[discountedPriceLabelArs(form.discount12), discountedPriceLabelUsd(form.discount12)]
                      .filter(Boolean)
                      .join(" · ") || "\u00A0"}
                  </small>
                </article>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="pro-web-fields">
              <input
                ref={webPhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  const preview = await mediaPreviewFromFile(file);
                  update({ profilePhotoReady: true, profilePhotoPreview: preview ?? "" });
                }}
              />
              <input
                ref={webVideoInputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  const preview = await mediaPreviewFromFile(file);
                  update({ videoReady: true, videoPreview: preview ?? "" });
                }}
              />
              <div className="pro-web-media-row">
                <div className="pro-web-media-row-main">
                  <strong>Foto de perfil</strong>
                  {form.profilePhotoPreview ? (
                    <span className="pro-web-media-preview" aria-hidden="true">
                      <img src={form.profilePhotoPreview} alt="" />
                    </span>
                  ) : null}
                </div>
                <button type="button" className={form.profilePhotoReady ? "done" : ""} onClick={() => webPhotoInputRef.current?.click()}>
                  {form.profilePhotoReady ? "Cargada" : "Cargar"}
                </button>
              </div>
              <div className="pro-web-media-row">
                <div className="pro-web-media-row-main">
                  <strong>Video de presentación</strong>
                  {form.videoPreview ? (
                    <span className="pro-web-media-preview" aria-hidden="true">
                      <img src={form.videoPreview} alt="" />
                    </span>
                  ) : null}
                </div>
                <button type="button" className={form.videoReady ? "done" : ""} onClick={() => webVideoInputRef.current?.click()}>
                  {form.videoReady ? "Cargado" : "Cargar"}
                </button>
              </div>
              <div className="pro-web-video-script">
                <strong>
                  {t(props.language, {
                    es: "Texto orientativo para tu video",
                    en: "Suggested script for your video",
                    pt: "Texto orientativo para seu video"
                  })}
                </strong>
                <p>
                  {t(props.language, {
                    es: "Te dejamos un texto orientativo para dar un mensaje claro en el video:",
                    en: "Here is a suggested outline for a clear message in your video:",
                    pt: "Deixamos um texto orientativo para uma mensagem clara no video:"
                  })}
                </p>
                <blockquote>
                  {t(props.language, {
                    es: "«Hola, soy [Nombre], psicólogo/a y especialista de Motivar Care. Trabajo acompañando a personas en [área principal: ansiedad, estrés, relaciones, adicciones, etc.] Mi enfoque principal es [breve mención: cognitivo-conductual, integrador, humanista, etc.] Podés agendar una sesión conmigo a través de la plataforma cuando lo necesites»",
                    en: "“Hello, I’m [Name], a psychologist and Motivar Care specialist. I support people with [main area: anxiety, stress, relationships, addictions, etc.] My main approach is [brief mention: CBT, integrative, humanistic, etc.] You can book a session with me on the platform whenever you need.”",
                    pt: "“Ola, sou [Nome], psicologo/a e especialista da Motivar Care. Acompanho pessoas em [area principal: ansiedade, estresse, relacionamentos, dependencias, etc.] Meu enfoque principal e [breve mencao: cognitivo-comportamental, integrador, humanista, etc.] Voce pode agendar uma sessao comigo pela plataforma quando precisar.”"
                  })}
                </blockquote>
              </div>
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
            <div className="pro-web-fields pro-web-stripe-fields">
              <input
                ref={webStripeDocInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  const preview = await mediaPreviewFromFile(file);
                  update({ stripeDocPreview: preview ?? "" });
                }}
              />
              <div className="pro-web-education-copy">
                <h3>{t(props.language, { es: "Integración con Stripe", en: "Stripe integration", pt: "Integracao com Stripe" })}</h3>
                <p>
                  {t(props.language, {
                    es: "Valide su identidad y documentos para activar cobros. Este paso suele tardar entre 3 y 5 minutos.",
                    en: "Validate your identity and documents to activate payouts. This step usually takes 3 to 5 minutes.",
                    pt: "Valide sua identidade e documentos para ativar pagamentos. Esta etapa costuma levar de 3 a 5 minutos."
                  })}
                </p>
                <p className="pro-web-price-bounds-hint">
                  {t(props.language, {
                    es: "El enlace a Stripe se abre en una pestaña nueva: volvé a esta ventana para marcar «Ya validé» y seguir al registro de cuenta.",
                    en: "Stripe opens in a new tab—return here to click “I already validated” and continue to account signup.",
                    pt: "O Stripe abre em nova aba: volte a esta janela para marcar «Ja validei» e seguir para criar a conta."
                  })}
                </p>
              </div>
              <div className="pro-web-media-row pro-web-stripe-doc-row">
                <div className="pro-web-media-row-main">
                  <strong>{t(props.language, { es: "Documento para verificación", en: "Verification document", pt: "Documento para verificacao" })}</strong>
                  {form.stripeDocPreview ? (
                    <span className="pro-web-media-preview" aria-hidden="true">
                      <img src={form.stripeDocPreview} alt="" />
                    </span>
                  ) : null}
                </div>
                <button type="button" className="pro-web-stripe-doc-btn" onClick={() => webStripeDocInputRef.current?.click()}>
                  {form.stripeDocPreview
                    ? t(props.language, { es: "Cambiar", en: "Change", pt: "Alterar" })
                    : t(props.language, { es: "Cargar", en: "Upload", pt: "Enviar" })}
                </button>
              </div>
              <div className="pro-web-grid-2 pro-web-stripe-actions">
                <button
                  type="button"
                  className="pro-web-stripe-connect"
                  onClick={() => {
                    window.open("https://dashboard.stripe.com", "_blank", "noopener,noreferrer");
                    update({ stripeVerificationStarted: true });
                  }}
                >
                  {t(props.language, { es: "Continuar con Stripe", en: "Continue with Stripe", pt: "Continuar com Stripe" })}
                </button>
                <button
                  type="button"
                  className={`pro-web-stripe-verify ${form.stripeVerified ? "done" : ""}`}
                  disabled={!form.stripeVerificationStarted}
                  onClick={() => update({ stripeVerified: true })}
                >
                  {form.stripeVerified
                    ? t(props.language, { es: "Documentos verificados", en: "Documents verified", pt: "Documentos verificados" })
                    : t(props.language, { es: "Ya validé en Stripe", en: "I already validated on Stripe", pt: "Ja validei no Stripe" })}
                </button>
              </div>
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
              disabled={!canContinue || credentialsChecking || registerInFlight}
              onClick={() => void handleContinue()}
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
                  es: "Completaste tus datos y la verificación de cobros. En el siguiente paso podrás acceder a tu cuenta y comenzar a operar en MotivarCare.",
                  en: "You completed your profile data and payout verification. In the next step you can access your account and start operating on MotivarCare.",
                  pt: "Voce concluiu os dados do perfil e a verificacao de pagamentos. No proximo passo podera acessar sua conta e comecar a operar na MotivarCare."
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
