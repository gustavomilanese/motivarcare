import { useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  dlocalPayoutBankCodes,
  dlocalPayoutCountryOptions,
  isDlocalPayoutCountry,
  type ProfessionalPayoutBankTransferType
} from "@therapy/types";
import { professionalSurfaceMessage, softNetworkOrHttp } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";
import type { AdminData } from "../types";
import { ProfileEditModal } from "./ProfileEditModal";
import { DlocalPayoutCountryFields } from "../../onboarding/components/DlocalPayoutCountryFields";
import {
  adminToPayoutFormFields,
  buildPayoutAdminFromFormFields,
  preparePayoutBankEditorDraft,
  resolvePayoutEditorProvider
} from "../../onboarding/lib/buildPayoutAdminFromFormFields";
import {
  collectPayoutFieldErrors,
  firstPayoutFieldError,
  mapPayoutApiError,
  type PayoutFieldErrorKey,
  type PayoutFormFields
} from "../../onboarding/lib/professionalPayoutValidation";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function payoutLang(language: AppLanguage): "es" | "en" | "pt" {
  return language === "en" || language === "pt" ? language : "es";
}

function FieldError(props: { message?: string }) {
  if (!props.message) {
    return null;
  }
  return <p className="pro-profile-field-error">{props.message}</p>;
}

function FieldHint(props: { message?: string }) {
  if (!props.message) {
    return null;
  }
  return <p className="pro-profile-field-hint">{props.message}</p>;
}

function payoutStatusLabel(language: AppLanguage, status: AdminData["payoutStatus"]): string {
  switch (status) {
    case "pending_review":
      return t(language, { es: "En revisión", en: "Under review", pt: "Em revisao" });
    case "active":
      return t(language, { es: "Listo para cobrar", en: "Ready to receive", pt: "Pronto para receber" });
    case "rejected":
      return t(language, { es: "Rechazado", en: "Rejected", pt: "Rejeitado" });
    default:
      return t(language, { es: "Borrador", en: "Draft", pt: "Rascunho" });
  }
}

function transferTypeLabel(language: AppLanguage, type: ProfessionalPayoutBankTransferType | undefined): string {
  switch (type) {
    case "cbu":
      return "CBU";
    case "cvu":
      return "CVU";
    case "alias":
      return t(language, { es: "Alias", en: "Alias", pt: "Alias" });
    case "iban":
      return "IBAN";
    case "ach":
      return t(language, { es: "Cuenta", en: "Account", pt: "Conta" });
    default:
      return "—";
  }
}

const EMPTY_ADMIN: AdminData = {
  taxId: "",
  legalName: "",
  payoutMethod: "stripe",
  payoutAccount: "",
  payoutStatus: "draft",
  payoutBankAccount: null,
  legalAcceptedAt: null,
  acceptedDocuments: ["contrato", "terminos", "consentimientos"],
  notes: ""
};

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "—";
}

function payoutCountryLabel(language: AppLanguage, code: string | null | undefined): string {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) {
    return "—";
  }
  const match = dlocalPayoutCountryOptions(language as "es" | "en" | "pt").find((option) => option.code === normalized);
  return match?.label ?? normalized;
}

function payoutBankLabel(country: string | null | undefined, code: string | null | undefined, fallbackName?: string | null): string {
  const bankCode = (code ?? "").trim();
  const countryCode = (country ?? "").trim().toUpperCase();
  if (countryCode === "AR" && bankCode === "000") {
    return "Mercado Pago / CVU (cuenta virtual)";
  }
  if (bankCode && isDlocalPayoutCountry(countryCode)) {
    const match = dlocalPayoutBankCodes(countryCode)?.find((bank) => bank.code === bankCode);
    if (match?.name) {
      return match.name;
    }
  }
  const name = fallbackName?.trim() ?? "";
  if (name) {
    return name;
  }
  return bankCode || "—";
}

