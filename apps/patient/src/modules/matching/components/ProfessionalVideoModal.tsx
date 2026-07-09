import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { MatchCardProfessional } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalVideoModal(props: {
  language: AppLanguage;
  professional: MatchCardProfessional;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const professionalName = professionalAccessibleName(props.professional);
  const posterSrc = props.professional.videoCoverUrl ?? props.professional.photoUrl;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.onClose]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    void video.play().catch(() => {
      /* Autoplay may be blocked until user interaction; controls remain available. */
    });
    return () => {
      video.pause();
    };
  }, [props.professional.videoUrl]);

  if (!props.professional.videoUrl) {
    return null;
  }

  return createPortal(
    <div className="matching-flow-backdrop patient-professional-video-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="matching-flow-modal patient-professional-video-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-professional-video-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="patient-professional-video-header">
          <div>
            <p className="patient-professional-video-kicker">
              {t(props.language, {
                es: "Presentación en video",
                en: "Video introduction",
                pt: "Apresentação em vídeo"
              })}
            </p>
            <h2 id="patient-professional-video-title">{professionalName}</h2>
          </div>
          <button
            type="button"
            className="patient-professional-video-close"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>

        <div className="patient-professional-video-player-wrap">
          <video
            ref={videoRef}
            className="patient-professional-video-player"
            src={props.professional.videoUrl}
            poster={posterSrc ? professionalPhotoSrc(posterSrc) : undefined}
            controls
            playsInline
            preload="metadata"
          />
        </div>
      </section>
    </div>,
    document.body
  );
}
