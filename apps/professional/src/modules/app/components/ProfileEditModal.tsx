import { type ReactNode } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { McButton, McModal, McNotice } from "@therapy/ui";

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
  return (
    <McModal
      open
      size={props.wide ? "lg" : "md"}
      title={props.title}
      onClose={props.onClose}
      closeDisabled={props.saving}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <>
          <McButton variant="secondary" disabled={props.saving} onClick={props.onClose}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </McButton>
          <McButton disabled={props.saving} onClick={props.onSave}>
            {props.saving
              ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
              : t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
          </McButton>
        </>
      }
    >
      {props.lead ? <p>{props.lead}</p> : null}
      {props.children}
      {props.error ? <McNotice>{props.error}</McNotice> : null}
    </McModal>
  );
}
