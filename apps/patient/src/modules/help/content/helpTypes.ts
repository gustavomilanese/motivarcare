import type { LocalizedText } from "@therapy/i18n-config";

export interface HelpFaqItem {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface HelpFaqSection {
  title: LocalizedText;
  items: HelpFaqItem[];
}

export interface HelpManualFigure {
  src: string;
  alt: LocalizedText;
  caption?: LocalizedText;
}

export interface HelpManualSection {
  title: LocalizedText;
  paragraphs?: LocalizedText[];
  bullets?: Array<{ label?: LocalizedText; body: LocalizedText }>;
  steps?: LocalizedText[];
  figures?: HelpManualFigure[];
}
