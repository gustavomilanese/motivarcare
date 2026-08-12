import type { EmotionalDiaryMood } from "@therapy/types";

export const PRO_MOOD_OPTIONS: {
  id: EmotionalDiaryMood;
  emoji: string;
  labelEs: string;
  labelEn: string;
  labelPt: string;
  tone: string;
  soft: string;
}[] = [
  { id: "very_bad", emoji: "😢", labelEs: "Muy mal", labelEn: "Very bad", labelPt: "Muito mal", tone: "#e11d48", soft: "rgba(225, 29, 72, 0.1)" },
  { id: "bad", emoji: "😕", labelEs: "Mal", labelEn: "Bad", labelPt: "Mal", tone: "#f43f5e", soft: "rgba(244, 63, 94, 0.1)" },
  { id: "regular", emoji: "😐", labelEs: "Regular", labelEn: "Okay", labelPt: "Regular", tone: "#7c6bcf", soft: "rgba(124, 107, 207, 0.12)" },
  { id: "good", emoji: "🙂", labelEs: "Bien", labelEn: "Good", labelPt: "Bem", tone: "#2563eb", soft: "rgba(37, 99, 235, 0.1)" },
  { id: "very_good", emoji: "😄", labelEs: "Muy bien", labelEn: "Great", labelPt: "Muito bem", tone: "#059669", soft: "rgba(5, 150, 105, 0.1)" }
];

export function moodMeta(mood: EmotionalDiaryMood) {
  return PRO_MOOD_OPTIONS.find((option) => option.id === mood) ?? PRO_MOOD_OPTIONS[2];
}
