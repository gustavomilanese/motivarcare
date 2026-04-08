import { useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { mediaPreviewFromFile } from "../../../app/utils/mediaPreview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalEducationInfoStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
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
          <h1>{t(props.language, { es: "Su formacion", en: "Your education", pt: "Sua formacao" })}</h1>
          <p>
            {t(props.language, {
              es: "El 97% de nuestros clientes revisan la formación del especialista antes de reservar una sesión. Su educación y sus cursos determinan el valor que le dan a su perfil, asi que incluya tanta formacion relevante como sea posible.",
              en: "97% of our clients review a specialist's education before booking a session. Your degree and courses shape how your profile is valued, so include as much relevant education as possible.",
              pt: "97% dos nossos clientes revisam a formacao do especialista antes de reservar uma sessao. Sua educacao e cursos influenciam o valor do perfil, por isso inclua o maximo de formacao relevante."
            })}
          </p>
          <p>
            {t(props.language, {
              es: "Es necesario especificar una formacion psicologica superior. Tambien podra anadir cursos adicionales y formacion avanzada. El numero de cursos y formaciones no se limita.",
              en: "You should include higher education in psychology. You can also add extra courses and advanced training. There is no limit to how many items you can add.",
              pt: "E necessario informar sua formacao superior em psicologia. Voce tambem pode adicionar cursos e formacoes avancadas. Nao ha limite de itens."
            })}
          </p>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalEducationStep(props: {
  language: AppLanguage;
  value: {
    institution: string;
    specialty: string;
    startYear: string;
    graduationYear: string;
    diplomaUploaded: boolean;
  };
  onChange: (value: {
    institution: string;
    specialty: string;
    startYear: string;
    graduationYear: string;
    diplomaUploaded: boolean;
  }) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const update = (patch: Partial<typeof props.value>) => props.onChange({ ...props.value, ...patch });
  const years = Array.from({ length: 51 }, (_, i) => String(2000 + i));
  const canContinue = Boolean(
    props.value.institution.trim()
    && props.value.specialty.trim()
    && props.value.startYear
    && props.value.graduationYear
    && props.value.diplomaUploaded
  );

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
          <h1>{t(props.language, { es: "Anadir diploma #1", en: "Add diploma #1", pt: "Adicionar diploma #1" })}</h1>
          <p>
            {t(props.language, {
              es: "El 97% de nuestros clientes revisan la formación del especialista antes de reservar una sesión. Su educación y cursos determinan el valor de su perfil.",
              en: "97% of our clients review specialist education before booking. Your education and courses shape your profile value.",
              pt: "97% dos clientes revisam a formacao antes de reservar. Sua educacao e cursos definem o valor do seu perfil."
            })}
          </p>
        </div>

        <div className="pro-personal-form">
          <input
            value={props.value.institution}
            placeholder={t(props.language, { es: "Nombre de la institucion educativa", en: "Educational institution name", pt: "Nome da instituicao" })}
            onChange={(event) => update({ institution: event.target.value })}
          />
          <input
            value={props.value.specialty}
            placeholder={t(props.language, { es: "Especialidad", en: "Specialty", pt: "Especialidade" })}
            onChange={(event) => update({ specialty: event.target.value })}
          />

          <div className="pro-personal-two-cols">
            <label className="pro-personal-year-wrap">
              <select value={props.value.startYear} onChange={(event) => update({ startYear: event.target.value })}>
                <option value="">{t(props.language, { es: "Año de inicio", en: "Start year", pt: "Ano de inicio" })}</option>
                {years.map((year) => <option key={`start-${year}`} value={year}>{year}</option>)}
              </select>
              <em aria-hidden="true">⌄</em>
            </label>

            <label className="pro-personal-year-wrap">
              <select value={props.value.graduationYear} onChange={(event) => update({ graduationYear: event.target.value })}>
                <option value="">{t(props.language, { es: "Año de graduacion", en: "Graduation year", pt: "Ano de graduacao" })}</option>
                {years.map((year) => <option key={`grad-${year}`} value={year}>{year}</option>)}
              </select>
              <em aria-hidden="true">⌄</em>
            </label>
          </div>
        </div>

        <button type="button" className="pro-photo-upload-main" onClick={() => update({ diplomaUploaded: true })}>
          {t(props.language, { es: "Suba una foto del diploma", en: "Upload a diploma photo", pt: "Enviar foto do diploma" })}
        </button>

        <div className="pro-education-rules">
          <strong>{t(props.language, { es: "Requisitos básicos para los diplomas:", en: "Basic diploma requirements:", pt: "Requisitos basicos para diplomas:" })}</strong>
          <ul>
            <li>{t(props.language, { es: "Puede agregar solo 1 diploma por cada curso o educacion.", en: "You can add one diploma per course or education item.", pt: "Voce pode adicionar 1 diploma por curso/formacao." })}</li>
            <li>{t(props.language, { es: "Formato de imagen: jpg, jpeg, png.", en: "Image format: jpg, jpeg, png.", pt: "Formato de imagem: jpg, jpeg, png." })}</li>
            <li>{t(props.language, { es: "Debe ser de buena calidad.", en: "It should be good quality.", pt: "Deve ter boa qualidade." })}</li>
          </ul>
        </div>

        {props.value.diplomaUploaded ? (
          <div className="pro-diploma-preview" aria-hidden="true">
            <div className="pro-diploma-preview-icon">↻</div>
            <div className="pro-diploma-preview-image" />
          </div>
        ) : null}

        <button type="button" className="pro-photo-secondary pro-education-add-other">
          {t(props.language, { es: "Anadir otro diploma", en: "Add another diploma", pt: "Adicionar outro diploma" })}
        </button>

        <button className="pro-primary pro-register-intro-cta" type="button" disabled={!canContinue} onClick={props.onContinue}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalStripeVerificationStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  const [stripeStatus, setStripeStatus] = useState<"unverified" | "pending" | "verified">("unverified");
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const stripeDocInputRef = useRef<HTMLInputElement | null>(null);

  const handleStripeContinue = () => {
    window.open("https://dashboard.stripe.com", "_blank", "noopener,noreferrer");
    setStripeStatus("pending");
  };

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
          <h1>{t(props.language, { es: "Verificación con Stripe", en: "Stripe verification", pt: "Verificacao com Stripe" })}</h1>
          <p>
            {t(props.language, {
              es: "Para recibir pagos y validar documentos de forma segura, necesitamos completar la verificación con Stripe. Este proceso suele tardar entre 3 y 5 minutos.",
              en: "To receive payouts and validate documents securely, we need to complete Stripe verification. It usually takes 3 to 5 minutes.",
              pt: "Para receber pagamentos e validar documentos com seguranca, precisamos concluir a verificacao com Stripe. Geralmente leva de 3 a 5 minutos."
            })}
          </p>
        </div>

        <input
          ref={stripeDocInputRef}
          type="file"
          accept="image/*,.pdf"
          style={{ display: "none" }}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            const preview = await mediaPreviewFromFile(file);
            setDocumentPreview(preview);
            setDocumentLoaded(true);
          }}
        />

        <div className="pro-web-media-row">
          <div className="pro-web-media-row-main">
            <strong>{t(props.language, { es: "Documento de identidad", en: "Identity document", pt: "Documento de identidade" })}</strong>
            {documentPreview ? (
              <span className="pro-web-media-preview" aria-hidden="true">
                <img src={documentPreview} alt="" />
              </span>
            ) : null}
          </div>
          <button type="button" onClick={() => stripeDocInputRef.current?.click()}>
            {documentLoaded
              ? t(props.language, { es: "Cambiar", en: "Change", pt: "Alterar" })
              : t(props.language, { es: "Cargar", en: "Upload", pt: "Enviar" })}
          </button>
        </div>

        <div className="pro-price-discounts">
          <button type="button" className="pro-photo-upload-main" onClick={handleStripeContinue}>
            {t(props.language, { es: "Continuar con Stripe", en: "Continue with Stripe", pt: "Continuar com Stripe" })}
          </button>
          <button
            type="button"
            className="pro-photo-secondary"
            disabled={!documentLoaded || stripeStatus === "verified"}
            onClick={() => setStripeStatus("verified")}
          >
            {stripeStatus === "verified"
              ? t(props.language, { es: "Documentos verificados", en: "Documents verified", pt: "Documentos verificados" })
              : t(props.language, { es: "Ya validé mis documentos", en: "I already validated my documents", pt: "Ja validei meus documentos" })}
          </button>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" disabled={stripeStatus !== "verified"} onClick={props.onContinue}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalSuccessInfoStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
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
          <h1>{t(props.language, { es: "¡Ya está dado de alta!", en: "You are officially live!", pt: "Voce ja esta ativo!" })}</h1>
          <p>
            {t(props.language, {
              es: "Su perfil quedó completo y la verificación de cobros fue aprobada. Ya puede empezar a recibir reservas.",
              en: "Your profile is complete and payout verification is approved. You can start receiving bookings now.",
              pt: "Seu perfil esta completo e a verificacao de pagamentos foi aprovada. Voce ja pode receber reservas."
            })}
          </p>
          <p>
            {t(props.language, {
              es: "Celebre este avance: su cuenta profesional ya está lista para operar.",
              en: "Celebrate this milestone: your professional account is now ready to operate.",
              pt: "Comemore este marco: sua conta profissional ja esta pronta para operar."
            })}
          </p>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Acceder", en: "Access", pt: "Acessar" })}
        </button>
      </section>
    </div>
  );
}

