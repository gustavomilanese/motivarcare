import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { PATIENT_PORTAL_URL } from "../../../app/services/api";
import { mediaPreviewFromFile } from "../../../app/utils/mediaPreview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalWelcomeGate(props: {
  language: AppLanguage;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <div className="pro-gate-shell">
      <section className="pro-gate-card">
        <div className="pro-gate-brand">
          <img
            className="pro-gate-brand-mark-img"
            src="/brand/motivarcare-mark.png"
            alt="MotivarCare"
            width={396}
            height={352}
          />
          <span className="pro-gate-brand-sub">
            {t(props.language, {
              es: "Portal Profesional",
              en: "Professional portal",
              pt: "Portal profissional"
            })}
          </span>
        </div>

        <div className="pro-gate-copy">
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

        <div className="pro-gate-actions pro-gate-actions--stacked">
          <p className="pro-gate-first-run">
            {t(props.language, {
              es: "¿Primera vez en MotivarCare?",
              en: "First time on MotivarCare?",
              pt: "Primeira vez no MotivarCare?"
            })}
          </p>
          <button className="pro-primary pro-gate-register-hero" type="button" onClick={props.onRegister}>
            {t(props.language, { es: "Crear cuenta gratis", en: "Create a free account", pt: "Criar conta gratis" })}
          </button>
          <p className="pro-gate-already">
            {t(props.language, {
              es: "¿Ya tenés cuenta?",
              en: "Already have an account?",
              pt: "Ja tem conta?"
            })}
          </p>
          <button className="pro-secondary pro-gate-login-quiet" type="button" onClick={props.onLogin}>
            {t(props.language, { es: "Iniciar sesión", en: "Sign in", pt: "Entrar" })}
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
              <strong className="pro-register-phone-amount">USD 5.173,75</strong>
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
                  <em>USD 125</em>
                </div>
                <div className="pro-register-phone-row">
                  <span className="avatar b">L</span>
                  <div>
                    <strong>Lucas Garcia</strong>
                    <small>{t(props.language, { es: "3 sesiones", en: "3 sessions", pt: "3 sessoes" })}</small>
                  </div>
                  <em>USD 95</em>
                </div>
                <div className="pro-register-phone-row">
                  <span className="avatar c">M</span>
                  <div>
                    <strong>Maria Suarez</strong>
                    <small>{t(props.language, { es: "5 sesiones", en: "5 sessions", pt: "5 sessoes" })}</small>
                  </div>
                  <em>USD 160</em>
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

