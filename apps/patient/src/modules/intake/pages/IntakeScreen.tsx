import { FormEvent, useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { OnboardingDraftNotice } from "@therapy/ui";

import {
  PATIENT_PORTAL_RESIDENCY_CODES,
  RESIDENCY_COUNTRY_OPTIONS,
  filterResidencyOptionsForPatientPortal
} from "@therapy/types";

function isPatientPortalPresetCountry(isoUpper: string): boolean {
  return /^[A-Z]{2}$/.test(isoUpper) && (PATIENT_PORTAL_RESIDENCY_CODES as readonly string[]).includes(isoUpper);
}

const PATIENT_PORTAL_RESIDENCY_OPTIONS = filterResidencyOptionsForPatientPortal(RESIDENCY_COUNTRY_OPTIONS);
import { INTAKE_MAIN_REASON_VALUE_JOINER, intakeQuestions } from "../../app/constants";
import { friendlyIntakeSaveMessage } from "../../app/lib/friendlyPatientMessages";
import type { IntakeCompletionPayload, IntakeQuestion, SessionUser } from "../../app/types";
import {
  isSafetyRiskPositiveAnswer,
  PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID,
  PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES,
  THERAPIST_PREF_AGE_OPTIONS_ES,
  THERAPIST_PREF_EXCLUSIVE_ES,
  THERAPIST_PREF_GENDER_OPTIONS_ES,
  THERAPIST_PREF_LGBT_OPTIONS_ES,
  buildTherapistPreferencesStored,
  parseTherapistPreferencesStored
} from "../patientClinicalIntakeQuestions";
import { PatientMainReasonStep } from "../components/PatientMainReasonStep";
import { IntakeChoicePills } from "../components/IntakeChoicePills";
import { IntakeApproachCards } from "../components/IntakeApproachCards";
import { IntakeForkGuideCard } from "../components/IntakeForkGuideCard";
import { IntakeIconTiles } from "../components/IntakeIconTiles";
import { IntakeMarkedTitle } from "../components/IntakeMarkedTitle";
import { AuthBrand } from "../../auth/AuthBrand";
import { intakeOptionLabel, intakeOptionSubtext } from "../lib/intakeOptionLabels";
import { buildPatientIntakeWizardSteps, wizardStepIndexForQuestion } from "../lib/patientIntakeWizardSteps";
import {
  activateCouplesMainReason,
  activateIndividualMainReason,
  detectMainReasonCategory,
  toggleCouplesFocusAnswer,
  toggleIndividualMainReason,
  updateIndividualOtherDetail,
  sanitizeIntakeAnswersForSubmit,
  validateMainReasonAnswers
} from "../lib/patientMainReason";
import { usePatientIntakeDraft } from "../hooks/usePatientIntakeDraft";
import { requestPatientSafetyReferral } from "../services/safetyReferralApi";
import { SafetyReferralScreen } from "./SafetyReferralScreen";
import type { CountryEmergencyResources } from "@therapy/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function patientIntakeWizardName(fullName: string): string {
  return fullName
    .trim()
    .replace(/^[`'"´]+|[`'"´]+$/g, "")
    .trim();
}

function wizardHeading(title: string): string {
  return title.replace(/^\s*\d+\.\s*/, "").trim();
}

function intakePieces(raw: string): string[] {
  return raw
    .split(INTAKE_MAIN_REASON_VALUE_JOINER)
    .map((piece) => piece.trim())
    .filter(Boolean);
}

function applyIntakeOptionSelection(
  prev: Record<string, string>,
  questionId: string,
  option: string,
  multi: boolean
): Record<string, string> {
  const prevRaw = prev[questionId] ?? "";
  if (!multi) {
    return { ...prev, [questionId]: option };
  }

  let pcs = intakePieces(prevRaw);
  const base = intakeQuestions.find((q) => q.id === questionId);
  const exclusiveEs = base?.exclusiveOptionEs;
  if (exclusiveEs && option === exclusiveEs) {
    return { ...prev, [questionId]: exclusiveEs };
  }
  if (exclusiveEs && pcs.includes(exclusiveEs)) {
    pcs = pcs.filter((p) => p !== exclusiveEs);
  }
  if (pcs.includes(option)) {
    const next = pcs.filter((p) => {
      if (p === option) {
        return false;
      }
      if (base?.otherFollowupOption && option === base.otherFollowupOption) {
        return !p.startsWith(`${base.otherFollowupOption}:`);
      }
      return true;
    });
    return { ...prev, [questionId]: next.join(INTAKE_MAIN_REASON_VALUE_JOINER) };
  }
  return { ...prev, [questionId]: [...pcs, option].join(INTAKE_MAIN_REASON_VALUE_JOINER) };
}

function isCrisisEmotionalAnswer(raw: string): boolean {
  return raw.trim() === PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES;
}

function therapistPrefGenderOptionLabel(lang: AppLanguage, valueEs: string): string {
  switch (valueEs) {
    case "Sin preferencia":
      return t(lang, { es: "Sin preferencia", en: "No preference", pt: "Sem preferencia" });
    case "Hombre":
      return t(lang, { es: "Hombre", en: "Man", pt: "Homem" });
    case "Mujer":
      return t(lang, { es: "Mujer", en: "Woman", pt: "Mulher" });
    default:
      return valueEs;
  }
}

function therapistPrefAgeOptionLabel(lang: AppLanguage, valueEs: string): string {
  const labels: Record<string, LocalizedText> = {
    "Sin preferencia": { es: "Sin preferencia", en: "No preference", pt: "Sem preferencia" },
    "25 a 35": { es: "25 a 35", en: "25 to 35", pt: "25 a 35" },
    "35 a 45": { es: "35 a 45", en: "35 to 45", pt: "35 a 45" },
    "45 a 55": { es: "45 a 55", en: "45 to 55", pt: "45 a 55" },
    "55 a 65": { es: "55 a 65", en: "55 to 65", pt: "55 a 65" },
    "65 a 75": { es: "65 a 75", en: "65 to 75", pt: "65 a 75" },
    "75 o más": { es: "75 o más", en: "75 or older", pt: "75 ou mais" }
  };
  return t(lang, labels[valueEs] ?? { es: valueEs, en: valueEs, pt: valueEs });
}

function therapistPrefLgbtOptionLabel(lang: AppLanguage, valueEs: string): string {
  const labels: Record<string, LocalizedText> = {
    "Sin preferencia": { es: "Sin preferencia", en: "No preference", pt: "Sem preferencia" },
    "Sí, prefiero experiencia o formación en temas LGBTIQ+": {
      es: "Sí, prefiero experiencia o formación en temas LGBTIQ+",
      en: "Yes, I prefer experience or training in LGBTIQ+ topics",
      pt: "Sim, prefiro experiencia ou formacao em temas LGBTIQ+"
    },
    "No es un criterio para mí": {
      es: "No es un criterio para mí",
      en: "Not a criterion for me",
      pt: "Nao e um criterio para mim"
    }
  };
  return t(lang, labels[valueEs] ?? { es: valueEs, en: valueEs, pt: valueEs });
}

function coerceTherapistOption<T extends readonly string[]>(list: T, value: string): string {
  return list.includes(value as T[number]) ? value : list[0]!;
}

function localizeIntakeQuestion(question: IntakeQuestion, language: AppLanguage): IntakeQuestion {
  if (question.id === "mainReason") {
    return {
      ...question,
      title: t(language, {
        es: "1. ¿Cuáles son tus motivos principales de consulta?",
        en: "1. What are your main reasons for seeking support?",
        pt: "1. Quais sao seus principais motivos de busca?"
      }),
      help: t(language, {
        es: "Elegí un tipo de terapia y marcá uno o varios motivos.",
        en: "Choose a therapy type and select one or more reasons.",
        pt: "Escolha um tipo de terapia e marque um ou mais motivos."
      })
    };
  }

  if (question.id === "therapyGoal") {
    return {
      ...question,
      title: t(language, {
        es: "2. ¿Qué te gustaría lograr con la terapia?",
        en: "2. What would you like to achieve with therapy?",
        pt: "2. O que voce gostaria de alcancar com a terapia?"
      }),
      help: t(language, {
        es: "Podés marcar uno o varios.",
        en: "You can select one or more.",
        pt: "Voce pode marcar uma ou varias."
      })
    };
  }

  if (question.id === "therapistPreferences") {
    return {
      ...question,
      title: t(language, {
        es: "3. ¿Tenés alguna preferencia respecto de tu psicólogo/a?",
        en: "3. Do you have any preferences about your therapist?",
        pt: "3. Voce tem alguma preferencia sobre seu psicologo/a?"
      }),
      help: t(language, {
        es: "Elegí “No tengo preferencias”, o marcá género, edad y enfoque LGBTIQ+.",
        en: "Choose “I have no preferences”, or mark gender, age, and LGBTIQ+ focus.",
        pt: "Escolha “Nao tenho preferencias”, ou marque genero, idade e enfoque LGBTIQ+."
      })
    };
  }

  if (question.id === "preferredApproach") {
    return {
      ...question,
      title: t(language, {
        es: "4. ¿Qué tipo de terapia preferís?",
        en: "4. What type of therapy do you prefer?",
        pt: "4. Que tipo de terapia voce prefere?"
      }),
      help: t(language, {
        es: "Podés marcar una o varias. Si no estás seguro/a, elegí la última opción (limpia el resto).",
        en: "You can pick one or more. If unsure, pick the last option (it clears the others).",
        pt: "Voce pode marcar uma ou mais. Se nao tiver certeza, escolha a ultima opcao (limpa as demais)."
      })
    };
  }

  if (question.id === "previousTherapy") {
    return {
      ...question,
      title: t(language, {
        es: "5. ¿Ya estuviste en terapia antes?",
        en: "5. Have you been in therapy before?",
        pt: "5. Voce ja fez terapia antes?"
      }),
      help: t(language, {
        es: "Elegí la opción que mejor te represente.",
        en: "Pick the option that fits you best.",
        pt: "Escolha a opcao que melhor te representa."
      })
    };
  }

  if (question.id === "emotionalState") {
    return {
      ...question,
      title: t(language, {
        es: "6. ¿Cómo te sentís hoy?",
        en: "6. How are you feeling today?",
        pt: "6. Como voce se sente hoje?"
      }),
      help: t(language, {
        es: "Elegí la opción que mejor describa cómo estás ahora.",
        en: "Pick the option that best describes how you are right now.",
        pt: "Escolha a opcao que melhor descreve como voce esta agora."
      })
    };
  }

  if (question.id === "supportNetwork") {
    return {
      ...question,
      title: t(language, {
        es: "7. ¿Contás con red de apoyo (familia/amigos)?",
        en: "7. Do you have a support network (family/friends)?",
        pt: "7. Voce conta com rede de apoio (familia/amigos)?"
      }),
      help: t(language, {
        es: "Contexto para continuidad terapéutica.",
        en: "Context for therapy continuity.",
        pt: "Contexto para continuidade terapeutica."
      })
    };
  }

  if (question.id === "safetyRisk") {
    return {
      ...question,
      title: t(language, {
        es: "8. En las últimas 2 semanas, ¿tuviste ideas de autolesión?",
        en: "8. In the last 2 weeks, have you had self-harm thoughts?",
        pt: "8. Nas ultimas 2 semanas voce teve ideias de autoagressao?"
      }),
      help: t(language, {
        es: "Pregunta de seguridad obligatoria antes de habilitar reservas.",
        en: "Mandatory safety question before enabling bookings.",
        pt: "Pergunta obrigatoria de seguranca antes de habilitar reservas."
      })
    };
  }

  return question;
}

export function IntakeScreen(props: {
  user: SessionUser;
  language: AppLanguage;
  authToken: string;
  /** ISO2 desde perfil (registro/login): si ya es uno de los países habilitados en portal, no repetimos el paso país. */
  profileResidencyCountryIso?: string | null;
  onComplete: (payload: IntakeCompletionPayload) => Promise<void>;
  onBack?: () => void;
  onCancel?: () => void;
  /** Sin guardar intake: cierra sesión / estado del portal (respuesta de riesgo en seguridad). */
  onSafetyReferralExit?: () => void;
  /** Opción conversacional con Maca (solo paso intro). */
  onChooseMacaChat?: () => void;
  hasActiveMacaChatSession?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {
      [PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID]: ""
    };
    for (const question of intakeQuestions) {
      seed[question.id] = "";
    }
    return seed;
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [crisisGate, setCrisisGate] = useState(false);
  const [safetyReferralGate, setSafetyReferralGate] = useState(false);
  const [safetyReferralResources, setSafetyReferralResources] = useState<CountryEmergencyResources | null>(null);
  const [residencyCountry, setResidencyCountry] = useState("");

  const presetIso = useMemo(
    () => props.profileResidencyCountryIso?.trim().toUpperCase() ?? "",
    [props.profileResidencyCountryIso]
  );

  /**
   * El cuestionario se puede cortar a la mitad: el progreso viaja al servidor, así que
   * el paciente vuelve días después (o desde otro dispositivo) y sigue donde estaba.
   */
  const draft = usePatientIntakeDraft({
    authToken: props.authToken,
    stepIndex,
    answers,
    residencyCountry,
    setStepIndex,
    setAnswers,
    setResidencyCountry
  });

  const { discard: discardDraft, restored: draftRestored, status: draftStatus } = draft;

  const countryStepEnabled = useMemo(() => !isPatientPortalPresetCountry(presetIso), [presetIso]);

  useEffect(() => {
    if (isPatientPortalPresetCountry(presetIso)) {
      setResidencyCountry(presetIso);
    }
  }, [presetIso]);

  const localizedQuestions = useMemo(
    () => intakeQuestions.map((question) => localizeIntakeQuestion(question, props.language)),
    [props.language]
  );

  const questionIds = useMemo(() => localizedQuestions.map((question) => question.id), [localizedQuestions]);
  const mainReasonCategory = useMemo(
    () =>
      detectMainReasonCategory(
        answers.mainReason ?? "",
        answers[PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID] ?? ""
      ),
    [answers]
  );
  const wizardSteps = useMemo(
    () =>
      buildPatientIntakeWizardSteps({
        countryStepEnabled,
        questionIds
      }),
    [countryStepEnabled, questionIds]
  );
  const totalWizardSteps = wizardSteps.length;
  const currentWizardStep = wizardSteps[stepIndex] ?? null;
  const current =
    currentWizardStep?.kind === "question"
      ? localizedQuestions.find((question) => question.id === currentWizardStep.questionId) ?? null
      : null;
  const progressPct = ((stepIndex + 1) / totalWizardSteps) * 100;
  const isLast = stepIndex >= totalWizardSteps - 1;
  const ask = useMemo(() => {
    const markFor: Record<string, LocalizedText> = {
      mainReason: { es: "motivos", en: "reasons", pt: "motivos" },
      therapyGoal: { es: "lograr", en: "achieve", pt: "alcancar" },
      therapistPreferences: { es: "preferencia", en: "preferences", pt: "preferencia" },
      preferredApproach: { es: "terapia", en: "therapy", pt: "terapia" },
      previousTherapy: { es: "antes", en: "before", pt: "antes" },
      emotionalState: { es: "hoy", en: "today", pt: "hoje" },
      supportNetwork: { es: "apoyo", en: "support", pt: "apoio" }
    };
    if (currentWizardStep?.kind === "intro") {
      return {
        title: t(props.language, {
          es: "Unas preguntas, antes de empezar",
          en: "A few questions before we start",
          pt: "Algumas perguntas antes de comecar"
        }),
        mark: t(props.language, { es: "empezar", en: "start", pt: "comecar" }),
        help: ""
      };
    }
    if (currentWizardStep?.kind === "country") {
      return {
        title: t(props.language, {
          es: "¿En qué país vivís?",
          en: "Which country do you live in?",
          pt: "Em que pais voce mora?"
        }),
        mark: t(props.language, { es: "vivís", en: "live", pt: "mora" }),
        help: t(props.language, {
          es: "Así mostramos precios y profesionales de tu zona.",
          en: "So we can show prices and professionals for your area.",
          pt: "Assim mostramos precos e profissionais da sua regiao."
        })
      };
    }
    if (!current) {
      return { title: "", mark: "", help: "" };
    }
    return {
      title: wizardHeading(current.title),
      mark: markFor[current.id] ? t(props.language, markFor[current.id]) : "",
      help: current.help
    };
  }, [current, currentWizardStep, props.language]);

  useEffect(() => {
    // Un borrador viejo puede apuntar a un paso que ya no existe (p. ej. el país ahora sale del perfil).
    if (stepIndex > totalWizardSteps - 1) {
      setStepIndex(Math.max(0, totalWizardSteps - 1));
    }
  }, [stepIndex, totalWizardSteps]);

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    if (props.onCancel) {
      props.onCancel();
    }
  };

  const handleCancel = () => {
    if (props.onCancel) {
      props.onCancel();
      return;
    }
    if (stepIndex > 0) {
      setStepIndex(0);
      return;
    }
    handleBack();
  };

  const baseQuestion = useMemo(
    () => (current ? intakeQuestions.find((q) => q.id === current.id) : undefined),
    [current]
  );

  const validateCurrent = (): boolean => {
    if (currentWizardStep?.kind === "intro") {
      setError("");
      return true;
    }
    if (currentWizardStep?.kind === "country") {
      const iso = residencyCountry.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(iso)) {
        setError(
          t(props.language, {
            es: "Elegí un país de residencia para continuar.",
            en: "Choose a country of residence to continue.",
            pt: "Escolha um pais de residencia para continuar."
          })
        );
        return false;
      }
      setError("");
      return true;
    }
    if (!current) {
      return false;
    }
    if (current.id === "mainReason") {
      if (!validateMainReasonAnswers(answers)) {
        if (mainReasonCategory === "couples") {
          setError(
            t(props.language, {
              es: "Elegí al menos un aspecto de la pareja para continuar.",
              en: "Pick at least one relationship focus area to continue.",
              pt: "Escolha pelo menos um aspecto do casal para continuar."
            })
          );
        } else {
          setError(
            t(props.language, {
              es: "Marcá al menos un motivo de consulta o completá el detalle de «Otro».",
              en: "Select at least one reason or complete the “Other” details.",
              pt: "Marque pelo menos um motivo ou complete o detalhe de «Outro»."
            })
          );
        }
        return false;
      }
      setError("");
      return true;
    }
    if (current.optional) {
      setError("");
      return true;
    }
    const value = answers[current.id]?.trim() ?? "";
    if (!value) {
      setError(
        t(props.language, {
          es: "Para avanzar necesitamos una respuesta en este paso. Elegí una opción o escribí algo corto arriba.",
          en: "We need an answer on this step to move on. Pick an option or write something brief above.",
          pt: "Precisamos de uma resposta neste passo. Escolha uma opcao ou escreva algo acima."
        })
      );
      return false;
    }
    const follow = baseQuestion?.otherFollowupOption;
    if (follow && current.allowMultiple) {
      const pcs = intakePieces(value);
      if (pcs.includes(follow)) {
        const detail = pcs.find((p) => p.startsWith(`${follow}:`));
        if (!detail || detail.slice(follow.length + 1).trim().length === 0) {
          setError(
            t(props.language, {
              es: `Si elegiste «${follow}», especificá brevemente en el campo de texto.`,
              en: `If you picked “${follow}”, please add a short note in the text field.`,
              pt: `Se voce escolheu “${follow}”, escreva um detalhe no campo de texto.`
            })
          );
          return false;
        }
      }
    }
    setError("");
    return true;
  };

  const triggerSafetyReferral = (countryIso: string) => {
    setSafetyReferralGate(true);
    void requestPatientSafetyReferral(props.authToken, {
      residencyCountry: countryIso,
      language: props.language
    })
      .then((response) => {
        setSafetyReferralResources(response.resources);
      })
      .catch((err) => {
        console.warn("[safety-referral] email request failed:", err instanceof Error ? err.message : err);
      });
  };

  const goNext = () => {
    if (currentWizardStep?.kind === "intro") {
      setError("");
      setStepIndex((step) => Math.min(step + 1, totalWizardSteps - 1));
      return;
    }
    if (!validateCurrent()) {
      return;
    }
    if (current?.id === "emotionalState" && isCrisisEmotionalAnswer(answers.emotionalState ?? "")) {
      setCrisisGate(true);
      return;
    }
    if (current?.id === "safetyRisk" && isSafetyRiskPositiveAnswer(answers.safetyRisk ?? "")) {
      const rc = (countryStepEnabled ? residencyCountry : presetIso).trim().toUpperCase();
      triggerSafetyReferral(/^[A-Z]{2}$/.test(rc) ? rc : presetIso || "AR");
      return;
    }
    if (!isLast) {
      setStepIndex((step) => Math.min(step + 1, totalWizardSteps - 1));
    }
  };

  const goPrev = () => {
    setError("");
    setStepIndex((s) => Math.max(0, s - 1));
  };

  const therapistPrefParsed =
    current?.id === "therapistPreferences"
      ? parseTherapistPreferencesStored(answers.therapistPreferences ?? "")
      : null;

  useEffect(() => {
    if (current?.id !== "therapistPreferences") {
      return;
    }
    setAnswers((prev) => {
      if (prev.therapistPreferences?.trim()) {
        return prev;
      }
      return {
        ...prev,
        therapistPreferences: buildTherapistPreferencesStored(
          false,
          THERAPIST_PREF_GENDER_OPTIONS_ES[0],
          THERAPIST_PREF_AGE_OPTIONS_ES[0],
          THERAPIST_PREF_LGBT_OPTIONS_ES[0]
        )
      };
    });
  }, [current?.id]);

  const dismissSafetyReferral = () => {
    setSafetyReferralGate(false);
    (props.onSafetyReferralExit ?? props.onCancel)?.();
  };

  if (safetyReferralGate) {
    return (
      <SafetyReferralScreen
        language={props.language}
        residencyCountry={residencyCountry || presetIso}
        resources={safetyReferralResources}
        onExit={dismissSafetyReferral}
      />
    );
  }

  if (crisisGate) {
    return (
      <div className="intake-shell intake-shell--wizard">
        <section className="intake-card intake-card--wizard intake-crisis-card">
          <h2 className="intake-question-title">
            {t(props.language, {
              es: "Tu bienestar es lo primero",
              en: "Your wellbeing comes first",
              pt: "Seu bem-estar vem em primeiro lugar"
            })}
          </h2>
          <p className="intake-question-help">
            {t(props.language, {
              es: "Si estás en peligro inmediato o tenés pensamientos de hacerte daño, buscá ayuda ahora. No estás solo/a.",
              en: "If you are in immediate danger or having thoughts of hurting yourself, seek help now. You are not alone.",
              pt: "Se voce estiver em perigo imediato ou tiver pensamentos de se machucar, busque ajuda agora. Voce nao esta so/a."
            })}
          </p>
          <ul className="intake-crisis-list">
            <li>
              {t(props.language, {
                es: "Emergencias: llamá al número local (911, 112, etc.) o acudí a la guardia más cercana.",
                en: "Emergencies: call your local emergency number or go to the nearest ER.",
                pt: "Emergencias: ligue para o numero local ou va a emergencia mais proxima."
              })}
            </li>
            <li>
              {t(props.language, {
                es: "Argentina — Línea 135 (CABA y GBA) / 143 (crisis y prevención del suicidio).",
                en: "Argentina — 135 / 143 crisis and suicide prevention line.",
                pt: "Argentina — Linhas 135 / 143."
              })}
            </li>
            <li>
              {t(props.language, {
                es: "México — SAPTEL 55 5259 8121 (CDMX).",
                en: "Mexico — SAPTEL 55 5259 8121.",
                pt: "Mexico — SAPTEL 55 5259 8121."
              })}
            </li>
          </ul>
          <p className="intake-question-help">
            {t(props.language, {
              es: "Para seguir con el cuestionario, elegí otra opción en “¿Cómo te sentís hoy?”.",
              en: "To continue the questionnaire, pick another answer under “How are you feeling today?”.",
              pt: "Para continuar, escolha outra opcao em “Como voce se sente hoje?”."
            })}
          </p>
          <div className="intake-wizard-actions">
            <button
              className="primary intake-wizard-primary"
              type="button"
              onClick={() => {
                setCrisisGate(false);
                setAnswers((prev) => ({ ...prev, emotionalState: "" }));
              }}
            >
              {t(props.language, {
                es: "Volver al cuestionario",
                en: "Back to questionnaire",
                pt: "Voltar ao questionario"
              })}
            </button>
          </div>
        </section>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const rc = residencyCountry.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(rc)) {
      const countryStep = wizardSteps.findIndex((step) => step.kind === "country");
      setStepIndex(countryStep >= 0 ? countryStep : 0);
      setError(
        t(props.language, {
          es: "Falta tu país de residencia. Volvé al paso anterior y elegí una opción.",
          en: "Your country of residence is missing. Go back one step and pick an option.",
          pt: "Falta seu pais de residencia. Volte um passo e escolha uma opcao."
        })
      );
      return;
    }

    if (mainReasonCategory === "couples" && !answers[PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID]?.trim()) {
      const mainReasonStep = wizardStepIndexForQuestion(wizardSteps, "mainReason");
      if (mainReasonStep >= 0) {
        setStepIndex(mainReasonStep);
      }
      setError(
        t(props.language, {
          es: "Completá los aspectos de terapia de pareja para continuar.",
          en: "Complete the couples therapy focus step to continue.",
          pt: "Complete os aspectos da terapia de casal para continuar."
        })
      );
      return;
    }

    const missing = intakeQuestions.filter((question) => !question.optional && !answers[question.id]?.trim());
    if (missing.length > 0) {
      const idx = wizardStepIndexForQuestion(wizardSteps, missing[0]!.id);
      if (idx >= 0) {
        setStepIndex(idx);
      }
      setError("");
      return;
    }

    if (isSafetyRiskPositiveAnswer(answers.safetyRisk ?? "")) {
      const rc = residencyCountry.trim().toUpperCase();
      triggerSafetyReferral(/^[A-Z]{2}$/.test(rc) ? rc : presetIso || "AR");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload: IntakeCompletionPayload = {
        answers: sanitizeIntakeAnswersForSubmit(answers),
        residencyCountry: rc
      };
      await props.onComplete(payload);
      // Cuestionario enviado: el borrador ya no sirve y no debe reaparecer.
      await discardDraft();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(friendlyIntakeSaveMessage(raw, props.language));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMainReasonCategoryChange = (category: "individual" | "couples") => {
    setError("");
    setAnswers((prev) =>
      category === "couples" ? activateCouplesMainReason(prev) : activateIndividualMainReason(prev)
    );
  };

  const isMainReasonCouplesView = current?.id === "mainReason" && mainReasonCategory === "couples";

  return (
    <div
      className={`intake-shell intake-shell--wizard intake-shell--ask${isMainReasonCouplesView ? " intake-shell--couples-focus" : ""}`}
    >
      <section className="intake-card intake-card--wizard">
        <AuthBrand />

        <div className="intake-wizard-top">
          <div className="intake-header-inline">
            <button className="intake-back-inline" type="button" onClick={stepIndex === 0 ? handleBack : goPrev}>
              {stepIndex === 0 ? null : <span aria-hidden="true">← </span>}
              {stepIndex === 0
                ? t(props.language, { es: "Salir", en: "Exit", pt: "Sair" })
                : t(props.language, { es: "Atrás", en: "Back", pt: "Voltar" })}
            </button>
          </div>

          <div
            className="intake-progress"
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalWizardSteps}
            aria-label={replaceTemplate(
              t(props.language, {
                es: "Paso {current} de {total}",
                en: "Step {current} of {total}",
                pt: "Passo {current} de {total}"
              }),
              { current: String(stepIndex + 1), total: String(totalWizardSteps) }
            )}
          >
            <div className="intake-progress-track">
              <div className="intake-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <IntakeMarkedTitle
            kicker={`${patientIntakeWizardName(props.user.fullName)}${t(props.language, {
              es: ", armamos tu perfil",
              en: ", let us build your profile",
              pt: ", vamos montar seu perfil"
            })}`}
            title={ask.title}
            mark={ask.mark}
            help={ask.help}
          />
        </div>

        <form className="intake-wizard-form" onSubmit={isLast ? handleSubmit : (e) => e.preventDefault()}>
          {currentWizardStep?.kind === "intro" ? (
            <div className="intake-fork" key="intake-pre-questions-intro">
              <IntakeForkGuideCard language={props.language} />
              {props.onChooseMacaChat ? (
                <button type="button" className="intake-fork-card intake-fork-card--maca" onClick={props.onChooseMacaChat}>
                  <img src="/brand/ds/maca.svg" alt="" />
                  <span>
                    <strong>
                      {props.hasActiveMacaChatSession
                        ? t(props.language, {
                            es: "Continuar con Maca",
                            en: "Continue with Maca",
                            pt: "Continuar com Maca"
                          })
                        : t(props.language, {
                            es: "Hablar con Maca",
                            en: "Talk with Maca",
                            pt: "Falar com a Maca"
                          })}
                    </strong>
                    <em>
                      {t(props.language, {
                        es: "Las mismas preguntas, en una charla.",
                        en: "The same questions, as a conversation.",
                        pt: "As mesmas perguntas, numa conversa."
                      })}
                    </em>
                  </span>
                </button>
              ) : null}
            </div>
          ) : currentWizardStep?.kind === "country" ? (
            <article className="question-card question-card--wizard" key="intake-residency">
              <IntakeChoicePills
                showLabel={false}
                label={t(props.language, {
                  es: "País de residencia",
                  en: "Country of residence",
                  pt: "Pais de residencia"
                })}
                options={PATIENT_PORTAL_RESIDENCY_OPTIONS.map((row) => row.code)}
                value={residencyCountry}
                labelFor={(code) =>
                  PATIENT_PORTAL_RESIDENCY_OPTIONS.find((row) => row.code === code)?.names[props.language] ?? code
                }
                onChange={(code) => {
                  setError("");
                  setResidencyCountry(code);
                }}
              />
            </article>
          ) : current?.id === "mainReason" ? (
            <PatientMainReasonStep
              language={props.language}
              title={wizardHeading(current.title)}
              help={current.help}
              mainReason={answers.mainReason ?? ""}
              couplesFocus={answers[PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID] ?? ""}
              onCategoryChange={handleMainReasonCategoryChange}
              onToggleIndividual={(option) => {
                setError("");
                setAnswers((prev) => toggleIndividualMainReason(prev, option));
              }}
              onToggleCouplesFocus={(option) => {
                setError("");
                setAnswers((prev) => toggleCouplesFocusAnswer(prev, option));
              }}
              onOtherDetailChange={(detail) => {
                setError("");
                setAnswers((prev) => updateIndividualOtherDetail(prev, detail));
              }}
            />
          ) : current?.id === "preferredApproach" ? (
            <article className="question-card question-card--wizard" key="intake-preferred-approach">
              <h2 className="intake-question-title">{wizardHeading(current.title)}</h2>
              <p className="intake-question-help">{current.help}</p>
              <IntakeApproachCards
                language={props.language}
                options={current.options ?? []}
                optionSubtexts={current.optionSubtexts}
                exclusiveOptionEs={current.exclusiveOptionEs}
                selected={new Set(intakePieces(answers.preferredApproach ?? ""))}
                onToggle={(option) => {
                  setError("");
                  setAnswers((prev) => applyIntakeOptionSelection(prev, "preferredApproach", option, true));
                }}
              />
            </article>
          ) : current?.id === "supportNetwork" || current?.id === "previousTherapy" ? (
            <article className="question-card question-card--wizard" key={`intake-${current.id}`}>
              <h2 className="intake-question-title">{wizardHeading(current.title)}</h2>
              <p className="intake-question-help">{current.help}</p>
              <IntakeIconTiles
                language={props.language}
                options={current.options ?? []}
                value={answers[current.id] ?? ""}
                columns={current.id === "previousTherapy" ? 3 : 2}
                onSelect={(option) => {
                  setError("");
                  setAnswers((prev) => ({ ...prev, [current.id]: option }));
                }}
              />
            </article>
          ) : current ? (
            <article
              className={`question-card question-card--wizard ${current.id === "safetyRisk" ? "question-card--safety" : ""}`}
              key={current.id}
            >
              <h2 className="intake-question-title">{wizardHeading(current.title)}</h2>
              <p className="intake-question-help">{current.help}</p>

              {baseQuestion?.therapistPreferenceComposite && therapistPrefParsed ? (
                <div className="intake-therapist-pref">
                  <button
                    type="button"
                    className={`intake-therapist-no-pref ${therapistPrefParsed.exclusive ? "intake-therapist-no-pref--active" : ""}`}
                    aria-pressed={therapistPrefParsed.exclusive}
                    onClick={() => {
                      setError("");
                      const p = parseTherapistPreferencesStored(answers.therapistPreferences ?? "");
                      if (p.exclusive) {
                        setAnswers((prev) => ({
                          ...prev,
                          therapistPreferences: buildTherapistPreferencesStored(
                            false,
                            THERAPIST_PREF_GENDER_OPTIONS_ES[0],
                            THERAPIST_PREF_AGE_OPTIONS_ES[0],
                            THERAPIST_PREF_LGBT_OPTIONS_ES[0]
                          )
                        }));
                        return;
                      }
                      setAnswers((prev) => ({ ...prev, therapistPreferences: THERAPIST_PREF_EXCLUSIVE_ES }));
                      setStepIndex((s) => Math.min(s + 1, totalWizardSteps - 1));
                    }}
                  >
                    {t(props.language, {
                      es: THERAPIST_PREF_EXCLUSIVE_ES,
                      en: "I have no preferences",
                      pt: "Nao tenho preferencias"
                    })}
                  </button>

                  {!therapistPrefParsed.exclusive ? (
                    <div className="intake-therapist-pref-fields">
                      <IntakeChoicePills
                        label={t(props.language, {
                          es: "Género",
                          en: "Gender",
                          pt: "Genero"
                        })}
                        options={THERAPIST_PREF_GENDER_OPTIONS_ES}
                        value={coerceTherapistOption(THERAPIST_PREF_GENDER_OPTIONS_ES, therapistPrefParsed.gender)}
                        labelFor={(option) => therapistPrefGenderOptionLabel(props.language, option)}
                        onChange={(value) => {
                          setError("");
                          setAnswers((prev) => {
                            const parsed = parseTherapistPreferencesStored(prev.therapistPreferences ?? "");
                            return {
                              ...prev,
                              therapistPreferences: buildTherapistPreferencesStored(
                                false,
                                value,
                                coerceTherapistOption(THERAPIST_PREF_AGE_OPTIONS_ES, parsed.age),
                                coerceTherapistOption(THERAPIST_PREF_LGBT_OPTIONS_ES, parsed.lgbtq)
                              )
                            };
                          });
                        }}
                      />
                      <IntakeChoicePills
                        label={t(props.language, {
                          es: "Edad",
                          en: "Age",
                          pt: "Idade"
                        })}
                        options={THERAPIST_PREF_AGE_OPTIONS_ES}
                        value={coerceTherapistOption(THERAPIST_PREF_AGE_OPTIONS_ES, therapistPrefParsed.age)}
                        labelFor={(option) => therapistPrefAgeOptionLabel(props.language, option)}
                        onChange={(value) => {
                          setError("");
                          setAnswers((prev) => {
                            const parsed = parseTherapistPreferencesStored(prev.therapistPreferences ?? "");
                            return {
                              ...prev,
                              therapistPreferences: buildTherapistPreferencesStored(
                                false,
                                coerceTherapistOption(THERAPIST_PREF_GENDER_OPTIONS_ES, parsed.gender),
                                value,
                                coerceTherapistOption(THERAPIST_PREF_LGBT_OPTIONS_ES, parsed.lgbtq)
                              )
                            };
                          });
                        }}
                      />
                      <IntakeChoicePills
                        label={t(props.language, {
                          es: "Temas LGBTIQ+",
                          en: "LGBTIQ+ topics",
                          pt: "Temas LGBTIQ+"
                        })}
                        options={THERAPIST_PREF_LGBT_OPTIONS_ES}
                        value={coerceTherapistOption(THERAPIST_PREF_LGBT_OPTIONS_ES, therapistPrefParsed.lgbtq)}
                        labelFor={(option) => therapistPrefLgbtOptionLabel(props.language, option)}
                        onChange={(value) => {
                          setError("");
                          setAnswers((prev) => {
                            const parsed = parseTherapistPreferencesStored(prev.therapistPreferences ?? "");
                            return {
                              ...prev,
                              therapistPreferences: buildTherapistPreferencesStored(
                                false,
                                coerceTherapistOption(THERAPIST_PREF_GENDER_OPTIONS_ES, parsed.gender),
                                coerceTherapistOption(THERAPIST_PREF_AGE_OPTIONS_ES, parsed.age),
                                value
                              )
                            };
                          });
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : current.multiline ? (
                <textarea
                  className="intake-textarea-touch"
                  rows={4}
                  value={answers[current.id]}
                  onChange={(event) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [current.id]: event.target.value
                    }))
                  }
                  placeholder={t(props.language, {
                    es: "Escribí con tus palabras...",
                    en: "Write in your own words...",
                    pt: "Escreva com suas palavras..."
                  })}
                />
              ) : (
                <>
                  <div
                    className={`intake-option-grid${
                      current.id === "emotionalState"
                        ? " intake-option-grid--mood"
                        : current.id === "safetyRisk"
                          ? " intake-option-grid--safety"
                          : " intake-option-grid--choice"
                    }`}
                    role="group"
                    aria-label={wizardHeading(current.title)}
                    aria-multiselectable={current.allowMultiple ? true : undefined}
                  >
                    {current.options?.map((option, optIdx) => {
                      const multi = Boolean(current.allowMultiple);
                      const raw = answers[current.id] ?? "";
                      const pieces = intakePieces(raw);
                      const follow = current.otherFollowupOption;
                      const selected = multi
                        ? pieces.includes(option) ||
                          Boolean(follow && option === follow && pieces.some((p) => p.startsWith(`${follow}:`)))
                        : raw === option;
                      const isCrisisChip =
                        Boolean(current.crisisLastOption) &&
                        current.options &&
                        optIdx === current.options.length - 1;
                      const isProvisional = Boolean(current.exclusiveOptionEs) && option === current.exclusiveOptionEs;
                      const isSafetyNote = current.id === "safetyRisk" && isSafetyRiskPositiveAnswer(option);
                      const sub = current.optionSubtexts?.[optIdx];
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`intake-option-chip ${selected ? "intake-option-chip--selected" : ""}${isCrisisChip ? " intake-option-chip--crisis" : ""}${isProvisional ? " intake-option-chip--provisional" : ""}${isSafetyNote ? " intake-option-chip--safety-note" : ""}`}
                          aria-pressed={selected}
                          onClick={() => {
                            setError("");
                            if (!multi && current.id === "safetyRisk" && isSafetyRiskPositiveAnswer(option)) {
                              setAnswers((prev) => ({ ...prev, [current.id]: option }));
                              const rc = (countryStepEnabled ? residencyCountry : presetIso).trim().toUpperCase();
                              triggerSafetyReferral(/^[A-Z]{2}$/.test(rc) ? rc : presetIso || "AR");
                              return;
                            }
                            setAnswers((prev) => applyIntakeOptionSelection(prev, current.id, option, multi));
                          }}
                        >
                          <span className="intake-option-chip-label">
                            {intakeOptionLabel(props.language, option)}
                          </span>
                          {sub || intakeOptionSubtext(props.language, option) ? (
                            <span className="intake-option-chip-sub">
                              {intakeOptionSubtext(props.language, option) ?? sub}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {current.otherFollowupOption &&
                  intakePieces(answers[current.id] ?? "").some(
                    (p) => p === current.otherFollowupOption || p.startsWith(`${current.otherFollowupOption}:`)
                  ) ? (
                    <label className="intake-other-followup">
                      <span className="intake-question-help">
                        {t(props.language, {
                          es: "Detalle (obligatorio si elegiste «Otro»)",
                          en: "Details (required if you picked “Other”)",
                          pt: "Detalhes (obrigatorio se escolheu “Outro”)"
                        })}
                      </span>
                      <textarea
                        className="intake-textarea-touch"
                        rows={3}
                        value={(() => {
                          const mark = current.otherFollowupOption!;
                          const hit = intakePieces(answers[current.id] ?? "").find((p) => p.startsWith(`${mark}:`));
                          return hit ? hit.slice(mark.length + 1).trim() : "";
                        })()}
                        onChange={(event) => {
                          const mark = current.otherFollowupOption!;
                          const v = event.target.value;
                          setAnswers((prev) => {
                            const pcs = intakePieces(prev[current.id] ?? "").filter(
                              (p) => p !== mark && !p.startsWith(`${mark}:`)
                            );
                            const trimmed = v.trim();
                            const next = trimmed ? [...pcs, `${mark}: ${v}`] : pcs;
                            return { ...prev, [current.id]: next.join(INTAKE_MAIN_REASON_VALUE_JOINER) };
                          });
                        }}
                        placeholder={t(props.language, {
                          es: "Escribí brevemente…",
                          en: "Briefly describe…",
                          pt: "Descreva brevemente…"
                        })}
                      />
                    </label>
                  ) : null}
                </>
              )}
            </article>
          ) : null}

          {error ? <p className="error-text intake-wizard-error">{error}</p> : null}

          <OnboardingDraftNotice
            language={props.language}
            status={draftStatus}
            restored={draftRestored}
          />

          <div className="intake-wizard-actions">
            <button className="intake-cancel-link" type="button" onClick={handleCancel} disabled={submitting}>
              {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
            </button>
            {isLast ? (
              <button className="primary intake-wizard-primary" type="submit" disabled={submitting}>
                {submitting
                  ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                  : t(props.language, {
                      es: "Listo",
                      en: "Done",
                      pt: "Pronto"
                    })}
              </button>
            ) : (
              <button
                className="primary intake-wizard-primary"
                type="button"
                onClick={goNext}
                disabled={submitting}
              >
                {t(props.language, { es: "Continuar", en: "Continue", pt: "Continuar" })}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
