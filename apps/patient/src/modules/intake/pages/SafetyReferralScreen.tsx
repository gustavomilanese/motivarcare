import { getEmergencyResources, type CountryEmergencyResources } from "@therapy/types";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function SafetyReferralScreen(props: {
  language: AppLanguage;
  residencyCountry?: string | null;
  resources?: CountryEmergencyResources | null;
  emailNote?: boolean;
  onExit: () => void;
}) {
  const resources = props.resources ?? getEmergencyResources(props.residencyCountry);

  return (
    <div className="intake-shell intake-shell--wizard">
      <section className="intake-card intake-card--wizard intake-crisis-card">
        <h2 className="intake-question-title">
          {t(props.language, {
            es: "Apoyo inmediato",
            en: "Immediate support",
            pt: "Apoio imediato"
          })}
        </h2>
        <p className="intake-question-help">
          {t(props.language, {
            es: "Lo que estás sintiendo es importante y no tenés que afrontarlo solo/a. MotivarCare no brinda atención de emergencia: lo más recomendable ahora es contactar un servicio de crisis local, emergencias o una persona de confianza que pueda acompañarte.",
            en: "What you are feeling matters, and you do not have to face it alone. MotivarCare does not provide emergency care—the safest next step is to reach a local crisis line, emergency service, or a trusted person who can stay with you.",
            pt: "O que voce esta sentindo importa e voce nao precisa enfrentar isso sozinho/a. A MotivarCare nao oferece atendimento de emergencia: o mais seguro agora e buscar uma linha de crise local, emergencias ou alguem de confianca."
          })}
        </p>

        {resources ? (
          <>
            <p className="intake-question-help intake-safety-frequent-subhead">
              {t(props.language, {
                es: `${resources.countryName} — recursos`,
                en: `${resources.countryName} — resources`,
                pt: `${resources.countryName} — recursos`
              })}
            </p>
            <ul className="intake-crisis-list">
              {resources.resources.map((resource) => (
                <li key={`${resource.label}-${resource.contact}`}>
                  <strong>{resource.label}:</strong> {resource.contact}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="intake-crisis-list">
            <li>
              {t(props.language, {
                es: "Emergencias: llamá al número local (911, 112, etc.) o acudí a la guardia más cercana.",
                en: "Emergencies: call your local emergency number or go to the nearest ER.",
                pt: "Emergencias: ligue para o numero local ou va a emergencia mais proxima."
              })}
            </li>
            <li>
              {t(props.language, {
                es: "Estados Unidos — 988 (línea de crisis) / 911.",
                en: "United States — 988 (crisis line) / 911.",
                pt: "Estados Unidos — 988 (linha de crise) / 911."
              })}
            </li>
            <li>
              {t(props.language, {
                es: "Argentina — 0800-345-1435 (crisis) / 911.",
                en: "Argentina — 0800-345-1435 (crisis) / 911.",
                pt: "Argentina — 0800-345-1435 (crise) / 911."
              })}
            </li>
          </ul>
        )}

        {props.emailNote !== false ? (
          <p className="intake-question-help">
            {t(props.language, {
              es: "También te enviamos un correo con estos recursos para que los tengas a mano.",
              en: "We also sent you an email with these resources so you can keep them handy.",
              pt: "Tambem enviamos um e-mail com esses recursos para voce consultar quando precisar."
            })}
          </p>
        ) : null}

        <p className="intake-question-help">
          {t(props.language, {
            es: "Gracias por tu tiempo. No guardamos este cuestionario; podés volver a registrarte cuando te sientas en condiciones.",
            en: "Thank you for your time. We are not saving this questionnaire—you can sign up again when you feel ready.",
            pt: "Obrigado pelo seu tempo. Nao salvamos este questionario; voce pode se registrar de novo quando se sentir preparado/a."
          })}
        </p>

        <div className="intake-wizard-actions">
          <button className="primary intake-wizard-primary" type="button" onClick={props.onExit}>
            {t(props.language, {
              es: "Entendido, salir",
              en: "OK, exit",
              pt: "Entendi, sair"
            })}
          </button>
        </div>
      </section>
    </div>
  );
}
