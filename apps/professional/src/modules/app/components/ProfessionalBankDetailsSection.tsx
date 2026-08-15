import { useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { ProfessionalPayoutBankTransferType } from "@therapy/types";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";
import type { AdminData } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function payoutStatusLabel(language: AppLanguage, status: AdminData["payoutStatus"]): string {
  switch (status) {
    case "pending_review":
      return t(language, { es: "En revisión", en: "Under review", pt: "Em revisao" });
    case "active":
      return t(language, { es: "Activo", en: "Active", pt: "Ativo" });
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

export function ProfessionalBankDetailsSection(props: {
  token: string;
  language: AppLanguage;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const [form, setForm] = useState<AdminData>(EMPTY_ADMIN);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ data: AdminData }>("/api/professional/admin", props.token)
      .then((response) => {
        if (!active) {
          return;
        }
        setForm({
          ...EMPTY_ADMIN,
          ...response.data,
          acceptedDocuments: response.data.acceptedDocuments ?? EMPTY_ADMIN.acceptedDocuments
        });
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

  const bank = form.payoutBankAccount;
  const accountValue = bank?.accountValue ?? form.payoutAccount ?? "";

  const patchBank = (patch: {
    transferType?: ProfessionalPayoutBankTransferType;
    accountValue?: string;
    accountHolderName?: string;
    bankName?: string | null;
  }) => {
    setForm((current) => ({
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
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest<{ message: string }>("/api/professional/admin", props.token, {
        method: "PUT",
        body: JSON.stringify(form)
      });
      setMessage(
        t(props.language, {
          es: "Datos bancarios guardados.",
          en: "Bank details saved.",
          pt: "Dados bancarios salvos."
        })
      );
      setError("");
      props.onEditingChange(false);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("admin-tab-save", props.language, raw));
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

  if (props.editing) {
    return (
      <div className="pro-profile-bank-editor">
        <div className="pro-profile-fields">
          <label className="pro-profile-field">
            <span>{t(props.language, { es: "Nombre legal", en: "Legal name", pt: "Nome legal" })}</span>
            <input
              value={form.legalName ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
            />
          </label>
          <label className="pro-profile-field">
            <span>{t(props.language, { es: "CUIT / CUIL / Tax ID", en: "Tax ID", pt: "Identificador fiscal" })}</span>
            <input
              value={form.taxId ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))}
            />
          </label>
          <label className="pro-profile-field">
            <span>{t(props.language, { es: "Titular de la cuenta", en: "Account holder", pt: "Titular da conta" })}</span>
            <input
              value={bank?.accountHolderName ?? ""}
              onChange={(event) => patchBank({ accountHolderName: event.target.value })}
            />
          </label>
          <label className="pro-profile-field">
            <span>{t(props.language, { es: "Tipo de cuenta", en: "Account type", pt: "Tipo de conta" })}</span>
            <select
              value={bank?.transferType ?? "cbu"}
              onChange={(event) =>
                patchBank({ transferType: event.target.value as ProfessionalPayoutBankTransferType })
              }
            >
              <option value="cbu">CBU</option>
              <option value="cvu">CVU</option>
              <option value="alias">Alias</option>
              <option value="iban">IBAN</option>
              <option value="ach">{t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}</option>
            </select>
          </label>
          <label className="pro-profile-field pro-profile-field--wide">
            <span>{t(props.language, { es: "CBU / CVU / Alias / IBAN", en: "Account identifier", pt: "Identificador da conta" })}</span>
            <input value={accountValue} onChange={(event) => patchBank({ accountValue: event.target.value })} />
          </label>
          <label className="pro-profile-field pro-profile-field--wide">
            <span>{t(props.language, { es: "Banco (opcional)", en: "Bank (optional)", pt: "Banco (opcional)" })}</span>
            <input
              value={bank?.bankName ?? ""}
              onChange={(event) => patchBank({ bankName: event.target.value || null })}
            />
          </label>
        </div>
        <div className="pro-profile-bank-editor-actions">
          <button
            type="button"
            className="pro-secondary"
            disabled={saving}
            onClick={() => {
              props.onEditingChange(false);
              setMessage("");
            }}
          >
            {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </button>
          <button className="pro-primary" type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving
              ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
              : t(props.language, { es: "Guardar datos bancarios", en: "Save bank details", pt: "Salvar dados bancarios" })}
          </button>
        </div>
        {error ? <p className="pro-error">{error}</p> : null}
        {message ? <p className="pro-success">{message}</p> : null}
      </div>
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
          <dt>{t(props.language, { es: "Nombre legal", en: "Legal name", pt: "Nome legal" })}</dt>
          <dd>{displayValue(form.legalName)}</dd>
        </div>
        <div>
          <dt>{t(props.language, { es: "CUIT / CUIL / Tax ID", en: "Tax ID", pt: "Identificador fiscal" })}</dt>
          <dd>{displayValue(form.taxId)}</dd>
        </div>
        <div>
          <dt>{t(props.language, { es: "Titular", en: "Account holder", pt: "Titular" })}</dt>
          <dd>{displayValue(bank?.accountHolderName)}</dd>
        </div>
        <div>
          <dt>{t(props.language, { es: "Tipo", en: "Type", pt: "Tipo" })}</dt>
          <dd>{transferTypeLabel(props.language, bank?.transferType)}</dd>
        </div>
        <div>
          <dt>{t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}</dt>
          <dd>{displayValue(accountValue)}</dd>
        </div>
        {bank?.bankName?.trim() ? (
          <div>
            <dt>{t(props.language, { es: "Banco", en: "Bank", pt: "Banco" })}</dt>
            <dd>{bank.bankName}</dd>
          </div>
        ) : null}
      </dl>
      {error ? <p className="pro-error">{error}</p> : null}
      {message ? <p className="pro-success">{message}</p> : null}
    </div>
  );
}
