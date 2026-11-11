import type { AppLanguage } from "@therapy/i18n-config";
import type { MoodLevel } from "../types";

/**
 * Escala “El clima de tu día”.
 * Íconos de línea (definición Alternativa A) viven en `MoodClimateIcon` — no están en el sprite `i-*` del DS.
 */
export const MOOD_OPTIONS: {
  id: MoodLevel;
  emoji: string;
  labelEs: string;
  labelEn: string;
  labelPt: string;
  tone: string;
}[] = [
  { id: "very_bad", emoji: "😢", labelEs: "Tormenta", labelEn: "Storm", labelPt: "Tempestade", tone: "#1e4033" },
  { id: "bad", emoji: "😕", labelEs: "Lluvia", labelEn: "Rain", labelPt: "Chuva", tone: "#2f6b51" },
  { id: "regular", emoji: "😐", labelEs: "Nublado", labelEn: "Cloudy", labelPt: "Nublado", tone: "#f5c33b" },
  { id: "good", emoji: "🙂", labelEs: "Algo de sol", labelEn: "Some sun", labelPt: "Solzinho", tone: "#a9cf54" },
  { id: "very_good", emoji: "😄", labelEs: "Despejado", labelEn: "Clear", labelPt: "Céu limpo", tone: "#4fa86a" }
];

/** Valor canónico guardado = labelEs. */
export const FEELING_CHIPS = [
  { id: "Ansiedad", es: "Ansiedad", en: "Anxiety", pt: "Ansiedade" },
  { id: "Alivio", es: "Alivio", en: "Relief", pt: "Alivio" },
  { id: "Tristeza", es: "Tristeza", en: "Sadness", pt: "Tristeza" },
  { id: "Calma", es: "Calma", en: "Calm", pt: "Calma" },
  { id: "Enojo", es: "Enojo", en: "Anger", pt: "Raiva" },
  { id: "Culpa", es: "Culpa", en: "Guilt", pt: "Culpa" },
  { id: "Frustración", es: "Frustración", en: "Frustration", pt: "Frustracao" },
  { id: "Alegría", es: "Alegría", en: "Joy", pt: "Alegria" },
  { id: "Soledad", es: "Soledad", en: "Loneliness", pt: "Solidao" }
] as const;

export type FeelingChipId = (typeof FEELING_CHIPS)[number]["id"];

export function feelingChipLabel(language: AppLanguage, chipId: string): string {
  const hit = FEELING_CHIPS.find((chip) => chip.id === chipId);
  if (!hit) {
    return chipId;
  }
  if (language === "en") {
    return hit.en;
  }
  if (language === "pt") {
    return hit.pt;
  }
  return hit.es;
}

export type DiaryNeedIcon = "reloj" | "chat" | "respira" | "escudo" | "clip";

export const NEED_OPTIONS: {
  id: string;
  icon: DiaryNeedIcon;
  labelEs: string;
  labelEn: string;
  labelPt: string;
}[] = [
  { id: "rest", icon: "reloj", labelEs: "Descansar", labelEn: "Rest", labelPt: "Descansar" },
  { id: "talk", icon: "chat", labelEs: "Hablarlo", labelEn: "Talk it out", labelPt: "Conversar" },
  { id: "breathe", icon: "respira", labelEs: "Respirar", labelEn: "Breathe", labelPt: "Respirar" },
  { id: "boundaries", icon: "escudo", labelEs: "Poner límites", labelEn: "Set boundaries", labelPt: "Limites" },
  { id: "organize", icon: "clip", labelEs: "Ordenar ideas", labelEn: "Organize thoughts", labelPt: "Organizar ideias" }
];

export function moodMeta(mood: MoodLevel) {
  return MOOD_OPTIONS.find((option) => option.id === mood) ?? MOOD_OPTIONS[2];
}
