import type { EmotionalDiaryMood } from "@therapy/types";

export const MOOD_OPTIONS: {
  id: EmotionalDiaryMood;
  emoji: string;
  labelEs: string;
  tone: string;
}[] = [
  { id: "very_good", emoji: "😄", labelEs: "Muy bien", tone: "#34d399" },
  { id: "good", emoji: "🙂", labelEs: "Bien", tone: "#5b9cf5" },
  { id: "regular", emoji: "😐", labelEs: "Regular", tone: "#8b7cf8" },
  { id: "bad", emoji: "😕", labelEs: "Mal", tone: "#fb7185" },
  { id: "very_bad", emoji: "😢", labelEs: "Muy mal", tone: "#f43f5e" }
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
  { id: "rest", icon: "🛏", labelEs: "Descansar" },
  { id: "talk", icon: "💬", labelEs: "Hablarlo" },
  { id: "breathe", icon: "🌬", labelEs: "Respirar" },
  { id: "boundaries", icon: "🛡", labelEs: "Poner límites" },
  { id: "organize", icon: "📋", labelEs: "Ordenar ideas" }
] as const;

export function moodMeta(mood: EmotionalDiaryMood) {
  return MOOD_OPTIONS.find((option) => option.id === mood) ?? MOOD_OPTIONS[2];
}
