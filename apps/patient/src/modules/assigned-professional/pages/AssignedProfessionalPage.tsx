import { type SyntheticEvent } from "react";
import { Navigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { CalmPortalToolbarRow } from "../../app/components/CalmPortalToolbarRow";
import { countAvailablePatientSessions } from "../../app/lib/countAvailablePatientSessions";
import { findProfessionalById } from "../../app/lib/professionals";
import { filterUpcomingPatientBookings, pickNextPatientBooking } from "@therapy/patient-core";
import type { PatientAppState, Professional } from "../../app/types";
import { AssignedProDetailCard } from "../components/AssignedProDetailCard";
import { AssignedProReserveCard } from "../components/AssignedProReserveCard";
import { AssignedProUpcomingCard } from "../components/AssignedProUpcomingCard";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Perfil del profesional del vínculo. Fuera del menú; se abre desde “Ver perfil”. */
export function AssignedProfessionalPage(props: {
  state: PatientAppState;
  language: AppLanguage;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onChat: (professionalId: string) => void;
  onReserve: (professionalId: string) => void;
  onBuy: () => void;
}) {
  const assignedId = props.state.assignedProfessionalId?.trim() ?? "";
  if (!assignedId) {
    return <Navigate replace to="/" />;
  }

  const professional = findProfessionalById(assignedId, props.professionals);
  if (!professional) {
    return <Navigate replace to="/" />;
  }

  const now = Date.now();
  const upcoming = filterUpcomingPatientBookings(props.state.bookings, now).filter(
    (booking) => booking.professionalId === assignedId
  );
  const next = pickNextPatientBooking(upcoming, now);
  const available = countAvailablePatientSessions({
    creditsRemaining: props.state.subscription.creditsRemaining,
    trialRebookAvailable: props.state.trialRebookAvailable
  });

  return (
    <div className="assigned-pro-page">
      <CalmPortalToolbarRow mountId="assigned-pro-toolbar-mount" />
      <header className="assigned-pro-head">
        <p className="assigned-pro-kicker">
          {t(props.language, { es: "Tu vínculo", en: "Your bond", pt: "Seu vínculo" })}
        </p>
        <h1>
          {t(props.language, { es: "Tus ", en: "Your ", pt: "Seus " })}
          <em>
            {t(props.language, {
              es: "profesionales",
              en: "professionals",
              pt: "profissionais"
            })}
          </em>
        </h1>
      </header>
      <div className="assigned-pro-columns">
        <div className="assigned-pro-main">
          <AssignedProDetailCard
            language={props.language}
            professional={professional}
            photoUrl={props.professionalPhotoMap[professional.id] ?? null}
            onChat={() => props.onChat(professional.id)}
            onImageFallback={props.onImageFallback}
          />
        </div>
        <aside className="assigned-pro-side" aria-label={t(props.language, { es: "Acciones", en: "Actions", pt: "Ações" })}>
          <AssignedProUpcomingCard
            language={props.language}
            timeZone={props.state.profile.timezone}
            booking={next}
          />
          <AssignedProReserveCard
            language={props.language}
            availableSessions={available}
            onReserve={() => props.onReserve(professional.id)}
            onBuy={props.onBuy}
          />
        </aside>
      </div>
    </div>
  );
}
