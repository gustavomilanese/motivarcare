import { useEffect } from "react";
import { createPortal } from "react-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { entryDetailHeading, entryListDisplayText } from "../lib/entryDisplay";
import { t } from "../lib/labels";
import { moodMeta, NEED_OPTIONS } from "../lib/moods";
import type { DiaryEntry } from "../types";

export interface DiaryEntryDetailModalProps {
  language: AppLanguage;
  entry: DiaryEntry;
  formattedDate: string;
  onClose: () => void;
}

function needLabel(id: string, language: AppLanguage): string {
  const need = NEED_OPTIONS.find((option) => option.id === id);
  if (!need) return id;
  return t(language, { es: need.labelEs, en: need.labelEn, pt: need.labelPt });
}

export function DiaryEntryDetailModal(props: DiaryEntryDetailModalProps) {
  const { entry, language, formattedDate, onClose } = props;
  const mood = moodMeta(entry.mood);
  const heading = entryDetailHeading(entry);
  const body = entryListDisplayText(entry);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="session-modal-backdrop diary-entry-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="session-modal diary-entry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diary-entry-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="diary-entry-modal-head">
          <div>
            <p className="diary-entry-modal-date">{formattedDate}</p>
            <h2 id="diary-entry-modal-title" className="diary-entry-modal-title">
              {heading ??
                t(language, {
                  es: "Detalle de la entrada",
                  en: "Entry detail",
                  pt: "Detalhe da entrada"
                })}
            </h2>
          </div>
          <button type="button" className="diary-entry-modal-close" onClick={onClose}>
            <span className="sr-only">
              {t(language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
            </span>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <span className="diary-mood-pill diary-entry-modal-mood" style={{ backgroundColor: `${mood.tone}22`, color: mood.tone }}>
          {mood.emoji} {t(language, { es: mood.labelEs, en: mood.labelEn, pt: mood.labelPt })}
        </span>

        {entry.shareWithPsychologist ? (
          <p className="diary-entry-modal-badge">
            {t(language, {
              es: "Compartida con tu psicólogo/a",
              en: "Shared with your therapist",
              pt: "Compartilhada com seu psicólogo"
            })}
          </p>
        ) : (
          <p className="diary-entry-modal-badge diary-entry-modal-badge--private">
            {t(language, { es: "Solo en tu diario", en: "Private in your diary", pt: "Só no seu diário" })}
          </p>
        )}

        <div className="diary-entry-modal-body">
          {heading && body ? (
            <section className="diary-entry-modal-section">
              <h3>{t(language, { es: "¿Qué pasó?", en: "What happened?", pt: "O que aconteceu?" })}</h3>
              <p className="diary-entry-modal-text">{body}</p>
            </section>
          ) : body ? (
            <p className="diary-entry-modal-text diary-entry-modal-text--lead">{body}</p>
          ) : heading ? (
            <p className="diary-entry-modal-text diary-entry-modal-text--lead">{heading}</p>
          ) : null}

          {entry.feelings.length > 0 ? (
            <section className="diary-entry-modal-section">
              <h3>{t(language, { es: "Lo que sentiste", en: "What you felt", pt: "O que sentiu" })}</h3>
              <ul className="diary-entry-modal-chips">
                {entry.feelings.map((feeling) => (
                  <li key={feeling}>{feeling}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {entry.recurringThought.trim() ? (
            <section className="diary-entry-modal-section">
              <h3>
                {t(language, {
                  es: "Pensamiento recurrente",
                  en: "Recurring thought",
                  pt: "Pensamento recorrente"
                })}
              </h3>
              <p className="diary-entry-modal-text">{entry.recurringThought.trim()}</p>
            </section>
          ) : null}

          {entry.needsNow.length > 0 ? (
            <section className="diary-entry-modal-section">
              <h3>{t(language, { es: "Qué necesitabas", en: "What you needed", pt: "O que precisava" })}</h3>
              <ul className="diary-entry-modal-chips">
                {entry.needsNow.map((needId) => (
                  <li key={needId}>{needLabel(needId, language)}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <footer className="diary-entry-modal-foot">
          <button type="button" className="diary-btn diary-btn--primary diary-btn--wide" onClick={onClose}>
            {t(language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
