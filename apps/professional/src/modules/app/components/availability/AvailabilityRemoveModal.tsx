import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { McButton, McModal } from "@therapy/ui";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AvailabilityRemoveModal(props: {
  language: AppLanguage;
  open: boolean;
  pendingCount: number;
  singleSlotLabel: string | null;
  isRemoving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title =
    props.pendingCount > 1
      ? replaceTemplate(
          t(props.language, {
            es: "Quitar {count} horarios?",
            en: "Remove {count} slots?",
            pt: "Remover {count} horarios?"
          }),
          { count: String(props.pendingCount) }
        )
      : t(props.language, {
          es: "Quitar horario?",
          en: "Remove slot?",
          pt: "Remover horario?"
        });

  return (
    <McModal
      open={props.open && props.pendingCount > 0}
      title={title}
      onClose={props.onCancel}
      closeDisabled={props.isRemoving}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <>
          <McButton variant="secondary" disabled={props.isRemoving} onClick={props.onCancel}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </McButton>
          <McButton variant="danger" disabled={props.isRemoving} onClick={props.onConfirm}>
            {props.isRemoving
              ? t(props.language, { es: "Quitando...", en: "Removing...", pt: "Removendo..." })
              : t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
          </McButton>
        </>
      }
    >
      <p>
        {t(props.language, {
          es: "Esta accion no se puede deshacer.",
          en: "This action cannot be undone.",
          pt: "Esta acao nao pode ser desfeita."
        })}
      </p>
      {props.pendingCount === 1 && props.singleSlotLabel ? <p>{props.singleSlotLabel}</p> : null}
    </McModal>
  );
}
