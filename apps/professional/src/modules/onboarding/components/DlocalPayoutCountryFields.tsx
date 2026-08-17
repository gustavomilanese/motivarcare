import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  dlocalPayoutBankCodes,
  dlocalPayoutCountryOptions,
  getDlocalPayoutCountryConfig,
  isDlocalPayoutCountry,
  type DlocalBankCode
} from "@therapy/types";
import type { PayoutFieldErrorKey, PayoutFormFields } from "../lib/professionalPayoutValidation";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function localized(language: AppLanguage, values: { es: string; en: string; pt: string }): string {
  return values[language as "es" | "en" | "pt"] ?? values.es;
}

function bankOptionLabel(country: string, bank: DlocalBankCode): string {
  if (country === "AR" && bank.code === "000") {
    return "Mercado Pago / CVU (cuenta virtual)";
  }
  return `${bank.name} (${bank.code})`;
}

function sortedBanks(country: string, banks: DlocalBankCode[]): DlocalBankCode[] {
  if (country !== "AR") {
    return banks;
  }
  const priority = ["000", "007", "011", "014", "072", "017", "285", "027", "143"];
  return [...banks].sort((a, b) => {
    const ai = priority.indexOf(a.code);
    const bi = priority.indexOf(b.code);
    if (ai === -1 && bi === -1) {
      return a.name.localeCompare(b.name);
    }
    if (ai === -1) {
      return 1;
    }
    if (bi === -1) {
      return -1;
    }
    return ai - bi;
  });
}

function FieldNote(props: { error?: string; hint?: string }) {
  if (props.error) {
    return <p className="pro-profile-field-error">{props.error}</p>;
  }
  if (props.hint) {
    return <p className="pro-profile-field-hint">{props.hint}</p>;
  }
  return null;
}

const SUPPORT_EMAIL = "soporte@motivarcare.com";

