import { useEffect, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import { professionalAuthSurfaceMessage } from "../../../app/lib/friendlyProfessionalSurfaceMessages";
import { apiRequest, PATIENT_PORTAL_URL } from "../../../app/services/api";
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
    { es: "Psicólogo", en: "Psychologist", pt: "Psicologo" },
    { es: "Psicoterapeuta", en: "Psychotherapist", pt: "Psicoterapeuta" },
    { es: "Psicoanalista", en: "Psychoanalyst", pt: "Psicanalista" },
    { es: "Psiquiatra", en: "Psychiatrist", pt: "Psiquiatra" },
    { es: "Terapeuta Gestalt", en: "Gestalt therapist", pt: "Terapeuta Gestalt" },
    { es: "Sexologo", en: "Sexologist", pt: "Sexologo" },
    { es: "Coach", en: "Coach", pt: "Coach" },
    { es: "Nutricionista", en: "Nutritionist", pt: "Nutricionista" },
    { es: "Doc. de Ciencias Medicas", en: "Medical sciences PhD", pt: "Doutor em ciencias medicas" },
    { es: "Doc. de Ciencias Psicologicas", en: "Psychological sciences PhD", pt: "Doutor em ciencias psicologicas" },
    { es: "Psicólogo en prácticas", en: "Psychologist in training", pt: "Psicologo em formacao" },
    { es: "Psicólogo perinatal", en: "Perinatal psychologist", pt: "Psicologo perinatal" },
    { es: "Psicólogo para militares y sus familiares", en: "Psychologist for military families", pt: "Psicologo para militares e familiares" }
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
                      <p>{t(props.language, { es: "Reservó sesión: 3 jul, 15:00", en: "Session booked: Jul 3, 3:00 PM", pt: "Sessao reservada: 3 jul, 15:00" })}</p>
                    </div>
                    <em>{t(props.language, { es: "hace 2 min", en: "2 min ago", pt: "ha 2 min" })}</em>
                  </article>

                  <article className="pro-clients-notification-card">
                    <span className="pro-clients-notification-mark" />
                    <div>
                      <strong>Nahuel Herrera Santos</strong>
                      <p>{t(props.language, { es: "Reservó sesión: 2 jul, 11:00", en: "Session booked: Jul 2, 11:00 AM", pt: "Sessao reservada: 2 jul, 11:00" })}</p>
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
    { es: "Menos de 1 año", en: "Less than 1 year", pt: "Menos de 1 ano" },
    { es: "1-3 años", en: "1-3 years", pt: "1-3 anos" },
    { es: "3-6 años", en: "3-6 years", pt: "3-6 anos" },
    { es: "6-10 años", en: "6-10 years", pt: "6-10 anos" },
    { es: "más de 10 años", en: "More than 10 years", pt: "Mais de 10 anos" }
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
    { es: "más de 5.000 horas", en: "More than 5,000 hours", pt: "Mais de 5.000 horas" }
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
              es: "Cuántas horas de práctica tiene?",
              en: "How many practice hours do you have?",
              pt: "Quantas horas de pratica voce tem?"
            })}
          </h1>
          <p>
            {t(props.language, {
              es: "Teniendo en cuenta que 1 sesión es aproximadamente 1 hora",
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
              es: "Los psicologos MotivarCare suelen desarrollar su práctica desde cero en 3 semanas",
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
            <p>{t(props.language, { es: "Con 40 horas de práctica por semana", en: "With 40 practice hours per week", pt: "Com 40 horas de pratica por semana" })}</p>
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
                es: "Al unirse a MotivarCare, obtiene una herramienta conveniente para administrar su práctica: desde administrar sesiones y clientes hasta establecer precios y monitorear sus ingresos.",
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
                  es: "Nos quedamos con el 100% de la comisión de la primera sesión con un nuevo cliente. La comisión de las sesiones por suscripción depende del número de sesiones realizadas al mes:",
                  en: "We keep 100% of the first session commission with a new client. Subscription session commissions depend on how many sessions you complete each month:",
                  pt: "Ficamos com 100% da comissao da primeira sessao com um novo cliente. A comissao das sessoes por assinatura depende do numero de sessoes realizadas por mes:"
                })}
              </p>
              <ul className="pro-terms-bullets">
                <li>45% {t(props.language, { es: "si se realizan de 1 a 20 sesiones", en: "for 1 to 20 sessions", pt: "para 1 a 20 sessoes" })}</li>
                <li>35% {t(props.language, { es: "si se realizan de 21 a 40 sesiones", en: "for 21 to 40 sessions", pt: "para 21 a 40 sessoes" })}</li>
                <li>25% {t(props.language, { es: "si se realizan más de 40 sesiones", en: "for more than 40 sessions", pt: "para mais de 40 sessoes" })}</li>
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

