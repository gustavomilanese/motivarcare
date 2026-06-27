import { useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
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

export function AdminPage(props: { token: string; language: AppLanguage }) {
  const [form, setForm] = useState<AdminData>({
    taxId: "",
    legalName: "",
    payoutMethod: "stripe",
    payoutAccount: "",
    payoutStatus: "draft",
    payoutBankAccount: null,
    legalAcceptedAt: null,
    acceptedDocuments: ["contrato", "terminos", "consentimientos"],
    notes: ""
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiRequest<{ data: AdminData }>("/api/professional/admin", props.token)
      .then((response) => {
        setForm((current) => ({
          ...current,
          ...response.data,
          acceptedDocuments: response.data.acceptedDocuments ?? []
        }));
      })
      .catch((requestError) => {
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(professionalSurfaceMessage("admin-tab-load", props.language, raw));
      });
  }, [props.language, props.token]);

  const handleSave = async () => {
    try {
      await apiRequest<{ message: string }>("/api/professional/admin", props.token, {
        method: "PUT",
        body: JSON.stringify(form)
      });
      setMessage(
        t(props.language, {
          es: "Datos administrativos guardados.",
          en: "Administrative data saved.",
          pt: "Dados administrativos salvos."
        })
      );
      setError("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("admin-tab-save", props.language, raw));
    }
  };

  const bank = form.payoutBankAccount;

  return (
    <section className="pro-card">
      <header className="pro-admin-payout-head">
        <div>
          <h3>{t(props.language, { es: "Datos de cobro", en: "Payout details", pt: "Dados de recebimento" })}</h3>
          <p>
            {t(props.language, {
              es: "Estos datos los usamos para transferirte el neto de tus sesiones ejecutadas.",
              en: "We use these details to transfer your net earnings from completed sessions.",
              pt: "Usamos esses dados para transferir seu liquido das sessoes realizadas."
            })}
          </p>
        </div>
        <span className={`pro-payout-setup__status pro-payout-setup__status--${form.payoutStatus ?? "draft"}`}>
          {payoutStatusLabel(props.language, form.payoutStatus)}
        </span>
      </header>

      <div className="pro-grid-form">
        <label>
          {t(props.language, { es: "Nombre legal", en: "Legal name", pt: "Nome legal" })}
          <input
            value={form.legalName ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
          />
        </label>

        <label>
          {t(props.language, { es: "CUIT / CUIL / Tax ID", en: "Tax ID", pt: "Identificador fiscal" })}
          <input value={form.taxId ?? ""} onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))} />
        </label>

        <label>
          {t(props.language, { es: "Titular de la cuenta", en: "Account holder", pt: "Titular da conta" })}
          <input
            value={bank?.accountHolderName ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                payoutBankAccount: {
                  transferType: current.payoutBankAccount?.transferType ?? "cbu",
                  accountValue: current.payoutBankAccount?.accountValue ?? "",
                  accountHolderName: event.target.value,
                  bankName: current.payoutBankAccount?.bankName ?? null
                }
              }))
            }
          />
        </label>

        <label>
          {t(props.language, { es: "Tipo de cuenta", en: "Account type", pt: "Tipo de conta" })}
          <select
            value={bank?.transferType ?? "cbu"}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                payoutBankAccount: {
                  transferType: event.target.value as NonNullable<typeof bank>["transferType"],
                  accountValue: current.payoutBankAccount?.accountValue ?? "",
                  accountHolderName: current.payoutBankAccount?.accountHolderName ?? "",
                  bankName: current.payoutBankAccount?.bankName ?? null
                }
              }))
            }
          >
            <option value="cbu">CBU</option>
            <option value="cvu">CVU</option>
            <option value="alias">Alias</option>
            <option value="iban">IBAN</option>
            <option value="ach">{t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}</option>
          </select>
        </label>

        <label>
          {t(props.language, { es: "CBU / CVU / Alias / IBAN", en: "Account identifier", pt: "Identificador da conta" })}
          <input
            value={bank?.accountValue ?? form.payoutAccount ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                payoutAccount: event.target.value,
                payoutBankAccount: {
                  transferType: current.payoutBankAccount?.transferType ?? "cbu",
                  accountValue: event.target.value,
                  accountHolderName: current.payoutBankAccount?.accountHolderName ?? "",
                  bankName: current.payoutBankAccount?.bankName ?? null
                }
              }))
            }
          />
        </label>

        <label>
          {t(props.language, { es: "Notas internas", en: "Internal notes", pt: "Notas internas" })}
          <textarea rows={3} value={form.notes ?? ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
      </div>

      <button className="pro-primary" type="button" onClick={handleSave}>
        {t(props.language, { es: "Guardar", en: "Save", pt: "Salvar" })}
      </button>
      {error ? <p className="pro-error">{error}</p> : null}
      {message ? <p className="pro-success">{message}</p> : null}
    </section>
  );
}
