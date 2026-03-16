import {
  SUPPORTED_CURRENCIES,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  currencyOptionLabel,
  textByLanguage
} from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export interface LanguageChoice {
  value: AppLanguage;
  nativeLabel: string;
  englishLabel: string;
}

export function PortalPreferencesModal(props: {
  open: boolean;
  language: AppLanguage;
  currency: SupportedCurrency;
  languageChoices: LanguageChoice[];
  onClose: () => void;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="session-modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="session-modal preferences-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="preferences-modal-header">
          <div>
            <h2>{t(props.language, { es: "Idioma y moneda", en: "Language and currency", pt: "Idioma e moeda" })}</h2>
            <p>
              {t(props.language, {
                es: "Tu portal se mostrara con estas preferencias en este dispositivo.",
                en: "Your portal will use these preferences on this device.",
                pt: "Seu portal usara essas preferencias neste dispositivo."
              })}
            </p>
          </div>
          <button type="button" className="preferences-modal-close" onClick={props.onClose}>
            ×
          </button>
        </header>

        <div className="preferences-groups">
          <section className="preferences-group">
            <h3>{t(props.language, { es: "Seleccionar idioma", en: "Select language", pt: "Selecionar idioma" })}</h3>
            <div className="preferences-options-grid">
              {props.languageChoices.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`preferences-option ${props.language === item.value ? "active" : ""}`}
                  onClick={() => props.onLanguageChange(item.value)}
                >
                  <strong>{item.nativeLabel}</strong>
                  <span>{item.englishLabel}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="preferences-group">
            <h3>{t(props.language, { es: "Seleccionar moneda", en: "Select currency", pt: "Selecionar moeda" })}</h3>
            <div className="preferences-options-grid">
              {SUPPORTED_CURRENCIES.map((currency) => (
                <button
                  key={currency}
                  type="button"
                  className={`preferences-option ${props.currency === currency ? "active" : ""}`}
                  onClick={() => props.onCurrencyChange(currency)}
                >
                  <strong>{currency}</strong>
                  <span>{currencyOptionLabel(currency, props.language)}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
