import { useCallback, useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type PaymentCheckoutEvent = {
  id: string;
  eventType: string;
  message: string | null;
  actorRole: string | null;
  createdAt: string;
};

type PaymentCheckoutRow = {
  id: string;
  kind: "PACKAGE" | "INDIVIDUAL" | "TRIAL";
  status: string;
  provider: string;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  displayName: string | null;
  sessionCount: number | null;
  chargeAmountMajor: number | null;
  chargeCurrency: string | null;
  fulfillmentPurchaseId: string | null;
  lastProviderStatus: string | null;
  lastError: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  events: PaymentCheckoutEvent[];
};

function kindLabel(kind: PaymentCheckoutRow["kind"], language: AppLanguage): string {
  if (kind === "PACKAGE") {
    return t(language, { es: "Paquete", en: "Package", pt: "Pacote" });
  }
  if (kind === "INDIVIDUAL") {
    return t(language, { es: "Sesiones sueltas", en: "Individual sessions", pt: "Sessoes avulsas" });
  }
  return t(language, { es: "Sesión de prueba", en: "Trial session", pt: "Sessao de teste" });
}

function statusLabel(status: string, language: AppLanguage): string {
  const map: Record<string, LocalizedText> = {
    CREATED: { es: "Iniciada", en: "Started", pt: "Iniciada" },
    REDIRECTED: { es: "En pago", en: "At payment", pt: "Em pagamento" },
    PAID: { es: "Pagada", en: "Paid", pt: "Paga" },
    FULFILLED: { es: "Acreditada", en: "Credited", pt: "Creditada" },
    FAILED: { es: "Fallida", en: "Failed", pt: "Falhou" },
    CANCELLED: { es: "Cancelada", en: "Cancelled", pt: "Cancelada" },
    EXPIRED: { es: "Expirada", en: "Expired", pt: "Expirada" }
  };
  return t(language, map[status] ?? { es: status, en: status, pt: status });
}

function formatWhen(iso: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value: iso,
    language,
    options: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
  });
}

