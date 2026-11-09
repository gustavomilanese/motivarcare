import { type FormEvent, type SyntheticEvent, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { calmGivenName } from "./calmHomeFormat";
import { IconEnviar } from "./calmIcons";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Message, Professional } from "../../app/types";
import { formatClock, isSameZonedDay } from "./calmHomeFormat";
import { useProfessionalThreadPreview } from "./useProfessionalThreadPreview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmMessageCard(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  professional: Professional | null;
  photoUrl: string | null;
  messages: Message[];
  authToken: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenChat: (professionalId: string) => void;
  onSend: (professionalId: string, text: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const professional = props.professional;
  const remote = useProfessionalThreadPreview(props.authToken, professional?.id ?? null);
  const source = remote.messages ?? props.messages;
  const thread = professional
    ? source
        .filter((message) => message.professionalId === professional.id)
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];
  const latestFromProfessional = [...thread].reverse().find((message) => message.sender === "professional") ?? null;
  const unread = thread.some((message) => message.sender === "professional" && !message.read);
  const given = professional ? calmGivenName(professional) : "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!professional || !text || sending) return;
    setSending(true);
    setSendError("");
    try {
      await props.onSend(professional.id, text);
      setDraft("");
      void remote.reload();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "");
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="calm-card calm-message">
      <header className="calm-message-head">
        {professional ? (
          <button type="button" className="calm-message-open" onClick={() => props.onOpenChat(professional.id)}>
            <span className="sr-only">
              {t(props.language, { es: "Abrir la conversación", en: "Open the conversation", pt: "Abrir a conversa" })}
            </span>
          </button>
        ) : null}
        {professional ? (
          <img
            src={professionalPhotoSrc(props.photoUrl)}
            alt=""
            width={44}
            height={44}
            onError={props.onImageFallback}
          />
        ) : (
          <span className="calm-message-avatar" aria-hidden="true" />
        )}
        <div>
          <strong>
            {professional
              ? t(props.language, {
                  es: `Mensaje de ${given}`,
                  en: `Message from ${given}`,
                  pt: `Mensagem de ${given}`
                })
              : t(props.language, { es: "Mensajes", en: "Messages", pt: "Mensagens" })}
          </strong>
          {latestFromProfessional ? (
            <span>
              {isSameZonedDay(new Date(latestFromProfessional.createdAt), props.now, props.timeZone)
                ? t(props.language, {
                    es: `Hoy ${formatClock(latestFromProfessional.createdAt, props.timeZone, props.language)}`,
                    en: `Today ${formatClock(latestFromProfessional.createdAt, props.timeZone, props.language)}`,
                    pt: `Hoje ${formatClock(latestFromProfessional.createdAt, props.timeZone, props.language)}`
                  })
                : formatClock(latestFromProfessional.createdAt, props.timeZone, props.language)}
            </span>
          ) : null}
        </div>
        {unread ? <em className="calm-chip calm-chip--new">{t(props.language, { es: "Nuevo", en: "New", pt: "Nova" })}</em> : null}
      </header>
      <p className="calm-message-body">
        {latestFromProfessional
          ? latestFromProfessional.text
          : professional
            ? t(props.language, {
                es: "Cuando te escriba, el mensaje va a aparecer acá.",
                en: "When they write, the message will show up here.",
                pt: "Quando escrever, a mensagem aparece aqui."
              })
            : t(props.language, {
                es: "El mensaje de tu profesional va a vivir en esta tarjeta.",
                en: "Your professional's message will live on this card.",
                pt: "A mensagem do seu profissional fica neste cartão."
              })}
      </p>
      {professional ? (
        <button type="button" className="calm-text-link calm-reply-link" onClick={() => props.onOpenChat(professional.id)}>
          {t(props.language, { es: "Responder", en: "Reply", pt: "Responder" })}
        </button>
      ) : null}
      {professional ? (
        <form className="calm-reply" onSubmit={submit}>
          <label className="sr-only" htmlFor="calm-reply">
            {t(props.language, { es: "Responder", en: "Reply", pt: "Responder" })}
          </label>
          <input
            id="calm-reply"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t(props.language, { es: "Respondele…", en: "Reply…", pt: "Responda…" })}
          />
          <button type="submit" aria-label={t(props.language, { es: "Enviar", en: "Send", pt: "Enviar" })} disabled={!draft.trim() || sending}>
            <IconEnviar size={18} />
          </button>
        </form>
      ) : null}
      {sendError ? <p className="calm-message-error" role="alert">{sendError}</p> : null}
    </article>
  );
}
