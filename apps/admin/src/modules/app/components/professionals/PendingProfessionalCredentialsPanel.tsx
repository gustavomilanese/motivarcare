import { useEffect, useId, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../../services/api";
import { fileToDataUrl } from "../../utils/media";
import type { AdminProfessionalDiploma, AdminProfessionalOps } from "../../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type DocumentKind = "pdf" | "image" | "file";
type CredentialsStep = "declared" | "identity" | "diplomas";

function documentKind(url: string): DocumentKind {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("data:application/pdf") || trimmed.includes(".pdf")) {
    return "pdf";
  }
  if (trimmed.startsWith("data:image/") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(trimmed)) {
    return "image";
  }
  return "file";
}

function documentTypeLabel(language: AppLanguage, kind: DocumentKind): string {
  if (kind === "pdf") {
    return "PDF";
  }
  if (kind === "image") {
    return t(language, { es: "Imagen", en: "Image", pt: "Imagem" });
  }
  return t(language, { es: "Archivo", en: "File", pt: "Arquivo" });
}

function downloadFileName(kind: DocumentKind, index: number, prefix: string): string {
  if (kind === "pdf") {
    return `${prefix}-${index + 1}.pdf`;
  }
  if (kind === "image") {
    return `${prefix}-${index + 1}.jpg`;
  }
  return `${prefix}-${index + 1}`;
}

function AttachmentRow(props: {
  language: AppLanguage;
  href: string;
  title: string;
  downloadName: string;
}) {
  const kind = documentKind(props.href);
  return (
    <li className="dashboard-pending-attach-list__item dashboard-pending-attach-list__item--preview">
      <div className="dashboard-pending-attach-preview">
        {kind === "image" ? (
          <a href={props.href} target="_blank" rel="noopener noreferrer">
            <img src={props.href} alt="" />
          </a>
        ) : kind === "pdf" ? (
          <iframe title={props.title} src={props.href} className="dashboard-pending-attach-preview__pdf" />
        ) : (
          <div className="dashboard-pending-attach-preview__fallback">
            {documentTypeLabel(props.language, kind)}
          </div>
        )}
      </div>
      <div className="dashboard-pending-attach-list__meta">
        <span className="dashboard-pending-attach-list__badge" data-kind={kind}>
          {documentTypeLabel(props.language, kind)}
        </span>
        <span className="dashboard-pending-attach-list__title">{props.title}</span>
      </div>
      <div className="dashboard-pending-attach-list__actions">
        <a
          className="dashboard-pending-attach-list__btn"
          href={props.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t(props.language, { es: "Abrir", en: "Open", pt: "Abrir" })}
        </a>
        <a
          className="dashboard-pending-attach-list__btn dashboard-pending-attach-list__btn--primary"
          href={props.href}
          download={props.downloadName}
        >
          {t(props.language, { es: "Descargar", en: "Download", pt: "Baixar" })}
        </a>
      </div>
    </li>
  );
}

function DocUploadButton(props: {
  language: AppLanguage;
  busy: boolean;
  label: string;
  onFile: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            void props.onFile(file);
          }
        }}
      />
      <button
        type="button"
        className="dashboard-pending-attach-list__btn dashboard-pending-attach-list__btn--primary"
        disabled={props.busy}
        onClick={() => inputRef.current?.click()}
      >
        {props.busy
          ? t(props.language, { es: "Subiendo…", en: "Uploading…", pt: "Enviando…" })
          : props.label}
      </button>
    </>
  );
}

