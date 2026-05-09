import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import type { SecurityAuditLogRow, SecurityAuditLogsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatWhen(iso: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value: iso,
    language,
    options: {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }
  });
}

const CATEGORY_FILTERS = [
  "",
  "AUTH_LOGIN_FAILED",
  "AUTH_LOGIN_RATE_LIMITED",
  "AUTH_REGISTER_TURNSTILE_FAILED",
  "AUTH_REGISTER_TURNSTILE_MISSING"
] as const;

export function SecurityAuditPage(props: { token: string; language: AppLanguage }) {
  const [rows, setRows] = useState<SecurityAuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      q.set("limit", "120");
      if (category.trim()) {
        q.set("category", category.trim());
      }
      const data = await apiRequest<SecurityAuditLogsResponse>(
        `/api/admin/security-audit-logs?${q.toString()}`,
        {},
        props.token
      );
      setRows(data.rows ?? []);
    } catch {
      setError(
        t(props.language, {
          es: "No se pudieron cargar los eventos. Reintentá en un momento.",
          en: "Could not load events. Try again shortly.",
          pt: "Nao foi possivel carregar os eventos. Tente de novo."
        })
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [props.language, props.token, category]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="ops-page finance-page">
      <section className="card stack finance-kpi-card finance-page-hero">
        <header className="toolbar">
          <h2>
            {t(props.language, {
              es: "Seguridad · registro e inicio de sesión",
              en: "Security · sign-up and sign-in",
              pt: "Seguranca · cadastro e login"
            })}
          </h2>
        </header>
        <p className="settings-section-lead">
          {t(props.language, {
            es: "Eventos en base de datos (complemento a Railway/Vercel): intentos de login fallidos, límites de frecuencia y Turnstile en alta de cuenta.",
            en: "Database events (alongside Railway/Vercel): failed logins, rate limits, and Turnstile on registration.",
            pt: "Eventos na base (alem de Railway/Vercel): logins falhos, rate limit e Turnstile no cadastro."
          })}
        </p>
        <div className="toolbar toolbar--wrap" role="group">
          <label className="stack" style={{ gap: 6 }}>
            <span className="muted">
              {t(props.language, { es: "Categoría", en: "Category", pt: "Categoria" })}
            </span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_FILTERS.map((c) => (
                <option key={c || "all"} value={c}>
                  {c || t(props.language, { es: "(todas)", en: "(all)", pt: "(todas)" })}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="primary" onClick={() => void load()} disabled={loading}>
            {loading
              ? t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })
              : t(props.language, { es: "Actualizar", en: "Refresh", pt: "Atualizar" })}
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="card stack">
        <div style={{ overflowX: "auto" }}>
          <table className="finance-table">
            <thead>
              <tr>
                <th>{t(props.language, { es: "Cuándo", en: "When", pt: "Quando" })}</th>
                <th>{t(props.language, { es: "Categoría", en: "Category", pt: "Categoria" })}</th>
                <th>{t(props.language, { es: "Mensaje", en: "Message", pt: "Mensagem" })}</th>
                <th>IP</th>
                <th>{t(props.language, { es: "Detalle", en: "Detail", pt: "Detalhe" })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="muted">
                    {t(props.language, {
                      es: "Sin eventos en este filtro.",
                      en: "No events for this filter.",
                      pt: "Sem eventos neste filtro."
                    })}
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatWhen(row.createdAt, props.language)}</td>
                  <td>
                    <code>{row.category}</code>
                  </td>
                  <td>{row.message ?? "—"}</td>
                  <td>{row.ip ?? "—"}</td>
                  <td>
                    {row.metadata ? (
                      <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", maxWidth: 360 }}>
                        {JSON.stringify(row.metadata, null, 2)}
                      </pre>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
