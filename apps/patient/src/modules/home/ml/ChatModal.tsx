import { useEffect, type SyntheticEvent } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { ChatPage } from "../../app/pages/ChatPage";
import type { PatientAppState, Professional } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Modal de chat con el profesional desde Inicio (sin salir de Home). */
export function DashboardHomeChatModal(props: {
  language: AppLanguage;
  state: PatientAppState;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  authToken: string | null;
  sessionUserId: string;
  onClose: () => void;
  onOpenFullChat: () => void;
  onSetActiveProfessional: (professionalId: string) => void;
  onSendMessage: (professionalId: string, text: string) => void;
  onMarkRead: (professionalId: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.onClose]);

  return (
    <div
      className="matching-flow-backdrop dashboard-home-chat-backdrop"
      role="presentation"
      onClick={props.onClose}
    >
      <section
        className="matching-flow-modal dashboard-home-chat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-home-chat-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dashboard-home-chat-head">
          <div className="dashboard-home-chat-head-copy">
            <p className="dashboard-home-chat-kicker">
              {t(props.language, {
                es: "MotivarCare",
                en: "MotivarCare",
                pt: "MotivarCare"
              })}
            </p>
            <h2 id="dashboard-home-chat-title" className="dashboard-home-chat-title">
              {t(props.language, {
                es: "Chat con tu profesional",
                en: "Chat with your professional",
                pt: "Chat com seu profissional"
              })}
            </h2>
          </div>
          <div className="dashboard-home-chat-head-actions">
            <button type="button" className="dashboard-home-chat-full" onClick={props.onOpenFullChat}>
              {t(props.language, {
                es: "Abrir chat completo",
                en: "Open full chat",
                pt: "Abrir chat completo"
              })}
            </button>
            <button type="button" className="dashboard-home-chat-close" onClick={props.onClose}>
              {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
            </button>
          </div>
        </header>

        <div className="dashboard-home-chat-body">
          <ChatPage
            embedded
            state={props.state}
            professionals={props.professionals}
            professionalPhotoMap={props.professionalPhotoMap}
            language={props.language}
            authToken={props.authToken}
            sessionUserId={props.sessionUserId}
            onSetActiveProfessional={props.onSetActiveProfessional}
            onSendMessage={props.onSendMessage}
            onMarkRead={props.onMarkRead}
            onImageFallback={props.onImageFallback}
          />
        </div>
      </section>
    </div>
  );
}
