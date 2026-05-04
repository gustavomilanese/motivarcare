import { useEffect, useRef, useState } from "react";

type Props = {
  imageSrc: string;
  patientPortalUrl: string;
  portalDisplayHost: string;
};

/**
 * Sección "Quiénes somos" con parallax suave en la foto (desktop).
 * Respeta prefers-reduced-motion; en ≤960px el desplazamiento se anula.
 */
export function QuienesSomosStrip(props: Props) {
  const { imageSrc, patientPortalUrl, portalDisplayHost } = props;
  const sectionRef = useRef<HTMLElement>(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const update = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setParallaxY(0);
        return;
      }
      if (window.matchMedia("(max-width: 960px)").matches) {
        setParallaxY(0);
        return;
      }
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const centerOffset = rect.top + rect.height / 2 - vh / 2;
      setParallaxY(centerOffset * -0.1);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section ref={sectionRef} className="plv2-photo-strip" id="quienes-somos" aria-labelledby="plv2-photo-strip-title">
      <div className="plv2-photo-strip-frame">
        <div className="plv2-photo-strip-parallax">
          <img
            src={imageSrc}
            alt="Persona en una videollamada con una profesional, desde un espacio tranquilo en casa"
            width={1024}
            height={546}
            loading="lazy"
            decoding="async"
            className="plv2-photo-strip-bg"
            style={{ transform: `translate3d(0, ${parallaxY}px, 0)` }}
          />
        </div>
        <div className="plv2-photo-strip-scrim" aria-hidden="true" />
        <div className="plv2-photo-strip-content">
          <div className="plv2-container">
            <div className="plv2-hero-copy">
              <p className="plv2-photo-strip-kicker">MotivarCare</p>
              <h2 id="plv2-photo-strip-title">¿Quiénes somos?</h2>
              <p className="plv2-photo-strip-tagline">Terapia que se adapta al ritmo de cada persona — no al contrario.</p>
              <p className="plv2-photo-strip-prose">
                <span className="plv2-photo-strip-accent">Maca</span> impulsó MotivarCare con una idea clara: que pedir
                ayuda psicológica sea sencillo. Nacimos para acercar un{" "}
                <span className="plv2-photo-strip-accent">acompañamiento psicológico serio y humano</span>, sin vueltas ni
                humo: claro, accesible y pensado para el día a día.
              </p>
              <a
                className="plv2-cta-gradient plv2-photo-strip-cta"
                href={patientPortalUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span className="plv2-cta-gradient-text">
                  Empiece hoy en <strong>{portalDisplayHost}</strong>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