export function ProfessionalEmailPasswordStep(props: {
  language: AppLanguage;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void | Promise<void>;
  submitError?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [visibleConfirm, setVisibleConfirm] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showEmailError, setShowEmailError] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [showPasswordMismatch, setShowPasswordMismatch] = useState(false);
  const [continueBusy, setContinueBusy] = useState(false);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.email.trim());
  const isValidPassword = props.password.trim().length >= 8;
  const passwordsMatch = props.password === passwordConfirm;

  const handleContinue = async () => {
    let ok = true;
    if (!isValidEmail) {
      setShowEmailError(true);
      ok = false;
    } else {
      setShowEmailError(false);
    }
    if (!isValidPassword) {
      setShowPasswordError(true);
      ok = false;
    } else {
      setShowPasswordError(false);
    }
    if (!passwordsMatch) {
      setShowPasswordMismatch(true);
      ok = false;
    } else {
      setShowPasswordMismatch(false);
    }
    if (!ok) {
      return;
    }
    setContinueBusy(true);
    try {
      await props.onContinue();
    } finally {
      setContinueBusy(false);
    }
  };

  const canSubmit = isValidEmail && isValidPassword && passwordsMatch;

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
          <h1>{t(props.language, { es: "Correo y contraseña", en: "Email and password", pt: "E-mail e senha" })}</h1>
        </div>

        <label className={`pro-form-step-field ${showEmailError ? "error" : ""}`}>
          <input
            type="email"
            value={props.email}
            placeholder={t(props.language, { es: "Correo electrónico", en: "Email address", pt: "E-mail" })}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleContinue();
              }
            }}
            onChange={(event) => {
              props.onEmailChange(event.target.value);
              if (showEmailError) {
                setShowEmailError(false);
              }
            }}
          />
        </label>
        {showEmailError ? (
          <span className="pro-form-step-inline-error">
            {t(props.language, {
              es: "Ingrese un correo válido (ej: nombre@dominio.com)",
              en: "Enter a valid email (e.g. name@domain.com)",
              pt: "Digite um e-mail valido (ex: nome@dominio.com)"
            })}
          </span>
        ) : null}

        <label className={`pro-form-step-field password ${showPasswordError ? "error" : ""}`}>
          <div className="pro-password-input-wrap">
            <input
              type={visible ? "text" : "password"}
              value={props.password}
              placeholder={t(props.language, {
                es: "Contraseña (mín. 8 caracteres)",
                en: "Password (min. 8 characters)",
                pt: "Senha (min. 8 caracteres)"
              })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleContinue();
                }
              }}
              onChange={(event) => {
                props.onPasswordChange(event.target.value);
                if (showPasswordError && event.target.value.trim().length >= 8) {
                  setShowPasswordError(false);
                }
                if (showPasswordMismatch && event.target.value === passwordConfirm) {
                  setShowPasswordMismatch(false);
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

        <label className={`pro-form-step-field password ${showPasswordMismatch ? "error" : ""}`}>
          <div className="pro-password-input-wrap">
            <input
              type={visibleConfirm ? "text" : "password"}
              value={passwordConfirm}
              placeholder={t(props.language, {
                es: "Repetir contraseña",
                en: "Repeat password",
                pt: "Repetir senha"
              })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleContinue();
                }
              }}
              onChange={(event) => {
                setPasswordConfirm(event.target.value);
                if (showPasswordMismatch && event.target.value === props.password) {
                  setShowPasswordMismatch(false);
                }
              }}
            />
            <button
              className="pro-password-toggle"
              type="button"
              aria-label={visibleConfirm ? "Hide password confirmation" : "Show password confirmation"}
              onClick={() => setVisibleConfirm((current) => !current)}
            >
              {visibleConfirm ? "◉" : "◌"}
            </button>
          </div>
        </label>
        {showPasswordMismatch ? (
          <span className="pro-form-step-inline-error">
            {t(props.language, {
              es: "Las contraseñas no coinciden.",
              en: "Passwords do not match.",
              pt: "As senhas nao coincidem."
            })}
          </span>
        ) : null}

        {props.submitError ? <p className="pro-form-step-inline-error">{props.submitError}</p> : null}

        <button
          className="pro-primary pro-register-intro-cta"
          type="button"
          disabled={!canSubmit || continueBusy}
          onClick={() => void handleContinue()}
        >
          {continueBusy
            ? t(props.language, { es: "Creando cuenta…", en: "Creating account…", pt: "Criando conta…" })
            : t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>

        {showPasswordError ? (
          <div className="pro-password-error-sheet" role="alert">
            <p>
              {t(props.language, {
                es: "La contraseña debe contener 8 o más caracteres.",
                en: "Password must contain 8 or more characters.",
                pt: "A senha deve conter 8 ou mais caracteres."
              })}
            </p>
            <button type="button" onClick={() => setShowPasswordError(false)}>
              {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function ProfessionalMobileEmailVerificationStep(props: {
  language: AppLanguage;
  token: string;
  email: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  const onVerifiedRef = useRef(props.onVerified);
  onVerifiedRef.current = props.onVerified;

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const me = await apiRequest<{ user: { emailVerified: boolean } }>("/api/auth/me", props.token);
        if (cancelled) {
          return;
        }
        if (me.user.emailVerified) {
          onVerifiedRef.current();
        }
      } catch {
        // ignore transient errors while polling
      }
    };
    const intervalId = window.setInterval(() => {
      void tick();
    }, 2800);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [props.token]);

  const handleResend = async () => {
    setResendLoading(true);
    setResendError("");
    setResendMessage("");
    try {
      const response = await apiRequest<{ message: string }>(
        "/api/auth/email-verification/resend",
        props.token,
        { method: "POST" }
      );
      setResendMessage(response.message);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setResendError(professionalAuthSurfaceMessage(raw || " ", props.language));
    } finally {
      setResendLoading(false);
    }
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

        <div className="pro-form-step-copy">
          <h1>
            {t(props.language, {
              es: "Validá tu correo",
              en: "Verify your email",
              pt: "Valide seu e-mail"
            })}
          </h1>
          <p>
            {t(props.language, {
              es: "Te enviamos un enlace a",
              en: "We sent a link to",
              pt: "Enviamos um link para"
            })}{" "}
            <strong>{props.email}</strong>
            {t(props.language, {
              es: ". Abrilo para continuar; esta pantalla avanza sola al confirmarse.",
              en: ". Open it to continue; this screen moves forward automatically once confirmed.",
              pt: ". Abra para continuar; esta tela avanca sozinha ao confirmar."
            })}
          </p>
        </div>

        <button
          type="button"
          className="pro-secondary pro-register-intro-cta"
          disabled={resendLoading}
          onClick={() => void handleResend()}
        >
          {resendLoading
            ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
            : t(props.language, { es: "Reenviar correo", en: "Resend email", pt: "Reenviar e-mail" })}
        </button>

        {resendMessage ? (
          <p className="pro-form-step-inline-error" style={{ color: "#15803d", marginTop: 8 }}>
            {resendMessage}
          </p>
        ) : null}
        {resendError ? <p className="pro-form-step-inline-error" style={{ marginTop: 8 }}>{resendError}</p> : null}
      </section>
    </div>
  );
}

