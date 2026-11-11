import type { ReactNode } from "react";
import {
  IconAyuda,
  IconCandado,
  IconChat,
  IconCheck,
  IconCorazon,
  IconDiario,
  IconReloj
} from "../../home/calm/calmIcons";
import { type IntakeApproachTone } from "./intakeApproachIcons";

const ICONS: Record<string, (size: number) => ReactNode> = {
  "Apoyo fuerte": (s) => <IconCorazon size={s} />,
  "Apoyo limitado": (s) => <IconChat size={s} />,
  "Sin apoyo": (s) => <IconAyuda size={s} />,
  "Prefiero no responder": (s) => <IconCandado size={s} />,
  "Sí, y me ayudó": (s) => <IconCheck size={s} />,
  "Sí, pero no me sirvió mucho": (s) => <IconReloj size={s} />,
  "No, nunca fui a terapia": (s) => <IconDiario size={s} />
};

const TONES: Record<string, IntakeApproachTone> = {
  "Apoyo fuerte": "lima",
  "Apoyo limitado": "salvia",
  "Sin apoyo": "amarillo",
  "Prefiero no responder": "menta",
  "Sí, y me ayudó": "lima",
  "Sí, pero no me sirvió mucho": "amarillo",
  "No, nunca fui a terapia": "menta"
};

export function intakeWideChoiceIcon(optionEs: string, size = 24): ReactNode {
  return (ICONS[optionEs] ?? ((s: number) => <IconAyuda size={s} />))(size);
}

export function intakeWideChoiceTone(optionEs: string): IntakeApproachTone {
  return TONES[optionEs] ?? "menta";
}

export function intakeWideChoiceProvisional(optionEs: string): boolean {
  return optionEs === "Prefiero no responder";
}
