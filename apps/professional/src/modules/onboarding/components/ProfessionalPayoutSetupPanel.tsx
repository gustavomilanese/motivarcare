import { type RefObject } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { ProfessionalPayoutBankTransferType, ProfessionalPayoutStatus } from "@therapy/types";
import {
  PROFESSIONAL_PAYOUT_FLOW_STEPS,
  PROFESSIONAL_PAYOUT_FISCAL_NOTICE,
  PROFESSIONAL_PAYOUT_SETUP_LEAD
} from "../constants/professionalProfileGuidanceCopy";
import type { PayoutFormFields } from "../lib/professionalPayoutValidation";

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
  form: PayoutFormFields;
  onFormChange: (patch: Partial<PayoutFormFields>) => void;
  docPreview: string;
  docInputRef: RefObject<HTMLInputElement | null>;
  onDocSelected: (file: File) => void | Promise<void>;
  payoutStatus?: ProfessionalPayoutStatus;
}) {
  const isDlocal = props.provider === "dlocal";
  const providerLocked = props.providerLocked ?? false;
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
        {providerLocked ? (
          <span className="pro-payout-setup__region-badge">
            {isDlocal
              ? t(props.language, {
                  es: "Cobros en Argentina y Latam",
                  en: "Payouts in Argentina and Latin America",
                  pt: "Recebimentos na Argentina e Latam"
                })
              : t(props.language, {
                  es: "Cobros internacionales",
                  en: "International payouts",
                  pt: "Recebimentos internacionais"
                })}
          </span>
        ) : null}
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

      <section className="pro-payout-flow" aria-label={t(props.language, { es: "Cómo funciona", en: "How it works", pt: "Como funciona" })}>
        {PROFESSIONAL_PAYOUT_FLOW_STEPS.map((step, index) => (
          <article key={step.title.es} className="pro-payout-flow__step">
            <span className="pro-payout-flow__index">{index + 1}</span>
            <div>
              <strong>{t(props.language, step.title)}</strong>
              <p>{t(props.language, step.body)}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="pro-payout-card">
        <h5>
          {t(props.language, { es: "Datos fiscales", en: "Tax identity", pt: "Dados fiscais" })}
        </h5>
        <p className="pro-payout-card__hint">{t(props.language, PROFESSIONAL_PAYOUT_FISCAL_NOTICE)}</p>
        <div className="pro-payout-card__grid">
          <label>
            <span>
              {isDlocal
                ? t(props.language, { es: "Nombre legal / razón social", en: "Legal name", pt: "Nome legal" })
                : t(props.language, { es: "Nombre legal", en: "Legal name", pt: "Nome legal" })}
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
            <span>
              {isDlocal
                ? t(props.language, { es: "CUIT / CUIL / DNI", en: "CUIT / CUIL / DNI", pt: "CUIT / CUIL / DNI" })
                : t(props.language, { es: "Identificador fiscal", en: "Tax ID", pt: "Identificador fiscal" })}
            </span>
            <input
              value={props.form.taxId}
              onChange={(event) => props.onFormChange({ taxId: event.target.value })}
              autoComplete="off"
              inputMode="numeric"
              placeholder={isDlocal ? "20-12345678-9" : "Tax ID"}
            />
          </label>
        </div>
      </section>

      <section className="pro-payout-card">
        <h5>
          {t(props.language, {
            es: "Cuenta donde recibís el dinero",
            en: "Account where you receive funds",
            pt: "Conta onde voce recebe"
          })}
        </h5>
        <p className="pro-payout-card__hint">
          {isDlocal
            ? t(props.language, {
                es: "Transferimos tu parte neta después de cada sesión ejecutada. La cuenta debe estar a tu nombre.",
                en: "We transfer your net share after each completed session. The account must be in your name.",
                pt: "Transferimos sua parte liquida apos cada sessao realizada. A conta deve estar em seu nome."
              })
            : t(props.language, {
                es: "Usamos transferencia bancaria internacional. Verificamos los datos antes del primer pago.",
                en: "We use international bank transfer. We verify details before the first payout.",
                pt: "Usamos transferencia bancaria internacional. Verificamos os dados antes do primeiro pagamento."
              })}
        </p>

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
              {props.form.bankTransferType === "alias"
                ? t(props.language, { es: "Alias bancario", en: "Bank alias", pt: "Alias bancario" })
                : props.form.bankTransferType === "iban"
                  ? "IBAN"
                  : props.form.bankTransferType === "ach"
                    ? t(props.language, { es: "Número de cuenta", en: "Account number", pt: "Numero da conta" })
                    : props.form.bankTransferType.toUpperCase()}
            </span>
            <input
              value={props.form.bankAccountValue}
              onChange={(event) => props.onFormChange({ bankAccountValue: event.target.value })}
              autoComplete="off"
              inputMode={props.form.bankTransferType === "alias" ? "text" : "numeric"}
              placeholder={
                props.form.bankTransferType === "alias"
                  ? "mi.alias.banco"
                  : props.form.bankTransferType === "iban"
                    ? "DE89 3704 0044 0532 0130 00"
                    : "0000000000000000000000"
              }
            />
          </label>
          {isDlocal && props.form.bankTransferType !== "alias" ? (
            <label>
              <span>{t(props.language, { es: "Banco (opcional)", en: "Bank (optional)", pt: "Banco (opcional)" })}</span>
              <input
                value={props.form.bankName}
                onChange={(event) => props.onFormChange({ bankName: event.target.value })}
                autoComplete="organization"
              />
            </label>
          ) : null}
        </div>
      </section>

      <section className="pro-payout-card">
        <h5>{t(props.language, { es: "Verificación de identidad", en: "Identity verification", pt: "Verificacao de identidade" })}</h5>
        <p className="pro-payout-card__hint">
          {t(props.language, {
            es: "Subí una foto clara de tu DNI o documento fiscal. Lo usamos para validar que la cuenta sea tuya.",
            en: "Upload a clear photo of your national ID or tax document. We use it to confirm the account is yours.",
            pt: "Envie uma foto clara do seu documento. Usamos para validar que a conta e sua."
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
            es: "Confirmo que los datos son correctos, la cuenta está a mi nombre y autorizo a MotivarCare a transferirme el neto de mis sesiones.",
            en: "I confirm the details are correct, the account is in my name, and I authorize MotivarCare to transfer my net session earnings.",
            pt: "Confirmo que os dados estao corretos, a conta esta em meu nome e autorizo a MotivarCare a transferir meu liquido de sessoes."
          })}
        </span>
      </label>

      <p className="pro-payout-footnote">
        {t(props.language, {
          es: "Revisamos los datos en 1–2 días hábiles. Podés atender pacientes mientras tanto; los pagos se liberan cuando tu cuenta quede activa.",
          en: "We review details within 1–2 business days. You can see patients meanwhile; payouts unlock once your account is active.",
          pt: "Revisamos os dados em 1–2 dias uteis. Voce pode atender pacientes enquanto isso; os pagamentos liberam quando a conta estiver ativa."
        })}
      </p>
    </div>
  );
}
