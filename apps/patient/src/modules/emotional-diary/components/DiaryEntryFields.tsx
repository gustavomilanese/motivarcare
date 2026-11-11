import type { ReactNode } from "react";
import { type AppLanguage } from "@therapy/i18n-config";
import { EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH } from "@therapy/types";
import {
  IconChat,
  IconClip,
  IconCorazon,
  IconDiario,
  IconEscudo,
  IconReloj,
  IconRespira
} from "../../home/calm/calmIcons";
import { t } from "../lib/labels";
import { FEELING_CHIPS, NEED_OPTIONS, feelingChipLabel, type DiaryNeedIcon } from "../lib/moods";

function NeedIcon(props: { name: DiaryNeedIcon }) {
  if (props.name === "reloj") return <IconReloj size={22} />;
  if (props.name === "chat") return <IconChat size={22} />;
  if (props.name === "respira") return <IconRespira size={22} />;
  if (props.name === "escudo") return <IconEscudo size={22} />;
  return <IconClip size={22} />;
}

type DiaryEntrySurface = "white" | "menta" | "lima";

function FieldCard(props: {
  icon: ReactNode;
  title: string;
  help?: string;
  surface?: DiaryEntrySurface;
  children: ReactNode;
}) {
  const surfaceClass =
    props.surface === "menta"
      ? " diary-entry-card--menta"
      : props.surface === "lima"
        ? " diary-entry-card--lima"
        : "";
  return (
    <article className={`diary-entry-card${surfaceClass}`}>
      <h2>
        <span className="diary-entry-field-ico" aria-hidden="true">
          {props.icon}
        </span>
        {props.title}
      </h2>
      {props.help ? <p className="diary-entry-help">{props.help}</p> : null}
      {props.children}
    </article>
  );
}

export function DiaryEntryWhatHappened(props: {
  language: AppLanguage;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldCard
      icon={<IconChat size={20} />}
      title={t(props.language, { es: "¿Qué pasó hoy?", en: "What happened today?", pt: "O que aconteceu hoje?" })}
      help={t(props.language, {
        es: "Contá con tus palabras lo que viviste hoy. No hace falta que sea perfecto.",
        en: "Describe what you lived today in your own words. It doesn't need to be perfect.",
        pt: "Conte com suas palavras o que viveu hoje. Não precisa ser perfeito."
      })}
    >
      <textarea
        className="diary-entry-textarea"
        maxLength={EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH}
        rows={6}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={t(props.language, {
          es: "Contá con tus palabras lo que viviste hoy…",
          en: "Describe what you lived today…",
          pt: "Conte o que viveu hoje…"
        })}
      />
      <p className="diary-entry-count">
        {props.value.length} / {EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH}
      </p>
    </FieldCard>
  );
}

export function DiaryEntryFeelings(props: {
  language: AppLanguage;
  feelings: string[];
  onToggle: (chip: string) => void;
}) {
  return (
    <FieldCard
      surface="lima"
      icon={<IconCorazon size={20} />}
      title={t(props.language, { es: "¿Qué sentiste?", en: "What did you feel?", pt: "O que sentiu?" })}
    >
      <div className="diary-entry-chips">
        {FEELING_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`diary-entry-chip${props.feelings.includes(chip.id) ? " is-active" : ""}`}
            onClick={() => props.onToggle(chip.id)}
          >
            {feelingChipLabel(props.language, chip.id)}
          </button>
        ))}
      </div>
    </FieldCard>
  );
}

export function DiaryEntryThought(props: {
  language: AppLanguage;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldCard
      icon={<IconDiario size={20} />}
      title={t(props.language, {
        es: "¿Qué pensamiento te quedó dando vueltas?",
        en: "What thought kept spinning?",
        pt: "Que pensamento ficou repetindo?"
      })}
      help={t(props.language, {
        es: "Escribí el pensamiento en el recuadro de abajo. Se guarda cuando tocás «Guardar entrada» al final de la página.",
        en: "Type your thought in the box below. It is saved when you tap «Save entry» at the bottom of the page.",
        pt: "Escreva o pensamento na caixa abaixo. Salva quando tocar em «Salvar entrada» no final da página."
      })}
    >
      <textarea
        className="diary-entry-textarea"
        maxLength={800}
        rows={4}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={t(props.language, {
          es: "Ej: '¿Y si no soy suficiente?'",
          en: "E.g. 'What if I'm not enough?'",
          pt: "Ex.: 'E se eu não for suficiente?'"
        })}
      />
      <p className="diary-entry-count">{props.value.length} / 800</p>
    </FieldCard>
  );
}

export function DiaryEntryNeeds(props: {
  language: AppLanguage;
  needs: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <FieldCard
      icon={<IconRespira size={20} />}
      title={t(props.language, { es: "¿Qué necesitás ahora?", en: "What do you need now?", pt: "O que você precisa agora?" })}
    >
      <div className="diary-entry-needs">
        {NEED_OPTIONS.map((need) => (
          <button
            key={need.id}
            type="button"
            className={`diary-entry-need${props.needs.includes(need.id) ? " is-active" : ""}`}
            onClick={() => props.onToggle(need.id)}
          >
            <span aria-hidden="true">
              <NeedIcon name={need.icon} />
            </span>
            {t(props.language, { es: need.labelEs, en: need.labelEn, pt: need.labelPt })}
          </button>
        ))}
      </div>
    </FieldCard>
  );
}

export function DiaryEntryVisibility(props: {
  language: AppLanguage;
  value: "private" | "for_psychologist";
  onChange: (value: "private" | "for_psychologist") => void;
}) {
  return (
    <article className="diary-entry-card diary-entry-card--menta">
      <h2>
        {t(props.language, {
          es: "¿Quién puede ver esta entrada?",
          en: "Who can see this entry?",
          pt: "Quem pode ver esta entrada?"
        })}
      </h2>
      <fieldset className="diary-entry-visibility">
        <legend className="sr-only">
          {t(props.language, {
            es: "Visibilidad de la entrada",
            en: "Entry visibility",
            pt: "Visibilidade da entrada"
          })}
        </legend>
        <label className={`diary-entry-visibility-option${props.value === "private" ? " is-active" : ""}`}>
          <input
            type="radio"
            name="diary-entry-visibility"
            checked={props.value === "private"}
            onChange={() => props.onChange("private")}
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
        <label className={`diary-entry-visibility-option${props.value === "for_psychologist" ? " is-active" : ""}`}>
          <input
            type="radio"
            name="diary-entry-visibility"
            checked={props.value === "for_psychologist"}
            onChange={() => props.onChange("for_psychologist")}
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
      </fieldset>
    </article>
  );
}

export function DiaryEntryActions(props: {
  language: AppLanguage;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="diary-entry-actions">
      <button type="button" className="diary-entry-cancel" disabled={props.saving} onClick={props.onCancel}>
        {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
      </button>
      <button type="button" className="diary-entry-save" disabled={props.saving} onClick={props.onSave}>
        {t(props.language, { es: "Guardar entrada", en: "Save entry", pt: "Salvar entrada" })}
      </button>
    </div>
  );
}
