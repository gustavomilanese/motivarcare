import { useEffect, useRef, type ReactNode } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfileEditModal(props: {
  language: AppLanguage;
  title: string;
  lead?: string;
  saving?: boolean;
  error?: string;
  wide?: boolean;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !props.saving) {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [props.saving]);

  return (
    <div className="pro-profile-edit-modal-backdrop" role="presentation" onClick={() => !props.saving && props.onClose()}>
      <section
        className={`pro-profile-edit-modal${props.wide ? " pro-profile-edit-modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-profile-edit-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h3 id="pro-profile-edit-modal-title">{props.title}</h3>
          <button
            type="button"
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
            disabled={props.saving}
            onClick={props.onClose}
          >
            ×
          </button>
        </header>
        {props.lead ? <p className="pro-profile-edit-modal-lead">{props.lead}</p> : null}
        {props.children}
        {props.error ? <p className="pro-error">{props.error}</p> : null}
        <div className="pro-profile-edit-modal-actions">
          <button type="button" className="pro-secondary" disabled={props.saving} onClick={props.onClose}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </button>
          <button className="pro-primary" type="button" disabled={props.saving} onClick={props.onSave}>
            {props.saving
              ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
              : t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
          </button>
        </div>
      </section>
    </div>
  );
}
