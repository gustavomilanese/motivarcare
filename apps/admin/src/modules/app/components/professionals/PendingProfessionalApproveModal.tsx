import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { McButton, McModal } from "@therapy/ui";
import type { AdminProfessionalOps } from "../../types";
import { buildPendingReviewChecklist } from "../../lib/pendingReviewChecklist";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PendingProfessionalApproveModal(props: {
  language: AppLanguage;
  professional: AdminProfessionalOps;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const checklist = buildPendingReviewChecklist(props.professional);
  const missing = checklist.filter((item) => !item.ok);
  const hasGaps = missing.length > 0;

  return (
    <McModal
      open
      title={t(props.language, {
        es: "Aprobar alta",
        en: "Approve sign-up",
        pt: "Aprovar cadastro"
      })}
      onClose={props.onClose}
      closeDisabled={props.loading}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <>
          <McButton variant="secondary" disabled={props.loading} onClick={props.onClose}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </McButton>
          <McButton disabled={props.loading} onClick={props.onConfirm}>
            {props.loading
              ? t(props.language, { es: "Aprobando…", en: "Approving…", pt: "Aprovando…" })
              : hasGaps
                ? t(props.language, {
                    es: "Aprobar igual",
                    en: "Approve anyway",
                    pt: "Aprovar mesmo assim"
                  })
                : t(props.language, { es: "Sí, aprobar", en: "Yes, approve", pt: "Sim, aprovar" })}
          </McButton>
        </>
      }
    >
      <p>
        <strong>{props.professional.fullName}</strong> · {props.professional.email}
      </p>
      {hasGaps ? (
        <div className="dashboard-pending-approve-warn">
          <p>
            {t(props.language, {
              es: `Hay ${missing.length} punto${missing.length === 1 ? "" : "s"} incompleto${missing.length === 1 ? "" : "s"}. ¿Aprobar igual?`,
              en: `${missing.length} item${missing.length === 1 ? " is" : "s are"} incomplete. Approve anyway?`,
              pt: `${missing.length} item${missing.length === 1 ? "" : "s"} incompleto${missing.length === 1 ? "" : "s"}. Aprovar mesmo assim?`
            })}
          </p>
          <ul>
            {missing.map((item) => (
              <li key={item.id}>
                {t(props.language, {
                  es: item.missingLabelEs,
                  en: item.missingLabelEn,
                  pt: item.missingLabelPt
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>
          {t(props.language, {
            es: "Checklist completo. El profesional pasará a aprobado y visible en matching.",
            en: "Checklist complete. They will become approved and visible in matching.",
            pt: "Checklist completo. O profissional ficara aprovado e visivel no matching."
          })}
        </p>
      )}
    </McModal>
  );
}
