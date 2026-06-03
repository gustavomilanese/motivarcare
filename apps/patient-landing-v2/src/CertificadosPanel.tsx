function CertificadosShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5l7 3v5.2c0 4.6-2.9 8.8-7 10.3-4.1-1.5-7-5.7-7-10.3V6.5l7-3z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.2l2.2 2.2 4.8-4.8"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CertificadosMedalIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="9.5" r="5.25" stroke="currentColor" strokeWidth="1.65" />
      <path
        d="M9.2 14.8L8 20.5l4-2.2 4 2.2-1.2-5.7"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.8l.85 1.72 1.9.28-1.37 1.34.32 1.89L12 11.9l-1.7.89.32-1.89-1.37-1.34 1.9-.28L12 7.8z"
        fill="currentColor"
      />
    </svg>
  );
}

function CertificadosPersonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.65" />
      <circle cx="12" cy="9.5" r="2.75" stroke="currentColor" strokeWidth="1.65" />
      <path
        d="M7.2 17.2c.9-2.2 2.8-3.4 4.8-3.4s3.9 1.2 4.8 3.4"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CertificadosPanel(props: { imageSrc: string }) {
  return (
    <section
      className="plv2-certificados-panel plv2-certificados-frame"
      aria-labelledby="plv2-certificados-title"
    >
      <div className="plv2-certificados-bg">
        <img
          src={props.imageSrc}
          alt="Equipo de psicólogos certificados de MotivarCare"
          width={1024}
          height={682}
          loading="lazy"
          decoding="async"
          sizes="(min-width: 961px) 54vw, 100vw"
          className="plv2-certificados-bg-img"
        />
      </div>
      <div className="plv2-certificados-content">
          <h3 id="plv2-certificados-title" className="plv2-certificados-title">
            Psicólogos certificados
          </h3>
          <span className="plv2-certificados-rule" aria-hidden="true" />
          <p className="plv2-certificados-lead">
            Profesionales especializados dedicados a tu bienestar mental y emocional.
          </p>
          <ul className="plv2-certificados-list">
            <li>
              <span className="plv2-certificados-icon" aria-hidden="true">
                <CertificadosShieldIcon />
              </span>
              <span>Formación académica verificada</span>
            </li>
            <li>
              <span className="plv2-certificados-icon" aria-hidden="true">
                <CertificadosMedalIcon />
              </span>
              <span>Experiencia comprobada</span>
            </li>
            <li>
              <span className="plv2-certificados-icon" aria-hidden="true">
                <CertificadosPersonIcon />
              </span>
              <span>Compromiso con tu bienestar</span>
            </li>
          </ul>
      </div>
    </section>
  );
}
