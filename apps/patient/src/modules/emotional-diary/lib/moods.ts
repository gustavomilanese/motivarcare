import type { MoodLevel } from "../types";

export const MOOD_OPTIONS: {
  id: MoodLevel;
  emoji: string;
  labelEs: string;
  labelEn: string;
  labelPt: string;
  tone: string;
}[] = [
  { id: "very_good", emoji: "😄", labelEs: "Muy bien", labelEn: "Great", labelPt: "Muito bem", tone: "#34d399" },
  { id: "good", emoji: "🙂", labelEs: "Bien", labelEn: "Good", labelPt: "Bem", tone: "#5b9cf5" },
  { id: "regular", emoji: "😐", labelEs: "Regular", labelEn: "Okay", labelPt: "Regular", tone: "#8b7cf8" },
  { id: "bad", emoji: "😕", labelEs: "Mal", labelEn: "Bad", labelPt: "Mal", tone: "#fb7185" },
  { id: "very_bad", emoji: "😢", labelEs: "Muy mal", labelEn: "Very bad", labelPt: "Muito mal", tone: "#f43f5e" }
];

export const FEELING_CHIPS = [
  "Ansiedad",
  "Alivio",
  "Tristeza",
  "Calma",
  "Enojo",
  "Culpa",
  "Frustración",
  "Alegría",
  "Soledad"
] as const;

export const NEED_OPTIONS = [
  { id: "rest", icon: "🛏", labelEs: "Descansar", labelEn: "Rest", labelPt: "Descansar" },
  { id: "talk", icon: "💬", labelEs: "Hablarlo", labelEn: "Talk it out", labelPt: "Conversar" },
  { id: "breathe", icon: "🌬", labelEs: "Respirar", labelEn: "Breathe", labelPt: "Respirar" },
  { id: "boundaries", icon: "🛡", labelEs: "Poner límites", labelEn: "Set boundaries", labelPt: "Limites" },
  { id: "organize", icon: "📋", labelEs: "Ordenar ideas", labelEn: "Organize thoughts", labelPt: "Organizar ideias" }
] as const;

export function moodMeta(mood: MoodLevel) {
  return MOOD_OPTIONS.find((option) => option.id === mood) ?? MOOD_OPTIONS[2];
}
