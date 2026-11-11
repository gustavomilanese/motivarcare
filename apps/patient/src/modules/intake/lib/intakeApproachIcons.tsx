import type { ReactNode } from "react";
import {
  IconAyuda,
  IconBienestar,
  IconChat,
  IconClip,
  IconCorazon,
  IconDiario
} from "../../home/calm/calmIcons";

/** Íconos del sprite DS (`i-*`) mapeados a enfoques. No hay glifos específicos de TCC/etc. en el DS. */
const BY_OPTION_ES: Record<string, (size: number) => ReactNode> = {
  "Terapia cognitivo-conductual (TCC)": (size) => <IconClip size={size} />,
  "Psicodinámica o psicoanalítica": (size) => <IconDiario size={size} />,
  "Humanista o centrada en la persona": (size) => <IconCorazon size={size} />,
  "Sistémica o familiar": (size) => <IconChat size={size} />,
  "Integradora o ecléctica": (size) => <IconBienestar size={size} />,
  "No estoy seguro/a; lo que recomiende el profesional": (size) => <IconAyuda size={size} />
};

export function intakeApproachIcon(optionEs: string, size = 20): ReactNode {
  const render = BY_OPTION_ES[optionEs];
  return render ? render(size) : <IconBienestar size={size} />;
}

/** Tintes de superficie DS para el badge del ícono (cíclico). */
export const INTAKE_APPROACH_TONE = ["menta", "lima", "salvia", "amarillo"] as const;
export type IntakeApproachTone = (typeof INTAKE_APPROACH_TONE)[number];

export function intakeApproachTone(index: number): IntakeApproachTone {
  return INTAKE_APPROACH_TONE[index % INTAKE_APPROACH_TONE.length]!;
}
