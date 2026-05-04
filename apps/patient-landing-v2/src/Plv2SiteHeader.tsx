import { useEffect, useId, useState } from "react";

const NAV_LINKS = [
  { href: "#quienes-somos", label: "Quiénes somos" },
  { href: "#como-empezar", label: "Cómo empezar" },
  { href: "#reviews", label: "Reviews" },
  { href: "#faq", label: "FAQs" }
] as const;

type Plv2SiteHeaderProps = {
  patientPortalUrl: string;
};

export function Plv2SiteHeader(props: Plv2SiteHeaderProps) {
  const [navOpen, setNavOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onMq = () => {
      if (mq.matches) {
        setNavOpen(false);
      }
    };
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    if (!navOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const mobileMenu = window.matchMedia("(max-width: 900px)");
    if (!mobileMenu.matches) {
      return () => window.removeEventListener("keydown", onKeyDown);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [navOpen]);

  return (
    <header className={`plv2-header plv2-header--restyle${navOpen ? " plv2-header--nav-open" : ""}`}>
      {navOpen ? (
        <button type="button" className="plv2-header-nav-backdrop" aria-label="Cerrar menú" onClick={() => setNavOpen(false)} />
      ) : null}
      <div className="plv2-container plv2-header-inner">
        <a href="/" className="plv2-brand plv2-brand--official" aria-label="MotivarCare — inicio">
          <img
            src="/brand/motivarcare-logo-full.png"
            alt="MotivarCare"
            className="plv2-brand-lockup"
            width={172}
            height={53}
            decoding="async"
          />
        </a>
        <button
          type="button"
          className="plv2-header-menu-toggle"
          aria-label={navOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={navOpen}
          aria-controls={`${menuId}-nav`}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span className="plv2-header-menu-toggle-box" aria-hidden="true">
            <span className="plv2-header-menu-toggle-line" />
            <span className="plv2-header-menu-toggle-line" />
            <span className="plv2-header-menu-toggle-line" />
          </span>
        </button>
        <nav className="plv2-header-nav" id={`${menuId}-nav`} aria-label="Secciones">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              className="plv2-header-nav-link"
              href={item.href}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a className="plv2-cta-gradient plv2-cta-gradient--header" href={props.patientPortalUrl} target="_blank" rel="noreferrer">
          Ingresar
        </a>
      </div>
    </header>
  );
}
