import { type ChangeEvent, useState } from "react";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { DEFAULT_PROFESSIONAL_AVATAR_SRC } from "../services/api";
import type { SessionUser } from "../types";
import { compressPatientAvatarDataUrl, fileToDataUrl } from "../utils/imageAvatar";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PostIntakePhotoScreen(props: {
  user: SessionUser;
  language: AppLanguage;
  busy: boolean;
  onContinue: (avatarDataUrl: string | null) => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [error, setError] = useState("");

  const initial = props.user.fullName.trim().charAt(0).toUpperCase() || "?";

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(
        t(props.language, {
          es: "Elegí una imagen (JPG, PNG o WEBP) desde tu dispositivo; si no querés foto, podés continuar sin subir nada.",
          en: "Choose an image (JPG, PNG, or WEBP) from your device—or skip if you’d rather not add a photo.",
          pt: "Escolha uma imagem (JPG, PNG ou WEBP) no dispositivo, ou pule se preferir sem foto."
        })
      );
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError(
        t(props.language, {
          es: "La imagen supera 4 MB.",
          en: "Image exceeds 4 MB.",
          pt: "A imagem supera 4 MB."
        })
      );
      return;
    }
    setError("");
    setFileBusy(true);
    try {
      const raw = await fileToDataUrl(file);
      setPreview(await compressPatientAvatarDataUrl(raw));
    } catch {
      setError(
        t(props.language, {
          es: "No pudimos leer ese archivo. Probá con otra foto o tocá continuar sin imagen.",
          en: "We couldn’t read that file. Try another photo, or continue without one.",
          pt: "Nao foi possivel ler esse arquivo. Tente outra foto ou continue sem imagem."
        })
      );
    } finally {
      setFileBusy(false);
    }
  };

  const disableActions = props.busy || fileBusy;

  return (
    <div className="intake-shell intake-shell--wizard">
      <section className="intake-card intake-card--wizard">
        <div className="intake-brand">
          <span className="intake-brand-mark" aria-hidden="true">
            &gt;
          </span>
          <div className="intake-brand-copy">
            <strong>motivarcare</strong>
            <span>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
          </div>
        </div>

        <div className="intake-wizard-top">
          <h1 className="intake-wizard-title">
            {replaceTemplate(
              t(props.language, {
                es: "{name}, tu foto de perfil",
                en: "{name}, your profile photo",
                pt: "{name}, sua foto de perfil"
              }),
              { name: props.user.fullName }
            )}
          </h1>
          <span className="chip intake-wizard-chip">
            {t(props.language, { es: "Opcional", en: "Optional", pt: "Opcional" })}
          </span>
        </div>

        <div className="intake-wizard-form">
          <article className="question-card question-card--wizard">
            <h2 className="intake-question-title">
              {t(props.language, {
                es: "Foto visible para tu terapeuta",
                en: "Photo visible to your therapist",
                pt: "Foto visivel para seu terapeuta"
              })}
            </h2>
            <p className="intake-question-help">
              {t(props.language, {
                es: "Aparece en el chat, en las reservas del profesional y en tu cuenta. Podés omitir y subirla después desde Mi cuenta.",
                en: "It appears in chat, on your therapist’s booking views, and in your account. You can skip and add it later from My account.",
                pt: "Aparece no chat, nas reservas do profissional e na sua conta. Voce pode pular e enviar depois em Minha conta."
              })}
            </p>

            <div className="intake-profile-photo">
              <div className="patient-account-avatar-row">
                <div className="patient-account-avatar-preview">
                  {preview ? (
                    <img
                      src={preview}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_PROFESSIONAL_AVATAR_SRC;
                      }}
                    />
                  ) : (
                    <span className="patient-account-avatar-initial" aria-hidden>
                      {initial}
                    </span>
                  )}
                </div>
                <div className="patient-account-avatar-actions">
                  <label className="patient-account-avatar-upload">
                    <input type="file" accept="image/*" disabled={disableActions} onChange={(e) => void handleFile(e)} />
                    <span>
                      {fileBusy
                        ? t(props.language, { es: "Procesando…", en: "Processing…", pt: "Processando…" })
                        : t(props.language, { es: "Subir imagen", en: "Upload image", pt: "Enviar imagem" })}
                    </span>
                  </label>
                  {preview ? (
                    <button type="button" className="ghost" disabled={disableActions} onClick={() => setPreview(null)}>
                      {t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>

          {error ? <p className="error-text intake-wizard-error">{error}</p> : null}

          <div className="intake-wizard-actions">
            <button type="button" className="ghost intake-wizard-secondary" disabled={disableActions} onClick={() => void props.onContinue(null)}>
              {t(props.language, { es: "Omitir", en: "Skip", pt: "Pular" })}
            </button>
            <button type="button" className="primary intake-wizard-primary" disabled={disableActions} onClick={() => void props.onContinue(preview)}>
              {props.busy
                ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                : t(props.language, { es: "Continuar", en: "Continue", pt: "Continuar" })}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
