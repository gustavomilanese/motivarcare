import type { AppLanguage, DisplayFxRates, LocalizedText, SupportedCurrency } from "@therapy/i18n-config";
import { replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { IconCandado, IconCerrar, IconSesiones } from "../../home/calm/calmIcons";
import { formatPatientUsdPrice } from "../lib/formatPatientUsdPrice";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type Quote = {
  sessionCount: number;
  chargeAmountMajor: number;
  chargeCurrency: string;
};

function formatCharge(
  amountMajor: number,
  currency: string,
  language: AppLanguage,
  displayCurrency: SupportedCurrency,
  fxRates?: DisplayFxRates
): string {
  if (currency.toUpperCase() === "ARS") {
    return `$ ${amountMajor.toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS`;
  }
  return formatPatientUsdPrice({
    usdMajor: amountMajor,
    displayCurrency,
    language,
    fxRates,
    maximumFractionDigits: 2
  });
}

export function IndividualSessionsQtyModal(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  qty: string;
  unitPriceMajor: number;
  quote: Quote | null;
  quoteLoading: boolean;
  usesLocalCurrency: boolean;
  market: string | null;
  loading: boolean;
  error: string | null;
  onQty: (value: string) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const n = Number.parseInt(props.qty.trim(), 10);
  const ok = Number.isFinite(n) && n >= 1 && n <= 99;
  const quoteMatches = Boolean(props.quote && props.quote.sessionCount === n);
  const unitLabel = quoteMatches && props.quote
    ? formatCharge(
        props.quote.chargeAmountMajor / Math.max(1, props.quote.sessionCount),
        props.quote.chargeCurrency,
        props.language,
        props.currency,
        props.fxRates
      )
    : formatPatientUsdPrice({
        usdMajor: props.unitPriceMajor,
        displayCurrency: props.currency,
        language: props.language,
        fxRates: props.fxRates,
        maximumFractionDigits: 0
      });
  const totalLabel = quoteMatches && props.quote
    ? formatCharge(props.quote.chargeAmountMajor, props.quote.chargeCurrency, props.language, props.currency, props.fxRates)
    : ok
      ? formatPatientUsdPrice({
          usdMajor: props.unitPriceMajor * n,
          displayCurrency: props.currency,
          language: props.language,
          fxRates: props.fxRates,
          maximumFractionDigits: 0
        })
      : null;

  const continueLabel = props.loading
    ? t(props.language, { es: "Un momento…", en: "One moment…", pt: "Um momento…" })
    : props.usesLocalCurrency
      ? t(props.language, { es: "Continuar al pago", en: "Continue to payment", pt: "Continuar para pagamento" })
      : t(props.language, { es: "Continuar", en: "Continue", pt: "Continuar" });

  return (
    <div className="matching-flow-backdrop individual-qty-backdrop" role="presentation" onClick={() => { if (!props.loading) props.onClose(); }}>
      <section
        className="matching-flow-modal trial-checkout-modal individual-qty-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-individual-qty-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="individual-qty-head">
          <span className="individual-qty-mancha" aria-hidden="true">
            <svg viewBox="0 0 100 100">
              <path d="M82 64c-6 18-26 28-44 24S8 68 10 48 28 12 50 12s38 34 32 52z" fill="#2F6B51" opacity="0.85" />
            </svg>
            <IconSesiones size={22} />
          </span>
          <div>
            <p className="individual-qty-kicker">{t(props.language, { es: "Compra flexible", en: "Flexible purchase", pt: "Compra flexível" })}</p>
            <h3 id="checkout-individual-qty-title">
              {t(props.language, { es: "Sumá sesiones sueltas", en: "Add single sessions", pt: "Some sessões avulsas" })}
            </h3>
            <p className="individual-qty-lead">
              {t(props.language, {
                es: "El precio es el de una sesión. Elegí cuántas querés y seguí al pago.",
                en: "The price is the single-session price. Choose how many you want and continue to payment.",
                pt: "O preço é o de uma sessão. Escolha quantas quer e siga para o pagamento."
              })}
            </p>
          </div>
          <button type="button" className="individual-qty-close" aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })} disabled={props.loading} onClick={props.onClose}>
            <IconCerrar size={18} />
          </button>
        </header>

        <div className="individual-qty-choices" role="group" aria-label={t(props.language, { es: "Cantidad", en: "Quantity", pt: "Quantidade" })}>
          {([1, 2, 3] as const).map((count) => (
            <button
              key={count}
              type="button"
              className={props.qty === String(count) ? "is-selected" : ""}
              disabled={props.loading}
              onClick={() => props.onQty(String(count))}
            >
              <b>{count}</b>
              <span>
                {count === 1
                  ? t(props.language, { es: "sesión", en: "session", pt: "sessão" })
                  : t(props.language, { es: "sesiones", en: "sessions", pt: "sessões" })}
              </span>
            </button>
          ))}
        </div>

        <label className="individual-qty-custom">
          <span>{t(props.language, { es: "Otra cantidad", en: "Other quantity", pt: "Outra quantidade" })}</span>
          <input
            inputMode="numeric"
            min={1}
            max={99}
            value={props.qty}
            disabled={props.loading}
            onChange={(event) => props.onQty(event.target.value.replace(/\D/g, "").slice(0, 2))}
          />
        </label>

        <div className="individual-qty-total">
          {ok && totalLabel ? (
            <>
              <div>
                <span>
                  {props.quoteLoading
                    ? t(props.language, { es: "Calculando…", en: "Calculating…", pt: "Calculando…" })
                    : replaceTemplate(t(props.language, { es: "{n} × {price}", en: "{n} × {price}", pt: "{n} × {price}" }), {
                        n: String(n),
                        price: unitLabel
                      })}
                </span>
                <strong>{totalLabel}</strong>
              </div>
              {props.usesLocalCurrency ? (
                <p>
                  <IconCandado size={16} />
                  {props.market === "AR"
                    ? t(props.language, {
                        es: "El pago se hace en pesos, de forma segura.",
                        en: "Payment is processed securely in pesos.",
                        pt: "O pagamento é feito em pesos, com segurança."
                      })
                    : t(props.language, {
                        es: "El pago se hace en tu moneda, de forma segura.",
                        en: "Payment is processed securely in your currency.",
                        pt: "O pagamento é feito na sua moeda, com segurança."
                      })}
                </p>
              ) : null}
            </>
          ) : (
            <p className="individual-qty-hint">
              {t(props.language, { es: "Ingresá una cantidad entre 1 y 99.", en: "Enter a quantity from 1 to 99.", pt: "Insira uma quantidade entre 1 e 99." })}
            </p>
          )}
        </div>

        {props.error ? <p className="individual-qty-error" role="alert">{props.error}</p> : null}

        <footer>
          <button type="button" className="individual-qty-cancel" disabled={props.loading} onClick={props.onClose}>
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </button>
          <button type="button" className="individual-qty-continue" disabled={props.loading || !ok} onClick={props.onContinue}>
            {continueLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
