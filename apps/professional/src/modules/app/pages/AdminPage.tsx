import { useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import type { AdminData } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AdminPage(props: { token: string; language: AppLanguage }) {
  const [form, setForm] = useState<AdminData>({
    taxId: "",
    payoutMethod: "stripe",
    payoutAccount: "",
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
        setError(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudo cargar la solapa administrativa.",
                en: "Could not load the admin tab.",
                pt: "Nao foi possivel carregar a aba administrativa."
              })
        );
      });
  }, [props.token]);

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
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo guardar.",
              en: "Could not save.",
              pt: "Nao foi possivel salvar."
            })
      );
    }
  };

  return (
    <section className="pro-card">
      <h2>{t(props.language, { es: "Solapa administrativa", en: "Administrative tab", pt: "Aba administrativa" })}</h2>
      <div className="pro-grid-form">
        <label>
          {t(props.language, { es: "Datos fiscales (Tax ID)", en: "Tax data (Tax ID)", pt: "Dados fiscais (Tax ID)" })}
          <input value={form.taxId ?? ""} onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))} />
        </label>

        <label>
          {t(props.language, { es: "Metodo de cobro", en: "Payout method", pt: "Metodo de cobranca" })}
          <input
            value={form.payoutMethod ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, payoutMethod: event.target.value }))}
          />
        </label>

        <label>
          {t(props.language, { es: "Cuenta de cobro", en: "Payout account", pt: "Conta de cobranca" })}
          <input
            value={form.payoutAccount ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, payoutAccount: event.target.value }))}
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
