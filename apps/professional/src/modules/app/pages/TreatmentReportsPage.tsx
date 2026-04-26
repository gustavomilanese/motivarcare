import { useCallback, useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { PatientAvatarImage } from "../components/PatientAvatarImage";
import { resolveApiAssetUrl } from "../services/api";
import {
  fetchTreatmentReportDetail,
  fetchTreatmentReportsList,
  type TreatmentReportDetail,
  type TreatmentReportListItem
} from "../../treatment-reports/services/treatmentReportsApi";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

interface TreatmentReportsPageProps {
  token: string;
  language: AppLanguage;
}

/**
 * Pestaña "Reportes" del profesional (PR-T4).
 *
 * UX:
 * 1. Carga la lista de pacientes con consent activo.
 * 2. Click en un paciente abre el panel de detalle con el resumen IA.
 *    - "Última semana" prioritario (si hay actividad) — se renderiza arriba.
 *    - "Histórico" debajo.
 * 3. Banderitas de safety se muestran con estilo destacado, para que el
 *    profesional pueda priorizar pacientes con señales recientes.
 */
export function TreatmentReportsPage(props: TreatmentReportsPageProps) {
  const { token, language } = props;
  const [items, setItems] = useState<TreatmentReportListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TreatmentReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListError(null);
    try {
      const result = await fetchTreatmentReportsList(token);
      setItems(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No pudimos cargar los reportes.";
      setListError(msg);
      setItems([]);
    }
  }, [token]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  /**
   * Lazy load del detalle: lo pedimos cuando el profesional hace click en una card.
   * No mantenemos cache cliente-side porque el TTL del backend ya evita regenerar.
   */
  useEffect(() => {
    if (!selectedPatientId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    fetchTreatmentReportDetail(selectedPatientId, token)
      .then((response) => {
        setDetail(response);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "No pudimos cargar el resumen.";
        setDetailError(msg);
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [selectedPatientId, token]);

  const sortedItems = useMemo(() => {
    if (!items) return null;
    /**
     * Ordenamos: con safety flag primero, luego por actividad reciente.
     * Esa es justo la pista de "qué paciente mirar antes" que pidió el producto.
     */
    return [...items].sort((a, b) => {
      if (a.safetyFlagged !== b.safetyFlagged) return a.safetyFlagged ? -1 : 1;
      const aTime = a.lastUserMessageAt ? new Date(a.lastUserMessageAt).getTime() : 0;
      const bTime = b.lastUserMessageAt ? new Date(b.lastUserMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [items]);

  return (
    <section className="pro-card pro-treatment-reports-card">
      <header className="pro-treatment-reports-header">
        <h2>
          {t(language, { es: "Reportes", en: "Reports", pt: "Relatórios" })}
        </h2>
        <p className="pro-treatment-reports-subtitle">
          {t(language, {
            es: "Resumen del acompañamiento entre sesiones del paciente con el asistente Maca. Solo aparecen pacientes que dieron su consentimiento.",
            en: "Summary of the patient's between-session companion chat with Maca. Only patients who consented appear here.",
            pt: "Resumo do acompanhamento entre sessões do paciente com a assistente Maca. Apenas pacientes que consentiram aparecem aqui."
          })}
        </p>
      </header>

      {listError ? <p className="pro-error">{listError}</p> : null}

      {!sortedItems ? (
        <p>{t(language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p>
      ) : null}

      {sortedItems && sortedItems.length === 0 && !listError ? (
        <p className="pro-treatment-reports-empty">
          {t(language, {
            es: "Todavía no hay pacientes que hayan habilitado compartir su chat. Cuando alguno lo haga, vas a verlo acá.",
            en: "No patients have shared their companion chat yet. As soon as one opts in, you'll see them here.",
            pt: "Nenhum paciente compartilhou seu chat ainda. Assim que alguém optar, ele aparecerá aqui."
          })}
        </p>
      ) : null}

      {sortedItems && sortedItems.length > 0 ? (
        <ul className="pro-treatment-reports-list">
          {sortedItems.map((item) => {
            const avatar = resolveApiAssetUrl(item.patientAvatarUrl);
            const isActive = selectedPatientId === item.patientId;
            return (
              <li
                key={item.patientId}
                className={`pro-treatment-reports-item${isActive ? " pro-treatment-reports-item--active" : ""}${item.safetyFlagged ? " pro-treatment-reports-item--flagged" : ""}`}
              >
                <button
                  type="button"
                  className="pro-treatment-reports-item-button"
                  onClick={() => setSelectedPatientId(item.patientId)}
                >
                  <PatientAvatarImage
                    src={avatar}
                    imgClassName="pro-patient-avatar"
                    emptyClassName="pro-patient-avatar pro-patient-avatar--empty"
                  />
                  <div className="pro-treatment-reports-item-text">
                    <strong>{item.patientName}</strong>
                    <span>
                      {t(language, {
                        es: "Mensajes:",
                        en: "Messages:",
                        pt: "Mensagens:"
                      })}{" "}
                      {item.messageCount}
                      {item.lastUserMessageAt ? (
                        <>
                          {" · "}
                          {t(language, {
                            es: "Última actividad:",
                            en: "Last activity:",
                            pt: "Última atividade:"
                          })}{" "}
                          {formatRelative(item.lastUserMessageAt, language)}
                        </>
                      ) : null}
                    </span>
                    {item.safetyFlagged ? (
                      <span className="pro-treatment-reports-flag">
                        {t(language, {
                          es: "Atención: se detectaron señales que pueden requerir seguimiento.",
                          en: "Attention: signals that may need follow-up were detected.",
                          pt: "Atenção: foram detectados sinais que podem requerer acompanhamento."
                        })}
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selectedPatientId ? (
        <div className="pro-treatment-reports-detail">
          {detailLoading ? (
            <p>{t(language, { es: "Generando resumen...", en: "Generating summary...", pt: "Gerando resumo..." })}</p>
          ) : null}
          {detailError ? <p className="pro-error">{detailError}</p> : null}
          {detail ? <ReportDetailView detail={detail} language={language} /> : null}
        </div>
      ) : null}
    </section>
  );
}

interface ReportDetailViewProps {
  detail: TreatmentReportDetail;
  language: AppLanguage;
}

function ReportDetailView(props: ReportDetailViewProps) {
  const { detail, language } = props;
  const { summary } = detail;

  return (
    <article className="pro-treatment-reports-detail-card">
      <header>
        <h3>
          {t(language, {
            es: "Resumen del acompañamiento",
            en: "Companion chat summary",
            pt: "Resumo do acompanhamento"
          })}
        </h3>
        <p className="pro-treatment-reports-meta">
          {t(language, {
            es: "Generado",
            en: "Generated",
            pt: "Gerado"
          })}{" "}
          {formatRelative(summary.generatedAt, language)}
          {" · "}
          {t(language, { es: "Modelo:", en: "Model:", pt: "Modelo:" })} {summary.model}
        </p>
      </header>

      {summary.weekly ? (
        <section className="pro-treatment-reports-section pro-treatment-reports-section--weekly">
          <h4>
            {t(language, {
              es: "Última semana — prioritario",
              en: "Last week — priority",
              pt: "Última semana — prioritário"
            })}
          </h4>
          <SummaryBlock summary={summary.weekly} language={language} />
        </section>
      ) : (
        <section className="pro-treatment-reports-section">
          <h4>
            {t(language, {
              es: "Última semana",
              en: "Last week",
              pt: "Última semana"
            })}
          </h4>
          <p className="pro-treatment-reports-empty">
            {t(language, {
              es: "Sin actividad reciente del paciente con Maca en los últimos 7 días.",
              en: "No recent activity from the patient with Maca in the last 7 days.",
              pt: "Sem atividade recente do paciente com Maca nos últimos 7 dias."
            })}
          </p>
        </section>
      )}

      <section className="pro-treatment-reports-section">
        <h4>
          {t(language, { es: "General", en: "Overall", pt: "Geral" })}
        </h4>
        <SummaryBlock summary={summary.overall} language={language} />
      </section>

      <p className="pro-treatment-reports-disclaimer">
        {t(language, {
          es: "Este resumen es generado por IA a partir del chat de acompañamiento. No constituye diagnóstico clínico. Tomar como insumo, no como conclusión.",
          en: "This summary is AI-generated from the companion chat. It is not a clinical diagnosis. Use it as input, not as a conclusion.",
          pt: "Este resumo é gerado por IA a partir do chat de acompanhamento. Não constitui diagnóstico clínico. Use como insumo, não como conclusão."
        })}
      </p>
    </article>
  );
}

function SummaryBlock(props: { summary: TreatmentReportDetail["summary"]["overall"]; language: AppLanguage }) {
  const { summary, language } = props;
  return (
    <div className="pro-treatment-reports-summary-block">
      <p>
        <strong>{t(language, { es: "Estado emocional:", en: "Mood:", pt: "Humor:" })}</strong> {summary.moodSummary}
      </p>
      {summary.topics.length > 0 ? (
        <div>
          <strong>{t(language, { es: "Temas:", en: "Topics:", pt: "Temas:" })}</strong>
          <ul>
            {summary.topics.map((topic, idx) => (
              <li key={`${topic}-${idx}`}>{topic}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {summary.signalsToWatch.length > 0 ? (
        <div className="pro-treatment-reports-signals">
          <strong>
            {t(language, {
              es: "A monitorear:",
              en: "Signals to watch:",
              pt: "Sinais a monitorar:"
            })}
          </strong>
          <ul>
            {summary.signalsToWatch.map((signal, idx) => (
              <li key={`${signal}-${idx}`}>{signal}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="pro-treatment-reports-narrative">{summary.narrative}</p>
    </div>
  );
}

/** Formato relativo simple sin dependencias (días/horas). */
function formatRelative(iso: string, language: AppLanguage): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return iso;
  const diffMs = Date.now() - target;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) {
    return t(language, { es: "hace instantes", en: "just now", pt: "agora há pouco" });
  }
  if (diffMin < 60) {
    return t(language, {
      es: `hace ${diffMin} min`,
      en: `${diffMin} min ago`,
      pt: `há ${diffMin} min`
    });
  }
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) {
    return t(language, {
      es: `hace ${diffH} h`,
      en: `${diffH} h ago`,
      pt: `há ${diffH} h`
    });
  }
  const diffD = Math.round(diffH / 24);
  return t(language, {
    es: `hace ${diffD} días`,
    en: `${diffD} days ago`,
    pt: `há ${diffD} dias`
  });
}
