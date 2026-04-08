import { type ChangeEvent, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { compressImageDataUrl, fileToDataUrl } from "../../utils/media";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalPhotoUrlField(props: {
  value: string;
  onChange: (next: string) => void;
  language: AppLanguage;
  disabled?: boolean;
  /** Textos para foto de usuario paciente (mismo control que profesional). */
  variant?: "professional" | "patient";
}) {
  const variant = props.variant ?? "professional";
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const trimmed = props.value.trim();
  const urlInputValue = trimmed.startsWith("data:image/") ? "" : trimmed;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || props.disabled) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLocalError(
        t(props.language, {
          es: "Elegí un JPG, PNG o WEBP. Si no querés cambiar la foto, cancelá.",
          en: "Choose a JPG, PNG, or WEBP—or cancel to keep the current photo.",
          pt: "Escolha JPG, PNG ou WEBP, ou cancele para manter a foto."
        })
      );
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setLocalError(
        t(props.language, {
          es: "Esa imagen pesa más de 4 MB. Comprimila o elegí otra más chica.",
          en: "That file is over 4 MB. Compress it or pick a smaller image.",
          pt: "O arquivo passa de 4 MB. Comprima ou escolha outro menor."
        })
      );
      return;
    }
    setBusy(true);
    setLocalError("");
    try {
      const raw = await fileToDataUrl(file);
      const compressed = await compressImageDataUrl(raw, 1600, 0.82);
      props.onChange(compressed);
    } catch {
      setLocalError(
        t(props.language, {
          es: "No pudimos leer ese archivo. Probá con otra foto o desde otra carpeta.",
          en: "We couldn’t read that file. Try another photo or a different folder.",
          pt: "Nao foi possivel ler o arquivo. Tente outra foto."
        })
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-pro-photo-field">
      <span className="admin-pro-photo-label">
        {variant === "patient"
          ? t(props.language, {
              es: "Foto de perfil del paciente",
              en: "Patient profile photo",
              pt: "Foto de perfil do paciente"
            })
          : t(props.language, {
              es: "Foto de perfil",
              en: "Profile photo",
              pt: "Foto de perfil"
            })}
      </span>
      <div className="admin-pro-photo-row">
        <div className="admin-pro-photo-preview" aria-hidden={!trimmed}>
          {trimmed ? (
            <img src={trimmed} alt="" />
          ) : (
            <span className="admin-pro-photo-placeholder">—</span>
          )}
        </div>
        <div className="admin-pro-photo-controls">
          <label className="admin-pro-photo-upload">
            <input type="file" accept="image/*" disabled={props.disabled || busy} onChange={(e) => void handleFile(e)} />
            <span>{busy ? t(props.language, { es: "Procesando…", en: "Processing…", pt: "Processando…" }) : t(props.language, { es: "Subir imagen", en: "Upload image", pt: "Enviar imagem" })}</span>
          </label>
          {trimmed ? (
            <button
              type="button"
              className="ghost small"
              disabled={props.disabled || busy}
              onClick={() => {
                props.onChange("");
                setLocalError("");
              }}
            >
              {t(props.language, { es: "Quitar foto", en: "Remove photo", pt: "Remover foto" })}
            </button>
          ) : null}
        </div>
      </div>
      <label className="admin-pro-photo-url">
        {t(props.language, {
          es: "O URL de imagen (https://…)",
          en: "Or image URL (https://…)",
          pt: "Ou URL da imagem (https://…)"
        })}
        <input
          type="url"
          placeholder="https://"
          disabled={props.disabled || busy}
          value={urlInputValue}
          onChange={(event) => {
            setLocalError("");
            props.onChange(event.target.value.trim());
          }}
        />
      </label>
      {localError ? <p className="error-text admin-pro-photo-error">{localError}</p> : null}
      <small className="admin-pro-photo-hint">
        {t(props.language, {
          es: "JPG o PNG, máximo 4 MB. Se comprime antes de guardar.",
          en: "JPG or PNG, max 4 MB. Compressed before saving.",
          pt: "JPG ou PNG, maximo 4 MB. Comprimido antes de salvar."
        })}
      </small>
    </div>
  );
}