function DiplomaCard(props: {
  language: AppLanguage;
  index: number;
  diploma: AdminProfessionalDiploma;
  token: string;
  professionalId: string;
  busy: boolean;
  requestBusy: boolean;
  onUploaded: (diploma: AdminProfessionalDiploma) => void;
  onError: (message: string) => void;
  onRequestEmail: () => void;
}) {
  const { diploma } = props;
  const documentUrl = diploma.documentUrl?.trim() || null;
  const hasDocument = Boolean(documentUrl);

  const uploadDiploma = async (file: File) => {
    try {
      if (file.size > 12 * 1024 * 1024) {
        props.onError(
          t(props.language, {
            es: "El archivo supera 12 MB.",
            en: "File exceeds 12 MB.",
            pt: "O arquivo passa de 12 MB."
          })
        );
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      const response = await apiRequest<{ diploma: AdminProfessionalDiploma }>(
        `/api/admin/professionals/${props.professionalId}/diplomas/${diploma.id}`,
        { method: "PATCH", body: JSON.stringify({ documentUrl: dataUrl }) },
        props.token
      );
      props.onUploaded(response.diploma);
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "Upload failed");
    }
  };

  return (
    <article className="dashboard-pending-credentials-diploma">
      <header className="dashboard-pending-credentials-diploma__head">
        <div>
          <p className="dashboard-pending-credentials-diploma__eyebrow">
            {t(props.language, {
              es: `Diploma ${props.index + 1}`,
              en: `Diploma ${props.index + 1}`,
              pt: `Diploma ${props.index + 1}`
            })}
          </p>
          <h4>
            {diploma.degree?.trim() ||
              t(props.language, { es: "Sin título", en: "No degree", pt: "Sem titulo" })}
          </h4>
        </div>
        {hasDocument ? (
          <span className="dashboard-pending-credentials-doc-ok">
            {t(props.language, { es: "Con adjunto", en: "Attachment ready", pt: "Com anexo" })}
          </span>
        ) : (
          <span className="dashboard-pending-credentials-doc-missing">
            {t(props.language, {
              es: "Sin documento adjunto",
              en: "No attached document",
              pt: "Sem documento anexado"
            })}
          </span>
        )}
      </header>

      <dl className="dashboard-pending-credentials-diploma__dl">
        <div>
          <dt>{t(props.language, { es: "Institución", en: "Institution", pt: "Instituicao" })}</dt>
          <dd>{diploma.institution?.trim() || "—"}</dd>
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

      {hasDocument && documentUrl ? (
        <ul className="dashboard-pending-attach-list">
          <AttachmentRow
            language={props.language}
            href={documentUrl}
            title={
              diploma.degree?.trim()
                ? t(props.language, {
                    es: `Documento · ${diploma.degree.trim()}`,
                    en: `Document · ${diploma.degree.trim()}`,
                    pt: `Documento · ${diploma.degree.trim()}`
                  })
                : t(props.language, {
                    es: `Documento diploma ${props.index + 1}`,
                    en: `Diploma document ${props.index + 1}`,
                    pt: `Documento diploma ${props.index + 1}`
                  })
            }
            downloadName={downloadFileName(documentKind(documentUrl), props.index, "diploma")}
          />
        </ul>
      ) : (
        <div className="dashboard-pending-credentials-upload-box">
          <p className="dashboard-pending-credentials-upload-hint">
            {t(props.language, {
              es: "Sin archivo. Subilo acá o pedíselo al profesional por email.",
              en: "No file. Upload it here or ask the professional by email.",
              pt: "Sem arquivo. Envie aqui ou peca ao profissional por email."
            })}
          </p>
          <div className="dashboard-pending-credentials-upload-actions">
            <DocUploadButton
              language={props.language}
              busy={props.busy}
              label={t(props.language, {
                es: "Subir diploma",
                en: "Upload diploma",
                pt: "Enviar diploma"
              })}
              onFile={uploadDiploma}
            />
            <button
              type="button"
              className="dashboard-pending-attach-list__btn"
              disabled={props.busy || props.requestBusy}
              onClick={props.onRequestEmail}
            >
              {props.requestBusy
                ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
                : t(props.language, {
                    es: "Pedir por email",
                    en: "Request by email",
                    pt: "Pedir por email"
                  })}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function StepStatusDot(props: { tone: "ok" | "warn" | "neutral" }) {
  return <span className={`dashboard-pending-cred-nav__dot dashboard-pending-cred-nav__dot--${props.tone}`} aria-hidden />;
}

export function PendingProfessionalCredentialsPanel(props: {
  language: AppLanguage;
  professional: AdminProfessionalOps;
  token: string;
  embedded?: boolean;
  onProfessionalPatch: (patch: Partial<AdminProfessionalOps>) => void;
}) {
  const { professional, language, token } = props;
  const navId = useId();
  const diplomas = professional.diplomas ?? [];
  const identityDocUrl = professional.stripeDocUrl?.trim() || null;
  const missingDiplomaDocs = diplomas.filter((diploma) => !diploma.documentUrl?.trim()).length;
  const identityOk = Boolean(identityDocUrl);
  const diplomasOk = diplomas.length > 0 && missingDiplomaDocs === 0;

  const [step, setStep] = useState<CredentialsStep>("declared");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionOk, setActionOk] = useState("");

  useEffect(() => {
    setStep("declared");
  }, [professional.id]);

  const steps: Array<{
    id: CredentialsStep;
    number: string;
    label: LocalizedText;
    hint: LocalizedText;
    tone: "ok" | "warn" | "neutral";
  }> = [
    {
      id: "declared",
      number: "1",
      label: { es: "Título declarado", en: "Declared title", pt: "Titulo declarado" },
      hint: {
        es: "Qué dice que es y cuánta experiencia.",
        en: "What they claim to be and their experience.",
        pt: "O que declara ser e a experiencia."
      },
      tone: "ok"
    },
    {
      id: "identity",
      number: "2",
      label: { es: "Identidad", en: "Identity", pt: "Identidade" },
      hint: {
        es: "DNI o documento fiscal.",
        en: "ID or tax document.",
        pt: "Documento de identidade ou fiscal."
      },
      tone: identityOk ? "ok" : "warn"
    },
    {
      id: "diplomas",
      number: "3",
      label: { es: "Diplomas", en: "Diplomas", pt: "Diplomas" },
      hint: {
        es:
          diplomas.length === 0
            ? "Sin diplomas cargados."
            : missingDiplomaDocs > 0
              ? `${missingDiplomaDocs} sin archivo.`
              : `${diplomas.length} con adjunto.`,
        en:
          diplomas.length === 0
            ? "No diplomas uploaded."
            : missingDiplomaDocs > 0
              ? `${missingDiplomaDocs} missing file.`
              : `${diplomas.length} with attachment.`,
        pt:
          diplomas.length === 0
            ? "Sem diplomas."
            : missingDiplomaDocs > 0
              ? `${missingDiplomaDocs} sem arquivo.`
              : `${diplomas.length} com anexo.`
      },
      tone: diplomas.length === 0 ? "warn" : diplomasOk ? "ok" : "warn"
    }
  ];

  const requestMissingDocs = async (missingItems: string[]) => {
    if (missingItems.length === 0) {
      return;
    }
    setActionError("");
    setActionOk("");
    setRequestBusy(true);
    try {
      await apiRequest(
        `/api/admin/professionals/${professional.id}/request-documents`,
        {
          method: "POST",
          body: JSON.stringify({ missingItems, note: null })
        },
        token
      );
      setActionOk(
        t(language, {
          es: "Email enviado al profesional pidiendo el documento.",
          en: "Email sent to the professional requesting the document.",
          pt: "Email enviado ao profissional pedindo o documento."
        })
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setRequestBusy(false);
    }
  };

  const uploadIdentity = async (file: File) => {
    setActionError("");
    setActionOk("");
    setUploadBusy(true);
    try {
      if (file.size > 12 * 1024 * 1024) {
        throw new Error(
          t(language, {
            es: "El archivo supera 12 MB.",
            en: "File exceeds 12 MB.",
            pt: "O arquivo passa de 12 MB."
          })
        );
      }
      const dataUrl = await fileToDataUrl(file);
      await apiRequest(
        `/api/admin/professionals/${professional.id}`,
        { method: "PATCH", body: JSON.stringify({ stripeDocUrl: dataUrl }) },
        token
      );
      props.onProfessionalPatch({ stripeDocUrl: dataUrl });
      setActionOk(
        t(language, {
          es: "Documento de identidad guardado.",
          en: "Identity document saved.",
          pt: "Documento de identidade salvo."
        })
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <section
      className={
        "dashboard-pending-credentials dashboard-pending-credentials--guided" +
        (props.embedded ? " dashboard-pending-credentials--embedded" : "")
      }
    >
      {!props.embedded ? (
        <header className="dashboard-pending-credentials__head">
          <div>
            <h3>
              {t(language, {
                es: "Formación y títulos",
                en: "Education and credentials",
                pt: "Formacao e titulos"
              })}
            </h3>
          </div>
        </header>
      ) : null}

      {actionError ? <p className="dashboard-pending-approvals__error">{actionError}</p> : null}
      {actionOk ? <p className="dashboard-pending-action-ok">{actionOk}</p> : null}

      <div className="dashboard-pending-cred-layout">
        <nav
          className="dashboard-pending-cred-nav"
          aria-label={t(language, {
            es: "Pasos de formación",
            en: "Credential steps",
            pt: "Passos de formacao"
          })}
        >
          {steps.map((item) => {
            const selected = step === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`${navId}-${item.id}`}
                className={
                  "dashboard-pending-cred-nav__item" +
                  (selected ? " dashboard-pending-cred-nav__item--active" : "")
                }
                aria-current={selected ? "step" : undefined}
                onClick={() => setStep(item.id)}
              >
                <span className="dashboard-pending-cred-nav__num">{item.number}</span>
                <span className="dashboard-pending-cred-nav__copy">
                  <strong>{t(language, item.label)}</strong>
                  <span>{t(language, item.hint)}</span>
                </span>
                <StepStatusDot tone={item.tone} />
              </button>
            );
          })}
        </nav>

        <div className="dashboard-pending-cred-stage" role="region" aria-labelledby={`${navId}-${step}`}>
          {step === "declared" ? (
            <dl className="dashboard-pending-credentials__summary">
              <div>
                <dt>
                  {t(language, {
                    es: "Título profesional",
                    en: "Professional title",
                    pt: "Titulo profissional"
                  })}
                </dt>
                <dd className="dashboard-pending-credentials__title-value">
                  {professional.professionalTitle?.trim() || "—"}
                </dd>
              </div>
              {professional.experienceBand?.trim() ? (
                <div>
                  <dt>
                    {t(language, {
                      es: "Experiencia declarada",
                      en: "Declared experience",
                      pt: "Experiencia declarada"
                    })}
                  </dt>
                  <dd>{professional.experienceBand}</dd>
                </div>
              ) : null}
              {professional.practiceBand?.trim() ? (
                <div>
                  <dt>
                    {t(language, {
                      es: "Horas de práctica",
                      en: "Practice hours",
                      pt: "Horas de pratica"
                    })}
                  </dt>
                  <dd>{professional.practiceBand}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {step === "identity" ? (
            identityDocUrl ? (
              <ul className="dashboard-pending-attach-list">
                <AttachmentRow
                  language={language}
                  href={identityDocUrl}
                  title={t(language, {
                    es: "DNI o documento fiscal",
                    en: "ID or tax document",
                    pt: "Documento de identidade ou fiscal"
                  })}
                  downloadName={downloadFileName(documentKind(identityDocUrl), 0, "identidad")}
                />
              </ul>
            ) : (
              <div className="dashboard-pending-credentials-upload-box">
                <p className="dashboard-pending-credentials-upload-hint">
                  {t(language, {
                    es: "Sin documento de identidad. Subilo acá o pedíselo por email.",
                    en: "No identity document. Upload it here or request it by email.",
                    pt: "Sem documento de identidade. Envie aqui ou peca por email."
                  })}
                </p>
                <div className="dashboard-pending-credentials-upload-actions">
                  <DocUploadButton
                    language={language}
                    busy={uploadBusy}
                    label={t(language, {
                      es: "Subir documento",
                      en: "Upload document",
                      pt: "Enviar documento"
                    })}
                    onFile={uploadIdentity}
                  />
                  <button
                    type="button"
                    className="dashboard-pending-attach-list__btn"
                    disabled={uploadBusy || requestBusy}
                    onClick={() =>
                      void requestMissingDocs([
                        t(language, {
                          es: "Documento de identidad o fiscal (JPG, PNG o PDF)",
                          en: "Identity or tax document (JPG, PNG, or PDF)",
                          pt: "Documento de identidade ou fiscal (JPG, PNG ou PDF)"
                        })
                      ])
                    }
                  >
                    {requestBusy
                      ? t(language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
                      : t(language, {
                          es: "Pedir por email",
                          en: "Request by email",
                          pt: "Pedir por email"
                        })}
                  </button>
                </div>
              </div>
            )
          ) : null}

          {step === "diplomas" ? (
            diplomas.length > 0 ? (
              <div className="dashboard-pending-credentials-diplomas">
                {diplomas.map((diploma, index) => (
                  <DiplomaCard
                    key={diploma.id}
                    language={language}
                    index={index}
                    diploma={diploma}
                    token={token}
                    professionalId={professional.id}
                    busy={uploadBusy}
                    requestBusy={requestBusy}
                    onError={(message) => setActionError(message)}
                    onRequestEmail={() => {
                      const label = diploma.degree?.trim() || `Diploma ${index + 1}`;
                      void requestMissingDocs([
                        t(language, {
                          es: `Archivo del diploma: ${label}`,
                          en: `Diploma file: ${label}`,
                          pt: `Arquivo do diploma: ${label}`
                        })
                      ]);
                    }}
                    onUploaded={(nextDiploma) => {
                      props.onProfessionalPatch({
                        diplomas: diplomas.map((item) =>
                          item.id === nextDiploma.id ? { ...item, ...nextDiploma } : item
                        )
                      });
                      setActionOk(
                        t(language, {
                          es: "Diploma actualizado.",
                          en: "Diploma updated.",
                          pt: "Diploma atualizado."
                        })
                      );
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="dashboard-pending-credentials-empty">
                {t(language, {
                  es: "No hay diplomas cargados en el registro.",
                  en: "No diplomas were submitted during sign-up.",
                  pt: "Nao ha diplomas no cadastro."
                })}
              </p>
            )
          ) : null}

          <div className="dashboard-pending-cred-stage__nav">
            <button
              type="button"
              className="dashboard-pending-attach-list__btn"
              disabled={step === "declared"}
              onClick={() =>
                setStep(step === "diplomas" ? "identity" : step === "identity" ? "declared" : "declared")
              }
            >
              {t(language, { es: "Anterior", en: "Previous", pt: "Anterior" })}
            </button>
            <button
              type="button"
              className="dashboard-pending-attach-list__btn dashboard-pending-attach-list__btn--primary"
              disabled={step === "diplomas"}
              onClick={() =>
                setStep(step === "declared" ? "identity" : step === "identity" ? "diplomas" : "diplomas")
              }
            >
              {t(language, { es: "Siguiente", en: "Next", pt: "Proximo" })}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
