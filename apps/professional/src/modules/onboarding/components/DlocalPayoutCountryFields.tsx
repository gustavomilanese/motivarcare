import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  dlocalPayoutBankCodes,
  dlocalPayoutCountryOptions,
  getDlocalPayoutCountryConfig,
  isDlocalPayoutCountry
} from "@therapy/types";
import type { PayoutFormFields } from "../lib/professionalPayoutValidation";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function localized(language: AppLanguage, values: { es: string; en: string; pt: string }): string {
  return values[language as "es" | "en" | "pt"] ?? values.es;
}

/**
 * Formulario de datos bancarios **dinámico por país de cobro** (`transfer_country`),
 * armado a partir de la spec compartida de dLocal (`@therapy/types → dlocalPayouts.ts`).
 *
 * El país de cobro es donde el profesional tiene la cuenta bancaria; puede diferir de su
 * país de residencia (un residente en Colombia con cuenta en Argentina cobra en AR).
 */
export function DlocalPayoutCountryFields(props: {
  language: AppLanguage;
  fields: PayoutFormFields;
  onFormChange: (patch: Partial<PayoutFormFields>) => void;
}) {
  const { language, fields, onFormChange } = props;
  const countryOptions = dlocalPayoutCountryOptions(language as "es" | "en" | "pt");
  const config = getDlocalPayoutCountryConfig(fields.payoutCountry);
  const bankList = isDlocalPayoutCountry(fields.payoutCountry)
    ? dlocalPayoutBankCodes(fields.payoutCountry)
    : null;

  return (
    <div className="pro-payout-dlocal">
      <label>
        <span>
          {t(language, {
            es: "País donde tenés la cuenta bancaria para cobrar",
            en: "Country of the bank account where you’ll get paid",
            pt: "País onde você tem a conta bancária para receber"
          })}
        </span>
        <select
          value={fields.payoutCountry}
          onChange={(event) =>
            onFormChange({
              payoutCountry: event.target.value,
              // Al cambiar de país, limpiamos los datos que dependen del país.
              documentType: "",
              bankCode: "",
              bankBranch: "",
              accountType: ""
            })
          }
        >
          <option value="">
            {t(language, { es: "Elegí un país", en: "Choose a country", pt: "Escolha um país" })}
          </option>
          {countryOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {!fields.payoutCountry ? (
        <p className="pro-payout-card__hint">
          {t(language, {
            es: "Sólo mostramos países donde hoy podemos transferirte tus pagos.",
            en: "We only list countries where we can currently transfer your payments.",
            pt: "Mostramos apenas países onde hoje podemos transferir seus pagamentos."
          })}
        </p>
      ) : null}

      {fields.payoutCountry && !config ? (
        <p className="pro-payout-card__warning">
          {t(language, {
            es: "Por ahora no podemos transferir a cuentas en ese país. Necesitás una cuenta en uno de los países de la lista.",
            en: "We can’t transfer to accounts in that country yet. You need an account in one of the listed countries.",
            pt: "Ainda não podemos transferir para contas nesse país. Você precisa de uma conta em um dos países da lista."
          })}
        </p>
      ) : null}

      {config ? (
        <>
          <div className="pro-payout-card__grid">
            <label>
              <span>{t(language, { es: "Nombre del titular", en: "First name", pt: "Nome do titular" })}</span>
              <input
                value={fields.beneficiaryFirstName}
                onChange={(event) => onFormChange({ beneficiaryFirstName: event.target.value })}
                autoComplete="given-name"
              />
            </label>
            <label>
              <span>{t(language, { es: "Apellido del titular", en: "Last name", pt: "Sobrenome do titular" })}</span>
              <input
                value={fields.beneficiaryLastName}
                onChange={(event) => onFormChange({ beneficiaryLastName: event.target.value })}
                autoComplete="family-name"
              />
            </label>
          </div>

          <div className="pro-payout-card__grid">
            <label>
              <span>{t(language, { es: "Tipo de documento", en: "Document type", pt: "Tipo de documento" })}</span>
              <select
                value={fields.documentType}
                onChange={(event) => onFormChange({ documentType: event.target.value })}
              >
                <option value="">
                  {t(language, { es: "Elegí una opción", en: "Choose an option", pt: "Escolha uma opção" })}
                </option>
                {config.documentTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t(language, { es: "Número de documento", en: "Document number", pt: "Número do documento" })}</span>
              <input
                value={fields.taxId}
                onChange={(event) => onFormChange({ taxId: event.target.value })}
                autoComplete="off"
              />
            </label>
          </div>

          <div className="pro-payout-card__grid">
            {bankList ? (
              <label>
                <span>{t(language, { es: "Banco", en: "Bank", pt: "Banco" })}</span>
                <select
                  value={fields.bankCode}
                  onChange={(event) => {
                    const code = event.target.value;
                    const match = bankList.find((bank) => bank.code === code);
                    onFormChange({ bankCode: code, bankName: match?.name ?? "" });
                  }}
                >
                  <option value="">
                    {t(language, { es: "Elegí tu banco", en: "Choose your bank", pt: "Escolha seu banco" })}
                  </option>
                  {bankList.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name} ({bank.code})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label>
                  <span>{t(language, { es: "Código de banco", en: "Bank code", pt: "Código do banco" })}</span>
                  <input
                    value={fields.bankCode}
                    onChange={(event) => onFormChange({ bankCode: event.target.value })}
                    autoComplete="off"
                    inputMode="numeric"
                    placeholder={t(language, {
                      es: "Código del banco",
                      en: "Bank code",
                      pt: "Código do banco"
                    })}
                  />
                </label>
                <label>
                  <span>{t(language, { es: "Nombre del banco", en: "Bank name", pt: "Nome do banco" })}</span>
                  <input
                    value={fields.bankName}
                    onChange={(event) => onFormChange({ bankName: event.target.value })}
                    autoComplete="organization"
                  />
                </label>
              </>
            )}

            <label>
              <span>{localized(language, config.accountLabel)}</span>
              <input
                value={fields.bankAccountValue}
                onChange={(event) => onFormChange({ bankAccountValue: event.target.value })}
                autoComplete="off"
              />
            </label>
          </div>

          <p className="pro-payout-card__hint">{localized(language, config.accountHint)}</p>

          {(config.requiresBranch || config.requiresAccountType) ? (
            <div className="pro-payout-card__grid">
              {config.requiresBranch ? (
                <label>
                  <span>{t(language, { es: "Sucursal / agencia", en: "Branch", pt: "Agência" })}</span>
                  <input
                    value={fields.bankBranch}
                    onChange={(event) => onFormChange({ bankBranch: event.target.value })}
                    autoComplete="off"
                    inputMode="numeric"
                  />
                </label>
              ) : null}
              {config.requiresAccountType ? (
                <label>
                  <span>{t(language, { es: "Tipo de cuenta", en: "Account type", pt: "Tipo de conta" })}</span>
                  <select
                    value={fields.accountType}
                    onChange={(event) =>
                      onFormChange({ accountType: event.target.value as PayoutFormFields["accountType"] })
                    }
                  >
                    <option value="">
                      {t(language, { es: "Elegí una opción", en: "Choose an option", pt: "Escolha uma opção" })}
                    </option>
                    <option value="CHECKING">
                      {t(language, { es: "Cuenta corriente", en: "Checking", pt: "Conta corrente" })}
                    </option>
                    <option value="SAVINGS">
                      {t(language, { es: "Caja de ahorro", en: "Savings", pt: "Poupança" })}
                    </option>
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
