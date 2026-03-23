import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AvailabilityBulkSticky(props: {
  language: AppLanguage;
  selectedCount: number;
  isRemoving: boolean;
  onRemoveSelected: () => void;
}) {
  if (props.selectedCount <= 0) {
    return null;
  }

  return (
    <div className="availability-bulk-sticky">
      <div className="availability-bulk-sticky-inner">
        <p>
          {replaceTemplate(
            t(props.language, {
              es: "{count} horarios seleccionados",
              en: "{count} selected slots",
              pt: "{count} horarios selecionados"
            }),
            { count: String(props.selectedCount) }
          )}
        </p>
        <button type="button" className="pro-primary" disabled={props.isRemoving} onClick={props.onRemoveSelected}>
          {t(props.language, { es: "Quitar seleccionados", en: "Remove selected", pt: "Remover selecionados" })}
        </button>
      </div>
    </div>
  );
}
