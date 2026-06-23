import { useId, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalListingVisibilityControl(props: {
  language: AppLanguage;
  token: string;
  professionalProfileId: string;
  visible: boolean;
  registrationApproval: "PENDING" | "APPROVED" | "REJECTED";
  onVisibleChange: (visible: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tipId = useId();
  const canEnable = props.registrationApproval === "APPROVED";
  const checked = props.visible && canEnable;

  const leadText = t(props.language, {
    es: "Ocultate del directorio cuando tengas la agenda llena, no quieras nuevos pacientes o estés de licencia. Podés volver a activarte cuando quieras.",
    en: "Hide from the directory when your schedule is full, you don't want new patients, or you're away. Turn visibility back on anytime.",
    pt: "Oculte-se do diretorio quando a agenda estiver cheia, nao quiser novos pacientes ou estiver de licenca. Reative quando quiser."
  });

  const statusText =
    props.registrationApproval === "PENDING"
      ? t(props.language, {
          es: "Cuando el equipo apruebe tu perfil vas a poder activar la visibilidad en matching.",
          en: "Once the team approves your profile you'll be able to turn on matching visibility.",
          pt: "Quando a equipe aprovar seu perfil voce podera ativar a visibilidade no matching."
        })
      : props.registrationApproval === "REJECTED"
        ? t(props.language, {
            es: "Tu alta fue rechazada. Escribinos a soporte si necesitás ayuda.",
            en: "Your signup was rejected. Contact support if you need help.",
            pt: "Seu cadastro foi rejeitado. Fale com o suporte se precisar de ajuda."
          })
        : checked
          ? t(props.language, {
              es: "Los pacientes pueden encontrarte en el matching y reservar turnos disponibles.",
              en: "Patients can find you in matching and book open slots.",
              pt: "Pacientes podem encontrar voce no matching e reservar horarios abertos."
            })
          : t(props.language, {
              es: "No aparecés en el matching. Tus pacientes actuales y reservas siguen activas.",
              en: "You won't appear in matching. Existing patients and bookings stay active.",
              pt: "Voce nao aparece no matching. Pacientes e reservas atuais continuam ativos."
            });

  const handleToggle = async () => {
    if (busy) {
      return;
    }
    const nextVisible = !checked;
    if (nextVisible && !canEnable) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest<{ message: string }>(
        `/api/profiles/professional/${props.professionalProfileId}/public-profile`,
        props.token,
        {
          method: "PATCH",
          body: JSON.stringify({ visible: nextVisible })
        }
      );
      props.onVisibleChange(nextVisible);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("profile-save", props.language, raw));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="pro-listing-visibility-header-wrap"
      aria-describedby={tipId}
      data-tour="pro-tour-listing-visibility"
    >
      <label className={`pro-listing-visibility-toggle pro-listing-visibility-toggle--header${busy ? " is-busy" : ""}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={busy || (!canEnable && !checked)}
          onChange={() => void handleToggle()}
          aria-label={t(props.language, {
            es: "Visibilidad en matching",
            en: "Matching visibility",
            pt: "Visibilidade no matching"
          })}
        />
        <span className="pro-listing-visibility-toggle-ui" aria-hidden="true" />
        <span className="pro-listing-visibility-toggle-label">
          {checked
            ? t(props.language, { es: "Visible", en: "Visible", pt: "Visivel" })
            : t(props.language, { es: "Oculto", en: "Hidden", pt: "Oculto" })}
        </span>
      </label>
      <div id={tipId} role="tooltip" className="pro-listing-visibility-header-tooltip">
        <p className="pro-listing-visibility-header-tooltip-title">
          {t(props.language, {
            es: "Visibilidad en matching",
            en: "Matching visibility",
            pt: "Visibilidade no matching"
          })}
        </p>
        <p>{leadText}</p>
        <p>{statusText}</p>
        {error ? <p className="pro-listing-visibility-header-tooltip-error">{error}</p> : null}
      </div>
    </div>
  );
}
