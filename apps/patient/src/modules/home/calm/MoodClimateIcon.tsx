import type { ReactNode } from "react";
import type { MoodLevel } from "../../emotional-diary/types";

/** Íconos “El clima de tu día” (definición Alternativa A). No están en el sprite `i-*` del DS. */

const CLOUD =
  "M4.8 13.1c0-1.55 1.2-2.85 2.75-2.9.2-2.15 1.9-3.7 4.05-3.7 1.8 0 3.35 1.1 3.95 2.7 1.45.1 2.65 1.3 2.65 2.85 0 1.6-1.3 2.9-2.9 2.9H7.7c-1.6 0-2.9-1.3-2.9-2.85z";

function Glyph(props: { children: ReactNode; size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={props.size}
      height={props.size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

function CloudOnly(props: { size: number }) {
  return (
    <Glyph size={props.size}>
      <path d={CLOUD} />
    </Glyph>
  );
}

function CloudStorm(props: { size: number }) {
  return (
    <Glyph size={props.size}>
      <path d={CLOUD} />
      <path d="M12.1 15.1 10.2 18.4h2.15L10.55 22" />
    </Glyph>
  );
}

function CloudRain(props: { size: number }) {
  return (
    <Glyph size={props.size}>
      <path d={CLOUD} />
      <path d="M9.1 16.2 8.15 19.1M12.05 16.45 11.1 19.35M14.95 16.2 14 19.1" />
    </Glyph>
  );
}

function PartlySunny(props: { size: number }) {
  /* Nube más baja/izquierda; sol asoma arriba-derecha (definición). */
  const cloudFront =
    "M3.9 15.2c0-1.55 1.2-2.85 2.75-2.9.2-2.15 1.9-3.7 4.05-3.7 1.8 0 3.35 1.1 3.95 2.7 1.45.1 2.65 1.3 2.65 2.85 0 1.6-1.3 2.9-2.9 2.9H6.8c-1.6 0-2.9-1.3-2.9-2.85z";
  return (
    <Glyph size={props.size}>
      <circle cx="16.2" cy="7.6" r="2.85" fill="#F5C33B" stroke="currentColor" />
      <path d="M16.2 2.95v1.35M20.15 4.95l-.95.95M21.7 8.95h-1.35M19.95 12.5l-.95-.95" />
      <path d={cloudFront} fill="#fff" />
    </Glyph>
  );
}

function ClearSun(props: { size: number }) {
  return (
    <Glyph size={props.size}>
      <circle cx="12" cy="12" r="3.6" fill="#F5C33B" stroke="currentColor" />
      <path d="M12 4.2v1.7M12 18.1v1.7M4.2 12h1.7M18.1 12h1.7M6.55 6.55l1.2 1.2M16.25 16.25l1.2 1.2M6.55 17.45l1.2-1.2M16.25 7.75l1.2-1.2" />
    </Glyph>
  );
}

const BY_MOOD: Record<MoodLevel, (props: { size: number }) => ReactNode> = {
  very_bad: CloudStorm,
  bad: CloudRain,
  regular: CloudOnly,
  good: PartlySunny,
  very_good: ClearSun
};

export function MoodClimateIcon(props: { mood: MoodLevel; size?: number }) {
  const size = props.size ?? 26;
  const Icon = BY_MOOD[props.mood];
  return <Icon size={size} />;
}
