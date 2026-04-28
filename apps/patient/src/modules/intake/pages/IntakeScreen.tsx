import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";

function preIntakeIntroCopy(language: AppLanguage): {
  title: string;
  body: readonly [string, string];
} {
  return {
    title: textByLanguage(language, {
      es: "Antes de las preguntas",
      en: "Before the questions",
      pt: "Antes das perguntas"
    }),
    body: [
      textByLanguage(language, {
        es: "A continuación te haremos unas breves preguntas para orientarte hacia el profesional más adecuado para tu necesidad particular.",
        en: "Next, we’ll ask you a few short questions to guide you toward the professional best suited to your particular needs.",
        pt: "Em seguida, faremos algumas perguntas breves para orientar você ao profissional mais adequado à sua necessidade."
      }),
      textByLanguage(language, {
        es: "Toda la información que nos brindes es confidencial y solo se utilizará para alimentar nuestro motor de búsqueda especialmente diseñado para lograr el mejor matcheo entre profesionales y pacientes.",
        en: "Everything you share is confidential and is only used to power our search engine, designed to achieve the best possible match between professionals and patients.",
        pt: "Todas as informações que você compartilhar são confidenciais e serão usadas apenas para alimentar nosso motor de busca, pensado para o melhor match entre profissionais e pacientes."
      })
    ] as const
  };
}
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
  isSafetyRiskFrequentlyAnswer,
  PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES,
  THERAPIST_PREF_AGE_OPTIONS_ES,
  THERAPIST_PREF_EXCLUSIVE_ES,
  THERAPIST_PREF_GENDER_OPTIONS_ES,
  THERAPIST_PREF_LGBT_OPTIONS_ES,
  buildTherapistPreferencesStored,
  parseTherapistPreferencesStored
} from "../patientClinicalIntakeQuestions";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
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
        es: "Podés marcar uno o varios.",
        en: "You can select one or more.",
        pt: "Voce pode marcar uma ou varias."
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
        es: "Elegí “No tengo preferencias” o indicá género, edad y enfoque LGBTIQ+ con los desplegables.",
        en: "Choose “I have no preferences” or set gender, age, and LGBTIQ+ focus using the dropdowns.",
        pt: "Escolha “Nao tenho preferencias” ou indique genero, idade e LGBTIQ+ nos menus."
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
      }),
      options: [
        t(language, { es: "Apoyo fuerte", en: "Strong support", pt: "Apoio forte" }),
        t(language, { es: "Apoyo limitado", en: "Limited support", pt: "Apoio limitado" }),
        t(language, { es: "Sin apoyo", en: "No support", pt: "Sem apoio" }),
        t(language, { es: "Prefiero no responder", en: "Prefer not to answer", pt: "Prefiro nao responder" })
      ]
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
      }),
      options: [
        t(language, { es: "No", en: "No", pt: "Nao" }),
        t(language, { es: "A veces", en: "Sometimes", pt: "As vezes" }),
        t(language, { es: "Frecuentemente", en: "Frequently", pt: "Frequentemente" }),
        t(language, { es: "Prefiero no responder", en: "Prefer not to answer", pt: "Prefiro nao responder" })
      ]
    };
  }

  return question;
}

