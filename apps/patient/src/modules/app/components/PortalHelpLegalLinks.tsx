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

export interface PortalHelpLegalLinksProps {
  language: AppLanguage;
  residencyCountry: string | null;
  patientMarket: Market;
  /** Cierra el menú móvil al navegar (solo modo menu). */
  onNavigate?: () => void;
}

export function PortalHelpLegalFooter(props: PortalHelpLegalLinksProps) {
  const emergency = getEmergencyResources(resolveCountryCode(props.residencyCountry, props.patientMarket));

  return (
    <>
      <div className="portal-site-footer-inner">
        <section className="portal-site-footer-block">
          <h2 className="portal-site-footer-heading">
            {t(props.language, { es: "Soporte", en: "Support", pt: "Suporte" })}
          </h2>
          <p className="portal-site-footer-lead">
            {t(props.language, {
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
            {t(props.language, { es: "Ayuda", en: "Help", pt: "Ajuda" })}
          </h2>
          <nav className="portal-site-footer-links" aria-label={t(props.language, { es: "Ayuda", en: "Help", pt: "Ajuda" })}>
            <Link to="/ayuda/preguntas-frecuentes">
              {t(props.language, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}
            </Link>
            <Link to="/ayuda/manual">
              {t(props.language, { es: "Manual de usuario", en: "User manual", pt: "Manual do usuário" })}
            </Link>
          </nav>
        </section>

        <section className="portal-site-footer-block">
          <h2 className="portal-site-footer-heading">
            {t(props.language, { es: "Legal", en: "Legal", pt: "Legal" })}
          </h2>
          <nav className="portal-site-footer-links" aria-label={t(props.language, { es: "Legal", en: "Legal", pt: "Legal" })}>
            <a href="/docs/terms.html" target="_blank" rel="noopener noreferrer">
              {t(props.language, { es: "Términos y condiciones", en: "Terms and conditions", pt: "Termos e condições" })}
            </a>
            <a href="/docs/privacy.html" target="_blank" rel="noopener noreferrer">
              {t(props.language, { es: "Política de privacidad", en: "Privacy policy", pt: "Política de privacidade" })}
            </a>
            <a href="/docs/crisis.html" target="_blank" rel="noopener noreferrer">
              {t(props.language, { es: "Líneas de apoyo", en: "Crisis lines", pt: "Linhas de apoio" })}
            </a>
          </nav>
        </section>

        {emergency ? (
          <section className="portal-site-footer-block portal-site-footer-block--phones">
            <h2 className="portal-site-footer-heading">
              {t(props.language, {
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
              {t(props.language, {
                es: "Si estás en peligro inmediato, llamá a emergencias de tu país.",
                en: "If you are in immediate danger, call your local emergency number.",
                pt: "Se estiver em perigo imediato, ligue para emergências do seu país."
              })}
            </p>
          </section>
        ) : null}
      </div>
      <p className="portal-site-footer-copy">© {new Date().getFullYear()} MotivarCare</p>
    </>
  );
}

export function PortalHelpLegalMenuSection(props: PortalHelpLegalLinksProps) {
  const emergency = getEmergencyResources(resolveCountryCode(props.residencyCountry, props.patientMarket));
  const closeMenu = props.onNavigate;

  return (
    <div
      className="menu-dropdown-help"
      role="group"
      aria-label={t(props.language, { es: "Ayuda y legal", en: "Help and legal", pt: "Ajuda e legal" })}
    >
      <p className="menu-dropdown-section-label">
        {t(props.language, { es: "Ayuda y legal", en: "Help and legal", pt: "Ajuda e legal" })}
      </p>
      <Link className="menu-item menu-item--help" to="/ayuda/preguntas-frecuentes" onClick={closeMenu}>
        {t(props.language, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}
      </Link>
      <Link className="menu-item menu-item--help" to="/ayuda/manual" onClick={closeMenu}>
        {t(props.language, { es: "Manual de usuario", en: "User manual", pt: "Manual do usuário" })}
      </Link>
      <a className="menu-item menu-item--help menu-item--help-email" href={`mailto:${PATIENT_SUPPORT_EMAIL}`}>
        <span>{t(props.language, { es: "Contactar soporte", en: "Contact support", pt: "Contactar suporte" })}</span>
        <small>{PATIENT_SUPPORT_EMAIL}</small>
      </a>
      <a className="menu-item menu-item--help" href="/docs/terms.html" target="_blank" rel="noopener noreferrer">
        {t(props.language, { es: "Términos y condiciones", en: "Terms and conditions", pt: "Termos e condições" })}
      </a>
      <a className="menu-item menu-item--help" href="/docs/privacy.html" target="_blank" rel="noopener noreferrer">
        {t(props.language, { es: "Política de privacidad", en: "Privacy policy", pt: "Política de privacidade" })}
      </a>
      <a className="menu-item menu-item--help" href="/docs/crisis.html" target="_blank" rel="noopener noreferrer">
        {t(props.language, { es: "Líneas de apoyo", en: "Crisis lines", pt: "Linhas de apoio" })}
      </a>
      {emergency ? (
        <div className="menu-dropdown-phones">
          <p className="menu-dropdown-phones-title">
            {t(props.language, { es: "Teléfonos útiles", en: "Useful numbers", pt: "Telefones úteis" })}
            <span> — {emergency.countryName}</span>
          </p>
          <ul className="menu-dropdown-phones-list">
            {emergency.resources.map((resource) => (
              <li key={`${resource.label}-${resource.contact}`}>
                <strong>{resource.label}</strong>
                <span>{resource.contact}</span>
              </li>
            ))}
          </ul>
          <p className="menu-dropdown-phones-note">
            {t(props.language, {
              es: "Peligro inmediato: emergencias de tu país.",
              en: "Immediate danger: your local emergency number.",
              pt: "Perigo imediato: emergências do seu país."
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