function mergeAdmin(data: AdminData): AdminData {
  return {
    ...EMPTY_ADMIN,
    ...data,
    acceptedDocuments: data.acceptedDocuments ?? EMPTY_ADMIN.acceptedDocuments
  };
}

function patchBankAccount(
  current: AdminData,
  patch: {
    transferType?: ProfessionalPayoutBankTransferType;
    accountValue?: string;
    accountHolderName?: string;
    bankName?: string | null;
  }
): AdminData {
  return {
    ...current,
    payoutAccount: patch.accountValue ?? current.payoutBankAccount?.accountValue ?? current.payoutAccount ?? "",
    payoutBankAccount: {
      transferType: patch.transferType ?? current.payoutBankAccount?.transferType ?? "cbu",
      accountValue: patch.accountValue ?? current.payoutBankAccount?.accountValue ?? "",
      accountHolderName: patch.accountHolderName ?? current.payoutBankAccount?.accountHolderName ?? "",
      bankName: patch.bankName !== undefined ? patch.bankName : current.payoutBankAccount?.bankName ?? null,
      payoutCountry: current.payoutBankAccount?.payoutCountry,
      beneficiaryFirstName: current.payoutBankAccount?.beneficiaryFirstName,
      beneficiaryLastName: current.payoutBankAccount?.beneficiaryLastName,
      documentType: current.payoutBankAccount?.documentType,
      document: current.payoutBankAccount?.document,
      bankCode: current.payoutBankAccount?.bankCode,
      bankBranch: current.payoutBankAccount?.bankBranch,
      accountType: current.payoutBankAccount?.accountType
    }
  };
}

