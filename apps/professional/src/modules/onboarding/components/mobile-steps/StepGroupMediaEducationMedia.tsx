import { useEffect, useMemo, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import {
  FALLBACK_SESSION_PRICE_MAX_ARS,
  FALLBACK_SESSION_PRICE_MAX_USD,
  FALLBACK_SESSION_PRICE_MIN_ARS,
  FALLBACK_SESSION_PRICE_MIN_USD,
  fetchSessionPriceBoundsDual,
  type SessionPriceBoundsDual
} from "../../../app/services/sessionPriceBounds";
import {
  fetchPublicUsdArsRate,
  roundSessionPriceArsFromUsd
} from "../../../app/services/usdArsPublicRate";
import { mediaPreviewFromFile } from "../../../app/utils/mediaPreview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalPriceStep(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  value: {
    sessionPriceArs: string;
    sessionPrice: string;
    discount4: string;
    discount8: string;
    discount12: string;
  };
  onChange: (value: {
    sessionPriceArs: string;
    sessionPrice: string;
    discount4: string;
    discount8: string;
    discount12: string;
  }) => void;
  /** Notifica el tipo USD→ARS obtenido del API (para armar el draft de onboarding). */
  onUsdArsRate?: (rate: number | null) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const update = (patch: Partial<typeof props.value>) => props.onChange({ ...props.value, ...patch });
  const usd = Number(props.value.sessionPrice || "0");
  const [bounds, setBounds] = useState<SessionPriceBoundsDual | null>(null);
  const [usdArsRate, setUsdArsRate] = useState<number | null>(null);
  const [usdArsRateError, setUsdArsRateError] = useState(false);
  const [priceError, setPriceError] = useState("");

  const arMin = bounds?.ars.min ?? FALLBACK_SESSION_PRICE_MIN_ARS;
  const arMax = bounds?.ars.max ?? FALLBACK_SESSION_PRICE_MAX_ARS;
  const usdMin = bounds?.usd.min ?? FALLBACK_SESSION_PRICE_MIN_USD;
  const usdMax = bounds?.usd.max ?? FALLBACK_SESSION_PRICE_MAX_USD;

  const computedSessionPriceArs = useMemo(() => {
    if (!usd || usdArsRate === null || !Number.isFinite(usdArsRate)) {
      return null;
    }
    return roundSessionPriceArsFromUsd(usd, usdArsRate);
  }, [usd, usdArsRate]);

  const usdOk = Number.isInteger(usd) && usd >= usdMin && usd <= usdMax;
  const arDerivedOk =
    computedSessionPriceArs === null ||
    (computedSessionPriceArs >= arMin && computedSessionPriceArs <= arMax);
  const canContinue = usd > 0 && usdOk && arDerivedOk;

  useEffect(() => {
    void fetchSessionPriceBoundsDual().then(setBounds);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicUsdArsRate()
      .then((rate) => {
        if (!cancelled) {
          setUsdArsRate(rate);
          setUsdArsRateError(false);
          props.onUsdArsRate?.(rate);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsdArsRate(null);
          setUsdArsRateError(true);
          props.onUsdArsRate?.(null);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar; notificar padre una vez
  }, []);

  useEffect(() => {
    setPriceError("");
  }, [props.value.sessionPrice]);

  const tryContinue = () => {
    if (usd <= 0) {
      setPriceError(
        t(props.language, {
          es: "Indicá el precio de referencia en USD (moneda de la plataforma).",
          en: "Enter your reference price in USD (the platform currency).",
          pt: "Informe o preco de referencia em USD (moeda da plataforma)."
        })
      );
      return;
    }
    if (!usdOk) {
      setPriceError(
        t(props.language, {
          es: `USD: entero entre ${usdMin} y ${usdMax}.`,
          en: `USD: whole dollars between ${usdMin} and ${usdMax}.`,
          pt: `USD: inteiro entre ${usdMin} e ${usdMax}.`
        })
      );
      return;
    }
    if (computedSessionPriceArs !== null && (computedSessionPriceArs < arMin || computedSessionPriceArs > arMax)) {
      setPriceError(
        t(props.language, {
          es: `Con el tipo de cambio actual, el precio en pesos quedaría fuera del rango (${arMin}–${arMax} ARS). Ajustá el monto en USD.`,
          en: `At the current exchange rate, the peso price would fall outside the allowed range (${arMin}–${arMax} ARS). Adjust your USD amount.`,
          pt: `Com a cotacao atual, o preco em pesos ficaria fora do intervalo (${arMin}–${arMax} ARS). Ajuste o valor em USD.`
        })
      );
      return;
    }
    setPriceError("");
    props.onContinue();
  };

  const clampPercent = (raw: string, max: number) => {
    const numeric = raw.replace(/\D/g, "");
    if (!numeric) {
      return "";
    }
    return String(Math.min(max, Math.max(0, Number(numeric))));
  };

  const discountedLine = (discount: string) => {
    const percent = Number(discount || "0");
    if (!percent) {
      return null;
    }
    const bits: string[] = [];
    const arsBasis = computedSessionPriceArs;
    if (arsBasis != null && arsBasis > 0) {
      bits.push(`${Math.max(0, Math.round(arsBasis * (1 - percent / 100)))} ARS`);
    }
    if (usd > 0) {
      bits.push(`${Math.max(0, Math.round(usd * (1 - percent / 100)))} ${props.currency}`);
    }
    if (bits.length === 0) {
      return null;
    }
    return `${bits.join(" · ")} ${t(props.language, { es: "por sesión", en: "per session", pt: "por sessao" })}`;
  };

  const discounted4 = discountedLine(props.value.discount4);
  const discounted8 = discountedLine(props.value.discount8);
  const discounted12 = discountedLine(props.value.discount12);

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
          <h1>{t(props.language, { es: "Precios por sesión", en: "Session prices", pt: "Precos por sessao" })}</h1>
          <p>
            {t(props.language, {
              es: "Acá definís el valor de referencia de tu sesión en dólares (USD). El precio en pesos se calcula con el tipo de cambio oficial y se redondea al siguiente múltiplo de 1.000 ARS.",
              en: "Set your reference session price in US dollars (USD). The peso price uses the official exchange rate and rounds up to the next ARS 1,000.",
              pt: "Defina aqui o valor de referencia da sessao em dolares (USD). O preco em pesos usa a cotacao oficial e arredonda para o proximo ARS 1.000."
            })}
          </p>
        </div>

        <p className="pro-price-bounds-hint">
          {t(props.language, {
            es: `USD ${usdMin}–${usdMax} enteros. Equivalente ARS (${arMin}–${arMax}) según cotización.`,
            en: `USD ${usdMin}–${usdMax} whole dollars. Implied ARS range (${arMin}–${arMax}) depends on the exchange rate.`,
            pt: `USD ${usdMin}–${usdMax} inteiros. ARS equivalente depende da cotacao (${arMin}–${arMax}).`
          })}
        </p>
        {usdArsRateError ? (
          <p className="pro-form-step-error" role="status">
            {t(props.language, {
              es: "No pudimos obtener el tipo de cambio ahora. Podés seguir; al guardar el perfil se volverá a intentar.",
              en: "We couldn’t load the exchange rate now. You can continue; saving your profile will retry.",
              pt: "Nao foi possivel obter a cotacao agora. Voce pode continuar; ao salvar tentaremos de novo."
            })}
          </p>
        ) : null}
        {priceError ? <p className="pro-form-step-error">{priceError}</p> : null}
        <label className="pro-form-step-field">
          <input
            inputMode="numeric"
            placeholder={t(props.language, { es: "Ej. 50", en: "e.g. 50", pt: "ex. 50" })}
            value={props.value.sessionPrice}
            onChange={(event) => update({ sessionPrice: event.target.value.replace(/\D/g, "") })}
          />
        </label>
        {computedSessionPriceArs !== null ? (
          <p className="pro-price-bounds-hint">
            {t(props.language, {
              es: `Equivalente orientativo: ${computedSessionPriceArs.toLocaleString("es-AR")} ARS.`,
              en: `Indicative equivalent: ${computedSessionPriceArs.toLocaleString("en-US")} ARS.`,
              pt: `Equivalente indicativo: ${computedSessionPriceArs.toLocaleString("pt-BR")} ARS.`
            })}
          </p>
        ) : null}

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

        <button className="pro-primary pro-register-intro-cta" type="button" disabled={!canContinue} onClick={tryContinue}>
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
                <small>{t(props.language, { es: "5+ años de experiencia", en: "5+ years of experience", pt: "5+ anos de experiencia" })}</small>
                <small>{t(props.language, { es: "5 000+ horas de práctica", en: "5,000+ practice hours", pt: "5.000+ horas de pratica" })}</small>
              </div>
              <span className="pro-photo-preview-favorite" aria-hidden="true">♥</span>
            </div>
            <strong className="pro-photo-preview-match">{t(props.language, { es: "Zlata M. te conviene a 100%", en: "Zlata M. is a 100% match for you", pt: "Zlata M. combina 100% com voce" })}</strong>
            <span className="pro-photo-preview-line" aria-hidden="true" />
            <p>
              {t(props.language, {
                es: "Hola! Soy psicóloga y terapeuta Gestalt. Trabajo con autoestima, ansiedad y ataques de panico.",
                en: "Hi! I am a psychologist and Gestalt therapist. I work with self-esteem, anxiety, and panic attacks.",
                pt: "Ola! Sou psicologa e terapeuta Gestalt. Trabalho com autoestima, ansiedade e ataques de panico."
              })}
            </p>
            <p className="pro-photo-preview-price">$1 000,00 {props.currency} {t(props.language, { es: "por 50 min. sesión", en: "per 50 min. session", pt: "por sessao de 50 min." })}</p>
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
              <span>{t(props.language, { es: "Psicólogo", en: "Psychologist", pt: "Psicologo" })}</span>
              <small>{t(props.language, { es: "10+ años de experiencia", en: "10+ years of experience", pt: "10+ anos de experiencia" })}</small>
              <small>{t(props.language, { es: "1 000+ horas de práctica", en: "1,000+ practice hours", pt: "1.000+ horas de pratica" })}</small>
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
          <p className="pro-photo-preview-price">$50,00 USD {t(props.language, { es: "por 50 min. sesión", en: "per 50 min. session", pt: "por sessao de 50 min." })}</p>
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
              es: "Una tarjeta de video presentación dura entre 1 y 2 minutos. Debe presentarse, contar que es especialista de MotivarCare y compartir brevemente su enfoque para motivar al cliente.",
              en: "A presentation video should last 1 to 2 minutes. Introduce yourself, mention you are a MotivarCare specialist, and briefly explain your approach to motivate the client.",
              pt: "Um video de apresentacao deve durar de 1 a 2 minutos. Apresente-se, diga que voce e especialista da MotivarCare e compartilhe seu enfoque de forma breve."
            })}
          </p>

          <div className="pro-video-script-hint">
            <strong>
              {t(props.language, {
                es: "Texto orientativo para tu video",
                en: "Suggested script for your video",
                pt: "Texto orientativo para seu video"
              })}
            </strong>
            <p>
              {t(props.language, {
                es: "Te dejamos un texto orientativo para dar un mensaje claro en el video:",
                en: "Here is a suggested outline for a clear message in your video:",
                pt: "Deixamos um texto orientativo para uma mensagem clara no video:"
              })}
            </p>
            <p className="pro-video-script-block">
              {t(props.language, {
                es: "«Hola, soy [Nombre], psicólogo/a y especialista de Motivar Care. Trabajo acompañando a personas en [área principal: ansiedad, estrés, relaciones, adicciones, etc.] Mi enfoque principal es [breve mención: cognitivo-conductual, integrador, humanista, etc.] Podés agendar una sesión conmigo a través de la plataforma cuando lo necesites»",
                en: "“Hello, I’m [Name], a psychologist and Motivar Care specialist. I support people with [main area: anxiety, stress, relationships, addictions, etc.] My main approach is [brief mention: CBT, integrative, humanistic, etc.] You can book a session with me on the platform whenever you need.”",
                pt: "“Ola, sou [Nome], psicologo/a e especialista da Motivar Care. Acompanho pessoas em [area principal: ansiedade, estresse, relacionamentos, dependencias, etc.] Meu enfoque principal e [breve mencao: cognitivo-comportamental, integrador, humanista, etc.] Voce pode agendar uma sessao comigo pela plataforma quando precisar.”"
              })}
            </p>
          </div>

          <p>{t(props.language, { es: "Principales requisitos del video:", en: "Main video requirements:", pt: "Principais requisitos do video:" })}</p>
          <ul>
            <li>{t(props.language, { es: "No mencione su apellido, solo su nombre.", en: "Mention only your first name, not your surname.", pt: "Nao mencione o sobrenome, apenas o nome." })}</li>
            <li>{t(props.language, { es: "Indique desde qué año ejerce práctica privada.", en: "Say since which year you have been in private practice.", pt: "Diga desde que ano atua em pratica privada." })}</li>
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
