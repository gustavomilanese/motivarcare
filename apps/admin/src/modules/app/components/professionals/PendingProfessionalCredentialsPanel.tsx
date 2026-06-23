import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { AdminProfessionalDiploma, AdminProfessionalOps } from "../../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function isImageDocumentUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith("data:image/") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(trimmed);
}

function diplomaDocumentLabel(language: AppLanguage, documentUrl: string | null | undefined): string {
  if (!documentUrl?.trim()) {
    return t(language, { es: "Sin documento adjunto", en: "No attached document", pt: "Sem documento anexado" });
  }
  if (documentUrl.startsWith("data:application/pdf")) {
    return t(language, { es: "PDF adjunto", en: "Attached PDF", pt: "PDF anexado" });
  }
  if (isImageDocumentUrl(documentUrl)) {
    return t(language, { es: "Imagen adjunta", en: "Attached image", pt: "Imagem anexada" });
  }
  return t(language, { es: "Documento adjunto", en: "Attached document", pt: "Documento anexado" });
}

function DiplomaCard(props: { language: AppLanguage; index: number; diploma: AdminProfessionalDiploma }) {
  const { diploma } = props;
  const documentUrl = diploma.documentUrl?.trim() || null;
  const hasDocument = Boolean(documentUrl);

  return (
    <article className="dashboard-pending-credentials-diploma">
      <header className="dashboard-pending-credentials-diploma__head">
        <h4>
          {t(props.language, {
            es: `Diploma ${props.index + 1}`,
            en: `Diploma ${props.index + 1}`,
            pt: `Diploma ${props.index + 1}`
          })}
        </h4>
        {hasDocument ? (
          <a
            className="dashboard-pending-credentials-doc-link"
            href={documentUrl!}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t(props.language, {
              es: "Ver documento",
              en: "View document",
              pt: "Ver documento"
            })}
          </a>
        ) : (
          <span className="dashboard-pending-credentials-doc-missing">
            {diplomaDocumentLabel(props.language, documentUrl)}
          </span>
        )}
      </header>
      <dl className="dashboard-pending-credentials-diploma__dl">
        <div>
          <dt>{t(props.language, { es: "Institución", en: "Institution", pt: "Instituicao" })}</dt>
          <dd>{diploma.institution?.trim() || "—"}</dd>
        </div>
        <div>
          <dt>{t(props.language, { es: "Título / especialidad", en: "Degree / specialty", pt: "Titulo / especialidade" })}</dt>
          <dd>{diploma.degree?.trim() || "—"}</dd>
        </div>
        <div>
          <dt>{t(props.language, { es: "Inicio", en: "Start", pt: "Inicio" })}</dt>
          <dd>{diploma.startYear ?? "—"}</dd>
        </div>
        <div>
          <dt>{t(props.language, { es: "Graduación", en: "Graduation", pt: "Graduacao" })}</dt>
          <dd>{diploma.graduationYear ?? "—"}</dd>
        </div>
      </dl>
      {hasDocument && documentUrl && isImageDocumentUrl(documentUrl) ? (
        <a
          className="dashboard-pending-credentials-doc-preview"
          href={documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t(props.language, {
            es: `Abrir diploma ${props.index + 1} en tamaño completo`,
            en: `Open diploma ${props.index + 1} full size`,
            pt: `Abrir diploma ${props.index + 1} em tamanho completo`
          })}
        >
          <img src={documentUrl} alt="" />
        </a>
      ) : hasDocument && documentUrl ? (
        <p className="dashboard-pending-credentials-doc-hint">
          {diplomaDocumentLabel(props.language, documentUrl)} —{" "}
          <a href={documentUrl} target="_blank" rel="noopener noreferrer">
            {t(props.language, { es: "abrir en nueva pestaña", en: "open in new tab", pt: "abrir em nova aba" })}
          </a>
        </p>
      ) : null}
    </article>
  );
}

export function PendingProfessionalCredentialsPanel(props: {
  language: AppLanguage;
  professional: AdminProfessionalOps;
}) {
  const { professional } = props;
  const diplomas = professional.diplomas ?? [];

  return (
    <section className="dashboard-pending-credentials" aria-labelledby={`pending-credentials-${professional.id}`}>
      <header className="dashboard-pending-credentials__head">
        <h3 id={`pending-credentials-${professional.id}`}>
          {t(props.language, {
            es: "Formación y títulos",
            en: "Education and credentials",
            pt: "Formacao e titulos"
          })}
        </h3>
        <p>
          {t(props.language, {
            es: "Revisá el título declarado y abrí cada documento adjunto antes de aprobar.",
            en: "Review the declared title and open each attached document before approving.",
            pt: "Revise o titulo declarado e abra cada documento anexado antes de aprovar."
          })}
        </p>
      </header>

      <dl className="dashboard-pending-credentials__summary">
        <div>
          <dt>{t(props.language, { es: "Título profesional", en: "Professional title", pt: "Titulo profissional" })}</dt>
          <dd className="dashboard-pending-credentials__title-value">
            {professional.professionalTitle?.trim() || "—"}
          </dd>
        </div>
        {professional.graduationYear != null ? (
          <div>
            <dt>{t(props.language, { es: "Año de egreso", en: "Graduation year", pt: "Ano de formatura" })}</dt>
            <dd>{professional.graduationYear}</dd>
          </div>
        ) : null}
        {professional.experienceBand?.trim() ? (
          <div>
            <dt>{t(props.language, { es: "Experiencia declarada", en: "Declared experience", pt: "Experiencia declarada" })}</dt>
            <dd>{professional.experienceBand}</dd>
          </div>
        ) : null}
        {professional.practiceBand?.trim() ? (
          <div>
            <dt>{t(props.language, { es: "Horas de práctica", en: "Practice hours", pt: "Horas de pratica" })}</dt>
            <dd>{professional.practiceBand}</dd>
          </div>
        ) : null}
      </dl>

      {diplomas.length > 0 ? (
        <div className="dashboard-pending-credentials-diplomas">
          {diplomas.map((diploma, index) => (
            <DiplomaCard key={diploma.id} language={props.language} index={index} diploma={diploma} />
          ))}
        </div>
      ) : (
        <p className="dashboard-pending-credentials-empty">
          {t(props.language, {
            es: "No hay diplomas cargados en el registro.",
            en: "No diplomas were submitted during sign-up.",
            pt: "Nao ha diplomas no cadastro."
          })}
        </p>
      )}
    </section>
  );
}
