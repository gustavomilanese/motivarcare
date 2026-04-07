import { type ChangeEvent, FormEvent, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { INTAKE_MAIN_REASON_VALUE_JOINER, intakeQuestions } from "../../app/constants";
import { DEFAULT_PROFESSIONAL_AVATAR_SRC } from "../../app/services/api";
import type { IntakeCompletionPayload, IntakeQuestion, SessionUser } from "../../app/types";
import { compressPatientAvatarDataUrl, fileToDataUrl } from "../../app/utils/imageAvatar";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function wizardHeading(title: string): string {
  return title.replace(/^\s*\d+\.\s*/, "").trim();
}

function localizeIntakeQuestion(question: IntakeQuestion, language: AppLanguage): IntakeQuestion {
  if (question.id === "mainReason") {
    return {
      ...question,
      title: t(language, {
        es: "1. ¿Cuáles son tus motivos de consulta?",
        en: "1. What are you looking for support with?",
        pt: "1. Com o que voce busca apoio?"
      }),
      help: t(language, {
        es: "Podés elegir una o más opciones.",
        en: "You can select one or more options.",
        pt: "Voce pode escolher uma ou mais opcoes."
      }),
      options: [
        t(language, { es: "Ansiedad", en: "Anxiety", pt: "Ansiedade" }),
        t(language, { es: "Depresión", en: "Depression", pt: "Depressao" }),
        t(language, { es: "Vínculos y pareja", en: "Relationships", pt: "Relacionamentos e casal" }),
        t(language, { es: "Estrés / burnout", en: "Stress / burnout", pt: "Estresse / burnout" }),
        t(language, { es: "Otro", en: "Other", pt: "Outro" })
      ]
    };
  }

  if (question.id === "therapyGoal") {
    return {
      ...question,
      title: t(language, {
        es: "2. ¿Qué objetivo te gustaría lograr en terapia?",
        en: "2. What goal would you like to achieve in therapy?",
        pt: "2. Qual objetivo voce gostaria de alcancar na terapia?"
      }),
      help: t(language, {
        es: "Esta respuesta mejora la calidad del matching.",
        en: "This answer improves matching quality.",
        pt: "Esta resposta melhora a qualidade do matching."
      })
    };
  }

  if (question.id === "preferredApproach") {
    return {
      ...question,
      title: t(language, {
        es: "3. Enfoque terapéutico preferido",
        en: "3. Preferred therapeutic approach",
        pt: "3. Abordagem terapeutica preferida"
      }),
      help: t(language, {
        es: "Si no sabes, no hay problema.",
        en: "If you are not sure, that is okay.",
        pt: "Se voce nao souber, tudo bem."
      }),
      options: [
        "CBT",
        t(language, { es: "Psicodinámico", en: "Psychodynamic", pt: "Psicodinamico" }),
        t(language, { es: "Integrativo", en: "Integrative", pt: "Integrativo" }),
        "Mindfulness",
        t(language, { es: "No estoy seguro", en: "I am not sure", pt: "Nao tenho certeza" })
      ]
    };
  }

  if (question.id === "previousTherapy") {
    return {
      ...question,
      title: t(language, {
        es: "4. Experiencia previa en terapia",
        en: "4. Previous therapy experience",
        pt: "4. Experiencia previa em terapia"
      }),
      help: t(language, {
        es: "Te ayuda a elegir ritmo y profesional.",
        en: "This helps choose pace and therapist.",
        pt: "Isso ajuda a definir ritmo e profissional."
      }),
      options: [
        t(language, { es: "No", en: "No", pt: "Nao" }),
        t(language, { es: "Sí, menos de 3 meses", en: "Yes, less than 3 months", pt: "Sim, menos de 3 meses" }),
        t(language, { es: "Sí, entre 3 y 12 meses", en: "Yes, between 3 and 12 months", pt: "Sim, entre 3 e 12 meses" }),
        t(language, { es: "Sí, más de 1 año", en: "Yes, more than 1 year", pt: "Sim, mais de 1 ano" })
      ]
    };
  }

  if (question.id === "emotionalState") {
    return {
      ...question,
      title: t(language, {
        es: "5. ¿Cómo te sentís hoy?",
        en: "5. How do you feel today?",
        pt: "5. Como voce se sente hoje?"
      }),
      help: t(language, {
        es: "Estado emocional actual.",
        en: "Current emotional state.",
        pt: "Estado emocional atual."
      }),
      options: [
        t(language, { es: "Estable", en: "Stable", pt: "Estavel" }),
        t(language, { es: "Sobrepasado", en: "Overwhelmed", pt: "Sobrecarregado" }),
        t(language, { es: "Triste", en: "Sad", pt: "Triste" }),
        t(language, { es: "Ansioso", en: "Anxious", pt: "Ansioso" }),
        t(language, { es: "No lo se", en: "I do not know", pt: "Nao sei" })
      ]
    };
  }

  if (question.id === "availability") {
    return {
      ...question,
      title: t(language, {
        es: "6. Disponibilidad horaria preferida",
        en: "6. Preferred availability",
        pt: "6. Disponibilidade horaria preferida"
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
        es: "7. Idioma para la sesión",
        en: "7. Session language",
        pt: "7. Idioma para a sessao"
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
        es: "8. Presupuesto estimado",
        en: "8. Estimated budget",
        pt: "8. Orcamento estimado"
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
        es: "9. ¿Contás con red de apoyo (familia/amigos)?",
        en: "9. Do you have a support network (family/friends)?",
        pt: "9. Voce conta com rede de apoio (familia/amigos)?"
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
        es: "10. En las últimas 2 semanas, ¿tuviste ideas de autolesión?",
        en: "10. In the last 2 weeks, have you had self-harm thoughts?",
        pt: "10. Nas ultimas 2 semanas voce teve ideias de autoagressao?"
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

  if (question.id === "profilePhoto") {
    return {
      ...question,
      title: t(language, {
        es: "11. Foto de perfil (opcional)",
        en: "11. Profile photo (optional)",
        pt: "11. Foto de perfil (opcional)"
      }),
      help: t(language, {
        es: "Tu terapeuta puede verla en el chat y en la agenda. Podés omitir este paso y subirla después desde Mi cuenta.",
        en: "Your therapist can see it in chat and scheduling. You can skip and add it later from My account.",
        pt: "Seu terapeuta pode ver no chat e na agenda. Voce pode pular e enviar depois em Minha conta."
      })
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
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState<string | null>(null);
  const [profilePhotoBusy, setProfilePhotoBusy] = useState(false);

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

  const validateCurrent = (): boolean => {
    if (!current) {
      return false;
    }
    if (current.profilePhoto || current.optional) {
      setError("");
      return true;
    }
    const value = answers[current.id]?.trim() ?? "";
    if (!value) {
      setError(
        t(props.language, {
          es: "Elegi o escribi una respuesta para continuar.",
          en: "Choose or enter an answer to continue.",
          pt: "Escolha ou escreva uma resposta para continuar."
        })
      );
      return false;
    }
    setError("");
    return true;
  };

  const goNext = () => {
    if (!validateCurrent()) {
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

  const intakeAvatarInitial = props.user.fullName.trim().charAt(0).toUpperCase() || "?";

  const handleIntakeProfilePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(
        t(props.language, {
          es: "Selecciona un archivo de imagen.",
          en: "Select an image file.",
          pt: "Selecione um arquivo de imagem."
        })
      );
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError(
        t(props.language, {
          es: "La imagen supera 4 MB.",
          en: "Image exceeds 4 MB.",
          pt: "A imagem supera 4 MB."
        })
      );
      return;
    }
    setError("");
    setProfilePhotoBusy(true);
    try {
      const raw = await fileToDataUrl(file);
      setProfilePhotoDataUrl(await compressPatientAvatarDataUrl(raw));
    } catch {
      setError(
        t(props.language, {
          es: "No se pudo leer la imagen.",
          en: "Could not read the image.",
          pt: "Nao foi possivel ler a imagem."
        })
      );
    } finally {
      setProfilePhotoBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const missing = intakeQuestions.filter(
      (question) => !question.optional && !question.profilePhoto && !answers[question.id]?.trim()
    );
    if (missing.length > 0) {
      const idx = localizedQuestions.findIndex((q) => q.id === missing[0].id);
      if (idx >= 0) {
        setStepIndex(idx);
      }
      setError(
        t(props.language, {
          es: "Completa todas las preguntas obligatorias para continuar.",
          en: "Complete all required questions to continue.",
          pt: "Complete todas as perguntas obrigatorias para continuar."
        })
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const answersForIntake = Object.fromEntries(
        Object.entries(answers).filter(([key]) => key !== "profilePhoto")
      );
      const payload: IntakeCompletionPayload = {
        answers: answersForIntake,
        profilePhotoDataUrl: profilePhotoDataUrl
      };
      await props.onComplete(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo guardar el perfil clínico. Intenta nuevamente.",
              en: "Could not save the clinical profile. Please try again.",
              pt: "Nao foi possivel salvar o perfil clínico. Tente novamente."
            })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="intake-shell intake-shell--wizard">
      <section className="intake-card intake-card--wizard">
        <div className="intake-brand">
          <span className="intake-brand-mark" aria-hidden="true">
            &gt;
          </span>
          <div className="intake-brand-copy">
            <strong>motivarcare</strong>
            <span>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
          </div>
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
                : t(props.language, { es: "Atras", en: "Back", pt: "Voltar" })}
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

              {current.profilePhoto ? (
                <div className="intake-profile-photo">
                  <div className="patient-account-avatar-row">
                    <div className="patient-account-avatar-preview">
                      {profilePhotoDataUrl ? (
                        <img
                          src={profilePhotoDataUrl}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_PROFESSIONAL_AVATAR_SRC;
                          }}
                        />
                      ) : (
                        <span className="patient-account-avatar-initial" aria-hidden>
                          {intakeAvatarInitial}
                        </span>
                      )}
                    </div>
                    <div className="patient-account-avatar-actions">
                      <label className="patient-account-avatar-upload">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={profilePhotoBusy || submitting}
                          onChange={(e) => void handleIntakeProfilePhoto(e)}
                        />
                        <span>
                          {profilePhotoBusy
                            ? t(props.language, { es: "Procesando…", en: "Processing…", pt: "Processando…" })
                            : t(props.language, { es: "Subir imagen", en: "Upload image", pt: "Enviar imagem" })}
                        </span>
                      </label>
                      {profilePhotoDataUrl ? (
                        <button
                          type="button"
                          className="ghost"
                          disabled={profilePhotoBusy || submitting}
                          onClick={() => setProfilePhotoDataUrl(null)}
                        >
                          {t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
                        </button>
                      ) : null}
                    </div>
                  </div>
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
                    es: "Escribi con tus palabras...",
                    en: "Write in your own words...",
                    pt: "Escreva com suas palavras..."
                  })}
                />
              ) : (
                <div
                  className="intake-option-grid"
                  role="group"
                  aria-label={wizardHeading(current.title)}
                  aria-multiselectable={current.allowMultiple ? true : undefined}
                >
                  {current.options?.map((option) => {
                    const multi = Boolean(current.allowMultiple);
                    const raw = answers[current.id] ?? "";
                    const selected = multi
                      ? raw
                          .split(/\n/)
                          .map((piece) => piece.trim())
                          .filter(Boolean)
                          .includes(option)
                      : raw === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`intake-option-chip ${selected ? "intake-option-chip--selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() => {
                          setError("");
                          setAnswers((prev) => {
                            if (!multi) {
                              return { ...prev, [current.id]: option };
                            }
                            const pieces = (prev[current.id] ?? "")
                              .split(/\n/)
                              .map((piece) => piece.trim())
                              .filter(Boolean);
                            const nextPieces = pieces.includes(option)
                              ? pieces.filter((p) => p !== option)
                              : [...pieces, option];
                            return {
                              ...prev,
                              [current.id]: nextPieces.join(INTAKE_MAIN_REASON_VALUE_JOINER)
                            };
                          });
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          ) : null}

          {error ? <p className="error-text intake-wizard-error">{error}</p> : null}

          <div className="intake-wizard-actions">
            <button className="ghost intake-wizard-secondary" type="button" onClick={handleCancel} disabled={submitting}>
              {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
            </button>
            {isLast ? (
              <button className="primary intake-wizard-primary" type="submit" disabled={submitting || profilePhotoBusy}>
                {submitting
                  ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                  : t(props.language, {
                      es: "Finalizar y ver profesionales",
                      en: "Finish and see professionals",
                      pt: "Finalizar e ver profissionais"
                    })}
              </button>
            ) : (
              <button
                className="primary intake-wizard-primary"
                type="button"
                onClick={goNext}
                disabled={submitting || profilePhotoBusy}
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
