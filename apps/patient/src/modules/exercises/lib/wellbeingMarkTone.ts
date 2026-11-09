import type { ExerciseCategory } from "../services/exercisesApi";

/** Mancha + trazo del ícono por categoría (tokens DS). Mancha clara → trazo bosque. */
export function wellbeingMarkTone(category?: ExerciseCategory | null): {
  mancha: string;
  icon: string;
} {
  switch (category) {
    case "respiracion":
      return { mancha: "#2F6B51", icon: "#f5f3eb" }; // verde-medio + crema
    case "postura":
      return { mancha: "#1E4033", icon: "#f5f3eb" }; // bosque + crema
    case "grounding":
      return { mancha: "#5E9677", icon: "#f5f3eb" }; // etapa-3 + crema
    case "movimiento":
      return { mancha: "#9FC9AE", icon: "#1E4033" }; // cat-salvia + bosque
    case "relajacion":
      return { mancha: "#F5C33B", icon: "#1B2A23" }; // amarillo + tinta
    case "mindfulness":
      return { mancha: "#C8D98A", icon: "#1E4033" }; // lima-fuerte + bosque
    default:
      return { mancha: "#2F6B51", icon: "#f5f3eb" };
  }
}
