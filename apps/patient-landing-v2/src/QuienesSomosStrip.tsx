import { useRef } from "react";
import { useSectionParallax } from "./useScrollMotion";

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
  const parallaxY = useSectionParallax(sectionRef);

  return (
    <section ref={sectionRef} className="plv2-photo-strip" id="quienes-somos" aria-labelledby="plv2-photo-strip-title">
      <div className="plv2-photo-strip-frame">
        <div className="plv2-photo-strip-parallax">
          <img
            src={imageSrc}
            alt="Profesional sonriendo en un entorno cálido y tranquilo"
            width={1024}
            height={573}
            loading="lazy"
            decoding="async"
            className="plv2-photo-strip-bg"
            style={{
              transform: `translate3d(0, ${parallaxY}px, 0) scale(1.04)`,
              transformOrigin: "58% 42%"
            }}
          />
        </div>
        <div className="plv2-photo-strip-scrim" aria-hidden="true" />
        <div className="plv2-photo-strip-content">
          <div className="plv2-container plv2-container--wide">
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
                  Comienza hoy en <strong>{portalDisplayHost}</strong>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
