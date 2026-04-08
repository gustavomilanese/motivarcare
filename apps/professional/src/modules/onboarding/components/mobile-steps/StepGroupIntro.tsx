import { useEffect, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import { PATIENT_PORTAL_URL } from "../../../app/services/api";
import { mediaPreviewFromFile } from "../../../app/utils/mediaPreview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalWelcomeGate(props: {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageSwitchRef = useRef<HTMLDivElement | null>(null);
  const languageOptions: Array<{ value: AppLanguage; label: string }> = [
    { value: "es", label: "Español" },
    { value: "en", label: "English" },
    { value: "pt", label: "Português" }
  ];
  const currentLanguageLabel = languageOptions.find((option) => option.value === props.language)?.label ?? "Español";

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!languageSwitchRef.current || languageSwitchRef.current.contains(event.target as Node)) {
        return;
      }
      setLanguageMenuOpen(false);
    }

    if (!languageMenuOpen) {
      return;
    }

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [languageMenuOpen]);

  return (
    <div className="pro-gate-shell">
      <section className="pro-gate-card">
        <div className="pro-gate-topbar">
          <div className="pro-gate-lang-switch" ref={languageSwitchRef}>
            <button
              type="button"
              className="pro-gate-lang-button"
              aria-haspopup="menu"
              aria-expanded={languageMenuOpen}
              onClick={() => setLanguageMenuOpen((current) => !current)}
            >
              <span className="pro-gate-lang-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.8 2.4 4.3 5.4 4.3 9s-1.5 6.6-4.3 9m0-18C9.2 5.4 7.7 8.4 7.7 12s1.5 6.6 4.3 9M4 12h16m-14 5.2h12M6 6.8h12" />
                </svg>
              </span>
              <span className="pro-gate-lang-current">{currentLanguageLabel}</span>
              <span className="pro-gate-lang-caret" aria-hidden="true">▾</span>
            </button>
            {languageMenuOpen ? (
              <div className="pro-gate-lang-menu" role="menu">
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitem"
                    className={props.language === option.value ? "active" : ""}
                    onClick={() => {
                      props.onLanguageChange(option.value);
                      setLanguageMenuOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    {props.language === option.value ? <span aria-hidden="true">✓</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="pro-gate-brand" aria-hidden="true">
          <div className="pro-gate-lockup">
            <div className="pro-gate-logo-mark">
              <span>M</span>
            </div>
            <span className="pro-gate-logo-name">MotivarCare</span>
          </div>
        </div>

        <div className="pro-gate-copy">
          <p className="pro-gate-eyebrow">
            {t(props.language, {
              es: "Portal profesional",
              en: "Professional portal",
              pt: "Portal profissional"
            })}
          </p>
          <h1>
            {t(props.language, {
              es: "Bienvenidos a MotivarCare para psicólogos",
              en: "Welcome to MotivarCare for Psychologists",
              pt: "Boas-vindas ao MotivarCare para psicólogos"
            })}
          </h1>
          <p>
            {t(props.language, {
              es: "Organiza tu agenda con claridad y crece dentro de una plataforma pensada para potenciar tu práctica.",
              en: "Organize your schedule clearly and grow within a platform designed to boost your practice.",
              pt: "Organize sua agenda com clareza e cresca em uma plataforma pensada para potencializar sua pratica."
            })}
          </p>
        </div>

        <div className="pro-gate-actions">
          <button className="pro-primary pro-gate-primary" type="button" onClick={props.onLogin}>
            {t(props.language, { es: "Iniciar Sesión", en: "Sign In", pt: "Entrar" })}
          </button>
          <button className="pro-secondary pro-gate-secondary" type="button" onClick={props.onRegister}>
            {t(props.language, { es: "Registrarse", en: "Register", pt: "Cadastrar-se" })}
          </button>
        </div>

        <button
          className="pro-gate-patient-link"
          type="button"
          onClick={() => {
            window.location.href = PATIENT_PORTAL_URL;
          }}
        >
          {t(props.language, { es: "Busco Psicólogo", en: "I Need a Therapist", pt: "Busco Psicologo" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalRegisterIntro(props: { language: AppLanguage; onContinue: () => void; onBack: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-register-intro-card pro-first-clients-card">
        <header className="pro-register-intro-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-register-intro-copy">
          <h1>
            {t(props.language, {
              es: "Primero, calculemos tus ganancias potenciales con MotivarCare",
              en: "First, let us estimate your potential earnings with MotivarCare",
              pt: "Primeiro, vamos calcular seus ganhos potenciais com o MotivarCare"
            })}
          </h1>
        </div>

        <div className="pro-register-device-wrap" aria-hidden="true">
          <div className="pro-register-device-card">
            <div className="pro-register-phone">
              <div className="pro-register-phone-top">
                <span>9:41</span>
                <span className="pro-register-phone-notch" />
                <span className="pro-register-phone-icons">◔</span>
              </div>
              <div className="pro-register-phone-pill">
                {t(props.language, { es: "Estimado mensual", en: "Monthly estimate", pt: "Estimativa mensal" })}
              </div>
              <strong className="pro-register-phone-amount">$5.173,75</strong>
              <p className="pro-register-phone-subtitle">
                {t(props.language, { es: "Ganancia proyectada", en: "Projected earnings", pt: "Ganhos projetados" })}
              </p>

              <div className="pro-register-phone-list">
                <div className="pro-register-phone-row">
                  <span className="avatar a">A</span>
                  <div>
                    <strong>Ana Martinez</strong>
                    <small>{t(props.language, { es: "4 sesiones", en: "4 sessions", pt: "4 sessoes" })}</small>
                  </div>
                  <em>$125</em>
                </div>
                <div className="pro-register-phone-row">
                  <span className="avatar b">L</span>
                  <div>
                    <strong>Lucas Garcia</strong>
                    <small>{t(props.language, { es: "3 sesiones", en: "3 sessions", pt: "3 sessoes" })}</small>
                  </div>
                  <em>$95</em>
                </div>
                <div className="pro-register-phone-row">
                  <span className="avatar c">M</span>
                  <div>
                    <strong>Maria Suarez</strong>
                    <small>{t(props.language, { es: "5 sesiones", en: "5 sessions", pt: "5 sessoes" })}</small>
                  </div>
                  <em>$160</em>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Vamos!", en: "Let's go!", pt: "Vamos!" })}
        </button>
      </section>
    </div>
  );
}

