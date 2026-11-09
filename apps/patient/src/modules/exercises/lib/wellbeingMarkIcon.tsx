import type { ReactNode } from "react";
import { IconBienestar, IconMusica, IconPin, IconRespira } from "../../home/calm/calmIcons";
import type { ExerciseCategory } from "../services/exercisesApi";

/** Solo íconos del sprite DS (`i-*`). Sin emojis ni trazos inventados. */
export function wellbeingMarkIcon(category?: ExerciseCategory | null, size = 22): ReactNode {
  switch (category) {
    case "respiracion":
      return <IconRespira size={size} />;
    case "relajacion":
      return <IconMusica size={size} />;
    case "grounding":
      return <IconPin size={size} />;
    case "postura":
    case "movimiento":
    case "mindfulness":
    default:
      return <IconBienestar size={size} />;
  }
}
