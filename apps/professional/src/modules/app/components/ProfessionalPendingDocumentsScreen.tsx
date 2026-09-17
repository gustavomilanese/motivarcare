import { useEffect, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import { documentFileToDataUrl } from "../utils/mediaPreview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type PendingDiploma = {
  id: string;
  institution: string;
  degree: string;
  startYear: number;
  graduationYear: number;
  documentUrl: string | null;
};

type PendingProfile = {
  id: string;
  stripeDocUrl: string | null;
  diplomas: PendingDiploma[];
};

export function ProfessionalPendingDocumentsScreen(props: {
  language: AppLanguage;
  token: string;
  professionalProfileId: string;
  email: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [profile, setProfile] = useState<PendingProfile | null>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);
  const diplomaInputRef = useRef<HTMLInputElement>(null);
  const [activeDiplomaId, setActiveDiplomaId] = useState<string | null>(null);

  const load = async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) {
      setLoading(true);
    }
    setError("");
    try {
      const response = await apiRequest<{
        profile: {
          id: string;
          stripeDocUrl?: string | null;
          diplomas?: PendingDiploma[];
        };
      }>("/api/profiles/me", props.token);
      setProfile({
        id: response.profile.id,
        stripeDocUrl: response.profile.stripeDocUrl ?? null,
        diplomas: response.profile.diplomas ?? []
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load profile");
    } finally {
      if (!opts?.quiet) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

  const saveProfileDocs = async (next: {
    stripeDocUrl?: string | null;
    diplomas?: PendingDiploma[];
  }) => {
    if (!profile) {
      return;
    }
    setSaving(true);
    setError("");
    setOk("");
    try {
      const diplomas = (next.diplomas ?? profile.diplomas).map((diploma) => ({
        institution: diploma.institution,
        degree: diploma.degree,
        startYear: diploma.startYear,
        graduationYear: diploma.graduationYear,
        documentUrl: diploma.documentUrl?.trim() ? diploma.documentUrl : null
      }));
      const stripeDocUrlRaw =
        next.stripeDocUrl !== undefined ? next.stripeDocUrl : profile.stripeDocUrl;
      await apiRequest(
        `/api/profiles/professional/${props.professionalProfileId}/public-profile`,
        props.token,
        {
          method: "PATCH",
          body: JSON.stringify({
            stripeDocUrl: stripeDocUrlRaw?.trim() ? stripeDocUrlRaw : null,
            diplomas
          })
        }
      );
      // Releer: el PATCH reemplaza diplomas y regenera ids.
      await load({ quiet: true });
      setOk(
        t(props.language, {
          es: "Documento guardado. Tu perfil vuelve a revisión.",
          en: "Document saved. Your profile is back under review.",
          pt: "Documento salvo. Seu perfil volta para revisao."
        })
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const onIdentitySelected = async (file: File | undefined) => {
    if (!file || !profile) {
      return;
    }
    try {
      const dataUrl = await documentFileToDataUrl(file);
      await saveProfileDocs({ stripeDocUrl: dataUrl });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not read file");
    }
  };

  const onDiplomaSelected = async (file: File | undefined) => {
    if (!file || !profile || !activeDiplomaId) {
      return;
    }
    try {
      const dataUrl = await documentFileToDataUrl(file);
      const diplomas = profile.diplomas.map((diploma) =>
        diploma.id === activeDiplomaId ? { ...diploma, documentUrl: dataUrl } : diploma
      );
      await saveProfileDocs({ diplomas });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not read file");
    } finally {
      setActiveDiplomaId(null);
    }
  };

  const missingIdentity = !profile?.stripeDocUrl?.trim();
  const missingDiplomas = (profile?.diplomas ?? []).filter((diploma) => !diploma.documentUrl?.trim());

  return (
    <div className="pro-auth-shell pro-registration-approval-shell">
      <section className="pro-registration-approval-card pro-pending-docs-card" aria-labelledby="pro-pending-docs-title">
        <p className="pro-registration-approval-eyebrow">
          {t(props.language, {
            es: "MotivarCare · Documentos",
            en: "MotivarCare · Documents",
            pt: "MotivarCare · Documentos"
          })}
        </p>
        <h1 id="pro-pending-docs-title" className="pro-registration-approval-title">
          {t(props.language, {
            es: "Completar documentos",
            en: "Complete documents",
            pt: "Completar documentos"
          })}
        </h1>
        <div className="pro-registration-approval-body">
          <p>
            {t(props.language, {
              es: `Subí lo que falte para seguir con la revisión. Te avisamos en ${props.email} cuando haya novedades.`,
              en: `Upload anything missing so we can continue review. We'll email ${props.email} with updates.`,
              pt: `Envie o que faltar para seguirmos a revisao. Avisaremos em ${props.email}.`
            })}
          </p>
        </div>

        {loading ? (
          <p className="pro-pending-docs-status">
            {t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}
          </p>
        ) : (
          <div className="pro-pending-docs-list">
            <article className="pro-pending-docs-item">
              <div>
                <strong>
                  {t(props.language, {
                    es: "Documento de identidad / fiscal",
                    en: "Identity / tax document",
                    pt: "Documento de identidade / fiscal"
                  })}
                </strong>
                <span className={missingIdentity ? "is-missing" : "is-ok"}>
                  {missingIdentity
                    ? t(props.language, { es: "Falta archivo", en: "File missing", pt: "Falta arquivo" })
                    : t(props.language, { es: "Cargado", en: "Uploaded", pt: "Enviado" })}
                </span>
              </div>
              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={() => identityInputRef.current?.click()}
              >
                {missingIdentity
                  ? t(props.language, { es: "Subir", en: "Upload", pt: "Enviar" })
                  : t(props.language, { es: "Reemplazar", en: "Replace", pt: "Substituir" })}
              </button>
            </article>

            {(profile?.diplomas ?? []).map((diploma, index) => {
              const missing = !diploma.documentUrl?.trim();
              return (
                <article key={diploma.id} className="pro-pending-docs-item">
                  <div>
                    <strong>
                      {diploma.degree?.trim() ||
                        t(props.language, {
                          es: `Diploma ${index + 1}`,
                          en: `Diploma ${index + 1}`,
                          pt: `Diploma ${index + 1}`
                        })}
                    </strong>
                    <span>{diploma.institution?.trim() || "—"}</span>
                    <span className={missing ? "is-missing" : "is-ok"}>
                      {missing
                        ? t(props.language, { es: "Falta archivo", en: "File missing", pt: "Falta arquivo" })
                        : t(props.language, { es: "Cargado", en: "Uploaded", pt: "Enviado" })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="primary"
                    disabled={saving}
                    onClick={() => {
                      setActiveDiplomaId(diploma.id);
                      diplomaInputRef.current?.click();
                    }}
                  >
                    {missing
                      ? t(props.language, { es: "Subir", en: "Upload", pt: "Enviar" })
                      : t(props.language, { es: "Reemplazar", en: "Replace", pt: "Substituir" })}
                  </button>
                </article>
              );
            })}

            {(profile?.diplomas ?? []).length === 0 ? (
              <p className="pro-pending-docs-status is-missing">
                {t(props.language, {
                  es: "No hay diplomas en tu registro. Escribinos a soporte si necesitás cargar uno nuevo.",
                  en: "No diplomas on your registration. Contact support if you need to add one.",
                  pt: "Nao ha diplomas no cadastro. Fale com o suporte se precisar adicionar."
                })}
              </p>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="pro-pending-docs-status is-missing" role="alert">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="pro-pending-docs-status is-ok" role="status">
            {ok}
          </p>
        ) : null}

        {!loading && !missingIdentity && missingDiplomas.length === 0 && (profile?.diplomas.length ?? 0) > 0 ? (
          <p className="pro-pending-docs-status is-ok">
            {t(props.language, {
              es: "Documentos listos. Ya podés volver a la pantalla de revisión.",
              en: "Documents ready. You can return to the review screen.",
              pt: "Documentos prontos. Pode voltar a tela de revisao."
            })}
          </p>
        ) : null}

        <div className="pro-registration-approval-actions">
          <button type="button" className="primary" onClick={props.onDone} disabled={saving}>
            {t(props.language, {
              es: "Listo, volver",
              en: "Done, go back",
              pt: "Pronto, voltar"
            })}
          </button>
          <button type="button" onClick={props.onBack} disabled={saving}>
            {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
          </button>
        </div>

        <input
          ref={identityInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onIdentitySelected(file);
          }}
        />
        <input
          ref={diplomaInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onDiplomaSelected(file);
          }}
        />
      </section>
    </div>
  );
}