function eventLabel(event: PaymentCheckoutEvent, language: AppLanguage): string {
  const byType: Record<string, LocalizedText> = {
    "checkout.created": {
      es: "Compra iniciada",
      en: "Purchase started",
      pt: "Compra iniciada"
    },
    "checkout.redirected": {
      es: "Pago en curso",
      en: "Payment in progress",
      pt: "Pagamento em andamento"
    },
    "checkout.fulfilled": {
      es: "Pago confirmado y sesiones acreditadas",
      en: "Payment confirmed and sessions credited",
      pt: "Pagamento confirmado e sessoes creditadas"
    },
    "checkout.sync_attempt": {
      es: "Verificación de pago",
      en: "Payment verification",
      pt: "Verificacao de pagamento"
    },
    "checkout.cancelled": {
      es: "Pago cancelado",
      en: "Payment cancelled",
      pt: "Pagamento cancelado"
    },
    "checkout.trial_booked": {
      es: "Sesión de prueba reservada",
      en: "Trial session booked",
      pt: "Sessao de teste reservada"
    }
  };

  return t(language, byType[event.eventType] ?? { es: event.message ?? event.eventType, en: event.message ?? event.eventType, pt: event.message ?? event.eventType });
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function PaymentActivityCopyField(props: {
  label: string;
  hint?: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyText(props.value);
    if (!ok) {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="payment-activity-ref-row">
      <div className="payment-activity-ref-copy">
        <span className="payment-activity-ref-label">{props.label}</span>
        {props.hint ? <span className="payment-activity-ref-hint">{props.hint}</span> : null}
        <code className="payment-activity-ref-value">{props.value}</code>
      </div>
      <button type="button" className="payment-activity-copy-btn" onClick={() => void onCopy()}>
        {copied ? props.copiedLabel : props.copyLabel}
      </button>
    </div>
  );
}

function buildSupportReferenceBlock(row: PaymentCheckoutRow, language: AppLanguage, title: string, amount: string | null): string {
  const lines = [
    "MotivarCare",
    t(language, { es: "Datos de compra", en: "Purchase details", pt: "Dados da compra" }),
    "—".repeat(24),
    `${t(language, { es: "Producto", en: "Product", pt: "Produto" })}: ${title}`,
    `${t(language, { es: "Fecha", en: "Date", pt: "Data" })}: ${formatWhen(row.createdAt, language)}`,
    `${t(language, { es: "Estado", en: "Status", pt: "Status" })}: ${statusLabel(row.status, language)}`
  ];

  if (amount) {
    lines.push(`${t(language, { es: "Monto", en: "Amount", pt: "Valor" })}: ${amount}`);
  }
  if (row.providerPaymentId) {
    lines.push(`${t(language, { es: "Referencia del pago", en: "Payment reference", pt: "Referencia do pagamento" })}: ${row.providerPaymentId}`);
  }
  if (row.fulfillmentPurchaseId) {
    lines.push(`${t(language, { es: "Comprobante MotivarCare", en: "MotivarCare receipt", pt: "Comprovante MotivarCare" })}: ${row.fulfillmentPurchaseId}`);
  }
  if (row.providerOrderId) {
    lines.push(`${t(language, { es: "Referencia de la operación", en: "Transaction reference", pt: "Referencia da operacao" })}: ${row.providerOrderId}`);
  }

  return lines.join("\n");
}

function PaymentActivityDetail(props: {
  row: PaymentCheckoutRow;
  title: string;
  amount: string | null;
  language: AppLanguage;
}) {
  const { row, title, amount, language } = props;
  const [copiedAll, setCopiedAll] = useState(false);

  const referenceFields = [
    row.fulfillmentPurchaseId
      ? {
          label: t(language, { es: "Comprobante MotivarCare", en: "MotivarCare receipt", pt: "Comprovante MotivarCare" }),
          hint: t(language, {
            es: "Referencia principal para consultas con nuestro equipo.",
            en: "Main reference when contacting our support team.",
            pt: "Referencia principal para consultas com nossa equipe."
          }),
          value: row.fulfillmentPurchaseId
        }
      : null,
    row.providerPaymentId
      ? {
          label: t(language, { es: "Referencia del pago", en: "Payment reference", pt: "Referencia do pagamento" }),
          hint: t(language, {
            es: "Puede aparecer en tu extracto bancario o comprobante del medio de pago.",
            en: "May appear on your bank statement or payment receipt.",
            pt: "Pode aparecer no extrato bancario ou comprovante do pagamento."
          }),
          value: row.providerPaymentId
        }
      : null,
    row.providerOrderId
      ? {
          label: t(language, { es: "Referencia de la operación", en: "Transaction reference", pt: "Referencia da operacao" }),
          hint: t(language, {
            es: "Código interno de seguimiento de esta compra.",
            en: "Internal tracking code for this purchase.",
            pt: "Codigo interno de acompanhamento desta compra."
          }),
          value: row.providerOrderId
        }
      : null
  ].filter((field): field is { label: string; hint: string; value: string } => field !== null);

  const copyAllLabel = t(language, { es: "Copiar todo", en: "Copy all", pt: "Copiar tudo" });
  const copiedAllLabel = t(language, { es: "Copiado", en: "Copied", pt: "Copiado" });
  const copyLabel = t(language, { es: "Copiar", en: "Copy", pt: "Copiar" });
  const copiedLabel = t(language, { es: "Copiado", en: "Copied", pt: "Copiado" });

  const onCopyAll = async () => {
    const ok = await copyText(buildSupportReferenceBlock(row, language, title, amount));
    if (!ok) {
      return;
    }
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="payment-activity-detail">
      {row.lastError ? <p className="payment-activity-error">{row.lastError}</p> : null}

      {referenceFields.length > 0 ? (
        <div className="payment-activity-refs">
          <div className="payment-activity-refs-head">
            <div>
              <p className="payment-activity-refs-kicker">
                {t(language, { es: "Para soporte", en: "For support", pt: "Para suporte" })}
              </p>
              <p className="payment-activity-refs-lead">
                {t(language, {
                  es: "Si necesitás ayuda con esta compra, copiá estas referencias y compartilas con soporte.",
                  en: "If you need help with this purchase, copy these references and share them with support.",
                  pt: "Se precisar de ajuda com esta compra, copie estas referencias e compartilhe com o suporte."
                })}
              </p>
            </div>
            <button type="button" className="payment-activity-copy-all-btn" onClick={() => void onCopyAll()}>
              {copiedAll ? copiedAllLabel : copyAllLabel}
            </button>
          </div>
          <div className="payment-activity-ref-list">
            {referenceFields.map((field) => (
              <PaymentActivityCopyField
                key={field.label}
                label={field.label}
                hint={field.hint}
                value={field.value}
                copyLabel={copyLabel}
                copiedLabel={copiedLabel}
              />
            ))}
          </div>
        </div>
      ) : null}

      {row.events.length > 0 ? (
        <div className="payment-activity-timeline-wrap">
          <p className="payment-activity-timeline-title">
            {t(language, { es: "Seguimiento", en: "Timeline", pt: "Acompanhamento" })}
          </p>
          <ol className="payment-activity-timeline">
            {row.events.map((event, index) => (
              <li key={event.id} className={index === 0 ? "is-latest" : undefined}>
                <span className="payment-activity-timeline-dot" aria-hidden="true" />
                <div className="payment-activity-timeline-body">
                  <time dateTime={event.createdAt}>{formatWhen(event.createdAt, language)}</time>
                  <span>{eventLabel(event, language)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

export function PaymentActivityPanel(props: { language: AppLanguage; authToken: string | null }) {
  const [rows, setRows] = useState<PaymentCheckoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!props.authToken) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<{ checkouts: PaymentCheckoutRow[] }>(
        "/api/profiles/me/payment-checkouts",
        {},
        props.authToken
      );
      setRows(response.checkouts ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load payment activity");
    } finally {
      setLoading(false);
    }
  }, [props.authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!props.authToken) {
    return null;
  }

  return (
    <section className="payment-activity-panel content-card stack">
      <div className="payment-activity-head">
        <h3 className="payment-activity-title">
          {t(props.language, {
            es: "Actividad de compras",
            en: "Purchase activity",
            pt: "Atividade de compras"
          })}
        </h3>
        <button type="button" className="ghost" onClick={() => void load()} disabled={loading}>
          {t(props.language, { es: "Actualizar", en: "Refresh", pt: "Atualizar" })}
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <p className="muted">
          {t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}
        </p>
      ) : null}
      {error ? <p className="danger">{error}</p> : null}
      {!loading && rows.length === 0 && !error ? (
        <p className="muted">
          {t(props.language, {
            es: "Todavía no hay compras registradas.",
            en: "No purchases recorded yet.",
            pt: "Ainda nao ha compras registradas."
          })}
        </p>
      ) : null}

      <ul className="payment-activity-list">
        {rows.map((row) => {
          const expanded = expandedId === row.id;
          const title =
            row.displayName?.trim()
            || (row.sessionCount
              ? t(props.language, {
                  es: `${row.sessionCount} sesión${row.sessionCount === 1 ? "" : "es"}`,
                  en: `${row.sessionCount} session${row.sessionCount === 1 ? "" : "s"}`,
                  pt: `${row.sessionCount} sessao${row.sessionCount === 1 ? "" : "es"}`
                })
              : kindLabel(row.kind, props.language));
          const amount =
            row.chargeAmountMajor != null && row.chargeCurrency
              ? `${row.chargeCurrency} ${row.chargeAmountMajor.toLocaleString()}`
              : null;

          return (
            <li key={row.id} className={`payment-activity-item status-${row.status.toLowerCase()}`}>
              <button
                type="button"
                className="payment-activity-item-trigger"
                onClick={() => setExpandedId(expanded ? null : row.id)}
                aria-expanded={expanded}
              >
                <div className="payment-activity-item-main">
                  <strong>{title}</strong>
                  <span className="payment-activity-meta">
                    {kindLabel(row.kind, props.language)} · {formatWhen(row.createdAt, props.language)}
                  </span>
                </div>
                <div className="payment-activity-item-side">
                  {amount ? <span className="payment-activity-amount">{amount}</span> : null}
                  <span className={`payment-activity-status status-${row.status.toLowerCase()}`}>
                    {statusLabel(row.status, props.language)}
                  </span>
                </div>
              </button>
              {expanded ? (
                <PaymentActivityDetail row={row} title={title} amount={amount} language={props.language} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
