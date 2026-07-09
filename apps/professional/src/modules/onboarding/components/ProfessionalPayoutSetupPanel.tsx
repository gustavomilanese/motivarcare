import { type RefObject } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { ProfessionalPayoutBankTransferType, ProfessionalPayoutStatus } from "@therapy/types";
import {
  PROFESSIONAL_PAYOUT_FISCAL_NOTICE,
  PROFESSIONAL_PAYOUT_SETUP_LEAD
} from "../constants/professionalProfileGuidanceCopy";
import { fiscalIdHintForCountry } from "../lib/fiscalIdByCountry";
import type { PayoutFormFields } from "../lib/professionalPayoutValidation";
import { DlocalPayoutCountryFields } from "./DlocalPayoutCountryFields";

export type PayoutProvider = "dlocal" | "stripe";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function statusLabel(language: AppLanguage, status: ProfessionalPayoutStatus | undefined): string {
  switch (status) {
    case "pending_review":
      return t(language, { es: "En revisión", en: "Under review", pt: "Em revisao" });
    case "active":
      return t(language, { es: "Listo para cobrar", en: "Ready to receive", pt: "Pronto para receber" });
    case "rejected":
      return t(language, { es: "Requiere corrección", en: "Needs correction", pt: "Requer correcao" });
    default:
      return t(language, { es: "Borrador", en: "Draft", pt: "Rascunho" });
  }
}

