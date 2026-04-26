import { useCallback, useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { useTreatmentChat } from "../hooks/useTreatmentChat";
import { TreatmentChatPanel } from "./TreatmentChatPanel";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

interface TreatmentChatFABProps {
  authToken: string | null;
  language: AppLanguage;
}

/**
 * Punto de entrada del chat IA flotante para el paciente.
 * - FAB siempre visible mientras el feature flag esté ON y el paciente esté logueado
 *   (la decisión de mount la toma AppRoot — acá no chequeamos flag de nuevo).
 * - Lazy-load: solo pegamos al backend la primera vez que el panel se abre, así
 *   un paciente que nunca lo abre no genera tráfico ni costo.
 */
export function TreatmentChatFAB(props: TreatmentChatFABProps) {
  const { authToken, language } = props;
  const [isOpen, setIsOpen] = useState(false);
  /** True una vez que el paciente abrió el panel por primera vez en esta sesión. */
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  const chat = useTreatmentChat({
    authToken,
    enabled: hasOpenedOnce
  });

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setHasOpenedOnce(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  /** Cerrar con Escape para accesibilidad y comodidad en desktop. */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          className="treatment-chat-fab"
          onClick={handleOpen}
          aria-label={t(language, {
            es: "Abrir chat de acompañamiento",
            en: "Open companion chat",
            pt: "Abrir chat de acompanhamento"
          })}
        >
          <span aria-hidden="true" className="treatment-chat-fab__icon">
            {/* SVG simple: globo de chat. Sin dependencias externas. */}
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z" />
            </svg>
          </span>
          <span className="treatment-chat-fab__label">
            {t(language, { es: "Hablar con Maca", en: "Talk to Maca", pt: "Falar com Maca" })}
          </span>
        </button>
      ) : null}

      {isOpen ? (
        <div className="treatment-chat-overlay" role="presentation">
          <TreatmentChatPanel
            language={language}
            loadState={chat.loadState}
            errorMessage={chat.errorMessage}
            messages={chat.messages}
            isAssistantTyping={chat.isAssistantTyping}
            safetyAlert={chat.safetyAlert}
            dailyTurnsRemaining={chat.conversation?.quota.dailyTurnsRemaining ?? null}
            onClose={handleClose}
            onSendMessage={(text) => void chat.sendMessage(text)}
            onRetryLoad={() => void chat.reload()}
          />
        </div>
      ) : null}
    </>
  );
}
