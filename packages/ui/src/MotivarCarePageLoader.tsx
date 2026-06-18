import { useId } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  MOTIVAR_CARE_MARK_SPINNER_PATH,
  MOTIVAR_CARE_MARK_VIEWBOX
} from "./motivarCareMarkSpinnerPath";

function loadingSrOnly(language?: AppLanguage): string {
  if (!language) {
    return "Loading";
  }
  return textByLanguage(language, { es: "Cargando", en: "Loading", pt: "Carregando" } satisfies LocalizedText);
}

function MarkSpinner(props: { size: number; gradientId: string }) {
  return (
    <svg
      className="mc-mark-spinner"
      width={props.size}
      height={props.size}
      viewBox={`0 0 ${MOTIVAR_CARE_MARK_VIEWBOX} ${MOTIVAR_CARE_MARK_VIEWBOX}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={props.gradientId} x1="10%" y1="92%" x2="90%" y2="8%">
          <stop offset="0%" stopColor="#55aee8" />
          <stop offset="100%" stopColor="#3ecfb5" />
        </linearGradient>
      </defs>
      <path
        className="mc-mark-spinner-track"
        d={MOTIVAR_CARE_MARK_SPINNER_PATH}
        pathLength={100}
        fill="none"
      />
      <path
        className="mc-mark-spinner-arc"
        d={MOTIVAR_CARE_MARK_SPINNER_PATH}
        pathLength={100}
        fill="none"
        stroke={`url(#${props.gradientId})`}
      />
    </svg>
  );
}

export function MotivarCareLoader(props: {
  size?: number;
  label?: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const size = props.size ?? 64;

  if (!props.label) {
    return <MarkSpinner size={size} gradientId={gradientId} />;
  }

  return (
    <span className="mc-loader">
      <MarkSpinner size={size} gradientId={gradientId} />
      <span className="mc-loader-label">{props.label}</span>
    </span>
  );
}

/** Loader del mark MotivarCare — sin caja contenedora. */
export function MotivarCarePageLoader(props: {
  language?: AppLanguage;
  size?: number;
  /** `block` centra en el área de página; `inline` en su sección. */
  layout?: "block" | "inline" | "compact";
}) {
  const gradientId = useId().replace(/:/g, "");
  const layoutClass =
    props.layout === "block"
      ? " mc-page-loader--block"
      : props.layout === "compact"
        ? " mc-page-loader--compact"
        : props.layout === "inline"
          ? " mc-page-loader--inline"
          : "";

  const size =
    props.size ?? (props.layout === "compact" ? 52 : props.layout === "inline" ? 60 : 72);

  return (
    <span
      className={`mc-page-loader${layoutClass}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <MarkSpinner size={size} gradientId={gradientId} />
      <span className="sr-only">{loadingSrOnly(props.language)}</span>
    </span>
  );
}

/** Alias usado en el portal profesional. */
export const ProPageLoader = MotivarCarePageLoader;
