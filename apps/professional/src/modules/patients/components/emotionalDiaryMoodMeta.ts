import type { EmotionalDiaryMood } from "@therapy/types";

export const PRO_MOOD_OPTIONS: {
  id: EmotionalDiaryMood;
  emoji: string;
  labelEs: string;
  labelEn: string;
  labelPt: string;
}[] = [
  { id: "very_bad", emoji: "😢", labelEs: "Muy mal", labelEn: "Very bad", labelPt: "Muito mal" },
  { id: "bad", emoji: "😕", labelEs: "Mal", labelEn: "Bad", labelPt: "Mal" },
  { id: "regular", emoji: "😐", labelEs: "Regular", labelEn: "Okay", labelPt: "Regular" },
  { id: "good", emoji: "🙂", labelEs: "Bien", labelEn: "Good", labelPt: "Bem" },
  { id: "very_good", emoji: "😄", labelEs: "Muy bien", labelEn: "Great", labelPt: "Muito bem" }
];

export function moodMeta(mood: EmotionalDiaryMood) {
  return PRO_MOOD_OPTIONS.find((option) => option.id === mood) ?? PRO_MOOD_OPTIONS[2];
}
