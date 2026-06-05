import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type AppLanguage } from "@therapy/i18n-config";
import { EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH } from "@therapy/types";
import { DiaryMacaFab, DiaryPortalToolbar, DiarySectionIntro, DiaryShell, useDiaryLeaveConfirm } from "../components/DiaryChrome";
import { t } from "../lib/labels";
import { FEELING_CHIPS, MOOD_OPTIONS, NEED_OPTIONS } from "../lib/moods";
import { createDiaryEntry, fetchDiarySettings } from "../services/emotionalDiaryApi";
import type { MoodLevel } from "../types";

export interface DiaryNewEntryPageProps {
  language: AppLanguage;
  authToken: string;
}

function parseMood(value: string | null): MoodLevel {
  if (value && MOOD_OPTIONS.some((option) => option.id === value)) {
    return value as MoodLevel;
  }
  return "regular";
}

/** Una sola decisión: privado en tu diario o visible para preparar la sesión. */
type DiaryEntryVisibility = "private" | "for_psychologist";

export function DiaryNewEntryPage(props: DiaryNewEntryPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mood, setMood] = useState<MoodLevel>(() => parseMood(searchParams.get("mood")));
  const [whatHappened, setWhatHappened] = useState("");
  const [feelings, setFeelings] = useState<string[]>([]);
  const [recurringThought, setRecurringThought] = useState("");
  const [needsNow, setNeedsNow] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<DiaryEntryVisibility>("for_psychologist");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDiarySettings(props.authToken)
      .then((settings) =>
        setVisibility(settings.shareWithPsychologistDefault ? "for_psychologist" : "private")
      )
      .catch(() => {
        /* default stays for_psychologist */
      });
  }, [props.authToken]);

  useEffect(() => {
    const fromQuery = searchParams.get("mood");
    if (fromQuery) setMood(parseMood(fromQuery));
  }, [searchParams]);

  const moodOption = useMemo(() => MOOD_OPTIONS.find((option) => option.id === mood) ?? MOOD_OPTIONS[2], [mood]);

  const isDirty = useMemo(
    () =>
      whatHappened.trim().length > 0 ||
      recurringThought.trim().length > 0 ||
      feelings.length > 0 ||
      needsNow.length > 0,
    [whatHappened, recurringThought, feelings, needsNow]
  );

  const confirmLeave = useDiaryLeaveConfirm(props.language, isDirty);

  function handleCancel() {
    if (!confirmLeave()) return;
    navigate("/diario");
  }

  function toggleFeeling(chip: string) {
    setFeelings((current) => (current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip]));
  }

  function toggleNeed(id: string) {
    setNeedsNow((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function persist(status: "draft" | "published") {
    setSaving(true);
    setError("");
    try {
      await createDiaryEntry(
        {
          status,
          mood,
          whatHappened,
          feelings,
          recurringThought,
          needsNow,
          isPrivate: visibility === "private",
          shareWithPsychologist: visibility === "for_psychologist"
        },
        props.authToken
      );
      navigate(status === "draft" ? "/diario" : "/diario/registros");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos guardar la entrada");
      setSaving(false);
    }
  }

  return (
    <DiaryShell language={props.language} className="diary-page--entry">
      <DiaryPortalToolbar language={props.language} isDirty={isDirty} showLeaveActions />
      <DiarySectionIntro
        language={props.language}
        title={t(props.language, {
          es: "Contale a tu Diario cómo te sentís hoy",
          en: "Tell your Diary how you feel today",
          pt: "Conte ao seu Diário como você se sente hoje"
        })}
        showSubNav={false}
      />

      {error ? <p className="diary-error">{error}</p> : null}

      <div className="diary-entry-layout diary-entry-layout--single">
        <div className="diary-entry-main">
          <article className="diary-card">
            <h3 className="diary-field-title">
              {t(props.language, { es: "Hoy me siento:", en: "Today I feel:", pt: "Hoje me sinto:" })}
            </h3>
            <div className="diary-mood-row diary-mood-row--compact">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`diary-mood-btn ${mood === option.id ? "diary-mood-btn--active" : ""}`}
                  style={{ "--diary-mood-tone": option.tone } as CSSProperties}
                  onClick={() => setMood(option.id)}
                  aria-pressed={mood === option.id}
                >
                  <span className="diary-mood-btn-emoji" aria-hidden="true">{option.emoji}</span>
                  <span className="diary-mood-btn-label">
                    {t(props.language, { es: option.labelEs, en: option.labelEn, pt: option.labelPt })}
                  </span>
                </button>
              ))}
            </div>
            <p className="diary-selected-mood">
              {moodOption.emoji}{" "}
              {t(props.language, { es: moodOption.labelEs, en: moodOption.labelEn, pt: moodOption.labelPt })}
            </p>
          </article>

          <article className="diary-card">
            <h3 className="diary-field-title">💬 {t(props.language, { es: "¿Qué pasó hoy?", en: "What happened today?", pt: "O que aconteceu hoje?" })}</h3>
            <p className="diary-field-help">
              {t(props.language, {
                es: "Contá con tus palabras lo que viviste hoy. No hace falta que sea perfecto.",
                en: "Describe what you lived today in your own words. It doesn't need to be perfect.",
                pt: "Conte com suas palavras o que viveu hoje. Não precisa ser perfeito."
              })}
            </p>
            <textarea
              className="diary-textarea"
              maxLength={EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH}
              rows={6}
              value={whatHappened}
              onChange={(event) => setWhatHappened(event.target.value)}
              placeholder={t(props.language, {
                es: "Contá con tus palabras lo que viviste hoy…",
                en: "Describe what you lived today…",
                pt: "Conte o que viveu hoje…"
              })}
            />
            <p className="diary-char-count">
              {whatHappened.length} / {EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH}
            </p>
          </article>

          <article className="diary-card">
            <h3 className="diary-field-title">💜 {t(props.language, { es: "¿Qué sentiste?", en: "What did you feel?", pt: "O que sentiu?" })}</h3>
            <div className="diary-chip-row">
              {FEELING_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`diary-chip ${feelings.includes(chip) ? "diary-chip--active" : ""}`}
                  onClick={() => toggleFeeling(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </article>

          <article className="diary-card">
            <h3 className="diary-field-title">
              💭 {t(props.language, { es: "¿Qué pensamiento te quedó dando vueltas?", en: "What thought kept spinning?", pt: "Que pensamento ficou repetindo?" })}
            </h3>
            <p className="diary-field-help">
              {t(props.language, {
                es: "Escribí el pensamiento en el recuadro de abajo. Se guarda cuando tocás «Guardar entrada» al final de la página.",
                en: "Type your thought in the box below. It is saved when you tap «Save entry» at the bottom of the page.",
                pt: "Escreva o pensamento na caixa abaixo. Salva quando tocar em «Salvar entrada» no final da página."
              })}
            </p>
            <textarea
              className="diary-textarea"
              maxLength={800}
              rows={4}
              value={recurringThought}
              onChange={(event) => setRecurringThought(event.target.value)}
              placeholder={t(props.language, {
                es: "Ej: '¿Y si no soy suficiente?'",
                en: "E.g. 'What if I'm not enough?'",
                pt: "Ex.: 'E se eu não for suficiente?'"
              })}
            />
            <p className="diary-char-count">{recurringThought.length} / 800</p>
          </article>

          <article className="diary-card">
            <h3 className="diary-field-title">
              🤝 {t(props.language, { es: "¿Qué necesitás ahora?", en: "What do you need now?", pt: "O que você precisa agora?" })}
            </h3>
            <div className="diary-need-grid">
              {NEED_OPTIONS.map((need) => (
                <button
                  key={need.id}
                  type="button"
                  className={`diary-need-btn ${needsNow.includes(need.id) ? "diary-need-btn--active" : ""}`}
                  onClick={() => toggleNeed(need.id)}
                >
                  <span className="diary-need-btn-icon" aria-hidden="true">
                    {need.icon}
                  </span>
                  <span className="diary-need-btn-label">
                    {t(props.language, { es: need.labelEs, en: need.labelEn, pt: need.labelPt })}
                  </span>
                </button>
              ))}
            </div>
          </article>

          <article className="diary-card diary-card--entry-options">
            <h3 className="diary-field-title">
              {t(props.language, {
                es: "¿Quién puede ver esta entrada?",
                en: "Who can see this entry?",
                pt: "Quem pode ver esta entrada?"
              })}
            </h3>
            <fieldset className="diary-visibility-fieldset">
              <legend className="sr-only">
                {t(props.language, {
                  es: "Visibilidad de la entrada",
                  en: "Entry visibility",
                  pt: "Visibilidade da entrada"
                })}
              </legend>
              <div className="diary-visibility-options">
                <label
                  className={`diary-visibility-option${visibility === "private" ? " diary-visibility-option--active" : ""}`}
                >
                  <input
                    type="radio"
                    name="diary-entry-visibility"
                    className="diary-visibility-input"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                  />
                  <strong>{t(props.language, { es: "Solo yo", en: "Only me", pt: "Só eu" })}</strong>
                  <small>
                    {t(props.language, {
                      es: "Queda en tu diario. Tu psicólogo/a no la ve para preparar la sesión.",
                      en: "Stays in your diary. Your therapist will not see it when preparing for a session.",
                      pt: "Fica no seu diário. Seu psicólogo não verá ao preparar a sessão."
                    })}
                  </small>
                </label>
                <label
                  className={`diary-visibility-option${visibility === "for_psychologist" ? " diary-visibility-option--active" : ""}`}
                >
                  <input
                    type="radio"
                    name="diary-entry-visibility"
                    className="diary-visibility-input"
                    checked={visibility === "for_psychologist"}
                    onChange={() => setVisibility("for_psychologist")}
                  />
                  <strong>
                    {t(props.language, {
                      es: "Para mi psicólogo/a",
                      en: "For my therapist",
                      pt: "Para meu psicólogo"
                    })}
                  </strong>
                  <small>
                    {t(props.language, {
                      es: "La verá al preparar tu próxima sesión.",
                      en: "They will see it when preparing for your next session.",
                      pt: "Verá ao preparar sua próxima sessão."
                    })}
                  </small>
                </label>
              </div>
            </fieldset>
          </article>

          <div className="diary-entry-actions diary-entry-actions--footer">
            <button type="button" className="diary-btn diary-btn--ghost" disabled={saving} onClick={handleCancel}>
              {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
            </button>
            <button type="button" className="diary-btn diary-btn--primary" disabled={saving} onClick={() => void persist("published")}>
              ✓ {t(props.language, { es: "Guardar entrada", en: "Save entry", pt: "Salvar entrada" })}
            </button>
          </div>
        </div>
      </div>

      <DiaryMacaFab language={props.language} />
    </DiaryShell>
  );
}
