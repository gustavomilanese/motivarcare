import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import { adminSurfaceMessage } from "../../app/lib/friendlyAdminSurfaceMessages";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import {
  fetchUnpaidProfessionalDetail,
  payProfessionalUnpaid
} from "../services/financeApi";
import type { UnpaidProfessionalDetailResponse } from "../types/finance.types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatLocalAmount(amount: number, currency: string, language: AppLanguage): string {
  try {
    return new Intl.NumberFormat(language === "pt" ? "pt-BR" : language === "en" ? "en-US" : "es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatSessionDate(value: string | null, language: AppLanguage): string {
  if (!value) {
    return "—";
  }
  return formatDateWithLocale({
    value,
    language,
    options: { month: "short", day: "numeric", year: "numeric" }
  });
}

export function FinanceProfessionalPayoutReview(props: {
  token: string;
  language: AppLanguage;
  professionalId: string;
  professionalName: string;
  /** Meses UTC seleccionados en Pendientes; se respetan al pagar. */
  months?: string[];
  onClose: () => void;
  onPaid: () => void;
}) {
  const [detail, setDetail] = useState<UnpaidProfessionalDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<"" | "ledger" | "dlocal">("");
  const [confirmMethod, setConfirmMethod] = useState<"" | "ledger" | "dlocal">("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchUnpaidProfessionalDetail(
        props.token,
        props.professionalId,
        props.months ?? []
      );
      setDetail(response);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-overview-load", props.language, raw));
    } finally {
      setLoading(false);
    }
  }, [props.language, props.months, props.professionalId, props.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const payoutAmountLabel =
    confirmMethod === "dlocal" && detail?.payout.estimatedLocal
      ? formatLocalAmount(
          detail.payout.estimatedLocal.amount,
          detail.payout.estimatedLocal.currency,
          props.language
        )
      : detail
        ? formatAdminFinanceUsd(detail.totals.pendingProfessionalNetUsdCents, props.language)
        : "";

  const executePay = async (method: "ledger" | "dlocal") => {
    setConfirmMethod("");
    setPaying(method);
    setError("");
    setSuccess("");
    try {
      const result = await payProfessionalUnpaid(props.token, props.professionalId, {
        method,
        payoutReference: reference.trim() || undefined,
        months: props.months
      });
      setSuccess(
        method === "dlocal" && result.dlocalPayoutId
          ? t(props.language, {
              es: `Pago enviado a dLocal (${result.dlocalPayoutId}). Se marcará pagado cuando confirme la entrega.`,
              en: `Payout sent to dLocal (${result.dlocalPayoutId}). It will be marked paid when delivery is confirmed.`,
              pt: `Pagamento enviado ao dLocal (${result.dlocalPayoutId}). Será marcado como pago quando a entrega for confirmada.`
            })
          : t(props.language, {
              es: "Pago registrado correctamente.",
              en: "Payment recorded successfully.",
              pt: "Pagamento registrado com sucesso."
            })
      );
      props.onPaid();
      window.setTimeout(() => props.onClose(), 1400);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("finance-payout-transfer", props.language, raw));
    } finally {
      setPaying("");
    }
  };

  useEffect(() => {
    if (!confirmMethod) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmMethod("");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmMethod]);

  const canDlocal =
    Boolean(detail?.payout.dlocalConfigured) &&
    Boolean(detail?.payout.ready) &&
    detail?.payout.estimatedLocal != null &&
    (detail?.totals.pendingSessionsCount ?? 0) > 0;

  return (
    <>
    <div className="finance-payout-review-backdrop" role="presentation" onClick={props.onClose}>
      <aside
        className="finance-payout-review-drawer"
        role="dialog"
        aria-labelledby="finance-payout-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="finance-payout-review-head">
          <div>
            <p className="finance-payout-review-eyebrow">
              {t(props.language, {
                es: "Revisión de liquidación",
                en: "Payout review",
                pt: "Revisão de liquidação"
              })}
            </p>
            <h2 id="finance-payout-review-title">{props.professionalName}</h2>
            {detail ? <p className="finance-payout-review-sub">{detail.professional.email}</p> : null}
          </div>
          <button type="button" className="finance-payout-review-close" onClick={props.onClose} aria-label="Close">
            ×
          </button>
        </header>

        {loading ? (
          <p className="finance-payout-review-loading">
            {t(props.language, { es: "Cargando detalle…", en: "Loading details…", pt: "Carregando detalhes…" })}
          </p>
        ) : detail ? (
          <div className="finance-payout-review-body">
            <div className="finance-payout-review-metrics">
              <article className="finance-payout-review-metric">
                <span>{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" })}</span>
                <strong>{detail.totals.sessionsCount}</strong>
              </article>
              <article className="finance-payout-review-metric">
                <span>{t(props.language, { es: "Ejecutado", en: "Gross", pt: "Executado" })}</span>
                <strong>{formatAdminFinanceUsd(detail.totals.grossUsdCents, props.language)}</strong>
              </article>
              <article className="finance-payout-review-metric">
                <span>{t(props.language, { es: "Comisión", en: "Platform fee", pt: "Comissão" })}</span>
                <strong>{formatAdminFinanceUsd(detail.totals.platformFeeUsdCents, props.language)}</strong>
              </article>
              <article className="finance-payout-review-metric finance-payout-review-metric--accent">
                <span>{t(props.language, { es: "Neto a pagar", en: "Net to pay", pt: "Líquido" })}</span>
                <strong>{formatAdminFinanceUsd(detail.totals.pendingProfessionalNetUsdCents, props.language)}</strong>
              </article>
            </div>

            <section className="finance-payout-review-card">
              <h3>{t(props.language, { es: "Cuenta de cobro", en: "Payout account", pt: "Conta de recebimento" })}</h3>
              <div className="finance-payout-review-payout-grid">
                <div>
                  <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
                  <strong className={detail.payout.ready ? "ok" : "warn"}>
                    {detail.payout.ready
                      ? t(props.language, { es: "Listo", en: "Ready", pt: "Pronto" })
                      : t(props.language, { es: "Incompleto", en: "Incomplete", pt: "Incompleto" })}
                  </strong>
                </div>
                <div>
                  <span>{t(props.language, { es: "País", en: "Country", pt: "País" })}</span>
                  <strong>{detail.payout.country ?? "—"}</strong>
                </div>
                <div>
                  <span>{t(props.language, { es: "Titular", en: "Beneficiary", pt: "Titular" })}</span>
                  <strong>{detail.payout.beneficiaryName ?? "—"}</strong>
                </div>
                <div>
                  <span>{t(props.language, { es: "Banco", en: "Bank", pt: "Banco" })}</span>
                  <strong>{detail.payout.bankName ?? detail.payout.bankCode ?? "—"}</strong>
                </div>
                <div>
                  <span>{t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}</span>
                  <strong>{detail.payout.accountMasked ?? "—"}</strong>
                </div>
                {detail.payout.estimatedLocal ? (
                  <div className="finance-payout-review-estimate">
                    <span>
                      {t(props.language, {
                        es: "Estimado dLocal",
                        en: "dLocal estimate",
                        pt: "Estimativa dLocal"
                      })}
                    </span>
                    <strong>
                      {formatLocalAmount(
                        detail.payout.estimatedLocal.amount,
                        detail.payout.estimatedLocal.currency,
                        props.language
                      )}
                    </strong>
                    <small>
                      {t(props.language, {
                        es: `TC ref. 1 USD = ${detail.payout.estimatedLocal.ratePerUsd} ${detail.payout.estimatedLocal.currency}`,
                        en: `Ref. FX 1 USD = ${detail.payout.estimatedLocal.ratePerUsd} ${detail.payout.estimatedLocal.currency}`,
                        pt: `Câmbio ref. 1 USD = ${detail.payout.estimatedLocal.ratePerUsd} ${detail.payout.estimatedLocal.currency}`
                      })}
                    </small>
                  </div>
                ) : null}
              </div>
              {!detail.payout.ready && detail.payout.reason ? (
                <p className="finance-payout-review-hint">{detail.payout.reason}</p>
              ) : null}
            </section>

            <section className="finance-payout-review-card">
              <h3>
                {t(props.language, {
                  es: "Sesiones incluidas",
                  en: "Included sessions",
                  pt: "Sessões incluídas"
                })}
              </h3>
              <div className="finance-payout-review-table-wrap">
                <table className="finance-payout-review-table">
                  <thead>
                    <tr>
                      <th>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</th>
                      <th>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</th>
                      <th>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</th>
                      <th>{t(props.language, { es: "Origen", en: "Source", pt: "Origem" })}</th>
                      <th>{t(props.language, { es: "Precio", en: "Price", pt: "Preço" })}</th>
                      <th>{t(props.language, { es: "Comisión", en: "Fee", pt: "Taxa" })}</th>
                      <th>{t(props.language, { es: "Neto", en: "Net", pt: "Líquido" })}</th>
                      <th>{t(props.language, { es: "Acción", en: "Action", pt: "Ação" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.sessions.map((session) => {
                      const isPaid = session.payoutStatus === "paid";
                      const awaitingSubmit = session.payoutStatus === "not_submitted";
                      return (
                      <tr key={session.id}>
                        <td>{formatSessionDate(session.bookingCompletedAt ?? session.bookingStartsAt, props.language)}</td>
                        <td>
                          <span
                            className={`admin-unpaid-status${
                              isPaid
                                ? " admin-unpaid-status--paid"
                                : awaitingSubmit
                                  ? " admin-unpaid-status--waiting"
                                  : " admin-unpaid-status--pending"
                            }`}
                          >
                            {isPaid
                              ? t(props.language, { es: "Pagada", en: "Paid", pt: "Paga" })
                              : awaitingSubmit
                                ? t(props.language, { es: "No enviada", en: "Not sent", pt: "Nao enviada" })
                                : t(props.language, { es: "En cobro", en: "In payout", pt: "Em cobranca" })}
                          </span>
                        </td>
                        <td>
                          <span className="finance-payout-review-patient">{session.patient.fullName}</span>
                        </td>
                        <td>
                          <div className="finance-payout-review-source">
                            <strong>
                              {session.sourceKind === "trial"
                                ? t(props.language, { es: "Prueba", en: "Trial", pt: "Teste" })
                                : t(props.language, { es: "Paquete", en: "Package", pt: "Pacote" })}
                            </strong>
                            <span>{session.sourceLabel}</span>
                            <span className="finance-payout-review-pct">{session.platformCommissionPercent}%</span>
                          </div>
                        </td>
                        <td className="num">
                          {formatAdminFinanceUsd(session.sessionPriceUsdCents, props.language)}
                          {session.currency.toLowerCase() !== "usd" ? (
                            <small className="finance-payout-review-original">
                              ({session.currency.toUpperCase()} {(session.sessionPriceCents / 100).toFixed(2)})
                            </small>
                          ) : null}
                        </td>
                        <td className="num">{formatAdminFinanceUsd(session.platformFeeUsdCents, props.language)}</td>
                        <td className="num">{formatAdminFinanceUsd(session.professionalNetUsdCents, props.language)}</td>
                        <td>
                          <a
                            className="finance-payout-review-session-link"
                            href={`/sessions?patientId=${encodeURIComponent(session.patient.id)}`}
                          >
                            {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" })}
                          </a>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="finance-payout-review-card finance-payout-review-actions-card">
              <label className="finance-payout-review-ref">
                <span>
                  {t(props.language, {
                    es: "Referencia de pago (opcional)",
                    en: "Payment reference (optional)",
                    pt: "Referência de pagamento (opcional)"
                  })}
                </span>
                <input
                  type="text"
                  value={reference}
                  placeholder={t(props.language, {
                    es: "Transferencia, comprobante, ID dLocal…",
                    en: "Transfer, receipt, dLocal ID…",
                    pt: "Transferência, comprovante, ID dLocal…"
                  })}
                  onChange={(event) => setReference(event.target.value)}
                />
              </label>
              <div className="finance-payout-review-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={Boolean(paying) || detail.totals.pendingSessionsCount === 0}
                  onClick={() => setConfirmMethod("ledger")}
                >
                  {paying === "ledger"
                    ? t(props.language, { es: "Registrando…", en: "Recording…", pt: "Registrando…" })
                    : t(props.language, {
                        es: "Registrar pago manual",
                        en: "Record manual payment",
                        pt: "Registrar pagamento manual"
                      })}
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!canDlocal || Boolean(paying)}
                  title={
                    !detail.payout.dlocalConfigured
                      ? t(props.language, {
                          es: "dLocal no configurado en este entorno",
                          en: "dLocal not configured in this environment",
                          pt: "dLocal não configurado neste ambiente"
                        })
                      : !detail.payout.ready
                        ? (detail.payout.reason ?? undefined)
                        : undefined
                  }
                  onClick={() => setConfirmMethod("dlocal")}
                >
                  {paying === "dlocal"
                    ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
                    : t(props.language, {
                        es: "Transferir vía dLocal",
                        en: "Transfer via dLocal",
                        pt: "Transferir via dLocal"
                      })}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {error ? <p className="error-text finance-payout-review-footer-msg">{error}</p> : null}
        {success ? <p className="finance-payout-review-success finance-payout-review-footer-msg">{success}</p> : null}
      </aside>
    </div>
    {confirmMethod
      ? createPortal(
          <div
            className="finance-payout-confirm-backdrop"
            role="presentation"
            onClick={() => setConfirmMethod("")}
          >
            <section
              className="finance-payout-confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="finance-payout-confirm-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="finance-payout-confirm-kicker">
                {confirmMethod === "dlocal"
                  ? t(props.language, { es: "dLocal", en: "dLocal", pt: "dLocal" })
                  : t(props.language, { es: "Pago manual", en: "Manual payment", pt: "Pagamento manual" })}
              </p>
              <h3 id="finance-payout-confirm-title">
                {confirmMethod === "dlocal"
                  ? t(props.language, { es: "¿Transferimos ahora?", en: "Send the transfer now?", pt: "Transferir agora?" })
                  : t(props.language, { es: "¿Registramos el pago?", en: "Record this payment?", pt: "Registrar o pagamento?" })}
              </h3>
              <p className="finance-payout-confirm-name">{props.professionalName}</p>
              <p className="finance-payout-confirm-amount">{payoutAmountLabel}</p>
              <div className="finance-payout-confirm-actions">
                <button type="button" className="secondary" onClick={() => setConfirmMethod("")}>
                  {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                </button>
                <button type="button" className="primary" onClick={() => void executePay(confirmMethod)}>
                  {confirmMethod === "dlocal"
                    ? t(props.language, { es: "Transferir", en: "Transfer", pt: "Transferir" })
                    : t(props.language, { es: "Registrar", en: "Record", pt: "Registrar" })}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )
      : null}
    </>
  );
}
