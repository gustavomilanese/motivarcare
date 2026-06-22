/**
 * Áreas de atención del profesional: motivos de consulta del paciente (sin "Otro")
 * + terapia de pareja como opción adicional para la práctica.
 */
export const PROFESSIONAL_ATTENTION_AREA_COUPLES_ES = "Terapia de pareja";

export const PROFESSIONAL_ATTENTION_AREA_OPTIONS_ES: readonly string[] = [
  "Ansiedad",
  "Ataques de pánico",
  "Estrés",
  "Depresión",
  "Problemas de autoestima",
  "Dificultad en relaciones",
  "Rupturas amorosas o duelos",
  "Problemas laborales o burnout",
  "Toma de decisiones importantes",
  "Falta de motivación o propósito",
  "Problemas de sueño",
  "Manejo de emociones",
  "Consumo o conductas adictivas",
  "Experiencias difíciles del pasado",
  "Crisis personales",
  "Soledad",
  "Dificultad para controlar impulsos",
  "Crecimiento personal",
  "Establecimiento de límites",
  "Comunicación efectiva",
  "Manejo de la ansiedad social",
  "Resolución de conflictos",
  "Desarrollo de vínculos",
  PROFESSIONAL_ATTENTION_AREA_COUPLES_ES
];

export function focusAreasIncludeCouplesTherapy(areas: readonly string[]): boolean {
  return areas.includes(PROFESSIONAL_ATTENTION_AREA_COUPLES_ES);
}
