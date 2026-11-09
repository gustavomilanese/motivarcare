import { Link } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import type { EmotionalDiarySessionSummary } from "@therapy/types";
import { IconDiario, IconFlecha } from "../../home/calm/calmIcons";
import { DiarySessionReportView } from "./DiarySessionReportView";
import { t } from "../lib/labels";

export function DiaryRecordsSession(props: {
  language: AppLanguage;
  summary: EmotionalDiarySessionSummary | null;
  summaryLoading: boolean;
  sendLoading: boolean;
  sentNotice: string | null;
  onPreview: () => void;
  onSend: () => void;
}) {
  const busy = props.summaryLoading || props.sendLoading;

  return (
    <section className="diary-records-side-card diary-records-session" aria-labelledby="diary-records-session-title">
      <span className="diary-side-mancha" aria-hidden="true">
        <svg className="diary-side-mancha-blob" viewBox="0 0 100 100">
          <path d="M82 64c-6 18-26 28-44 24S8 68 10 48 28 12 50 12s38 34 32 52z" fill="#2F6B51" opacity="0.85" />
        </svg>
        <IconDiario size={22} />
      </span>
      <p className="diary-calm-kicker">
        {t(props.language, { es: "Antes de tu sesión", en: "Before your session", pt: "Antes da sua sessão" })}
      </p>
      <h2 id="diary-records-session-title">
        {t(props.language, { es: "Prepará tu próxima sesión", en: "Prepare for your next session", pt: "Prepare sua próxima sessão" })}
      </h2>
      <p>
        {t(props.language, {
          es: "Armá el informe con las entradas que compartiste, revisalo y envialo a tu psicólogo/a. Así queda claro que lo recibió.",
          en: "Build the report from the entries you shared, review it, and send it to your therapist so it’s clear they received it.",
          pt: "Monte o relatório com as entradas que compartilhou, revise e envie ao seu psicólogo. Assim fica claro que ele recebeu."
        })}
      </p>
      <div className="diary-records-session-actions">
        <button type="button" className="diary-records-preview" disabled={busy} onClick={props.onPreview}>
          {props.summaryLoading
            ? t(props.language, { es: "Armando informe…", en: "Building report…", pt: "Montando relatório…" })
            : t(props.language, { es: "Vista previa del informe", en: "Preview report", pt: "Pré-visualizar relatório" })}
        </button>
        <button type="button" className="diary-records-send" disabled={busy} onClick={props.onSend}>
          {props.sendLoading
            ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
            : t(props.language, { es: "Enviar al psicólogo/a", en: "Send to my therapist", pt: "Enviar ao psicólogo" })}
        </button>
      </div>
      {props.sentNotice ? <p className="diary-records-sent" role="status">{props.sentNotice}</p> : null}
      {props.summary ? <DiarySessionReportView language={props.language} summary={props.summary} /> : null}
      <Link className="diary-records-sessions" to="/sessions">
        {t(props.language, { es: "Ver turnos y sesiones", en: "View appointments and sessions", pt: "Ver consultas e sessões" })}
        <IconFlecha size={16} />
      </Link>
    </section>
  );
}
