import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalProfileCardCheckStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-check-note">
          <p>
            {t(props.language, {
              es: "Verifique que todo este correcto y se vea bien en su tarjeta de perfil y en su tarjeta de sesion.",
              en: "Check that everything is correct and looks good on your profile card and your session card.",
              pt: "Verifique se esta tudo correto e com boa aparencia no cartao de perfil e no cartao de sessao."
            })}
          </p>
        </div>

        <article className="pro-photo-preview-card">
          <div className="pro-photo-preview-head">
            <div className="pro-photo-preview-image is-real-photo" aria-hidden="true" />
            <div className="pro-photo-preview-meta">
              <strong>Gustavo G.</strong>
              <span>{t(props.language, { es: "Psicologo", en: "Psychologist", pt: "Psicologo" })}</span>
              <small>{t(props.language, { es: "10+ anos de experiencia", en: "10+ years of experience", pt: "10+ anos de experiencia" })}</small>
              <small>{t(props.language, { es: "1 000+ horas de practica", en: "1,000+ practice hours", pt: "1.000+ horas de pratica" })}</small>
            </div>
            <span className="pro-photo-preview-favorite" aria-hidden="true">♥</span>
          </div>

          <strong className="pro-photo-preview-match">{t(props.language, { es: "Gustavo G. te conviene a 100%", en: "Gustavo G. is a 100% match for you", pt: "Gustavo G. combina 100% com voce" })}</strong>
          <span className="pro-photo-preview-line" aria-hidden="true" />
          <p>
            {t(props.language, {
              es: "Soy un profesional enfocado en ansiedad, autoestima y cambios vitales.",
              en: "I am a professional focused on anxiety, self-esteem, and life transitions.",
              pt: "Sou um profissional focado em ansiedade, autoestima e mudancas de vida."
            })}
          </p>
          <p className="pro-photo-preview-price">$50,00 USD {t(props.language, { es: "por 50 min. sesion", en: "per 50 min. session", pt: "por sessao de 50 min." })}</p>
        </article>

        <article className="pro-avatar-session-card">
          <div className="pro-avatar-session-date">
            <small>MAR</small>
            <strong>10</strong>
          </div>
          <div className="pro-avatar-session-meta">
            <strong>Martes, 19:03</strong>
            <span>Gustavo G.</span>
          </div>
          <div className="pro-avatar-session-image" aria-hidden="true" />
        </article>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Todo se ve bien y correcto", en: "Everything looks good and correct", pt: "Esta tudo certo e com boa aparencia" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalProfileFullCheckStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  const chips = [
    "Mejorar la calidad de vida",
    "Mejorar la autoestima",
    "Entender mejor las emociones",
    "Adaptarse",
    "Manejar la ira",
    "Superar miedos y fobias",
    "Superar la apatia",
    "Aliviar el cansancio"
  ];

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-check-note">
          <p>
            {t(props.language, {
              es: "Por favor, compruebe que todo este correcto y se vea bien en su perfil.",
              en: "Please check that everything is correct and looks good in your profile.",
              pt: "Por favor, verifique se esta tudo correto e com boa aparencia no seu perfil."
            })}
          </p>
        </div>

        <article className="pro-full-profile-preview">
          <div className="pro-video-cover-preview static" aria-hidden="true">
            <div className="pro-video-cover-frame" />
          </div>

          <div className="pro-full-profile-head">
            <div className="pro-avatar-session-image" aria-hidden="true" />
            <div>
              <strong>Gustavo G.</strong>
              <span>Psicologo</span>
            </div>
          </div>

          <div className="pro-full-profile-kpis">
            <span>50 USD por sesion</span>
            <span>1000+ horas</span>
            <span>10 anos exp.</span>
          </div>

          <strong className="pro-photo-preview-match">Gustavo te conviene a 100%</strong>
          <span className="pro-photo-preview-line" aria-hidden="true" />

          <section>
            <h4>Acerca de mi</h4>
            <p>Hola soy Gus. Trabajo con autoestima, ansiedad y procesos de cambio personal.</p>
          </section>

          <section>
            <h4>Trabajo con</h4>
            <p>ingles, espanol</p>
          </section>

          <section>
            <h4>Pais de nacimiento</h4>
            <p>Uruguay</p>
          </section>

          <section>
            <h4>Mis areas de trabajo</h4>
            <div className="pro-full-profile-tags">
              <span>Terapia cognitivo-conductual</span>
              <span>Psicoterapia positiva</span>
            </div>
          </section>

          <section>
            <h4>Te convengo si quieres</h4>
            <div className="pro-full-profile-tags">
              {chips.map((chip) => <span key={chip}>{chip}</span>)}
            </div>
          </section>
        </article>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Todo se ve bien y correcto", en: "Everything looks good and correct", pt: "Esta tudo certo e com boa aparencia" })}
        </button>
      </section>
    </div>
  );
}
