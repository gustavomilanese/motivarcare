import type { AppLanguage } from "@therapy/i18n-config";
import type { MatchCardProfessional } from "./types";

interface TimeSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface RankedProfessional {
  professional: MatchCardProfessional;
  score: number;
  reasons: string[];
  matchedTopics: string[];
  suggestedSlots: TimeSlot[];
}

type TopicKey =
  | "anxiety"
  | "depression"
  | "relationships"
  | "burnout"
  | "trauma"
  | "emotional-regulation"
  | "self-esteem";

const TOPIC_KEYWORDS: Record<TopicKey, string[]> = {
  anxiety: ["ansiedad", "anxiety", "panico", "panic", "nervios", "ansioso", "ansiosa"],
  depression: ["depresion", "depression", "triste", "tristeza", "animo bajo", "apatia"],
  relationships: ["pareja", "vinculo", "vinculos", "relaciones", "relationship", "familia"],
  burnout: ["estres", "stress", "burnout", "trabajo", "laboral", "agotamiento", "sobrepasado"],
  trauma: ["trauma", "abuso", "violencia", "duelo", "perdida", "ptsd"],
  "emotional-regulation": ["regulacion emocional", "emocional", "impulsividad", "reactividad"],
  "self-esteem": ["autoestima", "self esteem", "inseguridad", "confianza", "valor personal"]
};

const TOPIC_LABELS: Record<TopicKey, { es: string; en: string; pt: string }> = {
  anxiety: { es: "ansiedad", en: "anxiety", pt: "ansiedade" },
  depression: { es: "depresión", en: "depression", pt: "depressao" },
  relationships: { es: "vínculos y pareja", en: "relationships", pt: "relacionamentos" },
  burnout: { es: "estrés y burnout", en: "stress and burnout", pt: "estresse e burnout" },
  trauma: { es: "trauma", en: "trauma", pt: "trauma" },
  "emotional-regulation": { es: "regulación emocional", en: "emotional regulation", pt: "regulacao emocional" },
  "self-esteem": { es: "autoestima", en: "self-esteem", pt: "autoestima" }
};

const MAIN_REASON_TO_TOPIC: Record<string, TopicKey | null> = {
  ansiedad: "anxiety",
  ansiedade: "anxiety",
  anxiety: "anxiety",
  depresion: "depression",
  depressao: "depression",
  depression: "depression",
  "vinculos y pareja": "relationships",
  relationships: "relationships",
  "relacionamentos e casal": "relationships",
  relacionamentos: "relationships",
  "estres / burnout": "burnout",
  "estresse / burnout": "burnout",
  "stress / burnout": "burnout",
  otro: null,
  outro: null,
  other: null
};

const APPROACH_KEYWORDS: Record<string, string[]> = {
  tcc: ["tcc", "cbt", "cognitive", "conductual"],
  psicodinamico: ["psicodinamico", "psychodynamic", "dinamico"],
  integrativo: ["integrativo", "integrative"],
  mindfulness: ["mindfulness", "aceptacion", "atencion plena"]
};

/**
 * Detecta experiencia/orientación LGBTIQ+ en el texto del profesional.
 * Lista intencionalmente generosa para cubrir variaciones (ES/EN/PT, sigla, etc.).
 */
const LGBT_KEYWORDS = [
  "lgbt",
  "lgbtiq",
  "lgbtq",
  "lgtbiq",
  "diversidad sexual",
  "diversidad de genero",
  "diversidades de genero",
  "diversidad afectiva",
  "queer",
  "trans",
  "transgenero",
  "no binario",
  "no binarie",
  "homosexual",
  "lesbiana",
  "gay",
  "bisexual",
  "sexualidad"
];

