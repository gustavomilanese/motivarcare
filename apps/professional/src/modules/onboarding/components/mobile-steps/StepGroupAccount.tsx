import { useEffect, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import { PATIENT_PORTAL_URL } from "../../../app/services/api";
import { mediaPreviewFromFile } from "../../../app/utils/mediaPreview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}
export function ProfessionalSpecializationStep(props: {
  language: AppLanguage;
  value: string;
  onSelect: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const specializationOptions = [
    { es: "Psicologo", en: "Psychologist", pt: "Psicologo" },
    { es: "Psicoterapeuta", en: "Psychotherapist", pt: "Psicoterapeuta" },
    { es: "Psicoanalista", en: "Psychoanalyst", pt: "Psicanalista" },
    { es: "Psiquiatra", en: "Psychiatrist", pt: "Psiquiatra" },
    { es: "Terapeuta Gestalt", en: "Gestalt therapist", pt: "Terapeuta Gestalt" },
    { es: "Sexologo", en: "Sexologist", pt: "Sexologo" },
    { es: "Coach", en: "Coach", pt: "Coach" },
    { es: "Nutricionista", en: "Nutritionist", pt: "Nutricionista" },
    { es: "Doc. de Ciencias Medicas", en: "Medical sciences PhD", pt: "Doutor em ciencias medicas" },
    { es: "Doc. de Ciencias Psicologicas", en: "Psychological sciences PhD", pt: "Doutor em ciencias psicologicas" },
    { es: "Psicologo en practicas", en: "Psychologist in training", pt: "Psicologo em formacao" },
    { es: "Psicologo perinatal", en: "Perinatal psychologist", pt: "Psicologo perinatal" },
    { es: "Psicologo para militares y sus familiares", en: "Psychologist for military families", pt: "Psicologo para militares e familiares" }
  ].map((option) => t(props.language, option));

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-specialization-card pro-specialization-card--catalog">
        <header className="pro-register-intro-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-specialization-copy">
          <h1>{t(props.language, { es: "Su especializacion", en: "Your specialization", pt: "Sua especializacao" })}</h1>
          <p>{t(props.language, { es: "Elija los puntos relevantes", en: "Choose the most relevant option", pt: "Escolha a opcao mais relevante" })}</p>
        </div>

        <div className="pro-specialization-list" role="radiogroup" aria-label="Specialization options">
          {specializationOptions.map((option) => {
            const checked = props.value === option;

            return (
              <button
                key={option}
                className={`pro-specialization-item ${checked ? "selected" : ""}`}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => props.onSelect(option)}
              >
                <span>{option}</span>
                <span className="pro-specialization-radio" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <button className="pro-primary pro-specialization-cta" type="button" disabled={!props.value} onClick={props.onContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalFirstClientsStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-register-intro-card">
        <header className="pro-register-intro-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-register-intro-copy">
          <h1>
            {t(props.language, {
              es: "Los psicologos de MotivarCare reciben a sus primeros clientes a las 2 horas de registrarse",
              en: "MotivarCare psychologists receive their first clients within 2 hours of registering",
              pt: "Os psicologos do MotivarCare recebem seus primeiros clientes em ate 2 horas apos o cadastro"
            })}
          </h1>
        </div>

        <div className="pro-register-device-wrap" aria-hidden="true">
          <div className="pro-register-device-card">
            <div className="pro-clients-phone">
              <div className="pro-clients-phone-screen">
                <div className="pro-register-phone-top">
                  <span>12:00</span>
                  <span className="pro-register-phone-notch" />
                  <span className="pro-register-phone-icons">◔</span>
                </div>

                <div className="pro-clients-phone-date">
                  <span>{t(props.language, { es: "Viernes, 1 de julio", en: "Friday, July 1", pt: "Sexta, 1 de julho" })}</span>
                  <strong>12:00</strong>
                </div>

                <div className="pro-clients-notifications">
                  <article className="pro-clients-notification-card">
                    <span className="pro-clients-notification-mark" />
                    <div>
                      <strong>Ana Santiago Martin</strong>
                      <p>{t(props.language, { es: "Reservo sesion: 3 jul, 15:00", en: "Session booked: Jul 3, 3:00 PM", pt: "Sessao reservada: 3 jul, 15:00" })}</p>
                    </div>
                    <em>{t(props.language, { es: "hace 2 min", en: "2 min ago", pt: "ha 2 min" })}</em>
                  </article>

                  <article className="pro-clients-notification-card">
                    <span className="pro-clients-notification-mark" />
                    <div>
                      <strong>Nahuel Herrera Santos</strong>
                      <p>{t(props.language, { es: "Reservo sesion: 2 jul, 11:00", en: "Session booked: Jul 2, 11:00 AM", pt: "Sessao reservada: 2 jul, 11:00" })}</p>
                    </div>
                    <em>{t(props.language, { es: "hace 3 min", en: "3 min ago", pt: "ha 3 min" })}</em>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalExperienceStep(props: {
  language: AppLanguage;
  value: string;
  onSelect: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const experienceOptions = [
    { es: "Menos de 1 ano", en: "Less than 1 year", pt: "Menos de 1 ano" },
    { es: "1-3 anos", en: "1-3 years", pt: "1-3 anos" },
    { es: "3-6 anos", en: "3-6 years", pt: "3-6 anos" },
    { es: "6-10 anos", en: "6-10 years", pt: "6-10 anos" },
    { es: "Mas de 10 anos", en: "More than 10 years", pt: "Mais de 10 anos" }
  ].map((option) => t(props.language, option));

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-specialization-card">
        <header className="pro-register-intro-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-specialization-copy">
          <h1>{t(props.language, { es: "Su experiencia", en: "Your experience", pt: "Sua experiencia" })}</h1>
        </div>

        <div className="pro-specialization-list" role="radiogroup" aria-label="Experience options">
          {experienceOptions.map((option) => {
            const checked = props.value === option;

            return (
              <button
                key={option}
                className={`pro-specialization-item ${checked ? "selected" : ""}`}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => {
                  props.onSelect(option);
                  props.onContinue();
                }}
              >
                <span>{option}</span>
                <span className="pro-specialization-radio" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ProfessionalAverageClientsStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  const monthlyProjection = [
    { label: t(props.language, { es: "Sem 1", en: "Wk 1", pt: "Sem 1" }), withMotivarCare: 8, withoutMotivarCare: 3 },
    { label: t(props.language, { es: "Sem 2", en: "Wk 2", pt: "Sem 2" }), withMotivarCare: 16, withoutMotivarCare: 6 },
    { label: t(props.language, { es: "Sem 3", en: "Wk 3", pt: "Sem 3" }), withMotivarCare: 24, withoutMotivarCare: 9 },
    { label: t(props.language, { es: "Sem 4", en: "Wk 4", pt: "Sem 4" }), withMotivarCare: 30, withoutMotivarCare: 12 }
  ];
  const maxValue = 30;

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-register-intro-card">
        <header className="pro-register-intro-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-register-intro-copy">
          <h1>
            {t(props.language, {
              es: "De media, los psicologos consiguen 30 clientes en su primer mes en MotivarCare",
              en: "On average, psychologists get 30 clients in their first month on MotivarCare",
              pt: "Em media, psicologos conseguem 30 clientes no primeiro mes no MotivarCare"
            })}
          </h1>
          <p>
            {t(props.language, {
              es: "Con su experiencia, este numero puede ser mayor",
              en: "With your experience, this number may be higher",
              pt: "Com sua experiencia, esse numero pode ser ainda maior"
            })}
          </p>
        </div>

        <div className="pro-average-chart-wrap" aria-hidden="true">
          <div className="pro-average-chart pro-average-chart-modern">
            <div className="pro-average-chart-head">
              <strong>30</strong>
              <small>{t(props.language, { es: "clientes estimados en 4 semanas", en: "estimated clients in 4 weeks", pt: "clientes estimados em 4 semanas" })}</small>
            </div>

            <div className="pro-average-modern-body">
              <div className="pro-average-y-axis">
                {[30, 20, 10, 0].map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>

              <div className="pro-average-bars-grid">
                <div className="pro-average-grid-lines" />
                {monthlyProjection.map((point) => (
                  <div key={point.label} className="pro-average-bar-group">
                    <div className="pro-average-bars-pair">
                      <span
                        className="pro-average-bar with"
                        style={{ height: `${(point.withMotivarCare / maxValue) * 100}%` }}
                      />
                      <span
                        className="pro-average-bar without"
                        style={{ height: `${(point.withoutMotivarCare / maxValue) * 100}%` }}
                      />
                    </div>
                    <small>{point.label}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="pro-average-legend">
              <span><em className="with" />{t(props.language, { es: "con MotivarCare", en: "with MotivarCare", pt: "com MotivarCare" })}</span>
              <span><em className="without" />{t(props.language, { es: "sin MotivarCare", en: "without MotivarCare", pt: "sem MotivarCare" })}</span>
            </div>
          </div>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalPracticeHoursStep(props: {
  language: AppLanguage;
  value: string;
  onSelect: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const practiceHourOptions = [
    { es: "Menos de 500 horas", en: "Less than 500 hours", pt: "Menos de 500 horas" },
    { es: "500-1000 horas", en: "500-1000 hours", pt: "500-1000 horas" },
    { es: "1.000-3.000 horas", en: "1,000-3,000 hours", pt: "1.000-3.000 horas" },
    { es: "3.000-5.000 horas", en: "3,000-5,000 hours", pt: "3.000-5.000 horas" },
    { es: "Mas de 5.000 horas", en: "More than 5,000 hours", pt: "Mais de 5.000 horas" }
  ].map((option) => t(props.language, option));

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-specialization-card">
        <header className="pro-register-intro-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-specialization-copy">
          <h1>
            {t(props.language, {
              es: "Cuantas horas de practica tiene?",
              en: "How many practice hours do you have?",
              pt: "Quantas horas de pratica voce tem?"
            })}
          </h1>
          <p>
            {t(props.language, {
              es: "Teniendo en cuenta que 1 sesion es aproximadamente 1 hora",
              en: "Considering that 1 session is approximately 1 hour",
              pt: "Considerando que 1 sessao corresponde a aproximadamente 1 hora"
            })}
          </p>
        </div>

        <div className="pro-specialization-list" role="radiogroup" aria-label="Practice hour options">
          {practiceHourOptions.map((option) => {
            const checked = props.value === option;

            return (
              <button
                key={option}
                className={`pro-specialization-item ${checked ? "selected" : ""}`}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => {
                  props.onSelect(option);
                  props.onContinue();
                }}
              >
                <span>{option}</span>
                <span className="pro-specialization-radio" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ProfessionalEarningsPlanStep(props: { language: AppLanguage; onContinue: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      props.onContinue();
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [props.onContinue]);

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-plan-card">
        <div className="pro-plan-copy">
          <h1>
            {t(props.language, {
              es: "Los psicologos MotivarCare suelen desarrollar su practica desde cero en 3 semanas",
              en: "MotivarCare psychologists usually build their practice from scratch in 3 weeks",
              pt: "Psicologos do MotivarCare costumam desenvolver sua pratica do zero em 3 semanas"
            })}
          </h1>
          <p>
            {t(props.language, {
              es: "Y algunos ya consiguen 10 nuevos clientes el primer dia de trabajo",
              en: "Some of them even get 10 new clients on their first working day",
              pt: "E alguns ja conseguem 10 novos clientes no primeiro dia de trabalho"
            })}
          </p>
        </div>

        <article className="pro-plan-testimonial">
          <div className="pro-plan-person">
            <span className="pro-plan-avatar" aria-hidden="true">
              <img src="/images/avatar-galina.svg" alt="" />
            </span>
            <div>
              <strong>Galina B.</strong>
              <span>{t(props.language, { es: "Psiquiatra", en: "Psychiatrist", pt: "Psiquiatra" })}</span>
            </div>
          </div>
          <p>
            {t(props.language, {
              es: '"He estado trabajando con MotivarCare desde marzo de 2023. Construi mi practica aqui desde cero y trabajo solo aqui todo el tiempo, hasta ahora mis ingresos se han multiplicado por 4"',
              en: '"I have been working with MotivarCare since March 2023. I built my practice here from scratch and now my income has multiplied by 4"',
              pt: '"Trabalho com o MotivarCare desde marco de 2023. Construí minha pratica aqui do zero e minha renda ja multiplicou por 4"'
            })}
          </p>
        </article>

        <div className="pro-plan-loading" aria-live="polite">
          <div className="pro-plan-progress-track">
            <span className="pro-plan-progress-fill" />
          </div>
          <p>{t(props.language, { es: "Generando un plan de ganancias...", en: "Generating an earnings plan...", pt: "Gerando um plano de ganhos..." })}</p>
        </div>
      </section>
    </div>
  );
}

export function ProfessionalEarningsCalculatorStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-register-intro-card">
        <header className="pro-register-intro-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-register-intro-copy">
          <h1>
            {t(props.language, {
              es: "Ganancias de profesionales similares en MotivarCare",
              en: "Earnings of similar professionals on MotivarCare",
              pt: "Ganhos de profissionais similares no MotivarCare"
            })}
          </h1>
        </div>

        <div className="pro-calculator-wrap" aria-hidden="true">
          <div className="pro-calculator-chart">
            <div className="pro-calculator-bars">
              <div className="bar bar-1"><span>€2 880</span></div>
              <div className="bar bar-2" />
              <div className="bar bar-3"><span>€4 320</span></div>
              <div className="bar bar-4" />
              <div className="bar bar-5" />
              <div className="bar bar-6"><span>€5 760</span></div>
            </div>
            <div className="pro-calculator-axis">
              <span>1 {t(props.language, { es: "mes", en: "month", pt: "mes" })}</span>
              <span>3 {t(props.language, { es: "meses", en: "months", pt: "meses" })}</span>
              <span>6 {t(props.language, { es: "meses", en: "months", pt: "meses" })}</span>
            </div>
          </div>

          <div className="pro-calculator-total">
            <strong>€5 760</strong>
            <span>{t(props.language, { es: "En 6 meses", en: "In 6 months", pt: "Em 6 meses" })}</span>
          </div>

          <div className="pro-calculator-slider">
            <div className="pro-calculator-slider-track">
              <span className="pro-calculator-slider-fill" />
              <span className="pro-calculator-slider-thumb" />
            </div>
            <p>{t(props.language, { es: "Con 40 horas de practica por semana", en: "With 40 practice hours per week", pt: "Com 40 horas de pratica por semana" })}</p>
          </div>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Entendido", en: "Understood", pt: "Entendido" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalTermsStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-terms-card">
        <header className="pro-register-intro-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-terms-copy">
          <h1>
            {t(props.language, {
              es: "Condiciones de cooperacion con MotivarCare",
              en: "Cooperation terms with MotivarCare",
              pt: "Condicoes de cooperacao com o MotivarCare"
            })}
          </h1>
        </div>

        <div className="pro-terms-list">
          <article className="pro-terms-item">
            <span className="pro-terms-icon" aria-hidden="true">🚀</span>
            <p>
              {t(props.language, {
                es: "Al unirse a MotivarCare, obtiene una herramienta conveniente para administrar su practica: desde administrar sesiones y clientes hasta establecer precios y monitorear sus ingresos.",
                en: "By joining MotivarCare, you get a convenient tool to manage your practice, sessions, clients, pricing, and income.",
                pt: "Ao entrar no MotivarCare, voce passa a ter uma ferramenta para administrar sua pratica, sessoes, clientes, precos e ganhos."
              })}
            </p>
          </article>

          <article className="pro-terms-item">
            <span className="pro-terms-icon" aria-hidden="true">⚙️</span>
            <div>
              <p>
                {t(props.language, {
                  es: "Nos quedamos con el 100% de la comision de la primera sesion con un nuevo cliente. La comision de las sesiones por suscripcion depende del numero de sesiones realizadas al mes:",
                  en: "We keep 100% of the first session commission with a new client. Subscription session commissions depend on how many sessions you complete each month:",
                  pt: "Ficamos com 100% da comissao da primeira sessao com um novo cliente. A comissao das sessoes por assinatura depende do numero de sessoes realizadas por mes:"
                })}
              </p>
              <ul className="pro-terms-bullets">
                <li>45% {t(props.language, { es: "si se realizan de 1 a 20 sesiones", en: "for 1 to 20 sessions", pt: "para 1 a 20 sessoes" })}</li>
                <li>35% {t(props.language, { es: "si se realizan de 21 a 40 sesiones", en: "for 21 to 40 sessions", pt: "para 21 a 40 sessoes" })}</li>
                <li>25% {t(props.language, { es: "si se realizan mas de 40 sesiones", en: "for more than 40 sessions", pt: "para mais de 40 sessoes" })}</li>
              </ul>
            </div>
          </article>

          <article className="pro-terms-item">
            <span className="pro-terms-icon" aria-hidden="true">💸</span>
            <p>
              {t(props.language, {
                es: "El pago de sus ingresos se realiza una vez al mes a una cuenta en euros.",
                en: "Your earnings are paid once a month to a bank account in euros.",
                pt: "O pagamento dos seus ganhos e realizado uma vez por mes em uma conta em euros."
              })}
            </p>
          </article>

          <article className="pro-terms-item">
            <span className="pro-terms-icon" aria-hidden="true">🤝</span>
            <p>
              {t(props.language, {
                es: "Usted firma un acuerdo que no es exclusivo y tampoco restringe realizar practica personal fuera de la plataforma.",
                en: "You sign a non-exclusive agreement and you can still practice outside the platform.",
                pt: "Voce assina um acordo nao exclusivo e continua livre para atuar fora da plataforma."
              })}
            </p>
          </article>
        </div>

        <p className="pro-terms-footnote">
          {t(props.language, {
            es: "Al continuar, acepta terminos y condiciones generales",
            en: "By continuing, you accept the general terms and conditions",
            pt: "Ao continuar, voce aceita os termos e condicoes gerais"
          })}
        </p>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Acepto las condiciones", en: "I accept the terms", pt: "Aceito as condicoes" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalEmailStep(props: {
  language: AppLanguage;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [showError, setShowError] = useState(false);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.value.trim());
  const handleContinue = () => {
    if (!isValidEmail) {
      setShowError(true);
      return;
    }
    setShowError(false);
    props.onContinue();
  };

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-form-step-avatars" aria-hidden="true">
          <span className="avatar a">A</span>
          <span className="avatar b">L</span>
          <span className="avatar c">M</span>
          <span className="avatar d">S</span>
          <span className="avatar e">N</span>
          <span className="avatar f">C</span>
        </div>

        <div className="pro-form-step-copy">
          <h1>{t(props.language, { es: "Comencemos a crear su cuenta en MotivarCare!", en: "Let's start creating your MotivarCare account!", pt: "Vamos comecar a criar sua conta no MotivarCare!" })}</h1>
          <p>{t(props.language, { es: "Necesitamos un e-mail valido para continuar.", en: "We need a valid email to continue.", pt: "Precisamos de um e-mail valido para continuar." })}</p>
        </div>

        <label className={`pro-form-step-field ${showError ? "error" : ""}`}>
          <input
            type="email"
            value={props.value}
            placeholder={t(props.language, { es: "Introduzca su correo electronico", en: "Enter your email address", pt: "Digite seu e-mail" })}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleContinue();
              }
            }}
            onChange={(event) => {
              props.onChange(event.target.value);
              if (showError) {
                setShowError(false);
              }
            }}
          />
        </label>
        {showError ? (
          <span className="pro-form-step-inline-error">
            {t(props.language, { es: "Ingrese un correo valido (ej: nombre@dominio.com)", en: "Enter a valid email (e.g. name@domain.com)", pt: "Digite um e-mail valido (ex: nome@dominio.com)" })}
          </span>
        ) : null}

        <button className="pro-primary pro-register-intro-cta" type="button" disabled={!isValidEmail} onClick={handleContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalPasswordStep(props: {
  language: AppLanguage;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [showError, setShowError] = useState(false);
  const isValidPassword = props.value.trim().length >= 6;

  const handleContinue = () => {
    if (!isValidPassword) {
      setShowError(true);
      return;
    }

    setShowError(false);
    props.onContinue();
  };

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-password" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-form-step-copy">
          <h1>{t(props.language, { es: "Establecer una contrasena", en: "Set a password", pt: "Defina uma senha" })}</h1>
          <p>{t(props.language, { es: "La contrasena debe tener al menos 6 caracteres", en: "Password must be at least 6 characters long", pt: "A senha deve ter pelo menos 6 caracteres" })}</p>
        </div>

        <label className={`pro-form-step-field password ${showError ? "error" : ""}`}>
          <div className="pro-password-input-wrap">
            <input
              type={visible ? "text" : "password"}
              value={props.value}
              placeholder={t(props.language, { es: "Ingrese su contrasena", en: "Enter your password", pt: "Digite sua senha" })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleContinue();
                }
              }}
              onChange={(event) => {
                props.onChange(event.target.value);
                if (showError && event.target.value.trim().length >= 6) {
                  setShowError(false);
                }
              }}
            />
            <button
              className="pro-password-toggle"
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible((current) => !current)}
            >
              {visible ? "◉" : "◌"}
            </button>
          </div>
        </label>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={handleContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>

        {showError ? (
          <div className="pro-password-error-sheet" role="alert">
            <p>{t(props.language, { es: "La contrasena debe contener 6 o mas caracteres.", en: "Password must contain 6 or more characters.", pt: "A senha deve conter 6 ou mais caracteres." })}</p>
            <button type="button" onClick={() => setShowError(false)}>
              {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

