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
  /** Abre la pestaña Soporte del perfil (solo menú móvil). */
  onOpenSupport?: () => void;
}

/** Pie compacto: links esenciales + emergencia breve + ©. */
export function PortalHelpLegalFooter(props: PortalHelpLegalLinksProps) {
  const emergency = getEmergencyResources(resolveCountryCode(props.residencyCountry, props.patientMarket));
  const topPhones = emergency?.resources.slice(0, 2) ?? [];

  return (
    <>
      <div className="portal-site-footer-inner">
        <nav
          className="portal-site-footer-nav"
          aria-label={t(props.language, { es: "Ayuda y legal", en: "Help and legal", pt: "Ajuda e legal" })}
        >
          <a className="portal-site-footer-link" href={`mailto:${PATIENT_SUPPORT_EMAIL}`}>
            {t(props.language, { es: "Soporte", en: "Support", pt: "Suporte" })}
          </a>
          <Link className="portal-site-footer-link" to="/ayuda/preguntas-frecuentes">
            {t(props.language, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}
          </Link>
          <Link className="portal-site-footer-link" to="/ayuda/manual">
            {t(props.language, { es: "Manual", en: "Manual", pt: "Manual" })}
          </Link>
          <a className="portal-site-footer-link" href="/docs/terms.html" target="_blank" rel="noopener noreferrer">
            {t(props.language, { es: "Términos", en: "Terms", pt: "Termos" })}
          </a>
          <a className="portal-site-footer-link" href="/docs/privacy.html" target="_blank" rel="noopener noreferrer">
            {t(props.language, { es: "Privacidad", en: "Privacy", pt: "Privacidade" })}
          </a>
          <a className="portal-site-footer-link" href="/docs/crisis.html" target="_blank" rel="noopener noreferrer">
            {t(props.language, { es: "Líneas de apoyo", en: "Crisis lines", pt: "Linhas de apoio" })}
          </a>
        </nav>

        {emergency && topPhones.length > 0 ? (
          <p className="portal-site-footer-emergency">
            <span className="portal-site-footer-emergency-label">
              {t(props.language, { es: "Urgencias", en: "Emergency", pt: "Emergências" })}
              {" · "}
              {emergency.countryName}
            </span>
            {topPhones.map((resource) => (
              <span key={`${resource.label}-${resource.contact}`} className="portal-site-footer-emergency-item">
                {resource.label}: {resource.contact}
              </span>
            ))}
            <a className="portal-site-footer-emergency-more" href="/docs/crisis.html" target="_blank" rel="noopener noreferrer">
              {t(props.language, { es: "Ver todas", en: "See all", pt: "Ver todas" })}
            </a>
          </p>
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
    <>
      <section
        className="menu-dropdown-group menu-dropdown-help"
        aria-label={t(props.language, { es: "Ayuda", en: "Help", pt: "Ajuda" })}
      >
        <p className="menu-dropdown-section-label">
          {t(props.language, { es: "Ayuda", en: "Help", pt: "Ajuda" })}
        </p>
        <Link className="menu-item menu-item--help" to="/ayuda/preguntas-frecuentes" onClick={closeMenu}>
          {t(props.language, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}
        </Link>
        <Link className="menu-item menu-item--help" to="/ayuda/manual" onClick={closeMenu}>
          {t(props.language, { es: "Manual de usuario", en: "User manual", pt: "Manual do usuário" })}
        </Link>
        {props.onOpenSupport ? (
          <button className="menu-item menu-item--help" type="button" onClick={props.onOpenSupport}>
            {t(props.language, { es: "Soporte", en: "Support", pt: "Suporte" })}
          </button>
        ) : null}
        <a className="menu-item menu-item--help menu-item--help-email" href={`mailto:${PATIENT_SUPPORT_EMAIL}`}>
          <span>{t(props.language, { es: "Contactar soporte", en: "Contact support", pt: "Contactar suporte" })}</span>
          <small>{PATIENT_SUPPORT_EMAIL}</small>
        </a>
      </section>

      <section
        className="menu-dropdown-group menu-dropdown-legal"
        aria-label={t(props.language, { es: "Legal", en: "Legal", pt: "Legal" })}
      >
        <p className="menu-dropdown-section-label">
          {t(props.language, { es: "Legal", en: "Legal", pt: "Legal" })}
        </p>
        <a className="menu-item menu-item--help" href="/docs/terms.html" target="_blank" rel="noopener noreferrer">
          {t(props.language, { es: "Términos y condiciones", en: "Terms and conditions", pt: "Termos e condições" })}
        </a>
        <a className="menu-item menu-item--help" href="/docs/privacy.html" target="_blank" rel="noopener noreferrer">
          {t(props.language, { es: "Política de privacidad", en: "Privacy policy", pt: "Política de privacidade" })}
        </a>
        <a className="menu-item menu-item--help" href="/docs/crisis.html" target="_blank" rel="noopener noreferrer">
          {t(props.language, { es: "Líneas de apoyo", en: "Crisis lines", pt: "Linhas de apoio" })}
        </a>
      </section>

      {emergency ? (
        <section
          className="menu-dropdown-group menu-dropdown-emergency"
          aria-label={t(props.language, { es: "Teléfonos útiles", en: "Useful numbers", pt: "Telefones úteis" })}
        >
          <p className="menu-dropdown-section-label">
            {t(props.language, { es: "Teléfonos útiles", en: "Useful numbers", pt: "Telefones úteis" })}
            <span className="menu-dropdown-section-country"> — {emergency.countryName}</span>
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
        </section>
      ) : null}
    </>
  );
}
