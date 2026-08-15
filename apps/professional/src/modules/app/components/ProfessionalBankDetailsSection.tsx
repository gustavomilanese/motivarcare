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
}) {
  const [form, setForm] = useState<AdminData>(EMPTY_ADMIN);
  const [draft, setDraft] = useState<AdminData | null>(null);
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
    setDraft((current) => current ?? form);
    setError("");
  }, [props.editing, form]);

  useEffect(() => {
    if (!props.editing) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        props.onEditingChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [props.editing, props.onEditingChange, saving]);

  const bank = form.payoutBankAccount;
  const accountValue = bank?.accountValue ?? form.payoutAccount ?? "";
  const draftBank = draft?.payoutBankAccount;
  const draftAccountValue = draftBank?.accountValue ?? draft?.payoutAccount ?? "";

  const closeEditor = () => {
    if (saving) {
      return;
    }
    setError("");
    props.onEditingChange(false);
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    setSaving(true);
    try {
      const response = await apiRequest<{ message: string; data?: AdminData }>("/api/professional/admin", props.token, {
        method: "PUT",
        body: JSON.stringify(draft)
      });
      setForm(response.data ? mergeAdmin(response.data) : draft);
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
      {error && !props.editing ? <p className="pro-error">{error}</p> : null}
      {message ? <p className="pro-success">{message}</p> : null}

      {props.editing && draft ? (
        <div
          className="pro-profile-bank-modal-backdrop"
          role="presentation"
          onClick={closeEditor}
        >
          <section
            className="pro-profile-bank-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-profile-bank-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h3 id="pro-profile-bank-modal-title">
                {t(props.language, { es: "Editar datos bancarios", en: "Edit bank details", pt: "Editar dados bancarios" })}
              </h3>
              <button
                type="button"
                aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
                disabled={saving}
                onClick={closeEditor}
              >
                ×
              </button>
            </header>
            <p className="pro-profile-bank-modal-lead">
              {t(props.language, {
                es: "Estos datos se usan para transferirte el neto de tus sesiones ejecutadas.",
                en: "We use these details to transfer your net earnings from completed sessions.",
                pt: "Usamos esses dados para transferir seu liquido das sessoes realizadas."
              })}
            </p>
            <div className="pro-profile-fields">
              <label className="pro-profile-field">
                <span>{t(props.language, { es: "Nombre legal", en: "Legal name", pt: "Nome legal" })}</span>
                <input
                  value={draft.legalName ?? ""}
                  onChange={(event) => setDraft((current) => (current ? { ...current, legalName: event.target.value } : current))}
                />
              </label>
              <label className="pro-profile-field">
                <span>{t(props.language, { es: "CUIT / CUIL / Tax ID", en: "Tax ID", pt: "Identificador fiscal" })}</span>
                <input
                  value={draft.taxId ?? ""}
                  onChange={(event) => setDraft((current) => (current ? { ...current, taxId: event.target.value } : current))}
                />
              </label>
              <label className="pro-profile-field">
                <span>{t(props.language, { es: "Titular de la cuenta", en: "Account holder", pt: "Titular da conta" })}</span>
                <input
                  value={draftBank?.accountHolderName ?? ""}
                  onChange={(event) =>
                    setDraft((current) => (current ? patchBankAccount(current, { accountHolderName: event.target.value }) : current))
                  }
                />
              </label>
              <label className="pro-profile-field">
                <span>{t(props.language, { es: "Tipo de cuenta", en: "Account type", pt: "Tipo de conta" })}</span>
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
                  <option value="cbu">CBU</option>
                  <option value="cvu">CVU</option>
                  <option value="alias">Alias</option>
                  <option value="iban">IBAN</option>
                  <option value="ach">{t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}</option>
                </select>
              </label>
              <label className="pro-profile-field pro-profile-field--wide">
                <span>{t(props.language, { es: "CBU / CVU / Alias / IBAN", en: "Account identifier", pt: "Identificador da conta" })}</span>
                <input
                  value={draftAccountValue}
                  onChange={(event) =>
                    setDraft((current) => (current ? patchBankAccount(current, { accountValue: event.target.value }) : current))
                  }
                />
              </label>
              <label className="pro-profile-field pro-profile-field--wide">
                <span>{t(props.language, { es: "Banco (opcional)", en: "Bank (optional)", pt: "Banco (opcional)" })}</span>
                <input
                  value={draftBank?.bankName ?? ""}
                  onChange={(event) =>
                    setDraft((current) => (current ? patchBankAccount(current, { bankName: event.target.value || null }) : current))
                  }
                />
              </label>
            </div>
            {error ? <p className="pro-error">{error}</p> : null}
            <div className="pro-profile-bank-modal-actions">
              <button type="button" className="pro-secondary" disabled={saving} onClick={closeEditor}>
                {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
              </button>
              <button className="pro-primary" type="button" disabled={saving} onClick={() => void handleSave()}>
                {saving
                  ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                  : t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
