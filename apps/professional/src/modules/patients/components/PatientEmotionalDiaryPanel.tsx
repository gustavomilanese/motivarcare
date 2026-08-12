import { useEffect, useState, type CSSProperties } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { EmotionalDiaryEntry, EmotionalDiarySessionSummary } from "@therapy/types";
import { professionalSurfaceMessage } from "../../app/lib/friendlyProfessionalSurfaceMessages";
import { moodMeta } from "./emotionalDiaryMoodMeta";
import { ProDiarySessionReportView } from "./ProDiarySessionReportView";
import {
  fetchPatientEmotionalDiaryEntries,
  fetchPatientEmotionalDiarySummary
} from "../services/emotionalDiaryApi";
import { ProPageLoader } from "../../app/components/ProPageLoader";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatEntryDate(iso: string, language: AppLanguage): string {
  return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

const NEED_LABELS: Record<string, LocalizedText> = {
  rest: { es: "Descansar", en: "Rest", pt: "Descansar" },
  talk: { es: "Hablarlo", en: "Talk it out", pt: "Conversar" },
  breathe: { es: "Respirar", en: "Breathe", pt: "Respirar" },
  boundaries: { es: "Poner límites", en: "Set boundaries", pt: "Limites" },
  organize: { es: "Ordenar ideas", en: "Organize thoughts", pt: "Organizar ideias" }
};

function needLabel(needId: string, language: AppLanguage): string {
  const labels = NEED_LABELS[needId];
  return labels ? t(language, labels) : needId;
}

export interface PatientEmotionalDiaryPanelProps {
  patientId: string;
  token: string;
  language: AppLanguage;
  /** Si el paciente envió un informe recientemente (dashboard / notificaciones). */
  highlightReport?: boolean;
}

export function PatientEmotionalDiaryPanel(props: PatientEmotionalDiaryPanelProps) {
  const [entries, setEntries] = useState<EmotionalDiaryEntry[] | null>(null);
  const [error, setError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<EmotionalDiarySessionSummary | null>(null);

  useEffect(() => {
    fetchPatientEmotionalDiaryEntries(props.patientId, props.token)
      .then((rows) => {
        setEntries(rows);
        setError("");
      })
      .catch((requestError) => {
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(professionalSurfaceMessage("patient-emotional-diary-load", props.language, raw));
        setEntries([]);
      });
  }, [props.patientId, props.token, props.language]);

  async function handleLoadSummary() {
    setSummaryLoading(true);
    try {
      const result = await fetchPatientEmotionalDiarySummary(props.patientId, props.token);
      setSummary(result);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("patient-emotional-diary-summary", props.language, raw));
    } finally {
      setSummaryLoading(false);
    }
  }

  if (entries === null && !error) {
    return <ProPageLoader language={props.language} layout="inline" />;
  }

  const recent = entries?.slice(0, 5) ?? [];
  const totalShared = entries?.length ?? 0;

  return (
    <section
      className={`pro-card pro-patient-emotional-diary-card${props.highlightReport ? " pro-patient-emotional-diary-card--report" : ""}`}
      aria-labelledby="pro-patient-diary-title"
    >
      <header className="pro-patient-emotional-diary-header">
        <div className="pro-patient-emotional-diary-title-row">
          <div className="pro-patient-emotional-diary-heading">
            <p className="pro-patient-emotional-diary-eyebrow">
              {t(props.language, {
                es: "Preparación de sesión",
                en: "Session prep",
                pt: "Preparação da sessão"
              })}
            </p>
            <h2 id="pro-patient-diary-title">
              {t(props.language, { es: "Diario emocional", en: "Emotional diary", pt: "Diário emocional" })}
            </h2>
          </div>
          <div className="pro-patient-emotional-diary-meta">
            {props.highlightReport ? (
              <span className="pro-diary-report-badge is-unread">
                {t(props.language, { es: "Informe enviado", en: "Report sent", pt: "Relatório enviado" })}
              </span>
            ) : null}
            {totalShared > 0 ? (
              <span className="pro-patient-emotional-diary-count">
                {t(props.language, {
                  es: `${totalShared} compartida${totalShared === 1 ? "" : "s"}`,
                  en: `${totalShared} shared`,
                  pt: `${totalShared} compartilhada${totalShared === 1 ? "" : "s"}`
                })}
              </span>
            ) : null}
          </div>
        </div>
        <p className="pro-patient-emotional-diary-lead">
          {t(props.language, {
            es: "Lo que el paciente eligió compartir para mirar antes del encuentro. No incluye entradas privadas.",
            en: "What the patient chose to share for you to review before the session. Private entries are not included.",
            pt: "O que o paciente escolheu compartilhar para você olhar antes do encontro. Entradas privadas não entram."
          })}
        </p>
      </header>

      {error ? <p className="pro-error">{error}</p> : null}

      {recent.length === 0 ? (
        <div className="pro-patient-diary-empty">
          <strong>
            {t(props.language, {
              es: "Todavía no hay entradas compartidas",
              en: "No shared entries yet",
              pt: "Ainda não há entradas compartilhadas"
            })}
          </strong>
          <p>
            {t(props.language, {
              es: "Cuando el paciente publique y comparta notas del diario, van a aparecer acá.",
              en: "When the patient publishes and shares diary notes, they will show up here.",
              pt: "Quando o paciente publicar e compartilhar notas do diário, elas aparecerão aqui."
            })}
          </p>
        </div>
      ) : (
        <ul className="pro-patient-diary-list">
          {recent.map((entry) => {
            const mood = moodMeta(entry.mood);
            return (
              <li
                key={entry.id}
                className="pro-patient-diary-item"
                style={
                  {
                    "--diary-mood-tone": mood.tone,
                    "--diary-mood-soft": mood.soft
                  } as CSSProperties
                }
              >
                <div className="pro-patient-diary-item-mood" aria-hidden="true">
                  <span>{mood.emoji}</span>
                </div>
                <div className="pro-patient-diary-item-body">
                  <div className="pro-patient-diary-item-head">
                    <strong className="pro-patient-diary-item-title">{entry.title}</strong>
                    <time className="pro-patient-diary-item-date" dateTime={entry.publishedAt ?? entry.createdAt}>
                      {formatEntryDate(entry.publishedAt ?? entry.createdAt, props.language)}
                    </time>
                  </div>
                  {entry.whatHappened ? (
                    <p className="pro-patient-diary-preview">{entry.whatHappened}</p>
                  ) : null}
                  <div className="pro-patient-diary-item-tags">
                    <span className="pro-patient-diary-mood-pill">
                      {t(props.language, { es: mood.labelEs, en: mood.labelEn, pt: mood.labelPt })}
                    </span>
                    {entry.feelings.slice(0, 3).map((feeling) => (
                      <span key={feeling} className="pro-patient-diary-chip">
                        {feeling}
                      </span>
                    ))}
                    {entry.needsNow.slice(0, 2).map((needId) => (
                      <span key={needId} className="pro-patient-diary-chip pro-patient-diary-chip--need">
                        {needLabel(needId, props.language)}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalShared > recent.length ? (
        <p className="pro-patient-diary-more">
          {t(props.language, {
            es: `Mostrando las ${recent.length} más recientes de ${totalShared}. Abrí el informe para ver el panorama completo.`,
            en: `Showing the ${recent.length} most recent of ${totalShared}. Open the report for the full picture.`,
            pt: `Mostrando as ${recent.length} mais recentes de ${totalShared}. Abra o relatório para ver o panorama completo.`
          })}
        </p>
      ) : null}

      <div className="pro-patient-diary-actions">
        <div className="pro-patient-diary-actions-copy">
          <strong>
            {t(props.language, {
              es: "Informe para la sesión",
              en: "Session report",
              pt: "Relatório da sessão"
            })}
          </strong>
          <p>
            {t(props.language, {
              es: "Vista completa y legible de todas las entradas compartidas.",
              en: "Full readable view of every shared entry.",
              pt: "Visão completa e legível de todas as entradas compartilhadas."
            })}
          </p>
        </div>
        <button
          type="button"
          className="pro-btn pro-btn--primary pro-patient-diary-actions-btn"
          disabled={summaryLoading || recent.length === 0}
          onClick={() => void handleLoadSummary()}
        >
          {summaryLoading
            ? t(props.language, { es: "Abriendo informe…", en: "Opening report…", pt: "Abrindo relatório…" })
            : t(props.language, { es: "Ver informe completo", en: "View full report", pt: "Ver relatório completo" })}
        </button>
      </div>

      {summary ? <ProDiarySessionReportView language={props.language} summary={summary} /> : null}
    </section>
  );
}
