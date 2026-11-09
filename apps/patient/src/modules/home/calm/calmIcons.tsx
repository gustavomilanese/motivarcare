import type { ReactNode } from "react";

/** Trazos de `motivarcare/motivarcare.github.io` → `web/public/app-usuario/index.html`. */
function Line(props: { children: ReactNode; size?: number }) {
  const size = props.size ?? 22;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export function IconInicio(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19z" />
    </Line>
  );
}

export function IconSesiones(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <circle cx="12" cy="15" r="1.6" />
    </Line>
  );
}

export function IconChat(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M4.5 5.5h15v10h-9l-4.5 4v-4H4.5z" />
    </Line>
  );
}

export function IconDiario(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M6 3.5h10.5A2.5 2.5 0 0 1 19 6v14.5H7.5A2.5 2.5 0 0 1 5 18V4.5a1 1 0 0 1 1-1z" />
      <path d="M5 18a2.5 2.5 0 0 1 2.5-2.5H19M9 8h6M9 11.5h4" />
    </Line>
  );
}

export function IconMusica(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M9 17.5V6l10-2v11.5" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
    </Line>
  );
}

export function IconBienestar(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M5 19c0-8 5-13.5 14-14-.3 9-5.8 14-14 14z" />
      <path d="M5 19c3-3.5 6-6 9.5-8" />
    </Line>
  );
}

export function IconAyuda(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.5" />
      <circle cx="12" cy="17" r=".6" />
    </Line>
  );
}

export function IconTel(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2C10.6 19 5 13.4 4.5 5.7a2 2 0 0 1 2-2.2z" />
    </Line>
  );
}

export function IconCandado(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Line>
  );
}

export function IconPin(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </Line>
  );
}

export function IconCorazon(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
    </Line>
  );
}

export function IconRespira(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M3.5 9.5h10a2.5 2.5 0 1 0-2.5-2.5M3.5 14h14a2.5 2.5 0 1 1-2.5 2.5" />
    </Line>
  );
}

export function IconVideo(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
      <path d="m15.5 10.5 5-3v9l-5-3" />
    </Line>
  );
}

export function IconMic(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
    </Line>
  );
}

export function IconClip(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M19 11.5 12 18.5a4.5 4.5 0 0 1-6.4-6.4l7.4-7.4a3 3 0 0 1 4.2 4.2l-7.4 7.4a1.5 1.5 0 0 1-2.1-2.1l6.7-6.7" />
    </Line>
  );
}

export function IconEnviar(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M4.5 12 19.5 4.5 15.5 19.5l-3.5-6z" />
      <path d="m12 13.5 7.5-9" />
    </Line>
  );
}

export function IconCheck(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Line>
  );
}

export function IconAtras(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M15 6l-6 6 6 6" />
    </Line>
  );
}

export function IconCerrar(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Line>
  );
}

export function IconFlecha(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Line>
  );
}

export function IconReloj(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Line>
  );
}

export function IconEscudo(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M12 3.5 19 6v5.5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Line>
  );
}

export function IconCampana(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </Line>
  );
}

export function IconProfesional(props: { size?: number }) {
  return (
    <Line size={props.size}>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5c.8-4 3.9-6.3 7.5-6.3s6.7 2.3 7.5 6.3" />
    </Line>
  );
}

const MOOD_FACES = {
  very_bad: { fill: "#1e4033", stroke: "#F5F3EB", opacity: 0.5, d: "M10 22.5 Q16 15 22 22.5" },
  bad: { fill: "#2f6b51", stroke: "#F5F3EB", opacity: 0.5, d: "M10.5 21.5 Q16 18 21.5 21.5" },
  regular: { fill: "#f5c33b", stroke: "#1E4033", opacity: 0.45, d: "M10.5 19.5 L21.5 19.5" },
  good: { fill: "#a9cf54", stroke: "#1E4033", opacity: 0.45, d: "M10.5 18 Q16 22 21.5 18" },
  very_good: { fill: "#4fa86a", stroke: "#1E4033", opacity: 0.45, d: "M10 17 Q16 24.5 22 17" }
} as const;

export function MoodFace(props: { face: keyof typeof MOOD_FACES }) {
  const face = MOOD_FACES[props.face];
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill={face.fill} />
      <path d={face.d} fill="none" stroke={face.stroke} strokeOpacity={face.opacity} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
