import { useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { formatBusinessDayDeadline } from "../lib/addBusinessDays";
import type { RegistrationApprovalStatus } from "../lib/buildProfessionalAuthUser";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export type RegistrationGateStatus = Exclude<RegistrationApprovalStatus, "APPROVED" | "PENDING"> | "PENDING";

export function ProfessionalRegistrationApprovalScreen(props: {
  language: AppLanguage;
  status: RegistrationGateStatus;
  profileCreatedAt: string | null | undefined;
  email: string;
  rejectionReason?: string | null;
  onLogout: () => void;
  onRefreshStatus: () => Promise<void>;
  onCompleteDocuments?: () => void;
  onContinueRegistration?: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const status =
    props.status === "PENDING" ? "IN_REVIEW" : props.status;

  const deadline =
    status === "IN_REVIEW"
      ? formatBusinessDayDeadline(props.profileCreatedAt ?? new Date().toISOString(), 5)
      : null;
  const deadlineLabel =
    deadline != null
      ? formatDateWithLocale({
          value: deadline.toISOString(),
          language: props.language,
          options: { weekday: "long", day: "numeric", month: "long" }
        })
      : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await props.onRefreshStatus();
    } finally {
      setRefreshing(false);
    }
  };

  const title =
    status === "INCOMPLETE"
      ? t(props.language, {
          es: "Tu registro está incompleto",
          en: "Your registration is incomplete",
          pt: "Seu cadastro esta incompleto"
        })
      : status === "NEEDS_CHANGES"
        ? t(props.language, {
            es: "Necesitamos cambios en tu alta",
            en: "We need changes to your sign-up",
            pt: "Precisamos de mudancas no seu cadastro"
          })
        : status === "REJECTED"
          ? t(props.language, {
              es: "Tu alta no fue aprobada",
              en: "Your sign-up was not approved",
              pt: "Seu cadastro nao foi aprovado"
            })
          : t(props.language, {
              es: "Tu perfil está en revisión",
              en: "Your profile is under review",
              pt: "Seu perfil esta em revisao"
            });

  return (
    <div className="pro-auth-shell pro-registration-approval-shell">
      <section className="pro-registration-approval-card" aria-labelledby="pro-registration-approval-title">
        <div className="pro-registration-approval-brand" aria-hidden="true">
          <img src="/brand/motivarcare-mark.png" alt="" width={40} height={40} />
        </div>
        <p className="pro-registration-approval-eyebrow">
          {t(props.language, {
            es: "MotivarCare · Portal profesional",
            en: "MotivarCare · Professional portal",
            pt: "MotivarCare · Portal profissional"
          })}
        </p>
        <h1 id="pro-registration-approval-title" className="pro-registration-approval-title">
          {title}
        </h1>
        <div className="pro-registration-approval-body">
          {status === "INCOMPLETE" ? (
            <>
              <p>
                {t(props.language, {
                  es: "Guardamos tu progreso. Iniciá sesión (ya lo hiciste) y continuá el registro donde lo dejaste.",
                  en: "We saved your progress. You're signed in—continue registration where you left off.",
                  pt: "Guardamos seu progresso. Continue o cadastro de onde parou."
                })}
              </p>
              <p className="pro-registration-approval-note">
                {t(props.language, {
                  es: "Hasta que envíes el alta, no entra en revisión del equipo.",
                  en: "Until you submit, your profile won't enter team review.",
                  pt: "Ate enviar o cadastro, ele nao entra na revisao da equipe."
                })}
              </p>
            </>
          ) : null}

          {status === "IN_REVIEW" ? (
            <>
              <p>
                {t(props.language, {
                  es: "Recibimos tu registro. Nuestro equipo revisa cada alta de forma manual para cuidar la calidad del matching con pacientes.",
                  en: "We received your registration. Our team reviews each sign-up manually to protect matching quality.",
                  pt: "Recebemos seu cadastro. Nossa equipe revisa cada alta manualmente."
                })}
              </p>
              <p>
                {deadlineLabel
                  ? t(props.language, {
                      es: `El proceso suele tardar hasta 5 días hábiles (estimado hasta el ${deadlineLabel}). Te avisaremos por email a ${props.email}.`,
                      en: `Review usually takes up to 5 business days (estimated by ${deadlineLabel}). We'll email ${props.email}.`,
                      pt: `O processo costuma levar ate 5 dias uteis (estimativa ate ${deadlineLabel}). Avisaremos em ${props.email}.`
                    })
                  : t(props.language, {
                      es: `Te avisaremos por email a ${props.email} cuando tu perfil esté aprobado.`,
                      en: `We'll email ${props.email} once your profile is approved.`,
                      pt: `Avisaremos em ${props.email} quando seu perfil for aprovado.`
                    })}
              </p>
              <p className="pro-registration-approval-note">
                {t(props.language, {
                  es: "Si te pedimos un documento, usá Completar documentos abajo.",
                  en: "If we asked for a document, use Complete documents below.",
                  pt: "Se pedimos um documento, use Completar documentos abaixo."
                })}
              </p>
            </>
          ) : null}

          {status === "NEEDS_CHANGES" ? (
            <>
              <p>
                {t(props.language, {
                  es: "Revisamos tu perfil y necesitamos que corrijas o completes algunos datos antes de aprobarlo.",
                  en: "We reviewed your profile and need you to fix or complete a few items before approval.",
                  pt: "Revisamos seu perfil e precisamos que corrija ou complete alguns dados."
                })}
              </p>
              {props.rejectionReason?.trim() ? (
                <p className="pro-registration-approval-reason">
                  <strong>
                    {t(props.language, { es: "Qué necesitamos:", en: "What we need:", pt: "O que precisamos:" })}
                  </strong>{" "}
                  {props.rejectionReason.trim()}
                </p>
              ) : null}
              <p className="pro-registration-approval-note">
                {t(props.language, {
                  es: "Cuando guardes los cambios, tu alta vuelve automáticamente a revisión.",
                  en: "When you save the changes, your sign-up returns to review automatically.",
                  pt: "Quando salvar as mudancas, seu cadastro volta automaticamente para revisao."
                })}
              </p>
            </>
          ) : null}

          {status === "REJECTED" ? (
            <>
              <p>
                {t(props.language, {
                  es: "Tras revisar tu solicitud, en esta oportunidad no podemos aprobar tu alta.",
                  en: "After reviewing your application, we cannot approve your sign-up at this time.",
                  pt: "Apos revisar sua solicitacao, desta vez nao podemos aprovar seu cadastro."
                })}
              </p>
              {props.rejectionReason?.trim() ? (
                <p className="pro-registration-approval-reason">
                  <strong>
                    {t(props.language, { es: "Motivo:", en: "Reason:", pt: "Motivo:" })}
                  </strong>{" "}
                  {props.rejectionReason.trim()}
                </p>
              ) : null}
              <p>
                {t(props.language, {
                  es: "Te enviamos un correo con más detalles. Si creés que hubo un error, escribinos a soporte@motivarcare.com.",
                  en: "We sent an email with more details. If you believe this was a mistake, contact soporte@motivarcare.com.",
                  pt: "Enviamos um email com mais detalhes. Se acredita que houve um erro, escreva para soporte@motivarcare.com."
                })}
              </p>
            </>
          ) : null}
        </div>

        <div className="pro-registration-approval-actions">
          {status === "INCOMPLETE" && props.onContinueRegistration ? (
            <button type="button" className="primary" onClick={props.onContinueRegistration}>
              {t(props.language, {
                es: "Continuar registro",
                en: "Continue registration",
                pt: "Continuar cadastro"
              })}
            </button>
          ) : null}

          {(status === "IN_REVIEW" || status === "NEEDS_CHANGES") && props.onCompleteDocuments ? (
            <button type="button" className="primary" onClick={props.onCompleteDocuments}>
              {status === "NEEDS_CHANGES"
                ? t(props.language, {
                    es: "Corregir y reenviar",
                    en: "Fix and resubmit",
                    pt: "Corrigir e reenviar"
                  })
                : t(props.language, {
                    es: "Completar documentos",
                    en: "Complete documents",
                    pt: "Completar documentos"
                  })}
            </button>
          ) : null}

          {status === "IN_REVIEW" || status === "NEEDS_CHANGES" ? (
            <button type="button" onClick={() => void handleRefresh()} disabled={refreshing}>
              {refreshing
                ? t(props.language, { es: "Actualizando...", en: "Refreshing...", pt: "Atualizando..." })
                : t(props.language, {
                    es: "Actualizar estado",
                    en: "Refresh status",
                    pt: "Atualizar status"
                  })}
            </button>
          ) : null}

          <button type="button" className="ghost" onClick={props.onLogout}>
            {t(props.language, { es: "Cerrar sesión", en: "Sign out", pt: "Sair" })}
          </button>
        </div>
      </section>
    </div>
  );
}
