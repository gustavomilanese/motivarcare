import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { McButton, McModal, McTextarea } from "@therapy/ui";
import type { AdminProfessionalOps } from "../../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PendingProfessionalRejectModal(props: {
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
        es: "Rechazar definitivamente",
        en: "Reject permanently",
        pt: "Rejeitar definitivamente"
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
            variant="danger"
            disabled={props.loading || reason.trim().length < 8}
            onClick={() => props.onConfirm(reason.trim())}
          >
            {props.loading
              ? t(props.language, { es: "Rechazando…", en: "Rejecting…", pt: "Rejeitando…" })
              : t(props.language, { es: "Sí, rechazar", en: "Yes, reject", pt: "Sim, rejeitar" })}
          </McButton>
        </>
      }
    >
      <p>
        {t(props.language, {
          es: "Cierre definitivo: no podrá continuar el alta. Usá «Pedir cambios» si el problema es corregible.",
          en: "Permanent close: they cannot continue sign-up. Use Request changes if the issue is fixable.",
          pt: "Encerramento definitivo: nao podera continuar o cadastro. Use Pedir mudancas se for corrigivel."
        })}
      </p>
      <p>
        <strong>{props.professional.fullName}</strong> · {props.professional.email}
      </p>
      <label className="dashboard-pending-modal-label" htmlFor="pending-reject-reason">
        {t(props.language, {
          es: "Motivo del rechazo (obligatorio)",
          en: "Rejection reason (required)",
          pt: "Motivo da rejeicao (obrigatorio)"
        })}
      </label>
      <McTextarea
        id="pending-reject-reason"
        value={reason}
        disabled={props.loading}
        rows={4}
        maxLength={800}
        placeholder={t(props.language, {
          es: "Ej.: no cumple requisitos de habilitación profesional…",
          en: "E.g. does not meet professional licensing requirements…",
          pt: "Ex.: nao atende requisitos de habilitacao profissional…"
        })}
        onChange={(event) => setReason(event.target.value)}
      />
    </McModal>
  );
}