function normalize(value: string | undefined | null): string {
  if (!value) {
    return "";
  }
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function approachKeywordListsForSegments(preferredApproachRaw: string): string[][] {
  const normAll = normalize(preferredApproachRaw);
  if (!normAll) {
    return [];
  }
  if (normAll.includes("no estoy seguro") || normAll.includes("recomiende el profesional")) {
    return [];
  }
  const segments = preferredApproachRaw
    .split(/\n+/)
    .map((line) => normalize(line.trim()))
    .filter(Boolean);
  if (segments.length === 0) {
    return [];
  }
  const lists: string[][] = [];
  for (const seg of segments) {
    const keywords =
      APPROACH_KEYWORDS[seg]
      ?? (seg.includes("cognitiv") || seg.includes("tcc")
        ? APPROACH_KEYWORDS.tcc
        : seg.includes("psicodin")
          ? APPROACH_KEYWORDS.psicodinamico
          : seg.includes("human")
            ? APPROACH_KEYWORDS.integrativo
            : seg.includes("sistemic") || seg.includes("familiar")
              ? APPROACH_KEYWORDS.integrativo
              : seg.includes("integr")
                ? APPROACH_KEYWORDS.integrativo
                : []);
    if (keywords.length > 0) {
      lists.push(keywords);
    }
  }
  return lists;
}

function professionalMatchesApproachPreferences(preferredApproachRaw: string, therapeuticApproach: string | null | undefined): boolean {
  const approachText = normalize(therapeuticApproach ?? "");
  const lists = approachKeywordListsForSegments(preferredApproachRaw);
  return lists.some((keywords) => keywords.some((keyword) => approachText.includes(keyword)));
}

function hasSpecificTherapyApproachPreference(preferredApproachRaw: string): boolean {
  const normAll = normalize(preferredApproachRaw);
  if (!normAll) {
    return false;
  }
  return !normAll.includes("no estoy seguro") && !normAll.includes("recomiende el profesional");
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function localize(language: AppLanguage, values: { es: string; en: string; pt: string }): string {
  if (language === "en") {
    return values.en;
  }
  if (language === "pt") {
    return values.pt;
  }
  return values.es;
}

function localizeReason(language: AppLanguage, values: { es: string; en: string; pt: string }): string {
  return localize(language, values);
}

export function extractPatientTopics(answers: Record<string, string>): TopicKey[] {
  const mainReasonRaw = answers.mainReason ?? "";
  const goalText = normalize(answers.therapyGoal);
  const emotionalState = normalize(answers.emotionalState);
  const combined = `${goalText} ${emotionalState}`;
  const topics: TopicKey[] = [];

  const mainParts = mainReasonRaw
    .split(/\n+/)
    .map((piece) => normalize(piece))
    .filter(Boolean);
  for (const part of mainParts) {
    const mapped = MAIN_REASON_TO_TOPIC[part];
    if (mapped) {
      topics.push(mapped);
    }
  }

  (Object.keys(TOPIC_KEYWORDS) as TopicKey[]).forEach((topic) => {
    if (TOPIC_KEYWORDS[topic].some((keyword) => combined.includes(keyword))) {
      topics.push(topic);
    }
  });

  return unique(topics);
}

function extractProfessionalTopics(professional: MatchCardProfessional): TopicKey[] {
  const focusAreasText = (professional.focusAreas ?? []).join(" ");
  const haystack = normalize(
    `${professional.specialization ?? ""} ${professional.focusPrimary ?? ""} ${focusAreasText} ${professional.therapeuticApproach ?? ""} ${professional.bio ?? ""} ${professional.title}`
  );
  const topics: TopicKey[] = [];

  (Object.keys(TOPIC_KEYWORDS) as TopicKey[]).forEach((topic) => {
    if (TOPIC_KEYWORDS[topic].some((keyword) => haystack.includes(keyword))) {
      topics.push(topic);
    }
  });

  return unique(topics);
}

type AvailabilityWindow = "morning" | "afternoon" | "evening";

export function parseAvailabilityWindows(answer: string): Set<AvailabilityWindow> {
  const norm = normalize(answer);
  const windows = new Set<AvailabilityWindow>();
  if (!norm || norm === "flexible" || norm.includes("flexible") || norm.includes("cualquier") || norm.includes("any")) {
    return windows;
  }
  if (
    norm.includes("manana")
    || norm.includes("morning")
    || norm.includes("manha")
    || norm.includes("temprano")
    || norm.includes("early")
  ) {
    windows.add("morning");
  }
  if (
    norm.includes("tarde")
    || norm.includes("afternoon")
    || norm.includes("siesta")
    || norm.includes("after lunch")
    || norm.includes("media tarde")
  ) {
    windows.add("afternoon");
  }
  if (
    norm.includes("noche")
    || norm.includes("evening")
    || norm.includes("night")
    || norm.includes("noite")
    || norm.includes("despues del trabajo")
    || norm.includes("late")
    || norm.includes("tardecita")
  ) {
    windows.add("evening");
  }
  return windows;
}

function slotMatchesWindows(slot: TimeSlot, windows: Set<AvailabilityWindow>): boolean {
  if (windows.size === 0) {
    return true;
  }
  const hour = new Date(slot.startsAt).getHours();
  if (windows.has("morning") && hour >= 6 && hour < 12) return true;
  if (windows.has("afternoon") && hour >= 12 && hour < 18) return true;
  if (windows.has("evening") && hour >= 18 && hour <= 23) return true;
  return false;
}

function sortFutureSlots(slots: TimeSlot[]): TimeSlot[] {
  const now = Date.now();
  return [...slots]
    .filter((slot) => new Date(slot.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

type LanguageCode = "es" | "en" | "pt";

export interface LanguagePreference {
  preferred: Set<LanguageCode>;
  bilingual: boolean;
}

export function parseLanguagePreference(answer: string): LanguagePreference {
  const norm = normalize(answer);
  const preferred = new Set<LanguageCode>();
  let bilingual = false;
  if (!norm) return { preferred, bilingual };
  if (norm.includes("biling") || norm.includes("multiling")) {
    bilingual = true;
  }
  if (
    norm.includes("espanol")
    || norm.includes("spanish")
    || /\bes\b/.test(norm)
    || norm.includes("castellano")
  ) {
    preferred.add("es");
  }
  if (norm.includes("ingles") || norm.includes("english") || /\ben\b/.test(norm)) {
    preferred.add("en");
  }
  if (
    norm.includes("portugu")
    || norm.includes("portuguese")
    || /\bpt\b/.test(norm)
    || /\bbr\b/.test(norm)
  ) {
    preferred.add("pt");
  }
  return { preferred, bilingual };
}

function professionalSpeaksLanguage(professional: MatchCardProfessional, code: LanguageCode): boolean {
  const codeMap: Record<LanguageCode, string[]> = {
    es: ["es", "espanol", "spanish", "castellano"],
    en: ["en", "english", "ingles"],
    pt: ["pt", "portugues", "portuguese", "br"]
  };
  const aliases = codeMap[code];
  return professional.languages.some((raw) => {
    const normLang = normalize(raw);
    return aliases.some((alias) => normLang.includes(alias));
  });
}

export interface TherapistPrefsParsed {
  exclusive: boolean;
  gender: string;
  age: string;
  lgbtq: string;
}

const THERAPIST_PREF_EXCLUSIVE_ES = "No tengo preferencias";
const TH_PREFIX_G = "Género del/de la psicólogo/a: ";
const TH_PREFIX_AGE = "Edad aproximada del/de la psicólogo/a: ";
const TH_PREFIX_LGBT = "Experiencia en temas LGBTIQ+: ";
const TH_LEGACY_PREFIXES = {
  gender: "Género: ",
  age: "Edad aproximada: ",
  lgbt: "LGBTIQ+: "
};

export function parseTherapistPreferencesAnswer(raw: string | undefined | null): TherapistPrefsParsed {
  const empty: TherapistPrefsParsed = {
    exclusive: false,
    gender: "Sin preferencia",
    age: "Sin preferencia",
    lgbtq: "Sin preferencia"
  };
  if (!raw) return empty;
  const trimmed = raw.trim();
  if (!trimmed) return empty;
  if (trimmed === THERAPIST_PREF_EXCLUSIVE_ES) {
    return { ...empty, exclusive: true };
  }
  let gender = empty.gender;
  let age = empty.age;
  let lgbtq = empty.lgbtq;
  for (const piece of trimmed
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)) {
    if (piece.startsWith(TH_PREFIX_G)) {
      gender = piece.slice(TH_PREFIX_G.length).trim() || gender;
    } else if (piece.startsWith(TH_LEGACY_PREFIXES.gender)) {
      gender = piece.slice(TH_LEGACY_PREFIXES.gender.length).trim() || gender;
    } else if (piece.startsWith(TH_PREFIX_AGE)) {
      age = piece.slice(TH_PREFIX_AGE.length).trim() || age;
    } else if (piece.startsWith(TH_LEGACY_PREFIXES.age)) {
      age = piece.slice(TH_LEGACY_PREFIXES.age.length).trim() || age;
    } else if (piece.startsWith(TH_PREFIX_LGBT)) {
      lgbtq = piece.slice(TH_PREFIX_LGBT.length).trim() || lgbtq;
    } else if (piece.startsWith(TH_LEGACY_PREFIXES.lgbt)) {
      lgbtq = piece.slice(TH_LEGACY_PREFIXES.lgbt.length).trim() || lgbtq;
    }
  }
  return { exclusive: false, gender, age, lgbtq };
}

function therapistGenderMatches(prefGender: string, professionalGender: string | null | undefined): boolean | null {
  const pref = normalize(prefGender);
  if (!pref || pref === "sin preferencia") return null;
  const proGender = normalize(professionalGender ?? "");
  if (!proGender) return null;
  if (pref === "hombre" || pref === "varon" || pref === "masculino" || pref === "man" || pref === "male") {
    return proGender.includes("hombre") || proGender.includes("varon") || proGender.includes("masculino") || proGender.includes("man") || proGender.includes("male");
  }
  if (pref === "mujer" || pref === "femenino" || pref === "woman" || pref === "female") {
    return proGender.includes("mujer") || proGender.includes("femenino") || proGender.includes("woman") || proGender.includes("female");
  }
  return null;
}

function estimateProfessionalAge(graduationYear: number | null | undefined): number | null {
  if (!graduationYear || !Number.isFinite(graduationYear)) return null;
  const now = new Date().getFullYear();
  const estimated = now - graduationYear + 24;
  if (estimated < 22 || estimated > 100) return null;
  return estimated;
}

function therapistAgeMatches(prefAge: string, graduationYear: number | null | undefined): boolean | null {
  const pref = normalize(prefAge);
  if (!pref || pref === "sin preferencia") return null;
  const estimated = estimateProfessionalAge(graduationYear);
  if (estimated == null) return null;
  const range = pref.match(/(\d+)\s*(?:a|to|-)\s*(\d+)/);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    if (Number.isFinite(lo) && Number.isFinite(hi)) {
      return estimated >= lo - 2 && estimated <= hi + 2;
    }
  }
  if (pref.includes("75") && (pref.includes("o mas") || pref.includes("o más") || pref.includes("or older") || pref.includes("ou mais"))) {
    return estimated >= 73;
  }
  return null;
}

function professionalHasLgbtFocus(professional: MatchCardProfessional): boolean {
  const focusAreasText = (professional.focusAreas ?? []).join(" ");
  const haystack = normalize(
    `${focusAreasText} ${professional.bio ?? ""} ${professional.therapeuticApproach ?? ""} ${professional.specialization ?? ""}`
  );
  if (!haystack) return false;
  return LGBT_KEYWORDS.some((kw) => haystack.includes(kw));
}

interface TherapistPrefsScoreResult {
  delta: number;
  reasons: string[];
}

function scoreTherapistPreferences(
  prefs: TherapistPrefsParsed,
  professional: MatchCardProfessional,
  language: AppLanguage
): TherapistPrefsScoreResult {
  const reasons: string[] = [];
  let delta = 0;
  if (prefs.exclusive) return { delta, reasons };

  const genderMatch = therapistGenderMatches(prefs.gender, professional.gender);
  if (genderMatch === true) {
    delta += 12;
    reasons.push(
      localize(language, {
        es: "Coincide con tu preferencia de género para el/la profesional.",
        en: "Matches your gender preference for the professional.",
        pt: "Coincide com sua preferência de gênero para o/a profissional."
      })
    );
  } else if (genderMatch === false) {
    delta -= 25;
  }

  const ageMatch = therapistAgeMatches(prefs.age, professional.graduationYear);
  if (ageMatch === true) {
    delta += 6;
    reasons.push(
      localize(language, {
        es: "Está dentro del rango etario que preferís.",
        en: "Falls within your preferred age range.",
        pt: "Está na faixa etária que você prefere."
      })
    );
  }

  const lgbtPref = normalize(prefs.lgbtq);
  const wantsLgbt =
    lgbtPref.includes("si") || lgbtPref.includes("yes") || lgbtPref.includes("sim")
    || lgbtPref.includes("prefiero") || lgbtPref.includes("prefer");
  if (wantsLgbt) {
    if (professionalHasLgbtFocus(professional)) {
      delta += 10;
      reasons.push(
        localize(language, {
          es: "Tiene experiencia o formación en temas LGBTIQ+.",
          en: "Has experience or training in LGBTQ+ topics.",
          pt: "Tem experiência ou formação em temas LGBTQIA+."
        })
      );
    } else {
      delta -= 3;
    }
  }

  return { delta, reasons };
}

interface LanguageScoreResult {
  delta: number;
  reasons: string[];
}

function scoreLanguage(
  preference: LanguagePreference,
  professional: MatchCardProfessional,
  language: AppLanguage
): LanguageScoreResult {
  const reasons: string[] = [];
  let delta = 0;
  const { preferred, bilingual } = preference;
  if (preferred.size === 0 && !bilingual) return { delta, reasons };

  let allMatched = true;
  let anyMatched = false;
  for (const code of preferred) {
    const speaks = professionalSpeaksLanguage(professional, code);
    if (speaks) anyMatched = true;
    else allMatched = false;
  }

  if (preferred.size > 0 && allMatched) {
    delta += preferred.size === 1 ? 12 : 14;
    const labels: Record<LanguageCode, { es: string; en: string; pt: string }> = {
      es: { es: "español", en: "Spanish", pt: "espanhol" },
      en: { es: "inglés", en: "English", pt: "inglês" },
      pt: { es: "portugués", en: "Portuguese", pt: "português" }
    };
    const list = Array.from(preferred)
      .map((c) => localize(language, labels[c]))
      .join(", ");
    reasons.push(
      localize(language, {
        es: `Atiende en ${list}.`,
        en: `Sees patients in ${list}.`,
        pt: `Atende em ${list}.`
      })
    );
  } else if (preferred.size > 0 && anyMatched) {
    delta += 4;
  } else if (preferred.size > 0 && !anyMatched) {
    delta -= 8;
  }

  if (bilingual) {
    const langCount = professional.languages.length;
    if (langCount >= 2) {
      delta += 8;
      if (preferred.size === 0) {
        reasons.push(
          localize(language, {
            es: "Atiende en más de un idioma.",
            en: "Practices in more than one language.",
            pt: "Atende em mais de um idioma."
          })
        );
      }
    } else {
      delta -= 4;
    }
  }

  return { delta, reasons };
}

export function rankProfessionalsForPatient(params: {
  professionals: MatchCardProfessional[];
  intakeAnswers?: Record<string, string> | null;
  language: AppLanguage;
}): RankedProfessional[] {
  const answers = params.intakeAnswers ?? {};
  const patientTopics = extractPatientTopics(answers);
  const availabilityWindows = parseAvailabilityWindows(answers.availability ?? "");
  const preferredApproachRaw = answers.preferredApproach ?? "";
  const languagePreference = parseLanguagePreference(answers.language ?? "");
  const previousTherapy = normalize(answers.previousTherapy);
  const therapistPrefs = parseTherapistPreferencesAnswer(answers.therapistPreferences);

  return params.professionals
    .map((professional) => {
      const professionalTopics = extractProfessionalTopics(professional);
      const matchedTopics = patientTopics.filter((topic) => professionalTopics.includes(topic));
      const suggestedSlots = sortFutureSlots(professional.slots).slice(0, 6);
      const availabilityHasWindowPreference = availabilityWindows.size > 0;
      const availabilityMatches =
        availabilityHasWindowPreference
        && suggestedSlots.some((slot) => slotMatchesWindows(slot, availabilityWindows));

      let score = 35;

      score += Math.min(36, matchedTopics.length * 14);

      if (hasSpecificTherapyApproachPreference(preferredApproachRaw)) {
        if (professionalMatchesApproachPreferences(preferredApproachRaw, professional.therapeuticApproach)) {
          score += 14;
        }
      } else {
        score += 6;
      }

      const langScore = scoreLanguage(languagePreference, professional, params.language);
      score += langScore.delta;

      if (availabilityHasWindowPreference) {
        score += availabilityMatches ? 8 : 0;
      } else {
        score += suggestedSlots.length > 0 ? 6 : 0;
      }

      if (previousTherapy.includes("mas de 1")) {
        score += professional.yearsExperience >= 8 ? 5 : 2;
      } else if (previousTherapy === "no") {
        score += professional.yearsExperience >= 5 && professional.yearsExperience <= 15 ? 4 : 2;
      }

      const prefsScore = scoreTherapistPreferences(therapistPrefs, professional, params.language);
      score += prefsScore.delta;

      score += Math.round(Math.max(0, professional.compatibilityBase) * 0.08);

      const rating = professional.ratingAverage ?? 4.2;
      score += Math.round(Math.max(0, rating - 4.2) * 4);
      score = Math.max(1, Math.min(99, score));

      const reasons: string[] = [];
      if (matchedTopics.length > 0) {
        const topicLabels = matchedTopics
          .slice(0, 2)
          .map((topic) => localize(params.language, TOPIC_LABELS[topic]))
          .join(", ");
        reasons.push(
          localizeReason(params.language, {
            es: `Experiencia en ${topicLabels}.`,
            en: `Experience in ${topicLabels}.`,
            pt: `Experiencia em ${topicLabels}.`
          })
        );
      }

      if (hasSpecificTherapyApproachPreference(preferredApproachRaw)) {
        if (professionalMatchesApproachPreferences(preferredApproachRaw, professional.therapeuticApproach)) {
          reasons.push(
            localizeReason(params.language, {
              es: "Su enfoque terapéutico coincide con alguna de tus preferencias.",
              en: "Therapeutic approach matches at least one of your preferences.",
              pt: "A abordagem terapeutica coincide com pelo menos uma das suas preferencias."
            })
          );
        }
      }

      for (const reason of langScore.reasons) reasons.push(reason);
      for (const reason of prefsScore.reasons) reasons.push(reason);

      if (availabilityHasWindowPreference && availabilityMatches) {
        reasons.push(
          localizeReason(params.language, {
            es: "Tiene horarios en tu franja horaria preferida.",
            en: "Has openings in your preferred time range.",
            pt: "Tem horarios na sua faixa preferida."
          })
        );
      }

      if (reasons.length === 0) {
        reasons.push(
          localizeReason(params.language, {
            es: "Perfil compatible según tus respuestas y disponibilidad.",
            en: "Compatible profile based on your responses and availability.",
            pt: "Perfil compativel com base nas suas respostas e disponibilidade."
          })
        );
      }

      return {
        professional,
        score,
        reasons: reasons.slice(0, 3),
        matchedTopics: matchedTopics.map((topic) => localize(params.language, TOPIC_LABELS[topic])),
        suggestedSlots
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const aNext = a.suggestedSlots[0] ? new Date(a.suggestedSlots[0].startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bNext = b.suggestedSlots[0] ? new Date(b.suggestedSlots[0].startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aNext - bNext;
    });
}