export function ProfessionalPayoutSetupPanel(props: {
  language: AppLanguage;
  provider: PayoutProvider;
  providerLocked?: boolean;
  /** País de residencia del profesional: define la pista del identificador fiscal (CUIT, RFC, NIT…). */
  residencyCountry?: string | null;
  form: PayoutFormFields;
  onFormChange: (patch: Partial<PayoutFormFields>) => void;
  docPreview: string;
  docInputRef: RefObject<HTMLInputElement | null>;
  onDocSelected: (file: File) => void | Promise<void>;
  payoutStatus?: ProfessionalPayoutStatus;
}) {
  const isDlocal = props.provider === "dlocal";
  const fiscalHint = fiscalIdHintForCountry(props.residencyCountry, props.language);
  const transferOptions: Array<{ value: ProfessionalPayoutBankTransferType; label: LocalizedText }> = isDlocal
    ? [
        { value: "cbu", label: { es: "CBU", en: "CBU", pt: "CBU" } },
        { value: "cvu", label: { es: "CVU", en: "CVU", pt: "CVU" } },
        { value: "alias", label: { es: "Alias", en: "Alias", pt: "Alias" } }
      ]
    : [
        { value: "iban", label: { es: "IBAN", en: "IBAN", pt: "IBAN" } },
        { value: "ach", label: { es: "Cuenta bancaria", en: "Bank account", pt: "Conta bancaria" } }
      ];

  return (
    <div className="pro-payout-setup">
      <header className="pro-payout-setup__hero">
        <h4 className="pro-payout-setup__title">
          {t(props.language, {
            es: "Configurá cómo vas a cobrar tus sesiones",
            en: "Set up how you’ll get paid for sessions",
            pt: "Configure como vai receber pelas sessoes"
          })}
        </h4>
        <p className="pro-payout-setup__lead">{t(props.language, PROFESSIONAL_PAYOUT_SETUP_LEAD)}</p>
        {props.payoutStatus && props.payoutStatus !== "draft" ? (
          <span className={`pro-payout-setup__status pro-payout-setup__status--${props.payoutStatus}`}>
            {statusLabel(props.language, props.payoutStatus)}
          </span>
        ) : null}
      </header>

      {!isDlocal ? (
        <section className="pro-payout-card">
          <h5>
            {t(props.language, { es: "Datos fiscales", en: "Tax identity", pt: "Dados fiscais" })}
          </h5>
          <p className="pro-payout-card__hint">{t(props.language, PROFESSIONAL_PAYOUT_FISCAL_NOTICE)}</p>
          <div className="pro-payout-card__grid">
            <label>
              <span>
                {t(props.language, { es: "Nombre legal / razón social", en: "Legal name", pt: "Nome legal" })}
              </span>
              <input
                value={props.form.legalName}
                onChange={(event) => props.onFormChange({ legalName: event.target.value })}
                autoComplete="name"
                placeholder={t(props.language, {
                  es: "Como figura en tu documento",
                  en: "As shown on your ID",
                  pt: "Como consta no documento"
                })}
              />
            </label>
            <label>
              <span>{fiscalHint.label}</span>
              <input
                value={props.form.taxId}
                onChange={(event) => props.onFormChange({ taxId: event.target.value })}
                autoComplete="off"
                placeholder={fiscalHint.placeholder}
              />
            </label>
          </div>
        </section>
      ) : null}

      <section className="pro-payout-card">
        <h5>
          {t(props.language, {
            es: "Datos bancarios para pagos",
            en: "Bank details for payouts",
            pt: "Dados bancarios para pagamentos"
          })}
        </h5>
        <p className="pro-payout-card__hint">
          {t(props.language, {
            es: "Cargá los datos de la cuenta bancaria en la que querés recibir tus pagos por las sesiones realizadas. La cuenta debe estar registrada a tu nombre.",
            en: "Enter the bank account where you want to receive payment for your completed sessions. The account must be registered in your name.",
            pt: "Informe os dados da conta bancaria onde deseja receber os pagamentos das sessoes realizadas. A conta deve estar registrada em seu nome."
          })}
        </p>

        {isDlocal ? (
          <DlocalPayoutCountryFields
            language={props.language}
            fields={props.form}
            onFormChange={props.onFormChange}
          />
        ) : (
          <>
            <div className="pro-payout-transfer-tabs" role="tablist">
              {transferOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={props.form.bankTransferType === option.value}
                  className={`pro-payout-transfer-tab${props.form.bankTransferType === option.value ? " active" : ""}`}
                  onClick={() => props.onFormChange({ bankTransferType: option.value, bankAccountValue: "" })}
                >
                  {t(props.language, option.label)}
                </button>
              ))}
            </div>

            <div className="pro-payout-card__grid">
              <label>
                <span>
                  {t(props.language, { es: "Titular de la cuenta", en: "Account holder", pt: "Titular da conta" })}
                </span>
                <input
                  value={props.form.accountHolderName}
                  onChange={(event) => props.onFormChange({ accountHolderName: event.target.value })}
                  autoComplete="name"
                />
              </label>
              <label>
                <span>
                  {props.form.bankTransferType === "iban"
                    ? "IBAN"
                    : t(props.language, { es: "Número de cuenta", en: "Account number", pt: "Numero da conta" })}
                </span>
                <input
                  value={props.form.bankAccountValue}
                  onChange={(event) => props.onFormChange({ bankAccountValue: event.target.value })}
                  autoComplete="off"
                  placeholder={props.form.bankTransferType === "iban" ? "DE89 3704 0044 0532 0130 00" : ""}
                />
              </label>
              <label>
                <span>{t(props.language, { es: "Banco", en: "Bank", pt: "Banco" })}</span>
                <input
                  value={props.form.bankName}
                  onChange={(event) => props.onFormChange({ bankName: event.target.value })}
                  autoComplete="organization"
                  placeholder={t(props.language, {
                    es: "Nombre de tu banco",
                    en: "Your bank name",
                    pt: "Nome do seu banco"
                  })}
                />
              </label>
            </div>
          </>
        )}
      </section>

      <section className="pro-payout-card">
        <h5>{t(props.language, { es: "Verificación de identidad", en: "Identity verification", pt: "Verificacao de identidade" })}</h5>
        <p className="pro-payout-card__hint">
          {t(props.language, {
            es: "Subí una imagen clara de tu DNI o documento fiscal para que podamos validar tu identidad.",
            en: "Upload a clear image of your national ID or tax document so we can verify your identity.",
            pt: "Envie uma imagem clara do seu documento de identidade ou fiscal para que possamos validar sua identidade."
          })}
        </p>

        <input
          ref={props.docInputRef}
          type="file"
          accept="image/*,.pdf"
          style={{ display: "none" }}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              await props.onDocSelected(file);
            }
          }}
        />

        <div className="pro-payout-doc-upload">
          {props.docPreview ? (
            <span className="pro-payout-doc-preview" aria-hidden="true">
              <img src={props.docPreview} alt="" />
            </span>
          ) : (
            <span className="pro-payout-doc-placeholder" aria-hidden="true">
              {t(props.language, { es: "Sin documento", en: "No document", pt: "Sem documento" })}
            </span>
          )}
          <button type="button" className="pro-payout-doc-button" onClick={() => props.docInputRef.current?.click()}>
            {props.docPreview
              ? t(props.language, { es: "Cambiar documento", en: "Change document", pt: "Alterar documento" })
              : t(props.language, { es: "Subir documento", en: "Upload document", pt: "Enviar documento" })}
          </button>
        </div>
      </section>

      <label className="pro-payout-terms">
        <input
          type="checkbox"
          checked={props.form.payoutTermsAccepted}
          onChange={(event) => props.onFormChange({ payoutTermsAccepted: event.target.checked })}
        />
        <span>
          {t(props.language, {
            es: "Confirmo que los datos ingresados son correctos, que la cuenta está a mi nombre y autorizo a MotivarCare a transferir allí mis pagos.",
            en: "I confirm the details entered are correct, the account is in my name, and I authorize MotivarCare to transfer my payments there.",
            pt: "Confirmo que os dados informados estao corretos, que a conta esta em meu nome e autorizo a MotivarCare a transferir ali meus pagamentos."
          })}
        </span>
      </label>
    </div>
  );
}
