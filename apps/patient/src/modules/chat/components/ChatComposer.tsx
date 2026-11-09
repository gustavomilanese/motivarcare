import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { IconClip, IconEnviar } from "../../home/calm/calmIcons";
import type { ChatSharedEntry } from "../chatTimeline";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ChatComposer(props: {
  language: AppLanguage;
  givenName: string;
  enabled: boolean;
  draft: string;
  canSend: boolean;
  shareEntries: ChatSharedEntry[];
  sharedEntryIds: string[];
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onShareEntry: (entry: ChatSharedEntry) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setShareOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [shareOpen]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (props.canSend) props.onSend();
    }
  };

  const placeholder = props.enabled
    ? props.givenName
      ? t(props.language, {
          es: `Escribile a ${props.givenName}…`,
          en: `Write to ${props.givenName}…`,
          pt: `Escreva para ${props.givenName}…`
        })
      : t(props.language, { es: "Escribile…", en: "Write a message…", pt: "Escreva…" })
    : t(props.language, {
        es: "El chat se habilita con un profesional asignado",
        en: "Chat opens once a professional is assigned",
        pt: "O chat abre quando houver um profissional"
      });

  return (
    <footer className="chat-ds-composer">
      {shareOpen ? (
        <div className="chat-ds-share" ref={pickerRef}>
          <p>{t(props.language, { es: "Compartir una entrada del diario", en: "Share a diary entry", pt: "Compartilhar uma entrada do diário" })}</p>
          {props.shareEntries.length === 0 ? (
            <Link to="/diario/nueva">{t(props.language, { es: "Escribir en el diario", en: "Write in the diary", pt: "Escrever no diário" })}</Link>
          ) : (
            <ul>
              {props.shareEntries.map((entry) => {
                const already = props.sharedEntryIds.includes(entry.id);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      disabled={already || !props.enabled}
                      onClick={() => {
                        props.onShareEntry(entry);
                        setShareOpen(false);
                      }}
                    >
                      <b>{entry.title.trim() || t(props.language, { es: "Entrada del diario", en: "Diary entry", pt: "Entrada do diário" })}</b>
                      <span>
                        {already
                          ? t(props.language, { es: "Ya está en el chat", en: "Already in the chat", pt: "Já está no chat" })
                          : t(props.language, { es: "Enviar al chat", en: "Send to the chat", pt: "Enviar ao chat" })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
      <div className="chat-ds-field">
        <textarea
          rows={1}
          value={props.draft}
          placeholder={placeholder}
          disabled={!props.enabled}
          onChange={(event) => props.onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="chat-ds-clip"
          disabled={!props.enabled}
          aria-expanded={shareOpen}
          aria-label={t(props.language, { es: "Compartir del diario", en: "Share from the diary", pt: "Compartilhar do diário" })}
          onClick={() => setShareOpen((open) => !open)}
        >
          <IconClip size={22} />
        </button>
        <button
          type="button"
          className="chat-ds-send"
          disabled={!props.canSend}
          aria-label={t(props.language, { es: "Enviar", en: "Send", pt: "Enviar" })}
          onClick={props.onSend}
        >
          <IconEnviar size={18} />
        </button>
      </div>
      <p className="chat-ds-urgent">
        {t(props.language, {
          es: "Este chat no es para urgencias.",
          en: "This chat is not for emergencies.",
          pt: "Este chat não é para urgências."
        })}
        <a href="/docs/crisis.html" target="_blank" rel="noopener noreferrer">
          {t(props.language, { es: "Líneas de apoyo", en: "Support lines", pt: "Linhas de apoio" })}
        </a>
      </p>
    </footer>
  );
}
