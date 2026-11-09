import { useEffect, useRef } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { IconCerrar, IconMic, IconVideo } from "../../home/calm/calmIcons";
import { useDeviceTest, type DeviceTestErrorCode } from "../hooks/useDeviceTest";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function errorCopy(language: AppLanguage, code: DeviceTestErrorCode | null): string {
  if (!code) return "";
  switch (code) {
    case "unsupported":
      return t(language, {
        es: "Tu navegador no permite probar cámara y micrófono acá.",
        en: "Your browser can’t test camera and microphone here.",
        pt: "Seu navegador não permite testar câmera e microfone aqui."
      });
    case "insecure":
      return t(language, {
        es: "Para probar dispositivos necesitás una conexión segura (https).",
        en: "Device testing needs a secure connection (https).",
        pt: "Para testar dispositivos você precisa de uma conexão segura (https)."
      });
    case "denied":
      return t(language, {
        es: "Bloqueaste el acceso. Tocá el candado en la barra de dirección, permití cámara y micrófono, y volvé a probar.",
        en: "Access was blocked. Open the lock icon in the address bar, allow camera and microphone, then try again.",
        pt: "O acesso foi bloqueado. Toque no cadeado na barra de endereço, permita câmera e microfone e tente de novo."
      });
    case "not_found":
      return t(language, {
        es: "No encontramos cámara o micrófono conectados.",
        en: "We couldn’t find a connected camera or microphone.",
        pt: "Não encontramos câmera ou microfone conectados."
      });
    case "camera_only":
      return t(language, {
        es: "La cámara anda; el micrófono no. Revisá que no esté en uso por otra app.",
        en: "Camera works; microphone doesn’t. Check it isn’t in use by another app.",
        pt: "A câmera funciona; o microfone não. Veja se não está em uso por outro app."
      });
    case "mic_only":
      return t(language, {
        es: "El micrófono anda; la cámara no. Revisá que no esté en uso por otra app.",
        en: "Microphone works; camera doesn’t. Check it isn’t in use by another app.",
        pt: "O microfone funciona; a câmera não. Veja se não está em uso por outro app."
      });
    case "busy":
      return t(language, {
        es: "La cámara o el micrófono están ocupados por otra aplicación. Cerrala y reintentá.",
        en: "Camera or microphone is busy in another app. Close it and try again.",
        pt: "A câmera ou o microfone está ocupado por outro app. Feche e tente de novo."
      });
    default:
      return t(language, {
        es: "No pudimos abrir cámara y micrófono. Reintentá en un momento.",
        en: "We couldn’t open camera and microphone. Try again in a moment.",
        pt: "Não foi possível abrir câmera e microfone. Tente de novo em instantes."
      });
  }
}

export function DeviceTestModal(props: { language: AppLanguage; open: boolean; onClose: () => void }) {
  const test = useDeviceTest(props.open);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const micHeard = test.status === "ready" && test.hasAudio && test.micLevel > 0.08;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = test.stream;
    if (test.stream) {
      void video.play().catch(() => undefined);
    }
  }, [test.stream]);

  useEffect(() => {
    if (!props.open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  const errorMessage = errorCopy(props.language, test.errorCode);
  const showDevices = test.status === "ready" && (test.cameras.length > 1 || test.mics.length > 1);

  return (
    <div className="device-test-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="device-test-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-test-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="device-test-head">
          <div>
            <p className="device-test-kicker">
              {t(props.language, { es: "Antes de la sesión", en: "Before the session", pt: "Antes da sessão" })}
            </p>
            <h2 id="device-test-title">
              {t(props.language, {
                es: "Probar cámara y micrófono",
                en: "Test camera and microphone",
                pt: "Testar câmera e microfone"
              })}
            </h2>
          </div>
          <button
            type="button"
            className="device-test-close"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            <IconCerrar size={18} />
          </button>
        </header>

        <p className="device-test-lead">
          {t(props.language, {
            es: "La prueba es solo en tu dispositivo. No se graba ni se envía a nadie.",
            en: "This check stays on your device. Nothing is recorded or sent.",
            pt: "O teste fica só no seu dispositivo. Nada é gravado nem enviado."
          })}
        </p>

        <div className="device-test-preview">
          {test.status === "ready" && test.hasVideo ? (
            <video ref={videoRef} className="device-test-video" playsInline muted autoPlay />
          ) : (
            <div className="device-test-placeholder" aria-live="polite">
              <IconVideo size={28} />
              <span>
                {test.status === "requesting"
                  ? t(props.language, {
                      es: "Pedimos permiso al navegador…",
                      en: "Asking the browser for permission…",
                      pt: "Pedindo permissão ao navegador…"
                    })
                  : test.status === "denied"
                    ? t(props.language, {
                        es: "Sin permiso de cámara o micrófono",
                        en: "Camera or microphone permission denied",
                        pt: "Sem permissão de câmera ou microfone"
                      })
                    : test.status === "ready" && !test.hasVideo
                      ? t(props.language, {
                          es: "Sin imagen de cámara",
                          en: "No camera image",
                          pt: "Sem imagem da câmera"
                        })
                      : t(props.language, {
                          es: "La vista previa aparece acá",
                          en: "Your preview shows up here",
                          pt: "A prévia aparece aqui"
                        })}
              </span>
            </div>
          )}
        </div>

        <div
          className={`device-test-meter${micHeard ? " is-live" : ""}`}
          aria-label={t(props.language, {
            es: "Nivel del micrófono",
            en: "Microphone level",
            pt: "Nível do microfone"
          })}
        >
          <IconMic size={18} />
          <span className="device-test-meter-track" aria-hidden="true">
            <span style={{ width: `${Math.round(test.micLevel * 100)}%` }} />
          </span>
          <strong>
            {micHeard
              ? t(props.language, { es: "Te escuchamos", en: "We can hear you", pt: "Estamos te ouvindo" })
              : test.status === "ready" && test.hasAudio
                ? t(props.language, { es: "Hablá un segundo", en: "Say something", pt: "Fale um segundo" })
                : t(props.language, { es: "Micrófono", en: "Microphone", pt: "Microfone" })}
          </strong>
        </div>

        {showDevices ? (
          <div className="device-test-devices">
            {test.cameras.length > 1 ? (
              <label>
                <span>{t(props.language, { es: "Cámara", en: "Camera", pt: "Câmera" })}</span>
                <select value={test.cameraId} onChange={(event) => test.selectCamera(event.target.value)}>
                  {test.cameras.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {test.mics.length > 1 ? (
              <label>
                <span>{t(props.language, { es: "Micrófono", en: "Microphone", pt: "Microfone" })}</span>
                <select value={test.micId} onChange={(event) => test.selectMic(event.target.value)}>
                  {test.mics.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        {errorMessage ? <p className="device-test-error">{errorMessage}</p> : null}

        <div className="device-test-actions">
          {test.status === "ready" ? (
            <button type="button" className="calm-btn calm-btn--yellow" onClick={props.onClose}>
              {t(props.language, { es: "Listo", en: "Done", pt: "Pronto" })}
            </button>
          ) : (
            <button
              type="button"
              className="calm-btn calm-btn--yellow"
              disabled={test.status === "requesting"}
              onClick={test.retry}
            >
              {test.status === "requesting"
                ? t(props.language, { es: "Esperando…", en: "Waiting…", pt: "Aguardando…" })
                : t(props.language, { es: "Permitir y probar", en: "Allow and test", pt: "Permitir e testar" })}
            </button>
          )}
          <button type="button" className="calm-text-link" onClick={props.onClose}>
            {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          </button>
        </div>
      </section>
    </div>
  );
}
