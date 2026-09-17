import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { McButton, McModal, McTextarea } from "@therapy/ui";
import type { AdminProfessionalOps } from "../../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Pedir correcciones (NEEDS_CHANGES) — el profesional puede continuar. */
export function PendingProfessionalNeedsChangesModal(props: {
  language: AppLanguage;
  professional: AdminProfessionalOps;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <McModal
      open
      title={t(props.language, {
        es: "Pedir cambios",
        en: "Request changes",
        pt: "Pedir mudancas"
      })}
      onClose={props.onClose}
      closeDisabled={props.loading}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <>
          <McButton variant="secondary" disabled={props.loading} onClick={props.onClose}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </McButton>
          <McButton
            disabled={props.loading || reason.trim().length < 8}
            onClick={() => props.onConfirm(reason.trim())}
          >
            {props.loading
              ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
              : t(props.language, { es: "Pedir cambios", en: "Request changes", pt: "Pedir mudancas" })}
          </McButton>
        </>
      }
    >
      <p>
        {t(props.language, {
          es: "El profesional podrá ingresar, corregir lo indicado y reenviar. Recibe un email con el enlace al portal.",
          en: "They can sign in, fix what's listed, and resubmit. They get an email with the portal link.",
          pt: "O profissional podera entrar, corrigir o indicado e reenviar. Recebe um email com o link do portal."
        })}
      </p>
      <p>
        <strong>{props.professional.fullName}</strong> · {props.professional.email}
      </p>
      <label className="dashboard-pending-modal-label" htmlFor="pending-needs-changes-reason">
        {t(props.language, {
          es: "Qué necesita corregir (obligatorio)",
          en: "What they need to fix (required)",
          pt: "O que precisa corrigir (obrigatorio)"
        })}
      </label>
      <McTextarea
        id="pending-needs-changes-reason"
        value={reason}
        disabled={props.loading}
        rows={4}
        maxLength={800}
        placeholder={t(props.language, {
          es: "Ej.: falta diploma legible / documento de identidad vencido…",
          en: "E.g. missing readable diploma / expired ID…",
          pt: "Ex.: falta diploma legivel / documento vencido…"
        })}
        onChange={(event) => setReason(event.target.value)}
      />
    </McModal>
  );
}
