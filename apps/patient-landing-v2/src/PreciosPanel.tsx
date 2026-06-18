type Props = {
  imageSrc: string;
  patientPortalUrl: string;
};

export function PreciosPanel({ imageSrc, patientPortalUrl }: Props) {
  return (
    <section className="plv2-precios-panel" id="precios" aria-labelledby="plv2-precios-title">
      <div className="plv2-precios-frame">
        <div className="plv2-precios-bg">
          <img
            src={imageSrc}
            alt="Persona tomando notas en un escritorio con laptop, en un espacio de trabajo luminoso"
            width={1024}
            height={682}
            loading="lazy"
            decoding="async"
            sizes="(min-width: 961px) 54vw, 100vw"
            className="plv2-precios-bg-img"
          />
        </div>
        <div className="plv2-precios-content">
          <p className="plv2-precios-eyebrow">Precios transparentes</p>
          <h2 id="plv2-precios-title" className="plv2-precios-title">
            Sesiones claras y{" "}
            <span className="plv2-precios-title-accent">sin sorpresas</span>
          </h2>
          <span className="plv2-precios-rule" aria-hidden="true" />

          <div className="plv2-precios-hero">
            <p className="plv2-precios-kicker">Referencia en Argentina</p>
            <p className="plv2-precios-price-line">
              <span className="plv2-precios-price">Desde $40.000 ARS</span>
              <span className="plv2-precios-unit"> / sesión</span>
            </p>
            <p className="plv2-precios-price-note">Varía según experiencia y enfoque del profesional.</p>
          </div>

          <ul className="plv2-precios-details" role="list">
            <li>
              <strong>50 minutos</strong> por encuentro — tiempo estándar en la plataforma.
            </li>
            <li>
              <strong>Packs con descuento</strong> cuando el profesional los publique (4, 8 o 12 sesiones).
            </li>
            <li>
              <strong>Sin suscripción obligatoria</strong> — paga solo lo que use.
            </li>
          </ul>

          <div className="plv2-precios-cta">
            <p className="plv2-precios-cta-text">
              Cree la cuenta, explore perfiles y reserve la primera sesión con todo claro desde el inicio.
            </p>
            <a
              className="plv2-cta-gradient plv2-cta-gradient--header plv2-precios-cta-btn"
              href={patientPortalUrl}
              target="_blank"
              rel="noreferrer"
            >
              Reservar la primera sesión
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
