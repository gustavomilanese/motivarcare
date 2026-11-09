import type { SyntheticEvent } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Message, Professional } from "../../app/types";
import { IconChat } from "./calmIcons";
import { isSameZonedDay } from "./calmHomeFormat";
import { useProfessionalThreadPreview } from "./useProfessionalThreadPreview";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function ymd(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function dayBefore(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function wroteLabel(createdAt: string, now: Date, timeZone: string, language: AppLanguage): string {
  const created = new Date(createdAt);
  const today = ymd(now, timeZone);
  const written = ymd(created, timeZone);
  if (written === today || isSameZonedDay(created, now, timeZone)) {
    return t(language, { es: "Te escribió hoy", en: "They wrote today", pt: "Escreveu hoje" });
  }
  if (written === dayBefore(today)) {
    return t(language, { es: "Te escribió ayer", en: "They wrote yesterday", pt: "Escreveu ontem" });
  }
  const locale = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR";
  let when = written;
  try {
    when = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone }).format(created);
  } catch {
    when = written;
  }
  return t(language, {
    es: `Te escribió el ${when}`,
    en: `They wrote on ${when}`,
    pt: `Escreveu em ${when}`
  });
}

function ratingLabel(rating: number, language: AppLanguage): string {
  const locale = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR";
  return rating.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Columna derecha del inicio con sesión: ficha de app-usuario/index.html, estado 5. */
export function CalmSideProfessional(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  professional: Professional;
  photoUrl: string | null;
  messages: Message[];
  authToken: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onChat: () => void;
  onProfile: () => void;
}) {
  const remote = useProfessionalThreadPreview(props.authToken, props.professional.id);
  const source = remote.messages ?? props.messages;
  const latest = [...source]
    .filter((message) => message.professionalId === props.professional.id && message.sender === "professional")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .at(-1);
  const name = professionalAccessibleName(props.professional);
  const rating = props.professional.rating > 0 ? ratingLabel(props.professional.rating, props.language) : "";

  return (
    <article className="calm-card calm-side-pro">
      <div className="calm-side-pro-row">
        <img
          src={professionalPhotoSrc(props.photoUrl)}
          alt=""
          width={60}
          height={60}
          onError={props.onImageFallback}
        />
        <div>
          <span>{t(props.language, { es: "Tu profesional", en: "Your professional", pt: "Seu profissional" })}</span>
          <strong>{name}</strong>
          {rating ? (
            <p>
              <em>★</em> {rating}
            </p>
          ) : null}
        </div>
      </div>
      {latest ? (
        <p className="calm-side-pro-note">
          <i>i</i>
          <span>
            {wroteLabel(latest.createdAt, props.now, props.timeZone, props.language)}: <b>“{latest.text}”</b>
          </span>
        </p>
      ) : null}
      <div className="calm-side-pro-actions">
        <button type="button" className="calm-btn calm-btn--outline" onClick={props.onChat}>
          <IconChat size={18} />
          {t(props.language, { es: "Escribile", en: "Write", pt: "Escreva" })}
        </button>
        <button type="button" className="calm-text-link" onClick={props.onProfile}>
          {t(props.language, { es: "Ver perfil", en: "View profile", pt: "Ver perfil" })}
        </button>
      </div>
    </article>
  );
}