export function ProfessionalBankDetailsSection(props: {
  token: string;
  language: AppLanguage;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  residencyCountry?: string | null;
}) {
  const [form, setForm] = useState<AdminData>(EMPTY_ADMIN);
  const [draft, setDraft] = useState<AdminData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PayoutFieldErrorKey, string>>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ data: AdminData }>("/api/professional/admin", props.token)
      .then((response) => {
        if (!active) {
          return;
        }
        setForm(mergeAdmin(response.data));
        setError("");
        setLoaded(true);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(professionalSurfaceMessage("admin-tab-load", props.language, raw));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [props.language, props.token]);

  useEffect(() => {
    if (!props.editing) {
      setDraft(null);
      return;
    }
    setDraft((current) => current ?? preparePayoutBankEditorDraft(form, props.residencyCountry));
    setError("");
    setFieldErrors({});
  }, [props.editing, form, props.residencyCountry]);

  const bank = form.payoutBankAccount;
  const accountValue = bank?.accountValue ?? form.payoutAccount ?? "";
  const draftBank = draft?.payoutBankAccount;
  const draftAccountValue = draftBank?.accountValue ?? draft?.payoutAccount ?? "";
  const isDlocal = (draft?.payoutMethod ?? form.payoutMethod) === "dlocal"
    || resolvePayoutEditorProvider(draft ?? form, props.residencyCountry) === "dlocal";
  const dlocalFields = draft && isDlocal ? adminToPayoutFormFields(draft) : null;

  const applyDlocalFields = (patch: Partial<PayoutFormFields>) => {
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as PayoutFieldErrorKey[]) {
        delete next[key];
      }
      return next;
    });
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const fields = { ...adminToPayoutFormFields(current), ...patch };
      if (patch.beneficiaryFirstName !== undefined || patch.beneficiaryLastName !== undefined) {
        fields.accountHolderName = `${fields.beneficiaryFirstName} ${fields.beneficiaryLastName}`.trim();
      }
      const built = buildPayoutAdminFromFormFields("dlocal", fields);
      return {
        ...current,
        ...built,
        payoutMethod: "dlocal",
        payoutStatus: current.payoutStatus,
        payoutSubmittedAt: current.payoutSubmittedAt,
        legalAcceptedAt: current.legalAcceptedAt,
        acceptedDocuments: current.acceptedDocuments,
        notes: current.notes
      };
    });
  };

  const closeEditor = () => {
    if (saving) {
      return;
    }
    setError("");
    setFieldErrors({});
    props.onEditingChange(false);
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    const lang = payoutLang(props.language);
    const provider = resolvePayoutEditorProvider(draft, props.residencyCountry);
    const fields = adminToPayoutFormFields(draft);
    const nextFieldErrors = collectPayoutFieldErrors(provider, fields, lang);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(
        firstPayoutFieldError(nextFieldErrors)
        ?? t(props.language, {
          es: "Revisá los campos marcados en rojo y tocá guardar otra vez.",
          en: "Check the fields marked in red and save again.",
          pt: "Confira os campos em vermelho e salve de novo."
        })
      );
      return;
    }
    setSaving(true);
    try {
      const payload = provider === "dlocal"
        ? { ...draft, ...buildPayoutAdminFromFormFields("dlocal", { ...fields, payoutTermsAccepted: true }), payoutStatus: draft.payoutStatus, payoutSubmittedAt: draft.payoutSubmittedAt, legalAcceptedAt: draft.legalAcceptedAt, acceptedDocuments: draft.acceptedDocuments, notes: draft.notes }
        : draft;
      const response = await apiRequest<{ message: string; data?: AdminData }>("/api/professional/admin", props.token, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setForm(response.data ? mergeAdmin(response.data) : mergeAdmin(payload));
      setMessage(
        t(props.language, {
          es: "Datos bancarios guardados.",
          en: "Bank details saved.",
          pt: "Dados bancarios salvos."
        })
      );
      setError("");
      setFieldErrors({});
      props.onEditingChange(false);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      const net = softNetworkOrHttp(props.language, raw);
      if (net) {
        setError(net);
        return;
      }
      const mapped = mapPayoutApiError(raw, lang);
      setFieldErrors(mapped.field ? { [mapped.field]: mapped.message } : {});
      setError(mapped.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <p className="pro-profile-bank-status">
        {t(props.language, { es: "Cargando datos bancarios…", en: "Loading bank details…", pt: "Carregando dados bancarios…" })}
      </p>
    );
  }

  return (
    <div className="pro-profile-bank-view">
      <dl className="pro-profile-bank-dl">
        <div>
          <dt>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</dt>
          <dd>
            <span className={`pro-payout-setup__status pro-payout-setup__status--${form.payoutStatus ?? "draft"}`}>
              {payoutStatusLabel(props.language, form.payoutStatus)}
            </span>
          </dd>
        </div>
        <div>
          <dt>{t(props.language, { es: "Nombre y apellido (DNI)", en: "Legal name (ID)", pt: "Nome e sobrenome (documento)" })}</dt>
          <dd>{displayValue(form.legalName)}</dd>
        </div>
        {form.payoutMethod === "dlocal" ? null : (
          <div>
            <dt>{t(props.language, { es: "CUIT / CUIL / Tax ID", en: "Tax ID", pt: "Identificador fiscal" })}</dt>
            <dd>{displayValue(form.taxId)}</dd>
          </div>
        )}
        <div>
          <dt>{t(props.language, { es: "Titular de la cuenta", en: "Account holder", pt: "Titular da conta" })}</dt>
          <dd>{displayValue(bank?.accountHolderName)}</dd>
        </div>
        {form.payoutMethod === "dlocal" ? null : (
          <div>
            <dt>{t(props.language, { es: "Tipo", en: "Type", pt: "Tipo" })}</dt>
            <dd>{transferTypeLabel(props.language, bank?.transferType)}</dd>
          </div>
        )}
        <div>
          <dt>{t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}</dt>
          <dd>{displayValue(accountValue)}</dd>
        </div>
        {form.payoutMethod === "dlocal" ? (
          <>
            <div>
              <dt>{t(props.language, { es: "País de cobro", en: "Payout country", pt: "Pais de cobranca" })}</dt>
              <dd>{payoutCountryLabel(props.language, bank?.payoutCountry)}</dd>
            </div>
            <div>
              <dt>{t(props.language, { es: "Documento", en: "Document", pt: "Documento" })}</dt>
              <dd>
                {[bank?.documentType, bank?.document ?? form.taxId].filter((part) => Boolean(part?.trim())).join(" ") || "—"}
              </dd>
            </div>
          </>
        ) : null}
        {bank?.bankName?.trim() || bank?.bankCode?.trim() ? (
          <div>
            <dt>{t(props.language, { es: "Banco", en: "Bank", pt: "Banco" })}</dt>
            <dd>{payoutBankLabel(bank?.payoutCountry, bank?.bankCode, bank?.bankName)}</dd>
          </div>
        ) : null}
      </dl>
      {error && !props.editing ? <p className="pro-error">{error}</p> : null}
      {message ? <p className="pro-success">{message}</p> : null}

      {props.editing && draft ? (
        <ProfileEditModal
          language={props.language}
          wide
          title={t(props.language, { es: "Editar datos bancarios", en: "Edit bank details", pt: "Editar dados bancarios" })}
          saving={saving}
          error={error}
          onClose={closeEditor}
          onSave={() => void handleSave()}
        >
            <div className="pro-profile-fields">
              <label className={`pro-profile-field pro-profile-field--sentence${fieldErrors.legalName ? " is-invalid" : ""}`}>
                <span>{t(props.language, { es: "Nombre y Apellido (como en el DNI)", en: "First and last name (as on ID)", pt: "Nome e sobrenome (como no documento)" })}</span>
                <input
                  value={draft.legalName ?? ""}
                  aria-invalid={Boolean(fieldErrors.legalName)}
                  onChange={(event) => {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.legalName;
                      return next;
                    });
                    isDlocal
                      ? applyDlocalFields({ legalName: event.target.value })
                      : setDraft((current) => (current ? { ...current, legalName: event.target.value } : current));
                  }}
                />
                <FieldError message={fieldErrors.legalName} />
              </label>
              {isDlocal && dlocalFields ? (
                <div className="pro-profile-field pro-profile-field--wide">
                  <DlocalPayoutCountryFields
                    language={props.language}
                    fields={dlocalFields}
                    onFormChange={applyDlocalFields}
                    residencyCountry={props.residencyCountry}
                    fieldErrors={fieldErrors}
                  />
                </div>
              ) : (
                <>
              <label className={`pro-profile-field${fieldErrors.taxId ? " is-invalid" : ""}`}>
                <span>{t(props.language, { es: "CUIT / CUIL / Tax ID", en: "Tax ID", pt: "Identificador fiscal" })}</span>
                <input
                  value={draft.taxId ?? ""}
                  aria-invalid={Boolean(fieldErrors.taxId)}
                  onChange={(event) => {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.taxId;
                      return next;
                    });
                    setDraft((current) => (current ? { ...current, taxId: event.target.value } : current));
                  }}
                />
                <FieldError message={fieldErrors.taxId} />
              </label>
              <label className={`pro-profile-field${fieldErrors.accountHolderName ? " is-invalid" : ""}`}>
                <span>{t(props.language, { es: "Titular de la cuenta bancaria", en: "Bank account holder", pt: "Titular da conta bancária" })}</span>
                <input
                  value={draftBank?.accountHolderName ?? ""}
                  aria-invalid={Boolean(fieldErrors.accountHolderName)}
                  onChange={(event) => {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.accountHolderName;
                      return next;
                    });
                    setDraft((current) => (current ? patchBankAccount(current, { accountHolderName: event.target.value }) : current));
                  }}
                />
                <FieldError message={fieldErrors.accountHolderName} />
              </label>
              <label className="pro-profile-field">
                <span>{t(props.language, { es: "Tipo de identificador", en: "Identifier type", pt: "Tipo de identificador" })}</span>
                <select
                  value={draftBank?.transferType ?? "cbu"}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? patchBankAccount(current, {
                            transferType: event.target.value as ProfessionalPayoutBankTransferType
                          })
                        : current
                    )
                  }
                >
                  <option value="cbu">CBU (22 dígitos)</option>
                  <option value="cvu">CVU (22 dígitos, Mercado Pago)</option>
                  <option value="alias">Alias (ej. gus.fer.milan)</option>
                  <option value="iban">IBAN</option>
                  <option value="ach">{t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}</option>
                </select>
              </label>
              <label className={`pro-profile-field pro-profile-field--wide${fieldErrors.bankAccountValue ? " is-invalid" : ""}`}>
                <span>
                  {(draftBank?.transferType ?? "cbu") === "alias"
                    ? t(props.language, { es: "Alias de la cuenta", en: "Account alias", pt: "Alias da conta" })
                    : (draftBank?.transferType ?? "cbu") === "cbu"
                      ? "CBU (22 números)"
                      : (draftBank?.transferType ?? "cbu") === "cvu"
                        ? "CVU (22 números)"
                        : t(props.language, { es: "CBU / CVU / Alias / IBAN", en: "Account identifier", pt: "Identificador da conta" })}
                </span>
                <input
                  value={draftAccountValue}
                  aria-invalid={Boolean(fieldErrors.bankAccountValue)}
                  placeholder={
                    (draftBank?.transferType ?? "cbu") === "alias" ? "gus.fer.milan" : undefined
                  }
                  onChange={(event) => {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.bankAccountValue;
                      return next;
                    });
                    setDraft((current) => (current ? patchBankAccount(current, { accountValue: event.target.value }) : current));
                  }}
                />
                {fieldErrors.bankAccountValue ? (
                  <FieldError message={fieldErrors.bankAccountValue} />
                ) : (
                  <FieldHint
                    message={
                      (draftBank?.transferType ?? "cbu") === "alias"
                        ? t(props.language, {
                            es: "6 a 20 caracteres: letras, números y puntos. No es un CBU.",
                            en: "6 to 20 characters: letters, numbers, and dots. Not a CBU.",
                            pt: "6 a 20 caracteres: letras, números e pontos. Não é um CBU."
                          })
                        : (draftBank?.transferType ?? "cbu") === "cbu" || (draftBank?.transferType ?? "cbu") === "cvu"
                          ? t(props.language, {
                              es: "Exactamente 22 números. Si tenés un alias, cambiá el tipo a Alias.",
                              en: "Exactly 22 digits. If you have an alias, switch the type to Alias.",
                              pt: "Exatamente 22 números. Se tiver um alias, mude o tipo para Alias."
                            })
                          : undefined
                    }
                  />
                )}
              </label>
              <label className={`pro-profile-field pro-profile-field--wide pro-profile-field--sentence${fieldErrors.bankName ? " is-invalid" : ""}`}>
                <span>{t(props.language, { es: "Banco de la cuenta", en: "Account bank", pt: "Banco da conta" })}</span>
                <input
                  value={draftBank?.bankName ?? ""}
                  aria-invalid={Boolean(fieldErrors.bankName)}
                  onChange={(event) => {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.bankName;
                      return next;
                    });
                    setDraft((current) => (current ? patchBankAccount(current, { bankName: event.target.value || null }) : current));
                  }}
                />
                {fieldErrors.bankName ? (
                  <FieldError message={fieldErrors.bankName} />
                ) : (
                  <FieldHint
                    message={t(props.language, {
                      es: "Obligatorio. Si cobrás con Mercado Pago, escribí Mercado Pago.",
                      en: "Required. For Mercado Pago, type Mercado Pago.",
                      pt: "Obrigatório. No Mercado Pago, escreva Mercado Pago."
                    })}
                  />
                )}
              </label>
                </>
              )}
            </div>
        </ProfileEditModal>
      ) : null}
    </div>
  );
}
