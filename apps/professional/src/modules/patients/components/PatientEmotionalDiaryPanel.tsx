import { useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { EmotionalDiaryEntry } from "@therapy/types";
import { professionalSurfaceMessage } from "../../app/lib/friendlyProfessionalSurfaceMessages";
import { moodMeta } from "./emotionalDiaryMoodMeta";
import {
  fetchPatientEmotionalDiaryEntries,
  fetchPatientEmotionalDiarySummary
} from "../services/emotionalDiaryApi";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatEntryDate(iso: string, language: AppLanguage): string {
  return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export interface PatientEmotionalDiaryPanelProps {
  patientId: string;
  token: string;
  language: AppLanguage;
}

export function PatientEmotionalDiaryPanel(props: PatientEmotionalDiaryPanelProps) {
  const [entries, setEntries] = useState<EmotionalDiaryEntry[] | null>(null);
  const [error, setError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);

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
      setSummaryText(result.summary);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("patient-emotional-diary-summary", props.language, raw));
    } finally {
      setSummaryLoading(false);
    }
  }

  if (entries === null && !error) {
    return (
      <section className="pro-card">
        <p>{t(props.language, { es: "Cargando diario emocional…", en: "Loading emotional diary…", pt: "Carregando diário emocional…" })}</p>
      </section>
    );
  }

  const recent = entries?.slice(0, 5) ?? [];

  return (
    <section className="pro-card pro-patient-emotional-diary-card" aria-labelledby="pro-patient-diary-title">
      <header className="pro-patient-emotional-diary-header">
        <h2 id="pro-patient-diary-title">
          {t(props.language, { es: "Diario emocional", en: "Emotional diary", pt: "Diário emocional" })}
        </h2>
        <p className="pro-muted">
          {t(props.language, {
            es: "Entradas que el paciente compartió para la próxima sesión (publicadas, no privadas).",
            en: "Entries the patient shared for the next session (published, not private).",
            pt: "Entradas que o paciente compartilhou para a próxima sessão (publicadas, não privadas)."
          })}
        </p>
      </header>

      {error ? <p className="pro-error">{error}</p> : null}

      {recent.length === 0 ? (
        <p className="pro-muted">
          {t(props.language, {
            es: "Todavía no hay entradas compartidas.",
            en: "No shared entries yet.",
            pt: "Ainda não há entradas compartilhadas."
          })}
        </p>
      ) : (
        <ul className="pro-patient-diary-list">
          {recent.map((entry) => {
            const mood = moodMeta(entry.mood);
            return (
              <li key={entry.id} className="pro-patient-diary-item">
                <div className="pro-patient-diary-item-head">
                  <strong>{entry.title}</strong>
                  <span>{formatEntryDate(entry.publishedAt ?? entry.createdAt, props.language)}</span>
                </div>
                <p className="pro-patient-diary-preview">{entry.whatHappened}</p>
                <span className="pro-patient-diary-mood">
                  {mood.emoji}{" "}
                  {t(props.language, { es: mood.labelEs, en: mood.labelEn, pt: mood.labelPt })}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="pro-patient-diary-actions">
        <button type="button" className="pro-btn pro-btn--primary" disabled={summaryLoading} onClick={() => void handleLoadSummary()}>
          {summaryLoading
            ? t(props.language, { es: "Generando resumen…", en: "Generating summary…", pt: "Gerando resumo…" })
            : t(props.language, { es: "Ver resumen de sesión", en: "View session summary", pt: "Ver resumo da sessão" })}
        </button>
      </div>

      {summaryText ? <pre className="pro-patient-diary-summary">{summaryText}</pre> : null}
    </section>
  );
}
