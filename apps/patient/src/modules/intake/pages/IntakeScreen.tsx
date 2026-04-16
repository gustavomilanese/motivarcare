import { FormEvent, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { INTAKE_MAIN_REASON_VALUE_JOINER, intakeQuestions } from "../../app/constants";
import { friendlyIntakeSaveMessage } from "../../app/lib/friendlyPatientMessages";
import type { IntakeCompletionPayload, IntakeQuestion, SessionUser } from "../../app/types";
import { PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES } from "../patientClinicalIntakeQuestions";

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
        es: "Marcá lo que aplique, o elegí “No tengo preferencias”.",
        en: "Select what applies, or choose “I have no preferences”.",
        pt: "Marque o que se aplica ou escolha “Nao tenho preferencias”."
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
        es: "Elegí una opción. Si no estás seguro/a, podés dejarlo en manos del profesional.",
        en: "Choose one. If unsure, you can leave it to the professional.",
        pt: "Escolha uma opcao. Se nao tiver certeza, deixe a cargo do profissional."
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

  if (question.id === "availability") {
    return {
      ...question,
      title: t(language, {
        es: "7. Disponibilidad horaria preferida",
        en: "7. Preferred availability",
        pt: "7. Disponibilidade horaria preferida"
      }),
      help: t(language, {
        es: "Para mostrarte los mejores slots disponibles.",
        en: "To show the best available slots.",
        pt: "Para mostrar os melhores horarios disponiveis."
      }),
      options: [
        t(language, { es: "Por la mañana", en: "Morning", pt: "Manhã" }),
        t(language, { es: "Tarde", en: "Afternoon", pt: "Tarde" }),
        t(language, { es: "Noche", en: "Evening", pt: "Noite" }),
        t(language, { es: "Flexible", en: "Flexible", pt: "Flexivel" })
      ]
    };
  }

  if (question.id === "language") {
    return {
      ...question,
      title: t(language, {
        es: "8. Idioma para la sesión",
        en: "8. Session language",
        pt: "8. Idioma para a sessao"
      }),
      help: t(language, {
        es: "Se usa para el matching.",
        en: "Used for matching.",
        pt: "Usado para o matching."
      }),
      options: [
        t(language, { es: "Inglés", en: "English", pt: "Ingles" }),
        t(language, { es: "Español", en: "Spanish", pt: "Espanhol" }),
        t(language, { es: "Bilingüe", en: "Bilingual", pt: "Bilingue" })
      ]
    };
  }

  if (question.id === "budget") {
    return {
      ...question,
      title: t(language, {
        es: "9. Presupuesto estimado",
        en: "9. Estimated budget",
        pt: "9. Orcamento estimado"
      }),
      help: t(language, {
        es: "Luego podrás elegir paquetes de sesiones.",
        en: "You can choose session packages afterwards.",
        pt: "Depois voce podera escolher pacotes de sessoes."
      }),
      options: [
        t(language, { es: "Paquete inicial", en: "Starter package", pt: "Pacote inicial" }),
        t(language, { es: "Paquete intermedio", en: "Growth package", pt: "Pacote intermediario" }),
        t(language, { es: "Paquete intensivo", en: "Intensive package", pt: "Pacote intensivo" }),
        t(language, { es: "No estoy seguro", en: "I am not sure", pt: "Nao tenho certeza" })
      ]
    };
  }

  if (question.id === "supportNetwork") {
    return {
      ...question,
      title: t(language, {
        es: "10. ¿Contás con red de apoyo (familia/amigos)?",
        en: "10. Do you have a support network (family/friends)?",
        pt: "10. Voce conta com rede de apoio (familia/amigos)?"
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
        es: "11. En las últimas 2 semanas, ¿tuviste ideas de autolesión?",
        en: "11. In the last 2 weeks, have you had self-harm thoughts?",
        pt: "11. Nas ultimas 2 semanas voce teve ideias de autoagressao?"
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
  onComplete: (payload: IntakeCompletionPayload) => Promise<void>;
  onBack?: () => void;
  onCancel?: () => void;
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

  const localizedQuestions = useMemo(
    () => intakeQuestions.map((question) => localizeIntakeQuestion(question, props.language)),
    [props.language]
  );

  const totalSteps = localizedQuestions.length;
  const current = localizedQuestions[stepIndex];
  const progressPct = ((stepIndex + 1) / totalSteps) * 100;
  const isLast = stepIndex >= totalSteps - 1;

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
    if (!validateCurrent()) {
      return;
    }
    if (current?.id === "emotionalState" && isCrisisEmotionalAnswer(answers.emotionalState ?? "")) {
      setCrisisGate(true);
      return;
    }
    if (!isLast) {
      setStepIndex((s) => Math.min(s + 1, totalSteps - 1));
    }
  };

  const goPrev = () => {
    setError("");
    setStepIndex((s) => Math.max(0, s - 1));
  };

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

    const missing = intakeQuestions.filter((question) => !question.optional && !answers[question.id]?.trim());
    if (missing.length > 0) {
      const idx = localizedQuestions.findIndex((q) => q.id === missing[0].id);
      if (idx >= 0) {
        setStepIndex(idx);
      }
      setError(
        t(props.language, {
          es: "Falta alguna pregunta obligatoria. Te llevamos a la primera pendiente: completala y tocá continuar.",
          en: "A required question is still missing. We’ve jumped you to the first one—complete it and continue.",
          pt: "Falta alguma pergunta obrigatoria. Levamos voce a primeira pendente: complete e continue."
        })
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload: IntakeCompletionPayload = { answers };
      await props.onComplete(payload);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(friendlyIntakeSaveMessage(raw, props.language));
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
                { current: String(stepIndex + 1), total: String(totalSteps) }
              )}
            </p>
            <button className="intake-back-inline" type="button" onClick={stepIndex === 0 ? handleBack : goPrev}>
              <span aria-hidden="true">←</span>
              {stepIndex === 0
                ? t(props.language, { es: "Salir", en: "Exit", pt: "Sair" })
                : t(props.language, { es: "Atrás", en: "Back", pt: "Voltar" })}
            </button>
          </div>

          <div className="intake-progress" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={totalSteps}>
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
          {current ? (
            <article
              className={`question-card question-card--wizard ${current.id === "safetyRisk" ? "question-card--safety" : ""}`}
              key={current.id}
            >
              <h2 className="intake-question-title">{wizardHeading(current.title)}</h2>
              <p className="intake-question-help">{current.help}</p>

              {current.multiline ? (
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
  );
}
