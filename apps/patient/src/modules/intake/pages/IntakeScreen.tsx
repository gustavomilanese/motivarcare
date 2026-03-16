import { FormEvent, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { intakeQuestions } from "../../app/constants";
import type { IntakeQuestion, SessionUser } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function localizeIntakeQuestion(question: IntakeQuestion, language: AppLanguage): IntakeQuestion {
  if (question.id === "mainReason") {
    return {
      ...question,
      title: t(language, {
        es: "1. Cual es tu motivo principal de consulta?",
        en: "1. What is your main reason for consulting?",
        pt: "1. Qual e seu principal motivo de consulta?"
      }),
      help: t(language, {
        es: "Selecciona lo que mejor describa tu necesidad actual.",
        en: "Select what best describes your current need.",
        pt: "Selecione o que melhor descreve sua necessidade atual."
      }),
      options: [
        t(language, { es: "Ansiedad", en: "Anxiety", pt: "Ansiedade" }),
        t(language, { es: "Depresion", en: "Depression", pt: "Depressao" }),
        t(language, { es: "Vinculos y pareja", en: "Relationships", pt: "Relacionamentos e casal" }),
        t(language, { es: "Estres / burnout", en: "Stress / burnout", pt: "Estresse / burnout" }),
        t(language, { es: "Otro", en: "Other", pt: "Outro" })
      ]
    };
  }

  if (question.id === "therapyGoal") {
    return {
      ...question,
      title: t(language, {
        es: "2. Que objetivo te gustaria lograr en terapia?",
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
        es: "3. Enfoque terapeutico preferido",
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
        t(language, { es: "Psicodinamico", en: "Psychodynamic", pt: "Psicodinamico" }),
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
        t(language, { es: "Si, menos de 3 meses", en: "Yes, less than 3 months", pt: "Sim, menos de 3 meses" }),
        t(language, { es: "Si, entre 3 y 12 meses", en: "Yes, between 3 and 12 months", pt: "Sim, entre 3 e 12 meses" }),
        t(language, { es: "Si, mas de 1 ano", en: "Yes, more than 1 year", pt: "Sim, mais de 1 ano" })
      ]
    };
  }

  if (question.id === "emotionalState") {
    return {
      ...question,
      title: t(language, {
        es: "5. Como te sentis hoy?",
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
        t(language, { es: "Manana", en: "Morning", pt: "Manha" }),
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
        es: "7. Idioma para la sesion",
        en: "7. Session language",
        pt: "7. Idioma para a sessao"
      }),
      help: t(language, {
        es: "Se usa para el matching.",
        en: "Used for matching.",
        pt: "Usado para o matching."
      }),
      options: [
        t(language, { es: "Ingles", en: "English", pt: "Ingles" }),
        t(language, { es: "Espanol", en: "Spanish", pt: "Espanhol" }),
        t(language, { es: "Bilingue", en: "Bilingual", pt: "Bilingue" })
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
        es: "Luego podras elegir paquetes de sesiones.",
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
        es: "9. Contas con red de apoyo (familia/amigos)?",
        en: "9. Do you have a support network (family/friends)?",
        pt: "9. Voce conta com rede de apoio (familia/amigos)?"
      }),
      help: t(language, {
        es: "Contexto para continuidad terapeutica.",
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
        es: "10. En las ultimas 2 semanas tuviste ideas de autolesion?",
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

  return question;
}

export function IntakeScreen(props: {
  user: SessionUser;
  language: AppLanguage;
  onComplete: (answers: Record<string, string>) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const question of intakeQuestions) {
      seed[question.id] = "";
    }
    return seed;
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const localizedQuestions = useMemo(
    () => intakeQuestions.map((question) => localizeIntakeQuestion(question, props.language)),
    [props.language]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const missing = intakeQuestions.filter((question) => !answers[question.id]?.trim());
    if (missing.length > 0) {
      setError(
        t(props.language, {
          es: "Completa las 10 preguntas para continuar.",
          en: "Complete all 10 questions to continue.",
          pt: "Complete as 10 perguntas para continuar."
        })
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await props.onComplete(answers);
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
    <div className="intake-shell">
      <section className="intake-card">
        <span className="chip">
          {t(props.language, { es: "Cuestionario inicial obligatorio", en: "Mandatory initial questionnaire", pt: "Questionario inicial obrigatorio" })}
        </span>
        <h1>
          {replaceTemplate(
            t(props.language, {
              es: "{name}, completemos tu perfil clínico",
              en: "{name}, let us complete your clinical profile",
              pt: "{name}, vamos completar seu perfil clínico"
            }),
            { name: props.user.fullName }
          )}
        </h1>
        <p>
          {t(props.language, {
            es: "Este paso es obligatorio antes del matching. Incluye una evaluación de riesgo para detectar situaciones urgentes.",
            en: "This step is required before matching. It includes risk screening for urgent situations.",
            pt: "Este passo e obrigatorio antes do matching. Inclui triagem de risco para situacoes urgentes."
          })}
        </p>

        <form className="stack" onSubmit={handleSubmit}>
          {localizedQuestions.map((question) => (
            <article className="question-card" key={question.id}>
              <h3>{question.title}</h3>
              <p>{question.help}</p>

              {question.multiline ? (
                <textarea
                  rows={3}
                  value={answers[question.id]}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value
                    }))
                  }
                />
              ) : (
                <select
                  value={answers[question.id]}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value
                    }))
                  }
                >
                  <option value="">
                    {t(props.language, { es: "Seleccionar", en: "Select", pt: "Selecionar" })}
                  </option>
                  {question.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </article>
          ))}

          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary" type="submit" disabled={submitting}>
            {submitting
              ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
              : t(props.language, {
                  es: "Finalizar perfil clínico y ver profesionales recomendados",
                  en: "Finish clinical profile and view recommended professionals",
                  pt: "Finalizar perfil clínico e ver profissionais recomendados"
                })}
          </button>
        </form>
      </section>
    </div>
  );
}
