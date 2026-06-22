import { useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { formatBusinessDayDeadline } from "../lib/addBusinessDays";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalRegistrationApprovalScreen(props: {
  language: AppLanguage;
  status: "PENDING" | "REJECTED";
  profileCreatedAt: string | null | undefined;
  email: string;
  onLogout: () => void;
  onRefreshStatus: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const deadline =
    props.status === "PENDING"
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

  const isPending = props.status === "PENDING";

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
          {isPending
            ? t(props.language, {
                es: "Tu perfil está en revisión",
                en: "Your profile is under review",
                pt: "Seu perfil esta em revisao"
              })
            : t(props.language, {
                es: "Tu alta no fue aprobada",
                en: "Your sign-up was not approved",
                pt: "Seu cadastro nao foi aprovado"
              })}
        </h1>
        <div className="pro-registration-approval-body">
          {isPending ? (
            <>
              <p>
                {t(props.language, {
                  es: "Recibimos tu registro correctamente. Nuestro equipo revisa cada alta de forma manual para cuidar la calidad del matching con pacientes.",
                  en: "We received your registration. Our team reviews each sign-up manually to protect matching quality for patients.",
                  pt: "Recebemos seu cadastro. Nossa equipe revisa cada alta manualmente para cuidar a qualidade do matching com pacientes."
                })}
              </p>
              <p>
                {deadlineLabel
                  ? t(props.language, {
                      es: `El proceso suele tardar hasta 5 días hábiles (estimado hasta el ${deadlineLabel}). Te avisaremos por email a ${props.email} cuando tu perfil esté aprobado.`,
                      en: `Review usually takes up to 5 business days (estimated by ${deadlineLabel}). We'll email ${props.email} once your profile is approved.`,
                      pt: `O processo costuma levar ate 5 dias uteis (estimativa ate ${deadlineLabel}). Avisaremos por email em ${props.email} quando seu perfil for aprovado.`
                    })
                  : t(props.language, {
                      es: `Te avisaremos por email a ${props.email} cuando tu perfil esté aprobado.`,
                      en: `We'll email ${props.email} once your profile is approved.`,
                      pt: `Avisaremos por email em ${props.email} quando seu perfil for aprovado.`
                    })}
              </p>
              <p className="pro-registration-approval-note">
                {t(props.language, {
                  es: "Hasta entonces no podés acceder al portal. Podés cerrar sesión y volver más tarde.",
                  en: "Until then you cannot access the portal. You may sign out and return later.",
                  pt: "Ate la voce nao pode acessar o portal. Pode sair e voltar mais tarde."
                })}
              </p>
            </>
          ) : (
            <>
              <p>
                {t(props.language, {
                  es: "Gracias por completar tu registro en MotivarCare. Tras revisar tu solicitud, en esta oportunidad no pudimos aprobar tu alta.",
                  en: "Thank you for signing up with MotivarCare. After reviewing your application, we were unable to approve your profile at this time.",
                  pt: "Obrigado por se cadastrar na MotivarCare. Apos revisar sua solicitacao, desta vez nao pudemos aprovar seu cadastro."
                })}
              </p>
              <p>
                {t(props.language, {
                  es: "Te enviamos un correo con más detalles. Si creés que hubo un error, escribinos a soporte@motivarcare.com.",
                  en: "We sent you an email with more details. If you believe this was a mistake, contact soporte@motivarcare.com.",
                  pt: "Enviamos um email com mais detalhes. Se acredita que houve um erro, escreva para soporte@motivarcare.com."
                })}
              </p>
            </>
          )}
        </div>
        <div className="pro-registration-approval-actions">
          {isPending ? (
            <button type="button" className="primary" onClick={() => void handleRefresh()} disabled={refreshing}>
              {refreshing
                ? t(props.language, { es: "Actualizando...", en: "Refreshing...", pt: "Atualizando..." })
                : t(props.language, {
                    es: "Actualizar estado",
                    en: "Refresh status",
                    pt: "Atualizar status"
                  })}
            </button>
          ) : null}
          <button type="button" onClick={props.onLogout}>
            {t(props.language, { es: "Cerrar sesión", en: "Sign out", pt: "Sair" })}
          </button>
        </div>
      </section>
    </div>
  );
}