function payoutSupportMailto(language: AppLanguage, residencyCountry?: string | null): string {
  const residency = (residencyCountry ?? "").trim().toUpperCase();
  const subject = t(language, {
    es: "Cobro profesional — país no disponible",
    en: "Professional payout — country not available",
    pt: "Recebimento profissional — país não disponível"
  });
  const body = t(language, {
    es: [
      "Hola, quiero cobrar como profesional en MotivarCare.",
      residency ? `Mi país de residencia es: ${residency}.` : "Mi país de residencia es: (indicá el país).",
      "El país de mi cuenta bancaria no está en la lista de payouts. ¿Me pueden ayudar?"
    ].join("\n\n"),
    en: [
      "Hi, I’d like to get paid as a professional on MotivarCare.",
      residency ? `My country of residence is: ${residency}.` : "My country of residence is: (please fill in).",
      "My bank-account country isn’t on the payout list. Can you help?"
    ].join("\n\n"),
    pt: [
      "Olá, quero receber como profissional na MotivarCare.",
      residency ? `Meu país de residência é: ${residency}.` : "Meu país de residência é: (indique o país).",
      "O país da minha conta bancária não está na lista de payouts. Podem me ajudar?"
    ].join("\n\n")
  });
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
  /** Residencia del profesional: se usa para prellenar el email a soporte. */
  residencyCountry?: string | null;
  fieldErrors?: Partial<Record<PayoutFieldErrorKey, string>>;
  /** Si ya están en Identidad, no los volvemos a pedir acá. */
  hideBeneficiaryNameFields?: boolean;
}) {
  const { language, fields, onFormChange } = props;
  const errors = props.fieldErrors ?? {};
  const countryOptions = dlocalPayoutCountryOptions(language as "es" | "en" | "pt");
  const config = getDlocalPayoutCountryConfig(fields.payoutCountry);
  const bankList = isDlocalPayoutCountry(fields.payoutCountry)
    ? sortedBanks(fields.payoutCountry, dlocalPayoutBankCodes(fields.payoutCountry) ?? [])
    : null;
  const supportMailto = payoutSupportMailto(language, props.residencyCountry);

  return (
    <div className="pro-payout-dlocal">
      {props.hideBeneficiaryNameFields ? null : (
      <div className="pro-payout-card__grid">
        <label className={errors.beneficiaryFirstName ? "is-invalid" : undefined}>
          <span>{t(language, { es: "Nombre (como en el DNI)", en: "First name (as on ID)", pt: "Nome (como no documento)" })}</span>
          <input
            value={fields.beneficiaryFirstName}
            onChange={(event) => onFormChange({ beneficiaryFirstName: event.target.value })}
            autoComplete="given-name"
          />
          <FieldNote error={errors.beneficiaryFirstName} />
        </label>
        <label className={errors.beneficiaryLastName ? "is-invalid" : undefined}>
          <span>{t(language, { es: "Apellido (como en el DNI)", en: "Last name (as on ID)", pt: "Sobrenome (como no documento)" })}</span>
          <input
            value={fields.beneficiaryLastName}
            onChange={(event) => onFormChange({ beneficiaryLastName: event.target.value })}
            autoComplete="family-name"
          />
          <FieldNote error={errors.beneficiaryLastName} />
        </label>
      </div>
      )}

      <label className={errors.payoutCountry ? "is-invalid" : undefined}>
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
        <FieldNote error={errors.payoutCountry} />
      </label>

      <p className="pro-payout-card__hint">
        {t(language, {
          es: "Solo mostramos países donde hoy podemos transferirte (AR, BR, EC, MX, PE, PY, UY) y los bancos habilitados de cada uno.",
          en: "We only list countries where we can currently transfer (AR, BR, EC, MX, PE, PY, UY) and the enabled banks for each.",
          pt: "Mostramos apenas países onde hoje podemos transferir (AR, BR, EC, MX, PE, PY, UY) e os bancos habilitados de cada um."
        })}{" "}
        {t(language, {
          es: "Si tu país no está en la lista,",
          en: "If your country isn’t on the list,",
          pt: "Se o seu país não estiver na lista,"
        })}{" "}
        <a href={supportMailto}>
          {t(language, {
            es: `escribinos a ${SUPPORT_EMAIL}`,
            en: `email us at ${SUPPORT_EMAIL}`,
            pt: `escreva para ${SUPPORT_EMAIL}`
          })}
        </a>{" "}
        {t(language, {
          es: "e indicá de qué país sos.",
          en: "and tell us which country you’re in.",
          pt: "e indique de qual país você é."
        })}
      </p>

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
            <label className={errors.documentType ? "is-invalid" : undefined}>
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
              <FieldNote error={errors.documentType} />
            </label>
            <label className={errors.taxId ? "is-invalid" : undefined}>
              <span>
                {fields.payoutCountry === "AR"
                  ? t(language, { es: "Número de CUIT / CUIL", en: "CUIT / CUIL number", pt: "Número de CUIT / CUIL" })
                  : t(language, { es: "Número de documento fiscal", en: "Tax ID number", pt: "Número do documento" })}
              </span>
              <input
                value={fields.taxId}
                onChange={(event) => onFormChange({ taxId: event.target.value })}
                autoComplete="off"
                inputMode="numeric"
                placeholder={fields.payoutCountry === "AR" ? "20-12345678-9" : undefined}
              />
              <FieldNote
                error={errors.taxId}
                hint={
                  fields.payoutCountry === "AR"
                    ? t(language, {
                        es: "11 números. Podés pegarlo con guiones.",
                        en: "11 digits. Hyphens are fine.",
                        pt: "11 números. Pode colar com hífens."
                      })
                    : undefined
                }
              />
            </label>
          </div>

          <div className="pro-payout-card__grid">
            {bankList ? (
              <label className={errors.bankCode ? "is-invalid" : undefined}>
                <span>{t(language, { es: "Banco de la cuenta", en: "Account bank", pt: "Banco da conta" })}</span>
                <select
                  value={fields.bankCode}
                  aria-invalid={Boolean(errors.bankCode)}
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
                      {bankOptionLabel(fields.payoutCountry, bank)}
                    </option>
                  ))}
                </select>
                <FieldNote
                  error={errors.bankCode}
                  hint={
                    fields.payoutCountry === "AR"
                      ? t(language, {
                          es: "Solo estos bancos. Si cobrás con Mercado Pago, elegí «Mercado Pago / CVU».",
                          en: "Only these banks. For Mercado Pago, choose “Mercado Pago / CVU”.",
                          pt: "So estes bancos. No Mercado Pago, escolha “Mercado Pago / CVU”."
                        })
                      : undefined
                  }
                />
              </label>
            ) : (
              <>
                <label className={errors.bankCode ? "is-invalid" : undefined}>
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
                  <FieldNote error={errors.bankCode} />
                </label>
                <label className={errors.bankName ? "is-invalid" : undefined}>
                  <span>{t(language, { es: "Nombre del banco", en: "Bank name", pt: "Nome do banco" })}</span>
                  <input
                    value={fields.bankName}
                    onChange={(event) => onFormChange({ bankName: event.target.value })}
                    autoComplete="organization"
                  />
                  <FieldNote error={errors.bankName} />
                </label>
              </>
            )}

            <label className={errors.bankAccountValue ? "is-invalid" : undefined}>
              <span>{localized(language, config.accountLabel)}</span>
              <input
                value={fields.bankAccountValue}
                onChange={(event) => onFormChange({ bankAccountValue: event.target.value })}
                autoComplete="off"
                placeholder={
                  fields.payoutCountry === "AR"
                    ? t(language, {
                        es: "22 dígitos o alias (gus.fer.milan)",
                        en: "22 digits or alias (gus.fer.milan)",
                        pt: "22 dígitos ou alias (gus.fer.milan)"
                      })
                    : undefined
                }
              />
              <FieldNote error={errors.bankAccountValue} hint={localized(language, config.accountHint)} />
            </label>
          </div>

          {fields.payoutCountry === "AR" && bankList && bankList.length > 0 ? (
            <details className="pro-payout-accepted-banks">
              <summary>
                {t(language, {
                  es: "Ver bancos aceptados en Argentina",
                  en: "See accepted banks in Argentina",
                  pt: "Ver bancos aceitos na Argentina"
                })}
              </summary>
              <ul>
                {bankList.map((bank) => (
                  <li key={bank.code}>{bankOptionLabel(fields.payoutCountry, bank)}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {(config.requiresBranch || config.requiresAccountType) ? (
            <div className="pro-payout-card__grid">
              {config.requiresBranch ? (
                <label className={errors.bankBranch ? "is-invalid" : undefined}>
                  <span>{t(language, { es: "Sucursal / agencia", en: "Branch", pt: "Agência" })}</span>
                  <input
                    value={fields.bankBranch}
                    onChange={(event) => onFormChange({ bankBranch: event.target.value })}
                    autoComplete="off"
                    inputMode="numeric"
                    aria-invalid={Boolean(errors.bankBranch)}
                  />
                  <FieldNote error={errors.bankBranch} />
                </label>
              ) : null}
              {config.requiresAccountType ? (
                <label className={errors.accountType ? "is-invalid" : undefined}>
                  <span>{t(language, { es: "Tipo de cuenta", en: "Account type", pt: "Tipo de conta" })}</span>
                  <select
                    value={fields.accountType}
                    onChange={(event) =>
                      onFormChange({ accountType: event.target.value as PayoutFormFields["accountType"] })
                    }
                    aria-invalid={Boolean(errors.accountType)}
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
                  <FieldNote error={errors.accountType} />
                </label>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