export function IntakeScreen(props: {
  user: SessionUser;
  language: AppLanguage;
  /** ISO2 desde perfil (registro/login): si ya es uno de los países habilitados en portal, no repetimos el paso país. */
  profileResidencyCountryIso?: string | null;
  onComplete: (payload: IntakeCompletionPayload) => Promise<void>;
  onBack?: () => void;
  onCancel?: () => void;
  /** Sin guardar intake: cierra sesión / estado del portal (p. ej. respuesta “Frecuentemente” en seguridad). */
  onSafetyFrequentAbandon?: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const question of intakeQuestions) {
      seed[question.id] = "";
    }
    return seed;
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [crisisGate, setCrisisGate] = useState(false);
  const [safetyFrequentModal, setSafetyFrequentModal] = useState(false);
  const [residencyCountry, setResidencyCountry] = useState("");

  const presetIso = useMemo(
    () => props.profileResidencyCountryIso?.trim().toUpperCase() ?? "",
    [props.profileResidencyCountryIso]
  );

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

  const introCopy = useMemo(() => preIntakeIntroCopy(props.language), [props.language]);
  const questionCount = localizedQuestions.length;
  /** Paso 0 = intro; si hace falta país = 1; siguientes = preguntas clínicas. */
  const questionStepOffset = countryStepEnabled ? 2 : 1;
  const totalWizardSteps = (countryStepEnabled ? 2 : 1) + questionCount;
  const questionStepIndex = stepIndex >= questionStepOffset ? stepIndex - questionStepOffset : -1;
  const current = questionStepIndex >= 0 ? localizedQuestions[questionStepIndex] : null;
  const progressPct = ((stepIndex + 1) / totalWizardSteps) * 100;
  const isLast = stepIndex >= totalWizardSteps - 1;

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
    if (stepIndex === 0) {
      setError("");
      return true;
    }
    if (countryStepEnabled && stepIndex === 1) {
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

  const goNext = () => {
    if (stepIndex === 0) {
      setError("");
      setStepIndex(1);
      return;
    }
    if (countryStepEnabled && stepIndex === 1) {
      if (!validateCurrent()) {
        return;
      }
      setStepIndex(2);
      return;
    }
    if (!validateCurrent()) {
      return;
    }
    if (current?.id === "emotionalState" && isCrisisEmotionalAnswer(answers.emotionalState ?? "")) {
      setCrisisGate(true);
      return;
    }
    if (!isLast) {
      setStepIndex((s) => Math.min(s + 1, totalWizardSteps - 1));
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
      setStepIndex(countryStepEnabled ? 1 : 0);
      setError(
        t(props.language, {
          es: "Falta tu país de residencia. Volvé al paso anterior y elegí una opción.",
          en: "Your country of residence is missing. Go back one step and pick an option.",
          pt: "Falta seu pais de residencia. Volte um passo e escolha uma opcao."
        })
      );
      return;
    }

    const missing = intakeQuestions.filter((question) => !question.optional && !answers[question.id]?.trim());
    if (missing.length > 0) {
      const idx = localizedQuestions.findIndex((q) => q.id === missing[0].id);
      if (idx >= 0) {
        setStepIndex(idx + questionStepOffset);
      }
      setError("");
      return;
    }

    if (isSafetyRiskFrequentlyAnswer(answers.safetyRisk ?? "")) {
      setSafetyFrequentModal(true);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload: IntakeCompletionPayload = { answers, residencyCountry: rc };
      await props.onComplete(payload);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(friendlyIntakeSaveMessage(raw, props.language));
    } finally {
      setSubmitting(false);
    }
  };

  const dismissSafetyFrequentModal = () => {
    setSafetyFrequentModal(false);
    (props.onSafetyFrequentAbandon ?? props.onCancel)?.();
  };

  return (
    <Fragment>
    <div className="intake-shell intake-shell--wizard">
      <section className="intake-card intake-card--wizard">
        <div className="intake-brand">
          <img
            className="intake-brand-logo"
            src="/brand/motivarcare-logo-full.png"
            alt="MotivarCare"
            width={280}
            height={72}
          />
          <span className="intake-brand-context">{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
        </div>

        <div className="intake-wizard-top">
          <div className="intake-header-inline">
            <p className="intake-step-meta" aria-live="polite">
              {replaceTemplate(
                t(props.language, {
                  es: "Paso {current} de {total}",
                  en: "Step {current} of {total}",
                  pt: "Passo {current} de {total}"
                }),
                { current: String(stepIndex + 1), total: String(totalWizardSteps) }
              )}
            </p>
            <button className="intake-back-inline" type="button" onClick={stepIndex === 0 ? handleBack : goPrev}>
              <span aria-hidden="true">←</span>
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
          >
            <div className="intake-progress-track">
              <div className="intake-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <h1 className="intake-wizard-title">
            {replaceTemplate(
              t(props.language, {
                es: "{name}, armamos tu perfil",
                en: "{name}, let us build your profile",
                pt: "{name}, vamos montar seu perfil"
              }),
              { name: props.user.fullName }
            )}
          </h1>
          <span className="chip intake-wizard-chip">
            {t(props.language, {
              es: "Cuestionario inicial",
              en: "Initial questionnaire",
              pt: "Questionario inicial"
            })}
          </span>
        </div>

        <form className="intake-wizard-form" onSubmit={isLast ? handleSubmit : (e) => e.preventDefault()}>
          {stepIndex === 0 ? (
            <article className="question-card question-card--wizard intake-intro-card" key="intake-pre-questions-intro">
              <div className="intake-intro-card-accent" aria-hidden="true" />
              <div className="intake-intro-card-body">
                <div className="intake-intro-title-row">
                  <span className="intake-intro-hero-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                      />
                    </svg>
                  </span>
                  <h2 className="intake-question-title intake-intro-title">{introCopy.title}</h2>
                </div>
                <div className="intake-intro-points">
                  {introCopy.body.map((paragraph, index) => (
                    <div className="intake-intro-point" key={index}>
                      <span className="intake-intro-point-icon-wrap" aria-hidden="true">
                        {index === 0 ? (
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.65">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                            />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.65">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                            />
                          </svg>
                        )}
                      </span>
                      <p className="intake-intro-point-text">{paragraph}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ) : stepIndex === 1 && countryStepEnabled ? (
            <article className="question-card question-card--wizard" key="intake-residency">
              <h2 className="intake-question-title">
                {t(props.language, {
                  es: "País de residencia",
                  en: "Country of residence",
                  pt: "Pais de residencia"
                })}
              </h2>
              <label className="intake-select-field">
                <select
                  className="intake-select-touch"
                  aria-label={t(props.language, {
                    es: "País de residencia",
                    en: "Country of residence",
                    pt: "Pais de residencia"
                  })}
                  value={residencyCountry}
                  onChange={(event) => {
                    setError("");
                    setResidencyCountry(event.target.value);
                  }}
                >
                  <option value="">
                    {t(props.language, {
                      es: "Seleccionar…",
                      en: "Select…",
                      pt: "Selecionar…"
                    })}
                  </option>
                  {PATIENT_PORTAL_RESIDENCY_OPTIONS.map((row) => (
                    <option key={row.code} value={row.code}>
                      {row.names[props.language]}
                    </option>
                  ))}
                </select>
              </label>
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
                      <label className="intake-select-field">
                        <span className="intake-select-field-label">
                          {t(props.language, {
                            es: "Género del/de la psicólogo/a",
                            en: "Therapist gender",
                            pt: "Genero do/da psicologo/a"
                          })}
                        </span>
                        <select
                          className="intake-select-touch"
                          value={coerceTherapistOption(THERAPIST_PREF_GENDER_OPTIONS_ES, therapistPrefParsed.gender)}
                          onChange={(event) => {
                            setError("");
                            const v = event.target.value;
                            setAnswers((prev) => {
                              const p = parseTherapistPreferencesStored(prev.therapistPreferences ?? "");
                              return {
                                ...prev,
                                therapistPreferences: buildTherapistPreferencesStored(
                                  false,
                                  v,
                                  coerceTherapistOption(THERAPIST_PREF_AGE_OPTIONS_ES, p.age),
                                  coerceTherapistOption(THERAPIST_PREF_LGBT_OPTIONS_ES, p.lgbtq)
                                )
                              };
                            });
                          }}
                        >
                          {THERAPIST_PREF_GENDER_OPTIONS_ES.map((opt) => (
                            <option key={opt} value={opt}>
                              {therapistPrefGenderOptionLabel(props.language, opt)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="intake-select-field">
                        <span className="intake-select-field-label">
                          {t(props.language, {
                            es: "Edad aproximada del/de la psicólogo/a",
                            en: "Approximate age of therapist",
                            pt: "Idade aproximada do/da psicologo/a"
                          })}
                        </span>
                        <select
                          className="intake-select-touch"
                          value={coerceTherapistOption(THERAPIST_PREF_AGE_OPTIONS_ES, therapistPrefParsed.age)}
                          onChange={(event) => {
                            setError("");
                            const v = event.target.value;
                            setAnswers((prev) => {
                              const p = parseTherapistPreferencesStored(prev.therapistPreferences ?? "");
                              return {
                                ...prev,
                                therapistPreferences: buildTherapistPreferencesStored(
                                  false,
                                  coerceTherapistOption(THERAPIST_PREF_GENDER_OPTIONS_ES, p.gender),
                                  v,
                                  coerceTherapistOption(THERAPIST_PREF_LGBT_OPTIONS_ES, p.lgbtq)
                                )
                              };
                            });
                          }}
                        >
                          {THERAPIST_PREF_AGE_OPTIONS_ES.map((opt) => (
                            <option key={opt} value={opt}>
                              {therapistPrefAgeOptionLabel(props.language, opt)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="intake-select-field">
                        <span className="intake-select-field-label">
                          {t(props.language, {
                            es: "Experiencia en temas LGBTIQ+",
                            en: "Experience with LGBTIQ+ topics",
                            pt: "Experiencia em temas LGBTIQ+"
                          })}
                        </span>
                        <select
                          className="intake-select-touch"
                          value={coerceTherapistOption(THERAPIST_PREF_LGBT_OPTIONS_ES, therapistPrefParsed.lgbtq)}
                          onChange={(event) => {
                            setError("");
                            const v = event.target.value;
                            setAnswers((prev) => {
                              const p = parseTherapistPreferencesStored(prev.therapistPreferences ?? "");
                              return {
                                ...prev,
                                therapistPreferences: buildTherapistPreferencesStored(
                                  false,
                                  coerceTherapistOption(THERAPIST_PREF_GENDER_OPTIONS_ES, p.gender),
                                  coerceTherapistOption(THERAPIST_PREF_AGE_OPTIONS_ES, p.age),
                                  v
                                )
                              };
                            });
                          }}
                        >
                          {THERAPIST_PREF_LGBT_OPTIONS_ES.map((opt) => (
                            <option key={opt} value={opt}>
                              {therapistPrefLgbtOptionLabel(props.language, opt)}
                            </option>
                          ))}
                        </select>
                      </label>
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
                    className="intake-option-grid"
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
                      const sub = current.optionSubtexts?.[optIdx];
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`intake-option-chip ${selected ? "intake-option-chip--selected" : ""}${isCrisisChip ? " intake-option-chip--crisis" : ""}`}
                          aria-pressed={selected}
                          onClick={() => {
                            setError("");
                            if (!multi && current.id === "safetyRisk" && isSafetyRiskFrequentlyAnswer(option)) {
                              setAnswers((prev) => ({ ...prev, [current.id]: option }));
                              setSafetyFrequentModal(true);
                              return;
                            }
                            setAnswers((prev) => {
                              const id = current.id;
                              const prevRaw = prev[id] ?? "";
                              let pcs = intakePieces(prevRaw);
                              const base = intakeQuestions.find((q) => q.id === id);
                              const exclusiveEs = base?.exclusiveOptionEs;
                              if (!multi) {
                                return { ...prev, [id]: option };
                              }
                              if (exclusiveEs && option === exclusiveEs) {
                                return { ...prev, [id]: exclusiveEs };
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
                                return { ...prev, [id]: next.join(INTAKE_MAIN_REASON_VALUE_JOINER) };
                              }
                              return { ...prev, [id]: [...pcs, option].join(INTAKE_MAIN_REASON_VALUE_JOINER) };
                            });
                          }}
                        >
                          <span className="intake-option-chip-label">{option}</span>
                          {sub ? <span className="intake-option-chip-sub">{sub}</span> : null}
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

          <div className="intake-wizard-actions">
            <button className="ghost intake-wizard-secondary" type="button" onClick={handleCancel} disabled={submitting}>
              {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
            </button>
            {isLast ? (
              <button className="primary intake-wizard-primary" type="submit" disabled={submitting}>
                {submitting
                  ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                  : t(props.language, {
                      es: "Finalizar cuestionario",
                      en: "Finish questionnaire",
                      pt: "Finalizar questionario"
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

    {safetyFrequentModal ? (
      <div
        className="session-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-safety-frequent-title"
      >
        <div className="session-modal intake-safety-frequent-modal" onClick={(e) => e.stopPropagation()}>
          <h2 id="intake-safety-frequent-title" className="intake-question-title">
            {t(props.language, {
              es: "Apoyo inmediato",
              en: "Immediate support",
              pt: "Apoio imediato"
            })}
          </h2>
          <p className="intake-question-help">
            {t(props.language, {
              es: "Lo que estás sintiendo es importante y no tenés que afrontarlo solo/a. En este momento, lo más recomendable es buscar ayuda inmediata a través de un servicio de emergencia, una línea de apoyo en crisis o una persona de confianza que pueda acompañarte ahora.",
              en: "What you are feeling matters, and you do not have to face it alone. Right now, the safest next step is to reach an emergency service, a crisis helpline, or a trusted person who can be with you.",
              pt: "O que voce esta sentindo importa e voce nao precisa enfrentar isso sozinho/a. Agora, o mais seguro e buscar um servico de emergencia, uma linha de crise ou uma pessoa de confianca que possa estar com voce."
            })}
          </p>
          <p className="intake-question-help intake-safety-frequent-subhead">
            {t(props.language, {
              es: "Argentina — recursos",
              en: "Argentina — resources",
              pt: "Argentina — recursos"
            })}
          </p>
          <ul className="intake-crisis-list">
            <li>
              {t(props.language, {
                es: "Línea de apoyo al suicida y crisis: 0800-345-1435 (gratis, las 24 h).",
                en: "Suicide and crisis support line: 0800-345-1435 (free, 24/7).",
                pt: "Linha de apoio ao suicidio e crise: 0800-345-1435 (gratuita, 24 h)."
              })}
            </li>
            <li>
              {t(props.language, {
                es: "Emergencias: 911.",
                en: "Emergencies: 911.",
                pt: "Emergencias: 911."
              })}
            </li>
          </ul>
          <p className="intake-question-help">
            {t(props.language, {
              es: "Gracias por tu tiempo. No guardamos este cuestionario; podés volver a registrarte cuando te sientas en condiciones.",
              en: "Thank you for your time. We are not saving this questionnaire—you can sign up again when you feel ready.",
              pt: "Obrigado pelo seu tempo. Nao salvamos este questionario; voce pode se registrar de novo quando se sentir preparado/a."
            })}
          </p>
          <div className="intake-wizard-actions">
            <button className="primary intake-wizard-primary" type="button" onClick={dismissSafetyFrequentModal}>
              {t(props.language, {
                es: "Entendido, salir",
                en: "OK, exit",
                pt: "Entendi, sair"
              })}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </Fragment>
  );
}
