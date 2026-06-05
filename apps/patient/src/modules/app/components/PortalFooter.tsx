import { Link } from "react-router-dom";
import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import { getEmergencyResources, type Market } from "@therapy/types";
import { PATIENT_SUPPORT_EMAIL } from "../constants/support";

const t = (language: AppLanguage, values: { es: string; en: string; pt: string }) =>
  textByLanguage(language, values);

function resolveCountryCode(residencyCountry: string | null, market: Market): string {
  if (residencyCountry?.trim()) {
    return residencyCountry.trim().toUpperCase();
  }
  return market;
}

export interface PortalFooterProps {
  language: AppLanguage;
  residencyCountry: string | null;
  patientMarket: Market;
}

export function PortalFooter(props: PortalFooterProps) {
  const { language, residencyCountry, patientMarket } = props;
  const emergency = getEmergencyResources(resolveCountryCode(residencyCountry, patientMarket));

  return (
    <footer className="portal-site-footer" aria-label={t(language, { es: "Pie de página", en: "Footer", pt: "Rodapé" })}>
      <div className="portal-site-footer-inner">
        <section className="portal-site-footer-block">
          <h2 className="portal-site-footer-heading">
            {t(language, { es: "Soporte", en: "Support", pt: "Suporte" })}
          </h2>
          <p className="portal-site-footer-lead">
            {t(language, {
              es: "¿Necesitás ayuda con el portal? Escribinos.",
              en: "Need help with the portal? Contact us.",
              pt: "Precisa de ajuda com o portal? Fale conosco."
            })}
          </p>
          <a className="portal-site-footer-email" href={`mailto:${PATIENT_SUPPORT_EMAIL}`}>
            {PATIENT_SUPPORT_EMAIL}
          </a>
        </section>

        <section className="portal-site-footer-block">
          <h2 className="portal-site-footer-heading">
            {t(language, { es: "Ayuda", en: "Help", pt: "Ajuda" })}
          </h2>
          <nav className="portal-site-footer-links" aria-label={t(language, { es: "Ayuda", en: "Help", pt: "Ajuda" })}>
            <Link to="/ayuda/preguntas-frecuentes">
              {t(language, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}
            </Link>
            <Link to="/ayuda/manual">
              {t(language, { es: "Manual de usuario", en: "User manual", pt: "Manual do usuário" })}
            </Link>
          </nav>
        </section>

        <section className="portal-site-footer-block">
          <h2 className="portal-site-footer-heading">
            {t(language, { es: "Legal", en: "Legal", pt: "Legal" })}
          </h2>
          <nav className="portal-site-footer-links" aria-label={t(language, { es: "Legal", en: "Legal", pt: "Legal" })}>
            <a href="/docs/terms.html" target="_blank" rel="noopener noreferrer">
              {t(language, { es: "Términos y condiciones", en: "Terms and conditions", pt: "Termos e condições" })}
            </a>
            <a href="/docs/privacy.html" target="_blank" rel="noopener noreferrer">
              {t(language, { es: "Política de privacidad", en: "Privacy policy", pt: "Política de privacidade" })}
            </a>
            <a href="/docs/crisis.html" target="_blank" rel="noopener noreferrer">
              {t(language, { es: "Líneas de apoyo", en: "Crisis lines", pt: "Linhas de apoio" })}
            </a>
          </nav>
        </section>

        {emergency ? (
          <section className="portal-site-footer-block portal-site-footer-block--phones">
            <h2 className="portal-site-footer-heading">
              {t(language, {
                es: "Teléfonos útiles",
                en: "Useful numbers",
                pt: "Telefones úteis"
              })}
              <span className="portal-site-footer-country"> — {emergency.countryName}</span>
            </h2>
            <ul className="portal-site-footer-phones">
              {emergency.resources.map((resource) => (
                <li key={`${resource.label}-${resource.contact}`}>
                  <span className="portal-site-footer-phone-label">{resource.label}</span>
                  <span className="portal-site-footer-phone-contact">{resource.contact}</span>
                </li>
              ))}
            </ul>
            <p className="portal-site-footer-crisis-note">
              {t(language, {
                es: "Si estás en peligro inmediato, llamá a emergencias de tu país.",
                en: "If you are in immediate danger, call your local emergency number.",
                pt: "Se estiver em perigo imediato, ligue para emergências do seu país."
              })}
            </p>
          </section>
        ) : null}
      </div>
      <p className="portal-site-footer-copy">© {new Date().getFullYear()} MotivarCare</p>
    </footer>
  );
}
