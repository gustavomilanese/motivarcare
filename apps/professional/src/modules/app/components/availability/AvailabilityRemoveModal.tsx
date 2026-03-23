import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";

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
  if (!props.open || props.pendingCount <= 0) {
    return null;
  }

  return (
    <div className="availability-remove-modal-backdrop" role="presentation">
      <section className="availability-remove-modal" role="dialog" aria-modal="true" aria-labelledby="remove-slot-title">
        <h3 id="remove-slot-title">
          {props.pendingCount > 1
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
              })}
        </h3>
        <p>
          {t(props.language, {
            es: "Esta accion no se puede deshacer.",
            en: "This action cannot be undone.",
            pt: "Esta acao nao pode ser desfeita."
          })}
        </p>
        {props.pendingCount === 1 && props.singleSlotLabel ? (
          <p className="availability-remove-modal-meta">{props.singleSlotLabel}</p>
        ) : null}
        <div className="availability-remove-modal-actions">
          <button type="button" onClick={props.onCancel}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </button>
          <button type="button" className="pro-primary" disabled={props.isRemoving} onClick={props.onConfirm}>
            {props.isRemoving
              ? t(props.language, { es: "Quitando...", en: "Removing...", pt: "Removendo..." })
              : t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
          </button>
        </div>
      </section>
    </div>
  );
}
