import { IconEnviar } from "../home/calm/calmIcons";

/** Mancha DS (`icono-mancha`) + ícono de envío del sprite app-usuario. */
export function VerifyEmailMark() {
  return (
    <span className="verify-email-mark" aria-hidden="true">
      <svg className="verify-email-mark-blob" viewBox="0 0 100 100">
        <path d="M82 64c-6 18-26 28-44 24S8 68 10 48 28 12 50 12s38 34 32 52z" fill="#d6e7dc" opacity="0.95" />
      </svg>
      <span className="verify-email-mark-icon">
        <IconEnviar size={26} />
      </span>
    </span>
  );
}
