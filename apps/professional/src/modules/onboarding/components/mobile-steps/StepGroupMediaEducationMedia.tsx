import { useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import { mediaPreviewFromFile } from "../../../app/utils/mediaPreview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalPriceStep(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  value: {
    sessionPrice: string;
    discount4: string;
    discount8: string;
    discount12: string;
  };
  onChange: (value: {
    sessionPrice: string;
    discount4: string;
    discount8: string;
    discount12: string;
  }) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const update = (patch: Partial<typeof props.value>) => props.onChange({ ...props.value, ...patch });
  const sessionPrice = Number(props.value.sessionPrice || "0");
  const canContinue = sessionPrice > 0;

  const clampPercent = (raw: string, max: number) => {
    const numeric = raw.replace(/\D/g, "");
    if (!numeric) {
      return "";
    }
    return String(Math.min(max, Math.max(0, Number(numeric))));
  };

  const discountedPrice = (discount: string) => {
    if (!sessionPrice) {
      return null;
    }
    const percent = Number(discount || "0");
    if (!percent) {
      return null;
    }
    const value = Math.max(0, Math.round(sessionPrice * (1 - percent / 100)));
    return `${value} ${props.currency} ${t(props.language, { es: "por sesion", en: "per session", pt: "por sessao" })}`;
  };

  const discounted4 = discountedPrice(props.value.discount4);
  const discounted8 = discountedPrice(props.value.discount8);
  const discounted12 = discountedPrice(props.value.discount12);

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-price-copy">
          <h1>{t(props.language, { es: "Precio por una sesion", en: "Price per session", pt: "Preco por sessao" })}</h1>
          <p>
            {t(props.language, {
              es: "Puede cambiar el precio en cualquier momento en el futuro. Este es el precio que sus clientes pagaran por una sesion con usted.",
              en: "You can change this price anytime in the future. This is what clients will pay for a session with you.",
              pt: "Voce pode alterar esse preco no futuro. Este sera o valor que seus clientes pagarao por sessao."
            })}
          </p>
        </div>

        <label className="pro-form-step-field">
          <input
            inputMode="numeric"
            placeholder={`1,000 ${props.currency}`}
            value={props.value.sessionPrice}
            onChange={(event) => update({ sessionPrice: event.target.value.replace(/\D/g, "") })}
          />
        </label>

        <div className="pro-price-copy">
          <h2>{t(props.language, { es: "Descuento en planes de terapia", en: "Discount in therapy plans", pt: "Desconto em planos de terapia" })}</h2>
          <p>
            {t(props.language, {
              es: "Descuentos para paquetes de 4, 8 y 12 sesiones. La plataforma limita el máximo (5%, 10% y 15%).",
              en: "Discounts for 4, 8, and 12 session bundles. Platform caps apply (5%, 10%, and 15%).",
              pt: "Descontos para pacotes de 4, 8 e 12 sessoes. A plataforma limita o maximo (5%, 10% e 15%)."
            })}
          </p>
        </div>

        <div className="pro-price-discounts">
          <div className="pro-price-discount-row">
            <span>{t(props.language, { es: "4 sesiones (máx. 5%)", en: "4 sessions (max 5%)", pt: "4 sessoes (max. 5%)" })}</span>
            <label className="pro-price-percent-input">
              <input
                inputMode="numeric"
                value={props.value.discount4}
                onChange={(event) => update({ discount4: clampPercent(event.target.value, 5) })}
              />
              <em>%</em>
            </label>
            {discounted4 ? <small>{discounted4}</small> : null}
          </div>

          <div className="pro-price-discount-row">
            <span>{t(props.language, { es: "8 sesiones (máx. 10%)", en: "8 sessions (max 10%)", pt: "8 sessoes (max. 10%)" })}</span>
            <label className="pro-price-percent-input">
              <input
                inputMode="numeric"
                value={props.value.discount8}
                onChange={(event) => update({ discount8: clampPercent(event.target.value, 10) })}
              />
              <em>%</em>
            </label>
            {discounted8 ? <small>{discounted8}</small> : null}
          </div>

          <div className="pro-price-discount-row">
            <span>{t(props.language, { es: "12 sesiones (máx. 15%)", en: "12 sessions (max 15%)", pt: "12 sessoes (max. 15%)" })}</span>
            <label className="pro-price-percent-input">
              <input
                inputMode="numeric"
                value={props.value.discount12}
                onChange={(event) => update({ discount12: clampPercent(event.target.value, 15) })}
              />
              <em>%</em>
            </label>
            {discounted12 ? <small>{discounted12}</small> : null}
          </div>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" disabled={!canContinue} onClick={props.onContinue}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalPhotoInfoStep(props: { language: AppLanguage; currency: SupportedCurrency; onBack: () => void; onContinue: () => void }) {
  const rules = [
    { es: "La foto debe ser de buena calidad.", en: "The photo must be high quality.", pt: "A foto deve ter boa qualidade." },
    { es: "El fondo debe ser liso (sin paisajes ni personas).", en: "Use a plain background (no landscapes or people).", pt: "Use um fundo liso (sem paisagens ou pessoas)." },
    { es: "Debe verse profesional.", en: "It should look professional.", pt: "Ela deve parecer profissional." },
    { es: "No use audifonos, gafas de sol ni sombreros.", en: "Do not wear headphones, sunglasses, or hats.", pt: "Nao use fones, oculos escuros ou chapeu." },
    { es: "Mire a camara y mantengase centrado en el marco.", en: "Look at the camera and stay centered in frame.", pt: "Olhe para a camera e fique centralizado no quadro." },
    { es: "Debe verse con hombros (la foto de pasaporte no es adecuada).", en: "Shoulders should be visible (passport-style closeups are not ideal).", pt: "Os ombros devem aparecer (foto estilo passaporte nao e ideal)." }
  ];

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-about-info-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-about-copy">
          <h1>{t(props.language, { es: "Su foto", en: "Your photo", pt: "Sua foto" })}</h1>
          <p>
            {t(props.language, {
              es: "Una buena foto de perfil es muy importante. Muchos clientes hacen su eleccion con solo mirar su foto, por lo que debe verse profesional.",
              en: "A good profile photo is very important. Many clients decide by looking at your photo, so it should look professional.",
              pt: "Uma boa foto de perfil e muito importante. Muitos clientes escolhem so de olhar sua foto, por isso ela deve parecer profissional."
            })}
          </p>
          <p>{t(props.language, { es: "Criterios para la fotografia:", en: "Photo criteria:", pt: "Criterios para a foto:" })}</p>
          <ul className="pro-photo-info-rules">
            {rules.map((rule) => (
              <li key={rule.es}>{t(props.language, rule)}</li>
            ))}
          </ul>
        </div>

        <div className="pro-about-example">
          <strong>{t(props.language, { es: "Ejemplo", en: "Example", pt: "Exemplo" })}</strong>
          <article className="pro-photo-info-example">
            <div className="pro-photo-preview-head">
              <div className="pro-photo-preview-image" aria-hidden="true" />
              <div className="pro-photo-preview-meta">
                <strong>Zlata M.</strong>
                <span>{t(props.language, { es: "Psicoterapeuta, sexologa", en: "Psychotherapist, sexologist", pt: "Psicoterapeuta, sexologa" })}</span>
                <small>{t(props.language, { es: "5+ anos de experiencia", en: "5+ years of experience", pt: "5+ anos de experiencia" })}</small>
                <small>{t(props.language, { es: "5 000+ horas de practica", en: "5,000+ practice hours", pt: "5.000+ horas de pratica" })}</small>
              </div>
              <span className="pro-photo-preview-favorite" aria-hidden="true">♥</span>
            </div>
            <strong className="pro-photo-preview-match">{t(props.language, { es: "Zlata M. te conviene a 100%", en: "Zlata M. is a 100% match for you", pt: "Zlata M. combina 100% com voce" })}</strong>
            <span className="pro-photo-preview-line" aria-hidden="true" />
            <p>
              {t(props.language, {
                es: "Hola! Soy psicologa y terapeuta Gestalt. Trabajo con autoestima, ansiedad y ataques de panico.",
                en: "Hi! I am a psychologist and Gestalt therapist. I work with self-esteem, anxiety, and panic attacks.",
                pt: "Ola! Sou psicologa e terapeuta Gestalt. Trabalho com autoestima, ansiedade e ataques de panico."
              })}
            </p>
            <p className="pro-photo-preview-price">$1 000,00 {props.currency} {t(props.language, { es: "por 50 min. sesion", en: "per 50 min. session", pt: "por sessao de 50 min." })}</p>
          </article>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalPhotoUploadStep(props: {
  language: AppLanguage;
  hasPhoto: boolean;
  onPhotoSaved: () => void;
  /** Data URL (u otra fuente válida para la API) al completar recorte / avatar. */
  onPhotoDataUrl: (dataUrl: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [cropOpen, setCropOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const saveCrop = () => {
    setCropOpen(false);
    setAvatarOpen(true);
  };

  const saveAvatar = () => {
    setAvatarOpen(false);
    if (selectedPhotoPreview) {
      props.onPhotoDataUrl(selectedPhotoPreview);
    }
    props.onPhotoSaved();
  };

  const openPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-photo-card pro-photo-upload-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-photo-copy">
          <h1>{t(props.language, { es: "Anada su foto", en: "Add your photo", pt: "Adicione sua foto" })}</h1>
          <p>
            {t(props.language, {
              es: "Una buena foto de perfil es muy importante. Muchos clientes hacen su eleccion con solo mirar su foto, por lo que debe verse profesional.",
              en: "A good profile photo is very important. Many clients decide just by looking at it, so it should look professional.",
              pt: "Uma boa foto de perfil e muito importante. Muitos clientes escolhem so de olhar sua foto, por isso ela deve parecer profissional."
            })}
          </p>
        </div>

        <article className="pro-photo-preview-card">
          <div className="pro-photo-preview-head">
            <div className={`pro-photo-preview-image ${props.hasPhoto ? "is-real-photo" : "is-placeholder-photo"}`} aria-hidden="true">
              {!props.hasPhoto ? <span className="pro-photo-placeholder-icon">⊕</span> : null}
            </div>
            <div className="pro-photo-preview-meta">
              <strong>Gustavo G.</strong>
              <span>{t(props.language, { es: "Psicologo", en: "Psychologist", pt: "Psicologo" })}</span>
              <small>{t(props.language, { es: "10+ anos de experiencia", en: "10+ years of experience", pt: "10+ anos de experiencia" })}</small>
              <small>{t(props.language, { es: "1 000+ horas de practica", en: "1,000+ practice hours", pt: "1.000+ horas de pratica" })}</small>
            </div>
            <span className="pro-photo-preview-favorite" aria-hidden="true">♥</span>
          </div>

          <strong className="pro-photo-preview-match">{t(props.language, { es: "Gustavo G. te conviene a 100%", en: "Gustavo G. is a 100% match for you", pt: "Gustavo G. combina 100% com voce" })}</strong>
          <span className="pro-photo-preview-line" aria-hidden="true" />
          <p>
            {t(props.language, {
              es: "Presentacion profesional para generar confianza desde el primer contacto.",
              en: "Professional presentation to create trust from the first contact.",
              pt: "Apresentacao profissional para gerar confianca desde o primeiro contato."
            })}
          </p>
          <p className="pro-photo-preview-price">$50,00 USD {t(props.language, { es: "por 50 min. sesion", en: "per 50 min. session", pt: "por sessao de 50 min." })}</p>
        </article>

        <div className="pro-photo-actions">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              const preview = await mediaPreviewFromFile(file);
              setSelectedPhotoPreview(preview);
              setCropOpen(true);
            }}
          />
          <button type="button" className="pro-photo-upload-main" onClick={openPhotoPicker}>
            {props.hasPhoto
              ? t(props.language, { es: "Editar foto actual", en: "Edit current photo", pt: "Editar foto atual" })
              : t(props.language, { es: "Agregar una foto", en: "Add a photo", pt: "Adicionar uma foto" })}
          </button>
          {selectedPhotoPreview ? (
            <div className="pro-media-mini-preview" aria-hidden="true">
              <img src={selectedPhotoPreview} alt="" />
            </div>
          ) : null}
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" disabled={!props.hasPhoto} onClick={props.onContinue}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>

        {cropOpen ? (
          <div className="pro-photo-crop-modal" role="dialog" aria-modal="true">
            <button className="pro-photo-crop-close" type="button" aria-label="Close" onClick={() => setCropOpen(false)}>
              ×
            </button>
            <div className="pro-photo-crop-content">
              <h2>{t(props.language, { es: "Por favor recorte su foto", en: "Please crop your photo", pt: "Por favor recorte sua foto" })}</h2>
              <p>{t(props.language, { es: "Recorte su foto como quiera para que se vea genial.", en: "Crop your photo as you like so it looks great.", pt: "Recorte sua foto como quiser para que fique otima." })}</p>

              <div className="pro-photo-crop-image" aria-hidden="true">
                <div className="pro-photo-crop-frame">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
            <div className="pro-photo-crop-foot">
              <button type="button" className="pro-photo-upload-main" onClick={saveCrop}>
                {t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
              </button>
            </div>
          </div>
        ) : null}

        {avatarOpen ? (
          <div className="pro-photo-crop-modal" role="dialog" aria-modal="true">
            <button className="pro-photo-crop-close" type="button" aria-label="Close" onClick={() => setAvatarOpen(false)}>
              ×
            </button>
            <div className="pro-photo-crop-content">
              <h2>{t(props.language, { es: "Personalice su avatar", en: "Customize your avatar", pt: "Personalize seu avatar" })}</h2>
              <p>
                {t(props.language, {
                  es: "Ajuste su avatar para que su rostro este centrado y claramente visible. Puede mover su foto, acercarla y alejarla.",
                  en: "Adjust your avatar so your face is centered and clearly visible. You can move, zoom in, and zoom out.",
                  pt: "Ajuste seu avatar para que o rosto fique centralizado e visivel. Voce pode mover, ampliar e reduzir a foto."
                })}
              </p>

              <div className="pro-photo-crop-image avatar" aria-hidden="true">
                <div className="pro-photo-crop-frame avatar">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <div className="pro-avatar-guide" />
                </div>
              </div>
            </div>
            <div className="pro-photo-crop-foot">
              <button type="button" className="pro-photo-upload-main" onClick={saveAvatar}>
                {t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function ProfessionalAvatarAdjustStep(props: {
  language: AppLanguage;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [avatarOpen, setAvatarOpen] = useState(false);

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-price-copy">
          <h1>{t(props.language, { es: "Personalice su avatar", en: "Customize your avatar", pt: "Personalize seu avatar" })}</h1>
          <p>
            {t(props.language, {
              es: "Ajuste su avatar para que su rostro este centrado y claramente visible. Puede mover su foto, acercarla y alejarla.",
              en: "Adjust your avatar so your face is centered and clearly visible. You can move, zoom in, and zoom out.",
              pt: "Ajuste seu avatar para que o rosto fique centralizado e visivel. Voce pode mover, ampliar e reduzir a foto."
            })}
          </p>
        </div>

        <article className="pro-avatar-session-card">
          <div className="pro-avatar-session-date">
            <small>MAR</small>
            <strong>10</strong>
          </div>
          <div className="pro-avatar-session-meta">
            <strong>Martes, 18:50</strong>
            <span>Gustavo G.</span>
          </div>
          <div className="pro-avatar-session-image" aria-hidden="true" />
        </article>

        <button type="button" className="pro-photo-secondary pro-avatar-edit-btn" onClick={() => setAvatarOpen(true)}>
          {t(props.language, { es: "Editar avatar", en: "Edit avatar", pt: "Editar avatar" })}
        </button>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>

        {avatarOpen ? (
          <div className="pro-photo-crop-modal" role="dialog" aria-modal="true">
            <button className="pro-photo-crop-close" type="button" aria-label="Close" onClick={() => setAvatarOpen(false)}>
              ×
            </button>
            <div className="pro-photo-crop-content">
              <h2>{t(props.language, { es: "Personalice su avatar", en: "Customize your avatar", pt: "Personalize seu avatar" })}</h2>
              <p>
                {t(props.language, {
                  es: "Ajuste su avatar para que su rostro este centrado y claramente visible. Puede mover su foto, acercarla y alejarla.",
                  en: "Adjust your avatar so your face is centered and clearly visible. You can move, zoom in, and zoom out.",
                  pt: "Ajuste seu avatar para que o rosto fique centralizado e visivel. Voce pode mover, ampliar e reduzir a foto."
                })}
              </p>

              <div className="pro-photo-crop-image avatar" aria-hidden="true">
                <div className="pro-photo-crop-frame avatar">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <div className="pro-avatar-guide" />
                </div>
              </div>
            </div>
            <div className="pro-photo-crop-foot">
              <button type="button" className="pro-photo-upload-main" onClick={() => setAvatarOpen(false)}>
                {t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function ProfessionalVideoInfoStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-about-info-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-about-copy">
          <h1>{t(props.language, { es: "Agregue su tarjeta de video.", en: "Add your video card.", pt: "Adicione seu cartao de video." })}</h1>
          <p>
            {t(props.language, {
              es: "El 100% de nuestros clientes miran la tarjeta de video del especialista antes de concertar una cita. Por eso, la calidad del video y su contenido son muy importantes.",
              en: "Most clients watch a specialist's video card before booking. That's why video quality and content are very important.",
              pt: "A maioria dos clientes assiste ao video do especialista antes de agendar. Por isso, qualidade e conteudo sao muito importantes."
            })}
          </p>

          <p>
            {t(props.language, {
              es: "Una tarjeta de video presentacion dura entre 1 y 2 minutos. Debe presentarse, contar que es especialista de MotivarCare y compartir brevemente su enfoque para motivar al cliente.",
              en: "A presentation video should last 1 to 2 minutes. Introduce yourself, mention you are a MotivarCare specialist, and briefly explain your approach to motivate the client.",
              pt: "Um video de apresentacao deve durar de 1 a 2 minutos. Apresente-se, diga que voce e especialista da MotivarCare e compartilhe seu enfoque de forma breve."
            })}
          </p>

          <p>{t(props.language, { es: "Principales requisitos del video:", en: "Main video requirements:", pt: "Principais requisitos do video:" })}</p>
          <ul>
            <li>{t(props.language, { es: "No mencione su apellido, solo su nombre.", en: "Mention only your first name, not your surname.", pt: "Nao mencione o sobrenome, apenas o nome." })}</li>
            <li>{t(props.language, { es: "Indique desde que ano ejerce practica privada.", en: "Say since which year you have been in private practice.", pt: "Diga desde que ano atua em pratica privada." })}</li>
            <li>{t(props.language, { es: "Grabe con buena iluminacion y sin ruido de fondo.", en: "Record with good lighting and no background noise.", pt: "Grave com boa iluminacao e sem ruido de fundo." })}</li>
            <li>{t(props.language, { es: "Duracion entre 1 y 2 minutos.", en: "Duration between 1 and 2 minutes.", pt: "Duracao entre 1 e 2 minutos." })}</li>
            <li>{t(props.language, { es: "Tamano maximo de archivo: 30 MB.", en: "Maximum file size: 30 MB.", pt: "Tamanho maximo do arquivo: 30 MB." })}</li>
          </ul>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalVideoCoverStep(props: {
  language: AppLanguage;
  coverSelected: boolean;
  onSelectCover: (file: File) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [selectedCoverPreview, setSelectedCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-price-copy">
          <h1>{t(props.language, { es: "Elija una portada para su video", en: "Choose a cover for your video", pt: "Escolha uma capa para seu video" })}</h1>
          <p>
            {t(props.language, {
              es: "Elija una bonita portada de video, seleccionando el fotograma que mas le guste. Aparecera en lugar de su video hasta que el usuario comience a verlo.",
              en: "Choose a nice video cover by selecting the frame you like the most. It will be shown before users start playing your video.",
              pt: "Escolha uma capa para o video selecionando o quadro que mais gostar. Ela sera exibida ate o usuario iniciar o video."
            })}
          </p>
        </div>

        <div className="pro-video-cover-preview" aria-hidden="true">
          <div className="pro-video-cover-frame" />
          <div className="pro-video-cover-controls">
            <span>0:01 / 0:06</span>
            <span>◉</span>
            <span>◲</span>
            <span>⋮</span>
          </div>
          <div className="pro-video-cover-timeline">
            <span className={props.coverSelected ? "selected" : ""} />
          </div>
        </div>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            const preview = await mediaPreviewFromFile(file);
            setSelectedCoverPreview(preview);
            props.onSelectCover(file);
          }}
        />
        <button
          type="button"
          className={props.coverSelected ? "pro-photo-secondary pro-video-cover-change" : "pro-photo-upload-main"}
          onClick={() => coverInputRef.current?.click()}
        >
          {props.coverSelected
            ? t(props.language, { es: "Cambiar portada", en: "Change cover", pt: "Alterar capa" })
            : t(props.language, { es: "Elija una portada", en: "Choose cover", pt: "Escolher capa" })}
        </button>
        {selectedCoverPreview ? (
          <div className="pro-media-mini-preview" aria-hidden="true">
            <img src={selectedCoverPreview} alt="" />
          </div>
        ) : null}

        {props.coverSelected ? (
          <div className="pro-video-cover-result">
            <strong>{t(props.language, { es: "Asi se vera la portada de su video", en: "This is how your video cover will look", pt: "Assim sua capa de video sera exibida" })}</strong>
            <div className="pro-video-cover-preview static" aria-hidden="true">
              <div className="pro-video-cover-frame" />
            </div>
          </div>
        ) : null}

        <button className="pro-primary pro-register-intro-cta" type="button" disabled={!props.coverSelected} onClick={props.onContinue}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}
